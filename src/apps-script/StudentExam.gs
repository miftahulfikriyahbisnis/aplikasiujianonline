/**
 * StudentExam.gs - Student Attempt Engine, Batch Autosave, Anti-cheat, and Final Submit
 * Source of Truth: MASTER SPEC FR-15 to FR-19, Section 8.3, 9.1
 */

function studentStartAttempt(nim, accessCode) {
  var loginRes = studentLogin(nim, accessCode);
  var student = loginRes.student;
  var run = loginRes.run;
  var exam = loginRes.exam;

  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS);
  var attempt = attempts.find(function(a) {
    return a.Run_ID === run.runId && a.Student_ID === student.userId;
  });

  var now = new Date();
  var durationMs = exam.durationMinutes * 60 * 1000;
  var expiresAt = new Date(now.getTime() + durationMs).toISOString();

  if (!attempt) {
    var attemptId = generateId('ATT');
    attempt = {
      Attempt_ID: attemptId,
      Run_ID: run.runId,
      Student_ID: student.userId,
      Started_At: now.toISOString(),
      Submitted_At: '',
      Expires_At: expiresAt,
      Status: 'IN_PROGRESS',
      Objective_Score: 0,
      Essay_Score: 0,
      Final_Score: 0,
      Violation_Count: 0,
      Last_Sync_At: now.toISOString(),
      Client_Submission_ID: ''
    };
    appendRowObj(SHEETS.ATTEMPTS, attempt);
  } else {
    if (attempt.Status === 'SUBMITTED' || attempt.Status === 'TIMEOUT') {
      throw new Error('Ujian sudah selesai (' + attempt.Status + ').');
    }
  }

  // Load Exam Questions with locked Version_ID
  var examQuestions = getRowsAsObjects(SHEETS.EXAM_QUESTIONS).filter(function(eq) {
    return eq.Exam_ID === exam.examId;
  });
  examQuestions.sort(function(a, b) { return (Number(a.Question_Number) || 0) - (Number(b.Question_Number) || 0); });

  // Load Questions, Versions, and Options
  var versions = getRowsAsObjects(SHEETS.QUESTION_VERSIONS);
  var questions = getRowsAsObjects(SHEETS.QUESTIONS);
  var options = getRowsAsObjects(SHEETS.OPTIONS);

  var versionMap = {};
  versions.forEach(function(v) { versionMap[v.Version_ID] = v; });

  var questionMap = {};
  questions.forEach(function(q) { questionMap[q.Question_ID] = q; });

  var optionsMap = {};
  options.forEach(function(opt) {
    if (!optionsMap[opt.Version_ID]) optionsMap[opt.Version_ID] = [];
    optionsMap[opt.Version_ID].push(opt);
  });

  // Build SANITIZED student question payload
  // MANDATORY: No Is_Correct, No Answer_Guide, No Explanation
  var studentQuestions = [];
  for (var i = 0; i < examQuestions.length; i++) {
    var eq = examQuestions[i];
    var ver = versionMap[eq.Version_ID];
    if (!ver) continue;
    var qMaster = questionMap[ver.Question_ID] || {};

    var sanitizedOptions = undefined;
    if (qMaster.Question_Type === 'MCQ') {
      var rawOpts = optionsMap[ver.Version_ID] || [];
      rawOpts.sort(function(a, b) { return (Number(a.Sort_Order) || 0) - (Number(b.Sort_Order) || 0); });
      sanitizedOptions = rawOpts.map(function(o) {
        return {
          Option_ID: o.Option_ID,
          Option_Key: o.Option_Key,
          Option_Text: o.Option_Text,
          Sort_Order: Number(o.Sort_Order) || 1
        };
      });
    }

    studentQuestions.push({
      Exam_Question_ID: eq.Exam_Question_ID,
      Question_Number: eq.Question_Number,
      Question_Type: qMaster.Question_Type,
      Question_Text: ver.Question_Text,
      Image_URL: ver.Image_URL || '',
      Points: Number(eq.Points) || 2,
      Is_Required: Boolean(eq.Is_Required !== false),
      Options: sanitizedOptions
    });
  }

  // Load existing student answers
  var allAnswers = getRowsAsObjects(SHEETS.ANSWERS);
  var existingAnswers = {};
  for (var a = 0; a < allAnswers.length; a++) {
    var ans = allAnswers[a];
    if (ans.Attempt_ID === attempt.Attempt_ID) {
      existingAnswers[ans.Exam_Question_ID] = {
        Selected_Option_ID: ans.Selected_Option_ID || '',
        Answer_Text: ans.Answer_Text || ''
      };
    }
  }

  return {
    success: true,
    Attempt_ID: attempt.Attempt_ID,
    Run_ID: run.runId,
    Exam_Name: exam.examName,
    Course_Name: exam.courseName,
    Class_Name: run.className,
    Student_Name: student.name,
    Student_NIM: student.nim,
    Duration_Minutes: exam.durationMinutes,
    Started_At: attempt.Started_At,
    Expires_At: attempt.Expires_At,
    Fullscreen_Required: exam.fullscreenRequired,
    Anti_Cheat_Enabled: exam.antiCheatEnabled,
    Questions: studentQuestions,
    ExistingAnswers: existingAnswers
  };
}

