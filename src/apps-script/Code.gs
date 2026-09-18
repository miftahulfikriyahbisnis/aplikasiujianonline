/**
 * Code.gs - Entry point for Google Apps Script Web App and Container-bound Spreadsheet
 * Platform: Google Apps Script Web App (HTML Service) + REST API dispatcher
 */

function doGet(e) {
  // Check if called as an API endpoint (e.g. ping/status)
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e.parameter.action, e.parameter);
  }
  
  // Serve the Web App HTML interface
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Aplikasi Ujian Online Mahasiswa')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
    var action = data.action || (e.parameter ? e.parameter.action : null);
    var payload = data.payload || {};
    return handleApiRequest(action, payload);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleApiRequest(action, payload) {
  try {
    var result;
    switch (action) {
      case 'ping':
      case 'checkDb':
        result = checkDatabaseConnection();
        break;
      // Auth
      case 'adminLogin':
        result = adminLogin(payload.credential);
        break;
      case 'studentLogin':
        result = studentLogin(payload.nim, payload.accessCode);
        break;
      // Courses & Topics
      case 'getCourses':
        result = getCourses();
        break;
      case 'adminAddCourse':
        result = adminAddCourse(payload);
        break;
      case 'getTopics':
        result = getTopics(payload.courseId);
        break;
      case 'adminAddTopic':
        result = adminAddTopic(payload);
        break;
      case 'getQuestionBanks':
        result = getQuestionBanks(payload.courseId);
        break;
      case 'adminAddQuestionBank':
        result = adminAddQuestionBank(payload);
        break;
      // Questions
      case 'getQuestions':
        result = getQuestions(payload);
        break;
      case 'adminCreateMCQ':
        result = adminCreateMCQ(payload);
        break;
      case 'adminCreateEssay':
        result = adminCreateEssay(payload);
        break;
      case 'adminCreateQuestionVersion':
        result = adminCreateQuestionVersion(payload.questionId, payload.changes);
        break;
      case 'adminDuplicateQuestion':
        result = adminDuplicateQuestion(payload.questionId);
        break;
      case 'adminArchiveQuestion':
        result = adminArchiveQuestion(payload.questionId);
        break;
      // Exams & Runs
      case 'getExams':
        result = getExams(payload);
        break;
      case 'adminCreateExam':
        result = adminCreateExam(payload);
        break;
      case 'adminSetExamQuestions':
        result = adminSetExamQuestions(payload.examId, payload.questions);
        break;
      case 'adminPublishExam':
        result = adminPublishExam(payload.examId);
        break;
      case 'getExamRuns':
        result = getExamRuns(payload.examId);
        break;
      case 'adminCreateRun':
        result = adminCreateRun(payload);
        break;
      case 'adminUpdateRunStatus':
        result = adminUpdateRunStatus(payload.runId, payload.status);
        break;
      // Student Exam Flow
      case 'studentStartAttempt':
        result = studentStartAttempt(payload.nim, payload.accessCode);
        break;
      case 'studentBatchSaveAnswers':
        result = studentBatchSaveAnswers(payload.attemptId, payload.answers);
        break;
      case 'studentRecordViolation':
        result = studentRecordViolation(payload.attemptId, payload.event);
        break;
      case 'studentSubmitExam':
        result = studentSubmitExam(payload.attemptId, payload.clientSubmissionId);
        break;
      // Monitoring
      case 'adminGetMonitor':
        result = adminGetMonitor(payload.runId);
        break;
      case 'adminGrantPermission':
        result = adminGrantPermission(payload.attemptId, payload.type, payload.expiryMinutes, payload.reason);
        break;
      case 'adminMuteOrResolveViolation':
        result = adminMuteOrResolveViolation(payload.violationId, payload.actionType, payload.adminNote);
        break;
      // Grading & Results
      case 'adminGetEssayResponses':
        result = adminGetEssayResponses(payload.runId, payload.examQuestionId);
        break;
      case 'adminGradeEssay':
        result = adminGradeEssay(payload.answerId, payload.manualScore, payload.feedback, payload.gradedBy);
        break;
      case 'adminGetRunResults':
        result = adminGetRunResults(payload.runId);
        break;
      case 'adminGetStudentAnswers':
        result = adminGetStudentAnswers(payload.attemptId);
        break;
      // Export & Reset
      case 'adminExportRunXlsx':
        result = adminExportRunXlsx(payload.runId);
        break;
      case 'adminResetRunResponses':
        result = adminResetRunResponses(payload.runId, payload.confirmation);
        break;
      // Dashboard & Settings
      case 'getDashboardStats':
        result = getDashboardStats();
        break;
      case 'getSettings':
        result = getSettings();
        break;
      case 'updateSetting':
        result = updateSetting(payload.key, payload.value);
        break;
      default:
        throw new Error('Action tidak dikenali: ' + action);
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: result
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.message || err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Menu Spreadsheet container-bound
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('EXAM ADMIN')
    .addItem('Buka Dashboard Admin Web', 'openAdminWebApp')
    .addSeparator()
    .addItem('Inisialisasi Header & Data Awal', 'initDatabaseSetup')
    .addToUi();
}

function openAdminWebApp() {
  var url = ScriptApp.getService().getUrl();
  var html = HtmlService.createHtmlOutput('<script>window.open("' + url + '");google.script.host.close();</script>')
    .setWidth(300).setHeight(100);
  SpreadsheetApp.getUi().showModalDialog(html, 'Membuka Web App...');
}
