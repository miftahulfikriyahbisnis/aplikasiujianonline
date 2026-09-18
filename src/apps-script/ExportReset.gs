/**
 * ExportReset.gs - 4-Sheet XLSX Export, Safe Reset by Run_ID, and Dashboard Stats
 * Source of Truth: MASTER SPEC FR-25, FR-26, Section 3.8, 9.3, 9.4
 */

function adminExportRunXlsx(runId) {
  var runs = getRowsAsObjects(SHEETS.EXAM_RUNS);
  var run = runs.find(function(r) { return r.Run_ID === runId; });
  if (!run) throw new Error('Exam Run tidak ditemukan.');

  var exams = getRowsAsObjects(SHEETS.EXAMS);
  var exam = exams.find(function(e) { return e.Exam_ID === run.Exam_ID; }) || {};

  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS).filter(function(a) { return a.Run_ID === runId; });
  var attemptIds = attempts.map(function(a) { return a.Attempt_ID; });

  var users = getRowsAsObjects(SHEETS.USERS);
  var userMap = {};
  users.forEach(function(u) { userMap[u.User_ID] = u; });

  var attemptMap = {};
  attempts.forEach(function(a) { attemptMap[a.Attempt_ID] = a; });

  var allAnswers = getRowsAsObjects(SHEETS.ANSWERS).filter(function(ans) {
    return attemptIds.indexOf(ans.Attempt_ID) !== -1;
  });

  var allViolations = getRowsAsObjects(SHEETS.VIOLATIONS).filter(function(v) {
    return attemptIds.indexOf(v.Attempt_ID) !== -1;
  });

  var eqList = getRowsAsObjects(SHEETS.EXAM_QUESTIONS).filter(function(q) { return q.Exam_ID === exam.Exam_ID; });
  var eqMap = {};
  eqList.forEach(function(eq) { eqMap[eq.Exam_Question_ID] = eq; });

  var versions = getRowsAsObjects(SHEETS.QUESTION_VERSIONS);
  var versionMap = {};
  versions.forEach(function(v) { versionMap[v.Version_ID] = v; });

  var options = getRowsAsObjects(SHEETS.OPTIONS);
  var optionMap = {};
  options.forEach(function(opt) { optionMap[opt.Option_ID] = opt; });

  // Create new Spreadsheet for export
  var fileName = 'Export_Ujian_' + (run.Run_Name || 'Run').replace(/[^a-zA-Z0-9_-]/g, '_') + '_' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd_HHmm');
  var exportSs = SpreadsheetApp.create(fileName);

  // Sheet 1: Rekap Nilai
  var s1 = exportSs.getActiveSheet();
  s1.setName('Rekap Nilai');
  s1.appendRow(['NIM', 'Nama Mahasiswa', 'Kelas', 'Status Ujian', 'Nilai PG', 'Nilai Essay', 'Nilai Akhir', 'Status Penilaian', 'Jumlah Pelanggaran', 'Waktu Submit']);
  s1.getRange(1, 1, 1, 10).setFontWeight('bold');

  attempts.forEach(function(att) {
    var u = userMap[att.Student_ID] || {};
    var studentAnswers = allAnswers.filter(function(a) { return a.Attempt_ID === att.Attempt_ID; });
    var hasPendingEssay = studentAnswers.some(function(a) {
      return !a.Selected_Option_ID && (a.Manual_Score === '' || a.Manual_Score === undefined || a.Manual_Score === null);
    });
    s1.appendRow([
      u.NIM || '',
      u.Full_Name || '',
      u.Class_Name || '',
      att.Status,
      Number(att.Objective_Score) || 0,
      Number(att.Essay_Score) || 0,
      Number(att.Final_Score) || 0,
      hasPendingEssay ? 'PENDING ESSAY' : 'SELESAI',
      Number(att.Violation_Count) || 0,
      att.Submitted_At || '-'
    ]);
  });

  // Sheet 2: Jawaban PG
  var s2 = exportSs.insertSheet('Jawaban PG');
  s2.appendRow(['NIM', 'Nama Mahasiswa', 'No Soal', 'Pertanyaan', 'Opsi Dipilih', 'Teks Opsi', 'Benar/Salah', 'Skor']);
  s2.getRange(1, 1, 1, 8).setFontWeight('bold');

  allAnswers.filter(function(a) { return !!a.Selected_Option_ID; }).forEach(function(a) {
    var att = attemptMap[a.Attempt_ID] || {};
    var u = userMap[att.Student_ID] || {};
    var eq = eqMap[a.Exam_Question_ID] || {};
    var ver = versionMap[eq.Version_ID] || {};
    var opt = optionMap[a.Selected_Option_ID] || {};
    s2.appendRow([
      u.NIM || '',
      u.Full_Name || '',
      eq.Question_Number || 1,
      ver.Question_Text || '',
      opt.Option_Key || '',
      opt.Option_Text || '',
      a.Is_Correct ? 'BENAR' : 'SALAH',
      Number(a.Auto_Score) || 0
    ]);
  });

  // Sheet 3: Jawaban Essay
  var s3 = exportSs.insertSheet('Jawaban Essay');
  s3.appendRow(['NIM', 'Nama Mahasiswa', 'No Soal', 'Pertanyaan', 'Jawaban Mahasiswa', 'Skor Maksimal', 'Nilai Manual', 'Feedback Dosen', 'Waktu Dinilai']);
  s3.getRange(1, 1, 1, 9).setFontWeight('bold');

  allAnswers.filter(function(a) { return !a.Selected_Option_ID && a.Answer_Text; }).forEach(function(a) {
    var att = attemptMap[a.Attempt_ID] || {};
    var u = userMap[att.Student_ID] || {};
    var eq = eqMap[a.Exam_Question_ID] || {};
    var ver = versionMap[eq.Version_ID] || {};
    s3.appendRow([
      u.NIM || '',
      u.Full_Name || '',
      eq.Question_Number || 1,
      ver.Question_Text || '',
      a.Answer_Text || '',
      Number(eq.Points) || 10,
      a.Manual_Score !== '' ? Number(a.Manual_Score) : 'BELUM DINILAI',
      a.Lecturer_Feedback || '-',
      a.Graded_At || '-'
    ]);
  });

  // Sheet 4: Pelanggaran
  var s4 = exportSs.insertSheet('Pelanggaran');
  s4.appendRow(['NIM', 'Nama Mahasiswa', 'Jenis Pelanggaran', 'Waktu Terdeteksi', 'Durasi (detik)', 'Izin Dosen', 'Status Alarm', 'Catatan Admin']);
  s4.getRange(1, 1, 1, 8).setFontWeight('bold');

  allViolations.forEach(function(v) {
    var att = attemptMap[v.Attempt_ID] || {};
    var u = userMap[att.Student_ID] || {};
    s4.appendRow([
      u.NIM || '',
      u.Full_Name || '',
      v.Event_Type,
      v.Detected_At,
      Number(v.Duration_Seconds) || 0,
      v.Is_Authorized ? 'DISETUJUI' : 'TIDAK BERIZIN',
      v.Alarm_Status,
      v.Admin_Note || '-'
    ]);
  });

  logAdminAction('ADMIN', 'EXPORT_XLSX', 'EXAM_RUN', runId, 'Export file spreadsheet: ' + exportSs.getUrl());

  return {
    fileId: exportSs.getId(),
    fileName: fileName,
    url: exportSs.getUrl(),
    attemptsCount: attempts.length
  };
}

