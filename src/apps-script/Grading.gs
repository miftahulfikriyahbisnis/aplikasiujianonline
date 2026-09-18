/**
 * Grading.gs - Manual Essay Grading, Auto Recalculation, and Detailed Answer Viewer
 * Source of Truth: MASTER SPEC FR-20, FR-24, Section 3.7 & 5.5
 */

function adminGetEssayResponses(runId, examQuestionId) {
  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS).filter(function(a) { return a.Run_ID === runId; });
  var attemptIds = attempts.map(function(a) { return a.Attempt_ID; });

  var users = getRowsAsObjects(SHEETS.USERS);
  var userMap = {};
  users.forEach(function(u) { userMap[u.User_ID] = u; });

  var attemptMap = {};
  attempts.forEach(function(a) { attemptMap[a.Attempt_ID] = a; });

  var allAnswers = getRowsAsObjects(SHEETS.ANSWERS);
  var essayAnswers = allAnswers.filter(function(ans) {
    return attemptIds.indexOf(ans.Attempt_ID) !== -1 && !ans.Selected_Option_ID && (examQuestionId ? ans.Exam_Question_ID === examQuestionId : true);
  });

  var eqList = getRowsAsObjects(SHEETS.EXAM_QUESTIONS);
  var eqMap = {};
  eqList.forEach(function(eq) { eqMap[eq.Exam_Question_ID] = eq; });

  var versions = getRowsAsObjects(SHEETS.QUESTION_VERSIONS);
  var versionMap = {};
  versions.forEach(function(v) { versionMap[v.Version_ID] = v; });

  return essayAnswers.map(function(ans) {
    var att = attemptMap[ans.Attempt_ID] || {};
    var student = userMap[att.Student_ID] || {};
    var eq = eqMap[ans.Exam_Question_ID] || {};
    var ver = versionMap[eq.Version_ID] || {};

    return {
      Answer_ID: ans.Answer_ID,
      Attempt_ID: ans.Attempt_ID,
      Exam_Question_ID: ans.Exam_Question_ID,
      Question_Number: eq.Question_Number || 1,
      Question_Text: ver.Question_Text || '',
      Answer_Guide: ver.Answer_Guide || '',
      Max_Points: Number(eq.Points) || 10,
      Student_ID: student.User_ID || '',
      NIM: student.NIM || '',
      Student_Name: student.Full_Name || '',
      Answer_Text: ans.Answer_Text || '',
      Manual_Score: ans.Manual_Score !== '' ? Number(ans.Manual_Score) : null,
      Lecturer_Feedback: ans.Lecturer_Feedback || '',
      Graded_At: ans.Graded_At || '',
      Graded_By: ans.Graded_By || ''
    };
  });
}

function adminGradeEssay(answerId, manualScore, feedback, gradedBy) {
  var answers = getRowsAsObjects(SHEETS.ANSWERS);
  var targetAns = answers.find(function(a) { return a.Answer_ID === answerId; });
  if (!targetAns) throw new Error('Jawaban tidak ditemukan.');

  var eq = getRowsAsObjects(SHEETS.EXAM_QUESTIONS).find(function(q) { return q.Exam_Question_ID === targetAns.Exam_Question_ID; });
  var maxPoints = eq ? Number(eq.Points) : 100;

  var score = Number(manualScore);
  if (isNaN(score) || score < 0 || score > maxPoints) {
    throw new Error('Nilai harus berupa angka antara 0 dan ' + maxPoints);
  }

  var now = new Date().toISOString();
  updateRowObj(SHEETS.ANSWERS, targetAns.__rowIndex, {
    Manual_Score: score,
    Lecturer_Feedback: feedback || '',
    Graded_At: now,
    Graded_By: gradedBy || 'DOSEN'
  });

  // Recalculate Attempt Scores
  recalculateAttemptScore(targetAns.Attempt_ID);

  logAdminAction('ADMIN', 'GRADE_ESSAY', 'ANSWER', answerId, 'Beri nilai essay: ' + score + ' (Maks: ' + maxPoints + ')');
  return { Answer_ID: answerId, Manual_Score: score, Graded_At: now };
}

function recalculateAttemptScore(attemptId) {
  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS);
  var attempt = attempts.find(function(a) { return a.Attempt_ID === attemptId; });
  if (!attempt) return;

  var answers = getRowsAsObjects(SHEETS.ANSWERS).filter(function(a) { return a.Attempt_ID === attemptId; });

  var objScore = 0;
  var essayScore = 0;

  answers.forEach(function(ans) {
    if (ans.Selected_Option_ID) {
      objScore += Number(ans.Auto_Score) || 0;
    } else if (ans.Manual_Score !== undefined && ans.Manual_Score !== '') {
      essayScore += Number(ans.Manual_Score) || 0;
    }
  });

  var finalScore = objScore + essayScore;

  updateRowObj(SHEETS.ATTEMPTS, attempt.__rowIndex, {
    Objective_Score: objScore,
    Essay_Score: essayScore,
    Final_Score: finalScore
  });
}

