/**
 * Exams.gs - Exam Blueprint, Exam Questions (locking Version_ID), and Exam Runs
 * Source of Truth: MASTER SPEC FR-11 to FR-14, Section 5.2, 5.3
 */

function getExams(filter) {
  var exams = getRowsAsObjects(SHEETS.EXAMS);
  var examQuestions = getRowsAsObjects(SHEETS.EXAM_QUESTIONS);
  var runs = getRowsAsObjects(SHEETS.EXAM_RUNS);
  var courses = getRowsAsObjects(SHEETS.COURSES);

  var courseMap = {};
  courses.forEach(function(c) { courseMap[c.Course_ID] = c; });

  var eqMap = {};
  examQuestions.forEach(function(eq) {
    if (!eqMap[eq.Exam_ID]) eqMap[eq.Exam_ID] = [];
    eqMap[eq.Exam_ID].push(eq);
  });

  var runMap = {};
  runs.forEach(function(r) {
    if (!runMap[r.Exam_ID]) runMap[r.Exam_ID] = [];
    runMap[r.Exam_ID].push(r);
  });

  return exams.map(function(e) {
    var c = courseMap[e.Course_ID] || {};
    var questions = eqMap[e.Exam_ID] || [];
    var totalPoints = questions.reduce(function(sum, q) { return sum + (Number(q.Points) || 0); }, 0);
    return {
      Exam_ID: e.Exam_ID,
      Course_ID: e.Course_ID,
      Course_Name: c.Course_Name || '',
      Exam_Name: e.Exam_Name,
      Instructions: e.Instructions || '',
      Duration_Minutes: Number(e.Duration_Minutes) || 60,
      Shuffle_Questions: Boolean(e.Shuffle_Questions === true || e.Shuffle_Questions === 'TRUE'),
      Shuffle_Options: Boolean(e.Shuffle_Options === true || e.Shuffle_Options === 'TRUE'),
      Anti_Cheat_Enabled: Boolean(e.Anti_Cheat_Enabled === true || e.Anti_Cheat_Enabled === 'TRUE'),
      Fullscreen_Required: Boolean(e.Fullscreen_Required === true || e.Fullscreen_Required === 'TRUE'),
      Response_Retention_Days: Number(e.Response_Retention_Days) || 14,
      Status: e.Status,
      Total_Questions: questions.length,
      Total_Points: totalPoints,
      Runs_Count: (runMap[e.Exam_ID] || []).length,
      Created_At: e.Created_At,
      Updated_At: e.Updated_At
    };
  });
}

function adminCreateExam(payload) {
  if (!payload.Course_ID || !payload.Exam_Name) {
    throw new Error('Mata kuliah dan nama ujian wajib diisi.');
  }

  var now = new Date().toISOString();
  var examId = generateId('EXM');

  var newExam = {
    Exam_ID: examId,
    Course_ID: payload.Course_ID,
    Exam_Name: String(payload.Exam_Name).trim(),
    Instructions: payload.Instructions || 'Kerjakan dengan jujur dan teliti.',
    Duration_Minutes: Number(payload.Duration_Minutes) || 60,
    Shuffle_Questions: Boolean(payload.Shuffle_Questions),
    Shuffle_Options: Boolean(payload.Shuffle_Options),
    Anti_Cheat_Enabled: Boolean(payload.Anti_Cheat_Enabled !== false),
    Fullscreen_Required: Boolean(payload.Fullscreen_Required !== false),
    Response_Retention_Days: Number(payload.Response_Retention_Days) || 14,
    Status: 'DRAFT',
    Created_By: payload.Created_By || 'ADMIN',
    Created_At: now,
    Updated_At: now
  };

  appendRowObj(SHEETS.EXAMS, newExam);
  logAdminAction('ADMIN', 'CREATE_EXAM', 'EXAM', examId, 'Membuat draft ujian: ' + newExam.Exam_Name);
  return newExam;
}