function studentBatchSaveAnswers(attemptId, answers) {
  // answers: Array of { Exam_Question_ID, Selected_Option_ID, Answer_Text }
  if (!attemptId || !answers) {
    throw new Error('Attempt ID dan data jawaban wajib dikirim.');
  }

  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS);
  var attempt = attempts.find(function(a) { return a.Attempt_ID === attemptId; });
  if (!attempt) throw new Error('Sesi ujian tidak valid.');
  if (attempt.Status === 'SUBMITTED' || attempt.Status === 'TIMEOUT') {
    throw new Error('Ujian sudah selesai. Jawaban tidak dapat disimpan.');
  }

  var eqList = getRowsAsObjects(SHEETS.EXAM_QUESTIONS);
  var eqMap = {};
  eqList.forEach(function(eq) { eqMap[eq.Exam_Question_ID] = eq; });

  var options = getRowsAsObjects(SHEETS.OPTIONS);
  var optionMap = {};
  options.forEach(function(opt) { optionMap[opt.Option_ID] = opt; });

  var existingAnswers = getRowsAsObjects(SHEETS.ANSWERS).filter(function(ans) {
    return ans.Attempt_ID === attemptId;
  });
  var existingAnswerMap = {};
  existingAnswers.forEach(function(ans) {
    existingAnswerMap[ans.Exam_Question_ID] = ans;
  });

  var now = new Date().toISOString();

  answers.forEach(function(item) {
    var eq = eqMap[item.Exam_Question_ID];
    var isMcq = !!item.Selected_Option_ID;
    var isCorrect = false;
    var autoScore = 0;

    if (isMcq && eq) {
      var opt = optionMap[item.Selected_Option_ID];
      if (opt && (opt.Is_Correct === true || opt.Is_Correct === 'TRUE')) {
        isCorrect = true;
        autoScore = Number(eq.Points) || 0;
      }
    }

    var existing = existingAnswerMap[item.Exam_Question_ID];
    if (existing) {
      updateRowObj(SHEETS.ANSWERS, existing.__rowIndex, {
        Selected_Option_ID: item.Selected_Option_ID || '',
        Answer_Text: item.Answer_Text || '',
        Is_Correct: isCorrect,
        Auto_Score: autoScore,
        Saved_At: now
      });
    } else {
      appendRowObj(SHEETS.ANSWERS, {
        Answer_ID: generateId('ANS'),
        Attempt_ID: attemptId,
        Exam_Question_ID: item.Exam_Question_ID,
        Selected_Option_ID: item.Selected_Option_ID || '',
        Answer_Text: item.Answer_Text || '',
        Is_Correct: isCorrect,
        Auto_Score: autoScore,
        Manual_Score: 0,
        Lecturer_Feedback: '',
        Saved_At: now,
        Graded_At: '',
        Graded_By: ''
      });
    }
  });

  // Update Last_Sync_At on ATTEMPTS
  updateRowObj(SHEETS.ATTEMPTS, attempt.__rowIndex, {
    Last_Sync_At: now
  });

  return { status: 'success', savedAt: now, count: answers.length };
}

