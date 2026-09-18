/**
 * Auth.gs - Authentication for Admin and Student
 * Source of Truth: MASTER SPEC FR-01, FR-02, Section 8.4
 */

function adminLogin(credential) {
  if (!credential) {
    throw new Error('PIN atau credential admin wajib diisi.');
  }
  
  var pin = '123456';
  // Check settings
  var settings = getRowsAsObjects(SHEETS.SETTINGS);
  for (var i = 0; i < settings.length; i++) {
    if (settings[i].Setting_Key === 'ADMIN_PIN') {
      pin = String(settings[i].Setting_Value).trim();
      break;
    }
  }
  
  if (String(credential).trim() !== pin) {
    throw new Error('PIN Admin salah. Silakan periksa kembali.');
  }

  var token = 'ADM-SESSION-' + Utilities.getUuid();
  logAdminAction('ADMIN', 'LOGIN', 'AUTH', 'ADMIN', 'Admin berhasil login');
  
  return {
    success: true,
    token: token,
    role: 'ADMIN',
    name: 'Dosen / Admin Ujian'
  };
}

function studentLogin(nim, accessCode) {
  if (!nim || !accessCode) {
    throw new Error('NIM dan Kode Akses Ujian wajib diisi.');
  }
  
  var cleanNim = String(nim).trim();
  var cleanCode = String(accessCode).trim().toUpperCase();

  // Find User by NIM
  var users = getRowsAsObjects(SHEETS.USERS);
  var student = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].NIM).trim() === cleanNim) {
      student = users[i];
      break;
    }
  }

  // Auto-register student if testing or not yet in USERS list
  if (!student) {
    var now = new Date().toISOString();
    student = {
      User_ID: generateId('USR'),
      NIM: cleanNim,
      Full_Name: 'Mahasiswa ' + cleanNim,
      Email: cleanNim + '@student.kampus.ac.id',
      Class_Name: 'Kelas Reguler',
      Role: 'STUDENT',
      Is_Active: true,
      Created_At: now,
      Updated_At: now
    };
    appendRowObj(SHEETS.USERS, student);
  }

  if (student.Is_Active === false || student.Is_Active === 'FALSE') {
    throw new Error('Status akun mahasiswa tidak aktif. Silakan hubungi dosen/pengawas.');
  }

  // Find Exam Run by Access Code
  var runs = getRowsAsObjects(SHEETS.EXAM_RUNS);
  var targetRun = null;
  for (var j = 0; j < runs.length; j++) {
    if (String(runs[j].Access_Code).trim().toUpperCase() === cleanCode) {
      targetRun = runs[j];
      break;
    }
  }

  if (!targetRun) {
    throw new Error('Kode Akses Ujian tidak valid atau tidak ditemukan.');
  }

  if (targetRun.Status === 'CLOSED' || targetRun.Status === 'CANCELLED') {
    throw new Error('Sesi ujian (' + targetRun.Run_Name + ') berstatus ' + targetRun.Status + '. Anda tidak dapat masuk.');
  }

  // Find Exam details
  var exams = getRowsAsObjects(SHEETS.EXAMS);
  var exam = null;
  for (var k = 0; k < exams.length; k++) {
    if (exams[k].Exam_ID === targetRun.Exam_ID) {
      exam = exams[k];
      break;
    }
  }

  if (!exam) {
    throw new Error('Ujian induk tidak ditemukan untuk sesi ini.');
  }

  // Find existing attempt if any
  var attempts = getRowsAsObjects(SHEETS.ATTEMPTS);
  var existingAttempt = null;
  for (var a = 0; a < attempts.length; a++) {
    if (attempts[a].Run_ID === targetRun.Run_ID && attempts[a].Student_ID === student.User_ID) {
      existingAttempt = attempts[a];
      break;
    }
  }

  if (existingAttempt && (existingAttempt.Status === 'SUBMITTED' || existingAttempt.Status === 'TIMEOUT')) {
    throw new Error('Anda sudah menyelesaikan ujian ini (' + existingAttempt.Status + ' pada ' + existingAttempt.Submitted_At + '). Tidak dapat mengulang kembali.');
  }

  // Find course name
  var courses = getRowsAsObjects(SHEETS.COURSES);
  var courseName = '';
  for (var c = 0; c < courses.length; c++) {
    if (courses[c].Course_ID === exam.Course_ID) {
      courseName = courses[c].Course_Name;
      break;
    }
  }

  return {
    success: true,
    student: {
      userId: student.User_ID,
      nim: student.NIM,
      name: student.Full_Name,
      className: student.Class_Name
    },
    run: {
      runId: targetRun.Run_ID,
      runName: targetRun.Run_Name,
      className: targetRun.Class_Name,
      startAt: targetRun.Start_At,
      endAt: targetRun.End_At,
      status: targetRun.Status
    },
    exam: {
      examId: exam.Exam_ID,
      examName: exam.Exam_Name,
      courseName: courseName,
      durationMinutes: exam.Duration_Minutes,
      instructions: exam.Instructions,
      antiCheatEnabled: Boolean(exam.Anti_Cheat_Enabled === true || exam.Anti_Cheat_Enabled === 'TRUE'),
      fullscreenRequired: Boolean(exam.Fullscreen_Required === true || exam.Fullscreen_Required === 'TRUE')
    },
    hasExistingAttempt: !!existingAttempt,
    attemptId: existingAttempt ? existingAttempt.Attempt_ID : null
  };
}
