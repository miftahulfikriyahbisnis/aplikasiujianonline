/**
 * Questions.gs - Question Bank, MCQ, Essay, Versioning, Duplication, and Archiving
 * Source of Truth: MASTER SPEC FR-06 to FR-10, Sections 5.1 & 7.2
 */

function getQuestions(filter) {
  var questions = getRowsAsObjects(SHEETS.QUESTIONS);
  var versions = getRowsAsObjects(SHEETS.QUESTION_VERSIONS);
  var options = getRowsAsObjects(SHEETS.OPTIONS);
  var topics = getRowsAsObjects(SHEETS.TOPICS);
  var banks = getRowsAsObjects(SHEETS.QUESTION_BANKS);
  var courses = getRowsAsObjects(SHEETS.COURSES);

  filter = filter || {};

  // Map versions and options
  var versionMap = {};
  versions.forEach(function(v) {
    versionMap[v.Version_ID] = v;
  });

  var optionsMap = {};
  options.forEach(function(opt) {
    if (!optionsMap[opt.Version_ID]) optionsMap[opt.Version_ID] = [];
    optionsMap[opt.Version_ID].push(opt);
  });

  var topicMap = {};
  topics.forEach(function(t) { topicMap[t.Topic_ID] = t; });

  var bankMap = {};
  banks.forEach(function(b) { bankMap[b.Bank_ID] = b; });

  var courseMap = {};
  courses.forEach(function(c) { courseMap[c.Course_ID] = c; });

  var results = [];
  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    var currentVer = versionMap[q.Current_Version_ID] || {};
    var bank = bankMap[q.Bank_ID] || {};
    var topic = topicMap[q.Topic_ID] || {};
    var course = courseMap[bank.Course_ID || topic.Course_ID] || {};

    // Filters
    if (filter.status && q.Status !== filter.status) continue;
    if (filter.courseId && course.Course_ID !== filter.courseId) continue;
    if (filter.bankId && q.Bank_ID !== filter.bankId) continue;
    if (filter.topicId && q.Topic_ID !== filter.topicId) continue;
    if (filter.questionType && q.Question_Type !== filter.questionType) continue;
    if (filter.difficulty && q.Difficulty !== filter.difficulty) continue;
    if (filter.search) {
      var s = filter.search.toLowerCase();
      var txt = (currentVer.Question_Text || '').toLowerCase();
      if (txt.indexOf(s) === -1) continue;
    }

    var qOptions = optionsMap[q.Current_Version_ID] || [];
    qOptions.sort(function(a, b) { return (Number(a.Sort_Order) || 0) - (Number(b.Sort_Order) || 0); });

    // Find all version history for this question
    var allVersions = versions.filter(function(v) { return v.Question_ID === q.Question_ID; });
    allVersions.sort(function(a, b) { return Number(b.Version_Number) - Number(a.Version_Number); });

    results.push({
      Question_ID: q.Question_ID,
      Bank_ID: q.Bank_ID,
      Bank_Name: bank.Bank_Name || '',
      Course_ID: course.Course_ID || '',
      Course_Name: course.Course_Name || '',
      Topic_ID: q.Topic_ID,
      Topic_Name: topic.Topic_Name || '',
      Question_Type: q.Question_Type,
      Difficulty: q.Difficulty,
      Status: q.Status,
      Current_Version_ID: q.Current_Version_ID,
      Version_Number: currentVer.Version_Number || 1,
      Question_Text: currentVer.Question_Text || '',
      Image_URL: currentVer.Image_URL || '',
      Default_Points: Number(currentVer.Default_Points) || 0,
      Answer_Guide: currentVer.Answer_Guide || '',
      Explanation: currentVer.Explanation || '',
      Options: qOptions,
      Versions: allVersions,
      Created_At: q.Created_At,
      Updated_At: q.Updated_At
    });
  }

  return results;
}

