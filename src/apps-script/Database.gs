/**
 * Database.gs - Sheets Database Operations, ID Generation, and Initialization
 * Source of Truth: MASTER SPEC Section 7
 */

var SHEETS = {
  SETTINGS: 'SETTINGS',
  USERS: 'USERS',
  COURSES: 'COURSES',
  TOPICS: 'TOPICS',
  QUESTION_BANKS: 'QUESTION_BANKS',
  QUESTIONS: 'QUESTIONS',
  QUESTION_VERSIONS: 'QUESTION_VERSIONS',
  OPTIONS: 'OPTIONS',
  EXAMS: 'EXAMS',
  EXAM_QUESTIONS: 'EXAM_QUESTIONS',
  EXAM_RUNS: 'EXAM_RUNS',
  ATTEMPTS: 'ATTEMPTS',
  ANSWERS: 'ANSWERS',
  VIOLATIONS: 'VIOLATIONS',
  PERMISSIONS: 'PERMISSIONS',
  ADMIN_LOGS: 'ADMIN_LOGS',
  DASHBOARD: 'DASHBOARD'
};

var HEADERS = {
  SETTINGS: ['Setting_Key', 'Setting_Value', 'Description', 'Updated_At'],
  USERS: ['User_ID', 'NIM', 'Full_Name', 'Email', 'Class_Name', 'Role', 'Is_Active', 'Created_At', 'Updated_At'],
  COURSES: ['Course_ID', 'Course_Code', 'Course_Name', 'Description', 'Status', 'Created_At', 'Updated_At'],
  TOPICS: ['Topic_ID', 'Course_ID', 'Topic_Name', 'Description', 'Sort_Order', 'Status', 'Created_At', 'Updated_At'],
  QUESTION_BANKS: ['Bank_ID', 'Course_ID', 'Bank_Name', 'Description', 'Status', 'Created_By', 'Created_At', 'Updated_At'],
  QUESTIONS: ['Question_ID', 'Bank_ID', 'Topic_ID', 'Question_Type', 'Difficulty', 'Status', 'Current_Version_ID', 'Created_By', 'Created_At', 'Updated_At'],
  QUESTION_VERSIONS: ['Version_ID', 'Question_ID', 'Version_Number', 'Question_Text', 'Image_URL', 'Default_Points', 'Answer_Guide', 'Explanation', 'Created_By', 'Created_At'],
  OPTIONS: ['Option_ID', 'Version_ID', 'Option_Key', 'Option_Text', 'Is_Correct', 'Sort_Order'],
  EXAMS: ['Exam_ID', 'Course_ID', 'Exam_Name', 'Instructions', 'Duration_Minutes', 'Shuffle_Questions', 'Shuffle_Options', 'Anti_Cheat_Enabled', 'Fullscreen_Required', 'Response_Retention_Days', 'Status', 'Created_By', 'Created_At', 'Updated_At'],
  EXAM_QUESTIONS: ['Exam_Question_ID', 'Exam_ID', 'Version_ID', 'Question_Number', 'Points', 'Is_Required'],
  EXAM_RUNS: ['Run_ID', 'Exam_ID', 'Run_Name', 'Class_Name', 'Start_At', 'End_At', 'Access_Code', 'Status', 'Response_Retention_Days', 'Delete_After', 'Data_Status', 'Created_By', 'Created_At', 'Closed_At', 'Reset_At'],
  ATTEMPTS: ['Attempt_ID', 'Run_ID', 'Student_ID', 'Started_At', 'Submitted_At', 'Expires_At', 'Status', 'Objective_Score', 'Essay_Score', 'Final_Score', 'Violation_Count', 'Last_Sync_At', 'Client_Submission_ID'],
  ANSWERS: ['Answer_ID', 'Attempt_ID', 'Exam_Question_ID', 'Selected_Option_ID', 'Answer_Text', 'Is_Correct', 'Auto_Score', 'Manual_Score', 'Lecturer_Feedback', 'Saved_At', 'Graded_At', 'Graded_By'],
  VIOLATIONS: ['Violation_ID', 'Attempt_ID', 'Event_Type', 'Detected_At', 'Duration_Seconds', 'Is_Authorized', 'Alarm_Status', 'Resolved_At', 'Resolved_By', 'Admin_Note'],
  PERMISSIONS: ['Permission_ID', 'Attempt_ID', 'Permission_Type', 'Starts_At', 'Expires_At', 'Reason', 'Granted_By', 'Is_Active', 'Created_At'],
  ADMIN_LOGS: ['Log_ID', 'Admin_ID', 'Action_Type', 'Target_Type', 'Target_ID', 'Details', 'Created_At']
};

function getDbSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(sheetName) {
  var ss = getDbSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (HEADERS[sheetName]) {
      sheet.appendRow(HEADERS[sheetName]);
      sheet.getRange(1, 1, 1, HEADERS[sheetName].length).setFontWeight('bold');
    }
  }
  return sheet;
}

function getRowsAsObjects(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = data[i][j];
    }
    rowObj.__rowIndex = i + 1;
    rows.push(rowObj);
  }
  return rows;
}

