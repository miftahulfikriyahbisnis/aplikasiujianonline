/**
 * Monitoring.gs - Exam Monitoring, Anti-cheat Event Timeline, Alarm Control, and Permissions
 * Source of Truth: MASTER SPEC FR-21 to FR-23, Section 3.6, 9.2
 */

function adminGetMonitor(runId) {
  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS);
  if (runId) {
    attempts = attempts.filter(function(a) { return a.Run_ID === runId; });
  }

  var users = getRowsAsObjects(SHEETS.USERS);
  var userMap = {};
  users.forEach(function(u) { userMap[u.User_ID] = u; });

  var runs = getRowsAsObjects(SHEETS.EXAM_RUNS);
  var runMap = {};
  runs.forEach(function(r) { runMap[r.Run_ID] = r; });

  var allAnswers = getRowsAsObjects(SHEETS.ANSWERS);
  var allViolations = getRowsAsObjects(SHEETS.VIOLATIONS);
  var allPermissions = getRowsAsObjects(SHEETS.PERMISSIONS);
  var allExams = getRowsAsObjects(SHEETS.EXAMS);
  var allEq = getRowsAsObjects(SHEETS.EXAM_QUESTIONS);

  var now = new Date().getTime();

  return attempts.map(function(att) {
    var student = userMap[att.Student_ID] || {};
    var run = runMap[att.Run_ID] || {};
    var exam = allExams.find(function(e) { return e.Exam_ID === run.Exam_ID; }) || {};
    var totalQuestions = allEq.filter(function(q) { return q.Exam_ID === exam.Exam_ID; }).length;

    var studentAnswers = allAnswers.filter(function(a) {
      return a.Attempt_ID === att.Attempt_ID && (a.Selected_Option_ID || (a.Answer_Text && a.Answer_Text.trim().length > 0));
    });

    var studentViolations = allViolations.filter(function(v) { return v.Attempt_ID === att.Attempt_ID; });
    var hasActiveAlarm = studentViolations.some(function(v) { return v.Alarm_Status === 'ACTIVE'; });

    // Active permissions
    var activePermissions = allPermissions.filter(function(p) {
      if (p.Attempt_ID !== att.Attempt_ID) return false;
      var exp = new Date(p.Expires_At).getTime();
      return (p.Is_Active === true || p.Is_Active === 'TRUE') && exp > now;
    });

    return {
      Attempt_ID: att.Attempt_ID,
      Run_ID: att.Run_ID,
      Run_Name: run.Run_Name || '',
      Student_ID: student.User_ID || '',
      NIM: student.NIM || '',
      Full_Name: student.Full_Name || '',
      Class_Name: student.Class_Name || '',
      Total_Questions: totalQuestions,
      Answered_Count: studentAnswers.length,
      Started_At: att.Started_At,
      Last_Sync_At: att.Last_Sync_At,
      Status: att.Status,
      Violation_Count: Number(att.Violation_Count) || 0,
      Alarm_Status: hasActiveAlarm ? 'ACTIVE' : 'NORMAL',
      Active_Permissions: activePermissions,
      Violations: studentViolations
    };
  });
}

function adminGrantPermission(attemptId, type, expiryMinutes, reason) {
  // type: 'LEAVE_EXAM' or 'MUTE_ALARM'
  if (!attemptId || !type) throw new Error('Attempt ID dan tipe izin wajib diisi.');

  var now = new Date();
  var mins = Number(expiryMinutes) || 5;
  var expiresAt = new Date(now.getTime() + mins * 60 * 1000).toISOString();
  var permId = generateId('PERM');

  var permObj = {
    Permission_ID: permId,
    Attempt_ID: attemptId,
    Permission_Type: type,
    Starts_At: now.toISOString(),
    Expires_At: expiresAt,
    Reason: reason || 'Izin pengawas/dosen (' + mins + ' menit)',
    Granted_By: 'ADMIN',
    Is_Active: true,
    Created_At: now.toISOString()
  };

  appendRowObj(SHEETS.PERMISSIONS, permObj);

  // Mute any active alarms for this attempt
  var violations = getRowsAsObjects(SHEETS.VIOLATIONS).filter(function(v) {
    return v.Attempt_ID === attemptId && v.Alarm_Status === 'ACTIVE';
  });
  violations.forEach(function(v) {
    updateRowObj(SHEETS.VIOLATIONS, v.__rowIndex, {
      Alarm_Status: 'MUTED',
      Admin_Note: 'Alarm di-mute otomatis oleh izin ' + type
    });
  });

  logAdminAction('ADMIN', 'GRANT_PERMISSION', 'ATTEMPT', attemptId, 'Beri izin ' + type + ' durasi ' + mins + ' menit: ' + reason);
  return permObj;
}

function adminMuteOrResolveViolation(violationId, actionType, adminNote) {
  // actionType: 'MUTE' or 'RESOLVE'
  var violations = getRowsAsObjects(SHEETS.VIOLATIONS);
  var target = violations.find(function(v) { return v.Violation_ID === violationId; });
  if (!target) throw new Error('Pelanggaran tidak ditemukan.');

  var newStatus = actionType === 'RESOLVE' ? 'RESOLVED' : 'MUTED';
  var now = new Date().toISOString();

  updateRowObj(SHEETS.VIOLATIONS, target.__rowIndex, {
    Alarm_Status: newStatus,
    Resolved_At: now,
    Resolved_By: 'ADMIN',
    Admin_Note: adminNote || ('Admin melakukan ' + actionType)
  });

  logAdminAction('ADMIN', actionType + '_VIOLATION', 'VIOLATION', violationId, 'Pelanggaran diubah status ke ' + newStatus);
  return { Violation_ID: violationId, Alarm_Status: newStatus };
}