function adminGetRunResults(runId) {
  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS).filter(function(a) { return a.Run_ID === runId; });
  var users = getRowsAsObjects(SHEETS.USERS);
  var userMap = {};
  users.forEach(function(u) { userMap[u.User_ID] = u; });

  var allAnswers = getRowsAsObjects(SHEETS.ANSWERS);

  return attempts.map(function(att) {
    var student = userMap[att.Student_ID] || {};
    var studentAnswers = allAnswers.filter(function(ans) { return ans.Attempt_ID === att.Attempt_ID; });

    // Check if there are ungraded essays
    var pendingEssay = false;
    studentAnswers.forEach(function(ans) {
      if (!ans.Selected_Option_ID && (ans.Manual_Score === '' || ans.Manual_Score === undefined || ans.Manual_Score === null)) {
        pendingEssay = true;
      }
    });

    var gradingStatus = pendingEssay ? 'PENDING_ESSAY' : 'COMPLETED';

    return {
      Attempt_ID: att.Attempt_ID,
      Run_ID: att.Run_ID,
      Student_ID: student.User_ID || '',
      NIM: student.NIM || '',
      Full_Name: student.Full_Name || '',
      Class_Name: student.Class_Name || '',
      Started_At: att.Started_At,
      Submitted_At: att.Submitted_At,
      Status: att.Status,
      Objective_Score: Number(att.Objective_Score) || 0,
      Essay_Score: Number(att.Essay_Score) || 0,
      Final_Score: Number(att.Final_Score) || 0,
      Grading_Status: gradingStatus,
      Violation_Count: Number(att.Violation_Count) || 0,
      Last_Sync_At: att.Last_Sync_At
    };
  });
}

function adminGetStudentAnswers(attemptId) {
  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS);
  var attempt = attempts.find(function(a) { return a.Attempt_ID === attemptId; });
  if (!attempt) throw new Error('Attempt tidak ditemukan.');

  var users = getRowsAsObjects(SHEETS.USERS);
  var student = users.find(function(u) { return u.User_ID === attempt.Student_ID; }) || {};

  var runs = getRowsAsObjects(SHEETS.EXAM_RUNS);
  var run = runs.find(function(r) { return r.Run_ID === attempt.Run_ID; }) || {};

  var exams = getRowsAsObjects(SHEETS.EXAMS);
  var exam = exams.find(function(e) { return e.Exam_ID === run.Exam_ID; }) || {};

  var eqList = getRowsAsObjects(SHEETS.EXAM_QUESTIONS).filter(function(q) { return q.Exam_ID === exam.Exam_ID; });
  eqList.sort(function(a, b) { return (Number(a.Question_Number) || 0) - (Number(b.Question_Number) || 0); });

  var versions = getRowsAsObjects(SHEETS.QUESTION_VERSIONS);
  var versionMap = {};
  versions.forEach(function(v) { versionMap[v.Version_ID] = v; });

  var questions = getRowsAsObjects(SHEETS.QUESTIONS);
  var questionMap = {};
  questions.forEach(function(q) { questionMap[q.Question_ID] = q; });

  var options = getRowsAsObjects(SHEETS.OPTIONS);
  var optionMap = {};
  var optionsByVersion = {};
  options.forEach(function(opt) {
    optionMap[opt.Option_ID] = opt;
    if (!optionsByVersion[opt.Version_ID]) optionsByVersion[opt.Version_ID] = [];
    optionsByVersion[opt.Version_ID].push(opt);
  });

  var answers = getRowsAsObjects(SHEETS.ANSWERS).filter(function(a) { return a.Attempt_ID === attemptId; });
  var answerMap = {};
  answers.forEach(function(a) { answerMap[a.Exam_Question_ID] = a; });

  var detailList = [];
  eqList.forEach(function(eq) {
    var ver = versionMap[eq.Version_ID] || {};
    var qMaster = questionMap[ver.Question_ID] || {};
    var ans = answerMap[eq.Exam_Question_ID];

    var selectedOpt = ans && ans.Selected_Option_ID ? optionMap[ans.Selected_Option_ID] : null;
    var rawOptions = optionsByVersion[ver.Version_ID] || [];
    var correctOpt = rawOptions.find(function(o) { return o.Is_Correct === true || o.Is_Correct === 'TRUE'; });

    detailList.push({
      Exam_Question_ID: eq.Exam_Question_ID,
      Question_Number: eq.Question_Number,
      Question_Type: qMaster.Question_Type,
      Question_Text: ver.Question_Text,
      Image_URL: ver.Image_URL || '',
      Max_Points: Number(eq.Points) || 0,
      Selected_Option_ID: ans ? ans.Selected_Option_ID : '',
      Selected_Option_Key: selectedOpt ? selectedOpt.Option_Key : '',
      Selected_Option_Text: selectedOpt ? selectedOpt.Option_Text : '',
      Correct_Option_Key: correctOpt ? correctOpt.Option_Key : '',
      Correct_Option_Text: correctOpt ? correctOpt.Option_Text : '',
      Is_Correct: ans ? Boolean(ans.Is_Correct) : false,
      Auto_Score: ans ? Number(ans.Auto_Score) || 0 : 0,
      Answer_Text: ans ? ans.Answer_Text : '',
      Answer_Guide: ver.Answer_Guide || '',
      Manual_Score: ans && ans.Manual_Score !== '' ? Number(ans.Manual_Score) : null,
      Lecturer_Feedback: ans ? ans.Lecturer_Feedback : '',
      Options: rawOptions
    });
  });

  return {
    student: {
      NIM: student.NIM,
      Full_Name: student.Full_Name,
      Class_Name: student.Class_Name
    },
    attempt: {
      Attempt_ID: attempt.Attempt_ID,
      Status: attempt.Status,
      Started_At: attempt.Started_At,
      Submitted_At: attempt.Submitted_At,
      Objective_Score: attempt.Objective_Score,
      Essay_Score: attempt.Essay_Score,
      Final_Score: attempt.Final_Score,
      Violation_Count: attempt.Violation_Count
    },
    questions: detailList
  };
}
