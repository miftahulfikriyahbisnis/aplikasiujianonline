/**
 * CoursesTopics.gs - CRUD for Courses, Topics, and Question Banks
 * Source of Truth: MASTER SPEC FR-03, FR-04, FR-05
 */

function getCourses() {
  var rows = getRowsAsObjects(SHEETS.COURSES);
  return rows.map(function(r) {
    return {
      Course_ID: r.Course_ID,
      Course_Code: r.Course_Code,
      Course_Name: r.Course_Name,
      Description: r.Description,
      Status: r.Status || 'ACTIVE',
      Created_At: r.Created_At,
      Updated_At: r.Updated_At
    };
  });
}

function adminAddCourse(data) {
  if (!data.Course_Name || !data.Course_Code) {
    throw new Error('Kode dan Nama Mata Kuliah wajib diisi.');
  }

  var now = new Date().toISOString();
  var courseId = data.Course_ID || generateId('CRS');
  var newCourse = {
    Course_ID: courseId,
    Course_Code: String(data.Course_Code).trim().toUpperCase(),
    Course_Name: String(data.Course_Name).trim(),
    Description: data.Description || '',
    Status: data.Status || 'ACTIVE',
    Created_At: now,
    Updated_At: now
  };

  appendRowObj(SHEETS.COURSES, newCourse);
  logAdminAction('ADMIN', 'CREATE', 'COURSE', courseId, 'Tambah mata kuliah: ' + newCourse.Course_Name);
  return newCourse;
}

function getTopics(courseId) {
  var rows = getRowsAsObjects(SHEETS.TOPICS);
  if (courseId) {
    rows = rows.filter(function(r) { return r.Course_ID === courseId; });
  }
  rows.sort(function(a, b) {
    return (Number(a.Sort_Order) || 0) - (Number(b.Sort_Order) || 0);
  });
  return rows;
}

function adminAddTopic(data) {
  if (!data.Course_ID || !data.Topic_Name) {
    throw new Error('Mata Kuliah dan Nama Materi wajib diisi.');
  }

  var now = new Date().toISOString();
  var topicId = generateId('TPC');
  var newTopic = {
    Topic_ID: topicId,
    Course_ID: data.Course_ID,
    Topic_Name: String(data.Topic_Name).trim(),
    Description: data.Description || '',
    Sort_Order: Number(data.Sort_Order) || 1,
    Status: data.Status || 'ACTIVE',
    Created_At: now,
    Updated_At: now
  };

  appendRowObj(SHEETS.TOPICS, newTopic);
  logAdminAction('ADMIN', 'CREATE', 'TOPIC', topicId, 'Tambah materi: ' + newTopic.Topic_Name);
  return newTopic;
}

function getQuestionBanks(courseId) {
  var rows = getRowsAsObjects(SHEETS.QUESTION_BANKS);
  if (courseId) {
    rows = rows.filter(function(r) { return r.Course_ID === courseId; });
  }
  return rows;
}

function adminAddQuestionBank(data) {
  if (!data.Course_ID || !data.Bank_Name) {
    throw new Error('Mata Kuliah dan Nama Bank Soal wajib diisi.');
  }

  var now = new Date().toISOString();
  var bankId = generateId('BNK');
  var newBank = {
    Bank_ID: bankId,
    Course_ID: data.Course_ID,
    Bank_Name: String(data.Bank_Name).trim(),
    Description: data.Description || '',
    Status: data.Status || 'ACTIVE',
    Created_By: data.Created_By || 'ADMIN',
    Created_At: now,
    Updated_At: now
  };

  appendRowObj(SHEETS.QUESTION_BANKS, newBank);
  logAdminAction('ADMIN', 'CREATE', 'QUESTION_BANK', bankId, 'Tambah bank soal: ' + newBank.Bank_Name);
  return newBank;
}