function appendRowObj(sheetName, obj) {
  var sheet = getSheet(sheetName);
  var headers = HEADERS[sheetName] || sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var val = obj[headers[i]];
    row.push(val !== undefined ? val : '');
  }
  sheet.appendRow(row);
  return obj;
}

function updateRowObj(sheetName, rowIndex, obj) {
  var sheet = getSheet(sheetName);
  var headers = HEADERS[sheetName] || sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    if (obj[key] !== undefined) {
      sheet.getRange(rowIndex, i + 1).setValue(obj[key]);
    }
  }
}

function deleteRowsByIndices(sheetName, rowIndices) {
  if (!rowIndices || rowIndices.length === 0) return 0;
  var sheet = getSheet(sheetName);
  // Sort descending to delete from bottom up
  rowIndices.sort(function(a, b) { return b - a; });
  for (var i = 0; i < rowIndices.length; i++) {
    sheet.deleteRow(rowIndices[i]);
  }
  return rowIndices.length;
}

function generateId(prefix) {
  var now = new Date();
  var randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return prefix + '-' + Utilities.formatDate(now, 'Asia/Jakarta', 'yyyyMMdd-HHmmss') + '-' + randomStr;
}

function checkDatabaseConnection() {
  var ss = getDbSpreadsheet();
  var sheetNames = ss.getSheets().map(function(s) { return s.getName(); });
  var missing = [];
  for (var k in SHEETS) {
    if (SHEETS.hasOwnProperty(k) && sheetNames.indexOf(SHEETS[k]) === -1) {
      missing.push(SHEETS[k]);
    }
  }
  return {
    connected: true,
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    totalSheets: sheetNames.length,
    missingSheets: missing,
    timestamp: new Date().toISOString()
  };
}

function logAdminAction(adminId, actionType, targetType, targetId, details) {
  try {
    appendRowObj(SHEETS.ADMIN_LOGS, {
      Log_ID: generateId('LOG'),
      Admin_ID: adminId || 'ADMIN',
      Action_Type: actionType,
      Target_Type: targetType,
      Target_ID: targetId,
      Details: typeof details === 'string' ? details : JSON.stringify(details),
      Created_At: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to log admin action: ' + e);
  }
}

/**
 * Inisialisasi Database Google Sheets lengkap dengan 4 Mata Kuliah Awal
 */
function initDatabaseSetup() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    for (var k in HEADERS) {
      if (HEADERS.hasOwnProperty(k)) {
        getSheet(k);
      }
    }
    
    // Seed initial Courses if not exists
    var courses = getRowsAsObjects(SHEETS.COURSES);
    var now = new Date().toISOString();
    if (courses.length === 0) {
      var initialCourses = [
        { Course_ID: 'CRS001', Course_Code: 'BIOKIM', Course_Name: 'Biokimia', Description: 'Mata Kuliah Wajib Biokimia', Status: 'ACTIVE', Created_At: now, Updated_At: now },
        { Course_ID: 'CRS002', Course_Code: 'IPK', Course_Name: 'Inovasi Pembelajaran Kimia', Description: 'Mata Kuliah Pedagogik & Inovasi Kimia', Status: 'ACTIVE', Created_At: now, Updated_At: now },
        { Course_ID: 'CRS003', Course_Code: 'TLAB', Course_Name: 'Teknik Laboratorium', Description: 'Keselamatan Kerja dan Instrumen Laboratorium', Status: 'ACTIVE', Created_At: now, Updated_At: now },
        { Course_ID: 'CRS004', Course_Code: 'KDBIO', Course_Name: 'Kimia Dasar untuk Biologi', Description: 'Konsep Kimia Dasar Mahasiswa Biologi', Status: 'ACTIVE', Created_At: now, Updated_At: now }
      ];
      initialCourses.forEach(function(c) {
        appendRowObj(SHEETS.COURSES, c);
      });
    }

    // Seed default settings
    var settings = getRowsAsObjects(SHEETS.SETTINGS);
    if (settings.length === 0) {
      var initialSettings = [
        { Setting_Key: 'ADMIN_PIN', Setting_Value: '123456', Description: 'PIN masuk dashboard admin', Updated_At: now },
        { Setting_Key: 'DEFAULT_DURATION_MINUTES', Setting_Value: '60', Description: 'Durasi ujian default (menit)', Updated_At: now },
        { Setting_Key: 'DEFAULT_RETENTION_DAYS', Setting_Value: '14', Description: 'Masa simpan respons default (hari)', Updated_At: now },
        { Setting_Key: 'AUTOSAVE_INTERVAL_SECONDS', Setting_Value: '25', Description: 'Interval autosave batch frontend (detik)', Updated_At: now },
        { Setting_Key: 'ANTI_CHEAT_ENABLED', Setting_Value: 'true', Description: 'Aktifkan deteksi tab/window blur', Updated_At: now },
        { Setting_Key: 'FULLSCREEN_REQUIRED', Setting_Value: 'true', Description: 'Wajibkan fullscreen saat ujian', Updated_At: now }
      ];
      initialSettings.forEach(function(s) {
        appendRowObj(SHEETS.SETTINGS, s);
      });
    }

    return { status: 'success', message: 'Inisialisasi database dan sheet selesai' };
  } finally {
    lock.releaseLock();
  }
}