function adminCreateMCQ(payload) {
  if (!payload.Bank_ID || !payload.Question_Text || !payload.Options) {
    throw new Error('Bank soal, teks pertanyaan, dan opsi pilihan ganda wajib diisi.');
  }

  var now = new Date().toISOString();
  var questionId = generateId('Q');
  var versionId = generateId('QV');

  var questionObj = {
    Question_ID: questionId,
    Bank_ID: payload.Bank_ID,
    Topic_ID: payload.Topic_ID || '',
    Question_Type: 'MCQ',
    Difficulty: payload.Difficulty || 'MEDIUM',
    Status: 'ACTIVE',
    Current_Version_ID: versionId,
    Created_By: payload.Created_By || 'ADMIN',
    Created_At: now,
    Updated_At: now
  };

  var versionObj = {
    Version_ID: versionId,
    Question_ID: questionId,
    Version_Number: 1,
    Question_Text: payload.Question_Text,
    Image_URL: payload.Image_URL || '',
    Default_Points: Number(payload.Default_Points) || 2,
    Answer_Guide: '',
    Explanation: payload.Explanation || '',
    Created_By: payload.Created_By || 'ADMIN',
    Created_At: now
  };

  appendRowObj(SHEETS.QUESTIONS, questionObj);
  appendRowObj(SHEETS.QUESTION_VERSIONS, versionObj);

  // Append Options (A-D required, E optional)
  var options = payload.Options; // Array of { Option_Key, Option_Text, Is_Correct }
  options.forEach(function(opt, idx) {
    appendRowObj(SHEETS.OPTIONS, {
      Option_ID: generateId('OPT'),
      Version_ID: versionId,
      Option_Key: opt.Option_Key,
      Option_Text: opt.Option_Text,
      Is_Correct: Boolean(opt.Is_Correct === true || opt.Is_Correct === 'true'),
      Sort_Order: idx + 1
    });
  });

  logAdminAction('ADMIN', 'CREATE_MCQ', 'QUESTION', questionId, 'Tambah soal pilihan ganda');
  return { Question_ID: questionId, Version_ID: versionId };
}

function adminCreateEssay(payload) {
  if (!payload.Bank_ID || !payload.Question_Text) {
    throw new Error('Bank soal dan teks pertanyaan essay wajib diisi.');
  }

  var now = new Date().toISOString();
  var questionId = generateId('Q');
  var versionId = generateId('QV');

  var questionObj = {
    Question_ID: questionId,
    Bank_ID: payload.Bank_ID,
    Topic_ID: payload.Topic_ID || '',
    Question_Type: 'ESSAY',
    Difficulty: payload.Difficulty || 'MEDIUM',
    Status: 'ACTIVE',
    Current_Version_ID: versionId,
    Created_By: payload.Created_By || 'ADMIN',
    Created_At: now,
    Updated_At: now
  };

  var versionObj = {
    Version_ID: versionId,
    Question_ID: questionId,
    Version_Number: 1,
    Question_Text: payload.Question_Text,
    Image_URL: payload.Image_URL || '',
    Default_Points: Number(payload.Default_Points) || 10,
    Answer_Guide: payload.Answer_Guide || '',
    Explanation: payload.Explanation || '',
    Created_By: payload.Created_By || 'ADMIN',
    Created_At: now
  };

  appendRowObj(SHEETS.QUESTIONS, questionObj);
  appendRowObj(SHEETS.QUESTION_VERSIONS, versionObj);

  logAdminAction('ADMIN', 'CREATE_ESSAY', 'QUESTION', questionId, 'Tambah soal essay');
  return { Question_ID: questionId, Version_ID: versionId };
}