function adminResetRunResponses(runId, confirmation) {
  // CRITICAL: Only delete ATTEMPTS, ANSWERS, VIOLATIONS, PERMISSIONS for this Run_ID.
  // NEVER delete COURSES, TOPICS, QUESTION_BANKS, QUESTIONS, QUESTION_VERSIONS, OPTIONS, EXAMS, EXAM_QUESTIONS, EXAM_RUNS, ADMIN_LOGS.
  if (!runId) throw new Error('Run ID wajib ditentukan.');
  if (String(confirmation).trim() !== String(runId).trim() && String(confirmation).trim().toUpperCase() !== 'RESET') {
    throw new Error('Konfirmasi tidak valid. Harap ketik Run_ID atau "RESET" untuk melanjutkan.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var runs = getRowsAsObjects(SHEETS.EXAM_RUNS);
    var targetRun = runs.find(function(r) { return r.Run_ID === runId; });
    if (!targetRun) throw new Error('Exam Run tidak ditemukan.');

    // 1. Find all Attempt_IDs for this Run_ID
    var attempts = getRowsAsObjects(SHEETS.ATTEMPTS).filter(function(a) { return a.Run_ID === runId; });
    var attemptIds = attempts.map(function(a) { return a.Attempt_ID; });

    // 2. Delete ANSWERS
    var answers = getRowsAsObjects(SHEETS.ANSWERS);
    var ansIndices = [];
    answers.forEach(function(a) {
      if (attemptIds.indexOf(a.Attempt_ID) !== -1) ansIndices.push(a.__rowIndex);
    });
    deleteRowsByIndices(SHEETS.ANSWERS, ansIndices);

    // 3. Delete VIOLATIONS
    var violations = getRowsAsObjects(SHEETS.VIOLATIONS);
    var vioIndices = [];
    violations.forEach(function(v) {
      if (attemptIds.indexOf(v.Attempt_ID) !== -1) vioIndices.push(v.__rowIndex);
    });
    deleteRowsByIndices(SHEETS.VIOLATIONS, vioIndices);

    // 4. Delete PERMISSIONS
    var perms = getRowsAsObjects(SHEETS.PERMISSIONS);
    var permIndices = [];
    perms.forEach(function(p) {
      if (attemptIds.indexOf(p.Attempt_ID) !== -1) permIndices.push(p.__rowIndex);
    });
    deleteRowsByIndices(SHEETS.PERMISSIONS, permIndices);

    // 5. Delete ATTEMPTS
    var attIndices = attempts.map(function(a) { return a.__rowIndex; });
    deleteRowsByIndices(SHEETS.ATTEMPTS, attIndices);

    // 6. Update EXAM_RUNS: Data_Status = RESET, Reset_At = timestamp
    var now = new Date().toISOString();
    updateRowObj(SHEETS.EXAM_RUNS, targetRun.__rowIndex, {
      Data_Status: 'RESET',
      Reset_At: now
    });

    // 7. Write ADMIN_LOGS
    logAdminAction('ADMIN', 'RESET_RUN', 'EXAM_RUN', runId, 'Reset respons run: ' + attempts.length + ' attempts, ' + ansIndices.length + ' answers, ' + vioIndices.length + ' violations dihapus.');

    return {
      status: 'success',
      runId: runId,
      deletedAttempts: attempts.length,
      deletedAnswers: ansIndices.length,
      deletedViolations: vioIndices.length,
      deletedPermissions: permIndices.length,
      resetAt: now
    };
  } finally {
    lock.releaseLock();
  }
}

function getDashboardStats() {
  var courses = getRowsAsObjects(SHEETS.COURSES).filter(function(c) { return c.Status === 'ACTIVE'; });
  var questions = getRowsAsObjects(SHEETS.QUESTIONS).filter(function(q) { return q.Status === 'ACTIVE'; });
  var runs = getRowsAsObjects(SHEETS.EXAM_RUNS);
  var openRuns = runs.filter(function(r) { return r.Status === 'OPEN'; });
  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS);
  var inProgressAttempts = attempts.filter(function(a) { return a.Status === 'IN_PROGRESS'; });

  var allAnswers = getRowsAsObjects(SHEETS.ANSWERS);
  var pendingEssays = allAnswers.filter(function(ans) {
    return !ans.Selected_Option_ID && ans.Answer_Text && (ans.Manual_Score === '' || ans.Manual_Score === undefined || ans.Manual_Score === null);
  });

  var violations = getRowsAsObjects(SHEETS.VIOLATIONS);
  var activeViolations = violations.filter(function(v) { return v.Alarm_Status === 'ACTIVE'; });

  return {
    activeCoursesCount: courses.length,
    activeQuestionsCount: questions.length,
    openRunsCount: openRuns.length,
    inProgressStudentsCount: inProgressAttempts.length,
    pendingEssaysCount: pendingEssays.length,
    activeViolationsCount: activeViolations.length,
    openRuns: openRuns
  };
}

function getSettings() {
  return getRowsAsObjects(SHEETS.SETTINGS);
}

function updateSetting(key, value) {
  var settings = getRowsAsObjects(SHEETS.SETTINGS);
  var target = settings.find(function(s) { return s.Setting_Key === key; });
  var now = new Date().toISOString();
  if (target) {
    updateRowObj(SHEETS.SETTINGS, target.__rowIndex, {
      Setting_Value: String(value),
      Updated_At: now
    });
  } else {
    appendRowObj(SHEETS.SETTINGS, {
      Setting_Key: key,
      Setting_Value: String(value),
      Description: 'Custom Setting',
      Updated_At: now
    });
  }
  logAdminAction('ADMIN', 'UPDATE_SETTING', 'SETTINGS', key, 'Nilai diubah ke ' + value);
  return { status: 'success', key: key, value: value };
}