function adminSetExamQuestions(examId, questions) {
  // questions is array of { Version_ID, Question_Number, Points, Is_Required }
  if (!examId || !questions || questions.length === 0) {
    throw new Error('Exam ID dan daftar soal wajib ditentukan.');
  }

  var allEq = getRowsAsObjects(SHEETS.EXAM_QUESTIONS);
  var indicesToDelete = [];
  for (var i = 0; i < allEq.length; i++) {
    if (allEq[i].Exam_ID === examId) {
      indicesToDelete.push(allEq[i].__rowIndex);
    }
  }
  deleteRowsByIndices(SHEETS.EXAM_QUESTIONS, indicesToDelete);

  var totalPoints = 0;
  questions.forEach(function(q, idx) {
    var pts = Number(q.Points) || 2;
    totalPoints += pts;
    appendRowObj(SHEETS.EXAM_QUESTIONS, {
      Exam_Question_ID: generateId('EQ'),
      Exam_ID: examId,
      Version_ID: q.Version_ID, // Stores locked Version_ID
      Question_Number: q.Question_Number || (idx + 1),
      Points: pts,
      Is_Required: Boolean(q.Is_Required !== false)
    });
  });

  logAdminAction('ADMIN', 'SET_QUESTIONS', 'EXAM', examId, 'Menetapkan ' + questions.length + ' butir soal, total skor: ' + totalPoints);
  return { examId: examId, count: questions.length, totalPoints: totalPoints };
}

function adminPublishExam(examId) {
  var exams = getRowsAsObjects(SHEETS.EXAMS);
  var target = exams.find(function(e) { return e.Exam_ID === examId; });
  if (!target) throw new Error('Ujian tidak ditemukan.');

  var eq = getRowsAsObjects(SHEETS.EXAM_QUESTIONS).filter(function(q) { return q.Exam_ID === examId; });
  if (eq.length === 0) {
    throw new Error('Ujian tidak dapat dipublish karena belum memiliki soal. Masukkan soal terlebih dahulu.');
  }

  updateRowObj(SHEETS.EXAMS, target.__rowIndex, {
    Status: 'PUBLISHED',
    Updated_At: new Date().toISOString()
  });

  logAdminAction('ADMIN', 'PUBLISH_EXAM', 'EXAM', examId, 'Ujian berstatus PUBLISHED dengan ' + eq.length + ' butir soal');
  return { Exam_ID: examId, Status: 'PUBLISHED' };
}

function getExamRuns(examId) {
  var runs = getRowsAsObjects(SHEETS.EXAM_RUNS);
  if (examId) {
    runs = runs.filter(function(r) { return r.Exam_ID === examId; });
  }
  return runs;
}

function adminCreateRun(payload) {
  if (!payload.Exam_ID || !payload.Run_Name || !payload.Class_Name) {
    throw new Error('Exam ID, Nama Sesi, dan Kelas target wajib diisi.');
  }

  var now = new Date();
  var runId = generateId('RUN');

  // Generate 6-char random access code if not provided
  var code = payload.Access_Code ? String(payload.Access_Code).trim().toUpperCase() : Math.random().toString(36).substring(2, 8).toUpperCase();

  var retentionDays = Number(payload.Response_Retention_Days) || 14;
  var deleteAfter = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

  var newRun = {
    Run_ID: runId,
    Exam_ID: payload.Exam_ID,
    Run_Name: String(payload.Run_Name).trim(),
    Class_Name: String(payload.Class_Name).trim(),
    Start_At: payload.Start_At || now.toISOString(),
    End_At: payload.End_At || new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    Access_Code: code,
    Status: payload.Status || 'OPEN',
    Response_Retention_Days: retentionDays,
    Delete_After: deleteAfter,
    Data_Status: 'ACTIVE',
    Created_By: payload.Created_By || 'ADMIN',
    Created_At: now.toISOString(),
    Closed_At: '',
    Reset_At: ''
  };

  appendRowObj(SHEETS.EXAM_RUNS, newRun);
  logAdminAction('ADMIN', 'CREATE_RUN', 'EXAM_RUN', runId, 'Buat sesi ujian ' + newRun.Run_Name + ', kode: ' + code);
  return newRun;
}

function adminUpdateRunStatus(runId, newStatus) {
  var runs = getRowsAsObjects(SHEETS.EXAM_RUNS);
  var target = runs.find(function(r) { return r.Run_ID === runId; });
  if (!target) throw new Error('Exam Run tidak ditemukan.');

  var updateData = { Status: newStatus };
  if (newStatus === 'CLOSED') {
    updateData.Closed_At = new Date().toISOString();
  }
  updateRowObj(SHEETS.EXAM_RUNS, target.__rowIndex, updateData);

  logAdminAction('ADMIN', 'UPDATE_STATUS', 'EXAM_RUN', runId, 'Status sesi diubah ke ' + newStatus);
  return { Run_ID: runId, Status: newStatus };
}