function adminCreateQuestionVersion(questionId, changes) {
  // Minor revision: create new version, increment version number, preserve old exam references
  var questions = getRowsAsObjects(SHEETS.QUESTIONS);
  var questionRow = null;
  for (var i = 0; i < questions.length; i++) {
    if (questions[i].Question_ID === questionId) {
      questionRow = questions[i];
      break;
    }
  }
  if (!questionRow) throw new Error('Soal dengan ID ' + questionId + ' tidak ditemukan.');

  var versions = getRowsAsObjects(SHEETS.QUESTION_VERSIONS);
  var currentVersionNumber = 1;
  for (var v = 0; v < versions.length; v++) {
    if (versions[v].Question_ID === questionId) {
      var num = Number(versions[v].Version_Number) || 1;
      if (num > currentVersionNumber) currentVersionNumber = num;
    }
  }

  var newVersionNumber = currentVersionNumber + 1;
  var newVersionId = generateId('QV');
  var now = new Date().toISOString();

  var newVersionObj = {
    Version_ID: newVersionId,
    Question_ID: questionId,
    Version_Number: newVersionNumber,
    Question_Text: changes.Question_Text,
    Image_URL: changes.Image_URL || '',
    Default_Points: Number(changes.Default_Points) || 2,
    Answer_Guide: changes.Answer_Guide || '',
    Explanation: changes.Explanation || '',
    Created_By: changes.Created_By || 'ADMIN',
    Created_At: now
  };

  appendRowObj(SHEETS.QUESTION_VERSIONS, newVersionObj);

  // If MCQ, copy or update options
  if (changes.Options && changes.Options.length > 0) {
    changes.Options.forEach(function(opt, idx) {
      appendRowObj(SHEETS.OPTIONS, {
        Option_ID: generateId('OPT'),
        Version_ID: newVersionId,
        Option_Key: opt.Option_Key,
        Option_Text: opt.Option_Text,
        Is_Correct: Boolean(opt.Is_Correct === true || opt.Is_Correct === 'true'),
        Sort_Order: idx + 1
      });
    });
  }

  // Update QUESTIONS row to point to new Current_Version_ID
  updateRowObj(SHEETS.QUESTIONS, questionRow.__rowIndex, {
    Current_Version_ID: newVersionId,
    Updated_At: now
  });

  logAdminAction('ADMIN', 'NEW_VERSION', 'QUESTION', questionId, 'Revisi redaksi membuat versi ' + newVersionNumber);
  return { Version_ID: newVersionId, Version_Number: newVersionNumber };
}

function adminDuplicateQuestion(questionId) {
  // Substantive change: Duplicate to new Question_ID + Version_ID
  var questions = getRowsAsObjects(SHEETS.QUESTIONS);
  var targetQ = questions.find(function(q) { return q.Question_ID === questionId; });
  if (!targetQ) throw new Error('Soal tidak ditemukan.');

  var versions = getRowsAsObjects(SHEETS.QUESTION_VERSIONS);
  var targetV = versions.find(function(v) { return v.Version_ID === targetQ.Current_Version_ID; });
  if (!targetV) throw new Error('Versi soal tidak ditemukan.');

  var options = getRowsAsObjects(SHEETS.OPTIONS).filter(function(o) { return o.Version_ID === targetV.Version_ID; });

  var now = new Date().toISOString();
  var newQId = generateId('Q');
  var newVId = generateId('QV');

  appendRowObj(SHEETS.QUESTIONS, {
    Question_ID: newQId,
    Bank_ID: targetQ.Bank_ID,
    Topic_ID: targetQ.Topic_ID,
    Question_Type: targetQ.Question_Type,
    Difficulty: targetQ.Difficulty,
    Status: 'ACTIVE',
    Current_Version_ID: newVId,
    Created_By: 'ADMIN',
    Created_At: now,
    Updated_At: now
  });

  appendRowObj(SHEETS.QUESTION_VERSIONS, {
    Version_ID: newVId,
    Question_ID: newQId,
    Version_Number: 1,
    Question_Text: targetV.Question_Text + ' (Salinan)',
    Image_URL: targetV.Image_URL,
    Default_Points: targetV.Default_Points,
    Answer_Guide: targetV.Answer_Guide,
    Explanation: targetV.Explanation,
    Created_By: 'ADMIN',
    Created_At: now
  });

  options.forEach(function(o) {
    appendRowObj(SHEETS.OPTIONS, {
      Option_ID: generateId('OPT'),
      Version_ID: newVId,
      Option_Key: o.Option_Key,
      Option_Text: o.Option_Text,
      Is_Correct: o.Is_Correct,
      Sort_Order: o.Sort_Order
    });
  });

  logAdminAction('ADMIN', 'DUPLICATE', 'QUESTION', newQId, 'Duplikasi dari ' + questionId);
  return { Question_ID: newQId, Version_ID: newVId };
}

function adminArchiveQuestion(questionId) {
  var questions = getRowsAsObjects(SHEETS.QUESTIONS);
  var target = questions.find(function(q) { return q.Question_ID === questionId; });
  if (!target) throw new Error('Soal tidak ditemukan.');

  var newStatus = target.Status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
  updateRowObj(SHEETS.QUESTIONS, target.__rowIndex, {
    Status: newStatus,
    Updated_At: new Date().toISOString()
  });

  logAdminAction('ADMIN', 'ARCHIVE_TOGGLE', 'QUESTION', questionId, 'Status diubah ke ' + newStatus);
  return { Question_ID: questionId, Status: newStatus };
}