function studentRecordViolation(attemptId, event) {
  // event: { eventType: 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'PAGE_RELOAD', durationSeconds }
  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS);
  var attempt = attempts.find(function(a) { return a.Attempt_ID === attemptId; });
  if (!attempt) return { status: 'ignored' };

  var now = new Date();
  var nowIso = now.toISOString();

  // Check if there is an active LEAVE_EXAM permission
  var permissions = getRowsAsObjects(SHEETS.PERMISSIONS).filter(function(p) {
    return p.Attempt_ID === attemptId && (p.Is_Active === true || p.Is_Active === 'TRUE');
  });

  var isAuthorized = false;
  permissions.forEach(function(p) {
    var start = new Date(p.Starts_At).getTime();
    var exp = new Date(p.Expires_At).getTime();
    if (now.getTime() >= start && now.getTime() <= exp) {
      isAuthorized = true;
    }
  });

  var alarmStatus = isAuthorized ? 'MUTED' : 'ACTIVE';
  var violationId = generateId('VIO');

  appendRowObj(SHEETS.VIOLATIONS, {
    Violation_ID: violationId,
    Attempt_ID: attemptId,
    Event_Type: event.eventType || 'OTHER',
    Detected_At: nowIso,
    Duration_Seconds: Number(event.durationSeconds) || 0,
    Is_Authorized: isAuthorized,
    Alarm_Status: alarmStatus,
    Resolved_At: '',
    Resolved_By: '',
    Admin_Note: isAuthorized ? 'Izin resmi dosen/pengawas aktif' : ''
  });

  var currentViolations = Number(attempt.Violation_Count) || 0;
  updateRowObj(SHEETS.ATTEMPTS, attempt.__rowIndex, {
    Violation_Count: currentViolations + 1,
    Last_Sync_At: nowIso
  });

  return {
    status: 'recorded',
    violationId: violationId,
    alarmStatus: alarmStatus,
    isAuthorized: isAuthorized
  };
}

function studentSubmitExam(attemptId, clientSubmissionId) {
  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS);
  var attempt = attempts.find(function(a) { return a.Attempt_ID === attemptId; });
  if (!attempt) throw new Error('Attempt tidak ditemukan.');

  if (attempt.Status === 'SUBMITTED') {
    return { status: 'already_submitted', submittedAt: attempt.Submitted_At };
  }

  // Calculate total Objective_Score from ANSWERS
  var answers = getRowsAsObjects(SHEETS.ANSWERS).filter(function(a) {
    return a.Attempt_ID === attemptId;
  });

  var totalObjScore = 0;
  var totalEssayScore = 0;
  var hasEssay = false;

  answers.forEach(function(ans) {
    if (ans.Selected_Option_ID) {
      totalObjScore += Number(ans.Auto_Score) || 0;
    }
    if (ans.Answer_Text && !ans.Selected_Option_ID) {
      hasEssay = true;
      totalEssayScore += Number(ans.Manual_Score) || 0;
    }
  });

  var finalScore = hasEssay ? (totalObjScore + totalEssayScore) : totalObjScore;
  var now = new Date().toISOString();

  updateRowObj(SHEETS.ATTEMPTS, attempt.__rowIndex, {
    Status: 'SUBMITTED',
    Submitted_At: now,
    Objective_Score: totalObjScore,
    Essay_Score: totalEssayScore,
    Final_Score: finalScore,
    Client_Submission_ID: clientSubmissionId || generateId('SUB'),
    Last_Sync_At: now
  });

  return {
    status: 'SUBMITTED',
    submittedAt: now,
    objectiveScore: totalObjScore,
    hasEssay: hasEssay
  };
}
