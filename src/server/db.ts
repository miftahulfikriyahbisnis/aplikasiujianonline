/**
 * Server-side Database Manager
 * Implements the exact schema and business logic of the 16 Google Sheets tables
 * Source of Truth: MASTER SPEC Section 7 & 8
 */

import fs from 'fs';
import path from 'path';
import type {
  CourseItem,
  TopicItem,
  QuestionBankItem,
  QuestionItem,
  QuestionVersionItem,
  OptionItem,
  ExamItem,
  ExamQuestionItem,
  ExamRunItem,
  AttemptItem,
  AnswerItem,
  ViolationItem,
  PermissionItem,
  AdminLogItem,
  SettingItem,
  UserItem,
  StudentExamSession,
  StudentQuestionPayload
} from '../types/index.ts';

export interface DatabaseState {
  SETTINGS: SettingItem[];
  USERS: UserItem[];
  COURSES: CourseItem[];
  TOPICS: TopicItem[];
  QUESTION_BANKS: QuestionBankItem[];
  QUESTIONS: QuestionItem[];
  QUESTION_VERSIONS: QuestionVersionItem[];
  OPTIONS: OptionItem[];
  EXAMS: ExamItem[];
  EXAM_QUESTIONS: ExamQuestionItem[];
  EXAM_RUNS: ExamRunItem[];
  ATTEMPTS: AttemptItem[];
  ANSWERS: AnswerItem[];
  VIOLATIONS: ViolationItem[];
  PERMISSIONS: PermissionItem[];
  ADMIN_LOGS: AdminLogItem[];
}

const DB_FILE = path.join(process.cwd(), 'database_sheets_store.json');

export class DatabaseService {
  private data: DatabaseState;

  constructor() {
    this.data = this.loadInitialData();
  }

  private loadInitialData(): DatabaseState {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error reading database file, creating fresh:', e);
      }
    }

    const now = new Date().toISOString();
    const initial: DatabaseState = {
      SETTINGS: [
        { Setting_Key: 'ADMIN_PIN', Setting_Value: '123456', Description: 'PIN masuk dashboard admin', Updated_At: now },
        { Setting_Key: 'DEFAULT_DURATION_MINUTES', Setting_Value: '60', Description: 'Durasi ujian default (menit)', Updated_At: now },
        { Setting_Key: 'DEFAULT_RETENTION_DAYS', Setting_Value: '14', Description: 'Masa simpan respons default (hari)', Updated_At: now },
        { Setting_Key: 'AUTOSAVE_INTERVAL_SECONDS', Setting_Value: '25', Description: 'Interval autosave batch frontend (detik)', Updated_At: now },
        { Setting_Key: 'ANTI_CHEAT_ENABLED', Setting_Value: 'true', Description: 'Aktifkan deteksi tab/window blur', Updated_At: now },
        { Setting_Key: 'FULLSCREEN_REQUIRED', Setting_Value: 'true', Description: 'Wajibkan fullscreen saat ujian', Updated_At: now },
        { Setting_Key: 'APPS_SCRIPT_API_URL', Setting_Value: 'https://script.google.com/macros/s/AKfycbxdUFBK1CSvaU70tn210cuYOlQAGD9lQzzkhjD4I5RlZjm0DIhVNpg1Wnb_Z_ktG6if/exec', Description: 'URL Web App Google Apps Script', Updated_At: now }
      ],
      USERS: [
        {
          User_ID: 'USR-ADMIN',
          NIM: 'ADMIN01',
          Full_Name: 'Dosen Koordinator Ujian',
          Email: 'dosen@kampus.ac.id',
          Class_Name: 'Staf Pengajar',
          Role: 'ADMIN',
          Is_Active: true,
          Created_At: now,
          Updated_At: now
        },
        {
          User_ID: 'USR-STU001',
          NIM: '220101001',
          Full_Name: 'Ahmad Fauzi',
          Email: 'ahmad.fauzi@student.kampus.ac.id',
          Class_Name: 'Kelas A',
          Role: 'STUDENT',
          Is_Active: true,
          Created_At: now,
          Updated_At: now
        },
        {
          User_ID: 'USR-STU002',
          NIM: '220101002',
          Full_Name: 'Siti Nurhaliza',
          Email: 'siti.nurhaliza@student.kampus.ac.id',
          Class_Name: 'Kelas A',
          Role: 'STUDENT',
          Is_Active: true,
          Created_At: now,
          Updated_At: now
        },
        {
          User_ID: 'USR-STU003',
          NIM: '220101003',
          Full_Name: 'Budi Santoso',
          Email: 'budi.santoso@student.kampus.ac.id',
          Class_Name: 'Kelas B',
          Role: 'STUDENT',
          Is_Active: true,
          Created_At: now,
          Updated_At: now
        }
      ],
      COURSES: [
        { Course_ID: 'CRS001', Course_Code: 'BIOKIM', Course_Name: 'Biokimia', Description: 'Mata Kuliah Wajib Biokimia', Status: 'ACTIVE', Created_At: now, Updated_At: now },
        { Course_ID: 'CRS002', Course_Code: 'IPK', Course_Name: 'Inovasi Pembelajaran Kimia', Description: 'Mata Kuliah Pedagogik & Inovasi Kimia', Status: 'ACTIVE', Created_At: now, Updated_At: now },
        { Course_ID: 'CRS003', Course_Code: 'TLAB', Course_Name: 'Teknik Laboratorium', Description: 'Keselamatan Kerja dan Instrumen Laboratorium', Status: 'ACTIVE', Created_At: now, Updated_At: now },
        { Course_ID: 'CRS004', Course_Code: 'KDBIO', Course_Name: 'Kimia Dasar untuk Biologi', Description: 'Konsep Kimia Dasar Mahasiswa Biologi', Status: 'ACTIVE', Created_At: now, Updated_At: now }
      ],
      TOPICS: [
        { Topic_ID: 'TPC001', Course_ID: 'CRS001', Topic_Name: 'Kinetika Enzim & Inhibisi', Description: 'Mekanisme kerja enzim dan inhibisi kompetitif/nonkompetitif', Sort_Order: 1, Status: 'ACTIVE', Created_At: now, Updated_At: now },
        { Topic_ID: 'TPC002', Course_ID: 'CRS001', Topic_Name: 'Metabolisme Karbohidrat', Description: 'Glikolisis, Siklus Krebs, dan Rantai Transpor Elektron', Sort_Order: 2, Status: 'ACTIVE', Created_At: now, Updated_At: now },
        { Topic_ID: 'TPC003', Course_ID: 'CRS002', Topic_Name: 'Media Pembelajaran Digital', Description: 'Pengembangan media interaktif kimia', Sort_Order: 1, Status: 'ACTIVE', Created_At: now, Updated_At: now },
        { Topic_ID: 'TPC004', Course_ID: 'CRS003', Topic_Name: 'K3 Laboratorium Kimia', Description: 'MSDS, simbol bahaya, dan mitigasi tumpahan', Sort_Order: 1, Status: 'ACTIVE', Created_At: now, Updated_At: now }
      ],
      QUESTION_BANKS: [
        { Bank_ID: 'BNK001', Course_ID: 'CRS001', Bank_Name: 'Bank Soal UTS Biokimia 2026', Description: 'Kumpulan soal UTS Enzim dan Karbohidrat', Status: 'ACTIVE', Created_By: 'ADMIN', Created_At: now, Updated_At: now },
        { Bank_ID: 'BNK002', Course_ID: 'CRS003', Bank_Name: 'Bank Soal K3 & Instrumen', Description: 'Soal teknik penggunaan buret dan spektrofotometer', Status: 'ACTIVE', Created_By: 'ADMIN', Created_At: now, Updated_At: now }
      ],
      QUESTIONS: [
        { Question_ID: 'Q001', Bank_ID: 'BNK001', Topic_ID: 'TPC001', Question_Type: 'MCQ', Difficulty: 'MEDIUM', Status: 'ACTIVE', Current_Version_ID: 'QV001', Created_By: 'ADMIN', Created_At: now, Updated_At: now },
        { Question_ID: 'Q002', Bank_ID: 'BNK001', Topic_ID: 'TPC001', Question_Type: 'MCQ', Difficulty: 'EASY', Status: 'ACTIVE', Current_Version_ID: 'QV002', Created_By: 'ADMIN', Created_At: now, Updated_At: now },
        { Question_ID: 'Q003', Bank_ID: 'BNK001', Topic_ID: 'TPC001', Question_Type: 'ESSAY', Difficulty: 'HARD', Status: 'ACTIVE', Current_Version_ID: 'QV003', Created_By: 'ADMIN', Created_At: now, Updated_At: now }
      ],
      QUESTION_VERSIONS: [
        {
          Version_ID: 'QV001',
          Question_ID: 'Q001',
          Version_Number: 1,
          Question_Text: 'Pada kinetika enzim Michaelis-Menten, apa pengaruh inhibitor kompetitif terhadap nilai Km dan Vmax?',
          Image_URL: '',
          Default_Points: 2,
          Answer_Guide: '',
          Explanation: 'Inhibitor kompetitif bersaing dengan substrat pada sisi aktif enzim, sehingga Km meningkat sedangkan Vmax tetap.',
          Created_By: 'ADMIN',
          Created_At: now
        },
        {
          Version_ID: 'QV002',
          Question_ID: 'Q002',
          Version_Number: 1,
          Question_Text: 'Koenzim manakah yang bertindak sebagai pembawa elektron utama pada reaksi glikolisis?',
          Image_URL: '',
          Default_Points: 2,
          Answer_Guide: '',
          Explanation: 'NAD+ bertindak sebagai akseptor elektron tereduksi menjadi NADH.',
          Created_By: 'ADMIN',
          Created_At: now
        },
        {
          Version_ID: 'QV003',
          Question_ID: 'Q003',
          Version_Number: 1,
          Question_Text: 'Jelaskan perbedaan mendasar antara inhibisi kompetitif dan non-kompetitif pada enzim ditinjau dari sisi ikatan dan pengaruh konsentrasi substrat!',
          Image_URL: '',
          Default_Points: 10,
          Answer_Guide: 'Kriteria Penilaian:\n1. Sisi ikatan: Kompetitif berikatan di sisi aktif (identik dengan substrat), Non-kompetitif di sisi alosterik (skor 4).\n2. Pengaruh penambahan substrat: Pada kompetitif efek inhibisi dapat diatasi dengan meningkatkan konsentrasi substrat, pada non-kompetitif tidak dapat diatasi (skor 4).\n3. Kurva Lineweaver-Burk / parameter Km dan Vmax (skor 2).',
          Explanation: 'Penilaian komprehensif mekanisme inhibitor.',
          Created_By: 'ADMIN',
          Created_At: now
        }
      ],
      OPTIONS: [
        { Option_ID: 'OPT001', Version_ID: 'QV001', Option_Key: 'A', Option_Text: 'Km meningkat, Vmax tetap', Is_Correct: true, Sort_Order: 1 },
        { Option_ID: 'OPT002', Version_ID: 'QV001', Option_Key: 'B', Option_Text: 'Km tetap, Vmax menurun', Is_Correct: false, Sort_Order: 2 },
        { Option_ID: 'OPT003', Version_ID: 'QV001', Option_Key: 'C', Option_Text: 'Km menurun, Vmax menurun', Is_Correct: false, Sort_Order: 3 },
        { Option_ID: 'OPT004', Version_ID: 'QV001', Option_Key: 'D', Option_Text: 'Km dan Vmax tidak berubah', Is_Correct: false, Sort_Order: 4 },
        
        { Option_ID: 'OPT005', Version_ID: 'QV002', Option_Key: 'A', Option_Text: 'NAD+', Is_Correct: true, Sort_Order: 1 },
        { Option_ID: 'OPT006', Version_ID: 'QV002', Option_Key: 'B', Option_Text: 'FAD', Is_Correct: false, Sort_Order: 2 },
        { Option_ID: 'OPT007', Version_ID: 'QV002', Option_Key: 'C', Option_Text: 'NADP+', Is_Correct: false, Sort_Order: 3 },
        { Option_ID: 'OPT008', Version_ID: 'QV002', Option_Key: 'D', Option_Text: 'Koenzim Q', Is_Correct: false, Sort_Order: 4 }
      ],
      EXAMS: [
        {
          Exam_ID: 'EXM001',
          Course_ID: 'CRS001',
          Exam_Name: 'UTS Biokimia Teori Genap 2026',
          Instructions: 'Kerjakan soal pilihan ganda dan essay dengan teliti. Dilarang berpindah tab atau keluar fullscreen selama ujian.',
          Duration_Minutes: 60,
          Shuffle_Questions: false,
          Shuffle_Options: false,
          Anti_Cheat_Enabled: true,
          Fullscreen_Required: true,
          Response_Retention_Days: 14,
          Status: 'PUBLISHED',
          Created_By: 'ADMIN',
          Created_At: now,
          Updated_At: now
        }
      ],
      EXAM_QUESTIONS: [
        { Exam_Question_ID: 'EQ001', Exam_ID: 'EXM001', Version_ID: 'QV001', Question_Number: 1, Points: 2, Is_Required: true },
        { Exam_Question_ID: 'EQ002', Exam_ID: 'EXM001', Version_ID: 'QV002', Question_Number: 2, Points: 2, Is_Required: true },
        { Exam_Question_ID: 'EQ003', Exam_ID: 'EXM001', Version_ID: 'QV003', Question_Number: 3, Points: 10, Is_Required: true }
      ],
      EXAM_RUNS: [
        {
          Run_ID: 'RUN001',
          Exam_ID: 'EXM001',
          Run_Name: 'Sesi Ujian Kelas A - Pagi',
          Class_Name: 'Kelas A',
          Start_At: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          End_At: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          Access_Code: 'BIO2026',
          Status: 'OPEN',
          Response_Retention_Days: 14,
          Delete_After: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          Data_Status: 'ACTIVE',
          Created_By: 'ADMIN',
          Created_At: now,
          Closed_At: '',
          Reset_At: ''
        }
      ],
      ATTEMPTS: [],
      ANSWERS: [],
      VIOLATIONS: [],
      PERMISSIONS: [],
      ADMIN_LOGS: [
        {
          Log_ID: 'LOG001',
          Admin_ID: 'ADMIN',
          Action_Type: 'INIT_SYSTEM',
          Target_Type: 'DATABASE',
          Target_ID: 'SHEETS',
          Details: 'Inisialisasi database master spec selesai',
          Created_At: now
        }
      ]
    };

    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseState) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  public getState(): DatabaseState {
    return this.data;
  }

  public persist() {
    this.saveData(this.data);
  }

  // ID generator
  public generateId(prefix: string): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${rand}`;
  }

  // Log admin action
  public logAdmin(action: string, targetType: string, targetId: string, details: string) {
    this.data.ADMIN_LOGS.unshift({
      Log_ID: this.generateId('LOG'),
      Admin_ID: 'ADMIN',
      Action_Type: action,
      Target_Type: targetType,
      Target_ID: targetId,
      Details: details,
      Created_At: new Date().toISOString()
    });
    this.persist();
  }

  // Courses
  public getCourses(): CourseItem[] {
    return this.data.COURSES;
  }

  public addCourse(item: Partial<CourseItem>): CourseItem {
    const now = new Date().toISOString();
    const course: CourseItem = {
      Course_ID: item.Course_ID || this.generateId('CRS'),
      Course_Code: String(item.Course_Code || '').trim().toUpperCase(),
      Course_Name: String(item.Course_Name || '').trim(),
      Description: item.Description || '',
      Status: item.Status || 'ACTIVE',
      Created_At: now,
      Updated_At: now
    };
    this.data.COURSES.push(course);
    this.logAdmin('CREATE_COURSE', 'COURSE', course.Course_ID, `Tambah mata kuliah ${course.Course_Name}`);
    this.persist();
    return course;
  }

  // Topics
  public getTopics(courseId?: string): TopicItem[] {
    let list = this.data.TOPICS;
    if (courseId) list = list.filter(t => t.Course_ID === courseId);
    return list.sort((a, b) => a.Sort_Order - b.Sort_Order);
  }

  public addTopic(item: Partial<TopicItem>): TopicItem {
    const now = new Date().toISOString();
    const topic: TopicItem = {
      Topic_ID: this.generateId('TPC'),
      Course_ID: item.Course_ID!,
      Topic_Name: String(item.Topic_Name || '').trim(),
      Description: item.Description || '',
      Sort_Order: Number(item.Sort_Order) || (this.data.TOPICS.length + 1),
      Status: item.Status || 'ACTIVE',
      Created_At: now,
      Updated_At: now
    };
    this.data.TOPICS.push(topic);
    this.logAdmin('CREATE_TOPIC', 'TOPIC', topic.Topic_ID, `Tambah materi ${topic.Topic_Name}`);
    this.persist();
    return topic;
  }

  // Question Banks
  public getQuestionBanks(courseId?: string): QuestionBankItem[] {
    let list = this.data.QUESTION_BANKS;
    if (courseId) list = list.filter(b => b.Course_ID === courseId);
    return list;
  }

  public addQuestionBank(item: Partial<QuestionBankItem>): QuestionBankItem {
    const now = new Date().toISOString();
    const bank: QuestionBankItem = {
      Bank_ID: this.generateId('BNK'),
      Course_ID: item.Course_ID!,
      Bank_Name: String(item.Bank_Name || '').trim(),
      Description: item.Description || '',
      Status: item.Status || 'ACTIVE',
      Created_By: 'ADMIN',
      Created_At: now,
      Updated_At: now
    };
    this.data.QUESTION_BANKS.push(bank);
    this.logAdmin('CREATE_BANK', 'QUESTION_BANK', bank.Bank_ID, `Tambah bank soal ${bank.Bank_Name}`);
    this.persist();
    return bank;
  }

  // Questions with Versioning
  public getQuestions(filter: any = {}) {
    const bankMap = new Map(this.data.QUESTION_BANKS.map(b => [b.Bank_ID, b]));
    const topicMap = new Map(this.data.TOPICS.map(t => [t.Topic_ID, t]));
    const courseMap = new Map(this.data.COURSES.map(c => [c.Course_ID, c]));
    const versionMap = new Map(this.data.QUESTION_VERSIONS.map(v => [v.Version_ID, v]));

    return this.data.QUESTIONS.filter(q => {
      if (filter.status && q.Status !== filter.status) return false;
      if (filter.bankId && q.Bank_ID !== filter.bankId) return false;
      if (filter.topicId && q.Topic_ID !== filter.topicId) return false;
      if (filter.questionType && q.Question_Type !== filter.questionType) return false;
      if (filter.difficulty && q.Difficulty !== filter.difficulty) return false;
      return true;
    }).map(q => {
      const ver = versionMap.get(q.Current_Version_ID) || {} as QuestionVersionItem;
      const bank = bankMap.get(q.Bank_ID);
      const topic = topicMap.get(q.Topic_ID);
      const course = bank ? courseMap.get(bank.Course_ID) : undefined;
      const opts = this.data.OPTIONS.filter(o => o.Version_ID === q.Current_Version_ID)
        .sort((a, b) => a.Sort_Order - b.Sort_Order);
      const allVers = this.data.QUESTION_VERSIONS.filter(v => v.Question_ID === q.Question_ID)
        .sort((a, b) => b.Version_Number - a.Version_Number);

      return {
        Question_ID: q.Question_ID,
        Bank_ID: q.Bank_ID,
        Bank_Name: bank?.Bank_Name || '',
        Course_ID: course?.Course_ID || '',
        Course_Name: course?.Course_Name || '',
        Topic_ID: q.Topic_ID,
        Topic_Name: topic?.Topic_Name || '',
        Question_Type: q.Question_Type,
        Difficulty: q.Difficulty,
        Status: q.Status,
        Current_Version_ID: q.Current_Version_ID,
        Version_Number: ver.Version_Number || 1,
        Question_Text: ver.Question_Text || '',
        Image_URL: ver.Image_URL || '',
        Default_Points: ver.Default_Points || 0,
        Answer_Guide: ver.Answer_Guide || '',
        Explanation: ver.Explanation || '',
        Options: opts,
        Versions: allVers,
        Created_At: q.Created_At,
        Updated_At: q.Updated_At
      };
    });
  }

  public createMCQ(payload: {
    Bank_ID: string;
    Topic_ID: string;
    Difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    Question_Text: string;
    Image_URL?: string;
    Default_Points: number;
    Explanation?: string;
    Options: Array<{ Option_Key: 'A' | 'B' | 'C' | 'D' | 'E'; Option_Text: string; Is_Correct: boolean }>;
  }) {
    const now = new Date().toISOString();
    const qId = this.generateId('Q');
    const vId = this.generateId('QV');

    const question: QuestionItem = {
      Question_ID: qId,
      Bank_ID: payload.Bank_ID,
      Topic_ID: payload.Topic_ID,
      Question_Type: 'MCQ',
      Difficulty: payload.Difficulty || 'MEDIUM',
      Status: 'ACTIVE',
      Current_Version_ID: vId,
      Created_By: 'ADMIN',
      Created_At: now,
      Updated_At: now
    };

    const version: QuestionVersionItem = {
      Version_ID: vId,
      Question_ID: qId,
      Version_Number: 1,
      Question_Text: payload.Question_Text,
      Image_URL: payload.Image_URL || '',
      Default_Points: Number(payload.Default_Points) || 2,
      Answer_Guide: '',
      Explanation: payload.Explanation || '',
      Created_By: 'ADMIN',
      Created_At: now
    };

    this.data.QUESTIONS.push(question);
    this.data.QUESTION_VERSIONS.push(version);

    payload.Options.forEach((opt, idx) => {
      this.data.OPTIONS.push({
        Option_ID: this.generateId('OPT'),
        Version_ID: vId,
        Option_Key: opt.Option_Key,
        Option_Text: opt.Option_Text,
        Is_Correct: Boolean(opt.Is_Correct),
        Sort_Order: idx + 1
      });
    });

    this.logAdmin('CREATE_MCQ', 'QUESTION', qId, `Buat soal pilihan ganda ${qId}`);
    this.persist();
    return { Question_ID: qId, Version_ID: vId };
  }

  public createEssay(payload: {
    Bank_ID: string;
    Topic_ID: string;
    Difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    Question_Text: string;
    Image_URL?: string;
    Default_Points: number;
    Answer_Guide: string;
    Explanation?: string;
  }) {
    const now = new Date().toISOString();
    const qId = this.generateId('Q');
    const vId = this.generateId('QV');

    const question: QuestionItem = {
      Question_ID: qId,
      Bank_ID: payload.Bank_ID,
      Topic_ID: payload.Topic_ID,
      Question_Type: 'ESSAY',
      Difficulty: payload.Difficulty || 'MEDIUM',
      Status: 'ACTIVE',
      Current_Version_ID: vId,
      Created_By: 'ADMIN',
      Created_At: now,
      Updated_At: now
    };

    const version: QuestionVersionItem = {
      Version_ID: vId,
      Question_ID: qId,
      Version_Number: 1,
      Question_Text: payload.Question_Text,
      Image_URL: payload.Image_URL || '',
      Default_Points: Number(payload.Default_Points) || 10,
      Answer_Guide: payload.Answer_Guide || '',
      Explanation: payload.Explanation || '',
      Created_By: 'ADMIN',
      Created_At: now
    };

    this.data.QUESTIONS.push(question);
    this.data.QUESTION_VERSIONS.push(version);

    this.logAdmin('CREATE_ESSAY', 'QUESTION', qId, `Buat soal essay ${qId}`);
    this.persist();
    return { Question_ID: qId, Version_ID: vId };
  }

  public createQuestionVersion(questionId: string, changes: any) {
    const question = this.data.QUESTIONS.find(q => q.Question_ID === questionId);
    if (!question) throw new Error('Soal tidak ditemukan');

    const existingVers = this.data.QUESTION_VERSIONS.filter(v => v.Question_ID === questionId);
    const maxVer = Math.max(...existingVers.map(v => v.Version_Number), 0);
    const newVerNum = maxVer + 1;
    const newVerId = this.generateId('QV');
    const now = new Date().toISOString();

    const version: QuestionVersionItem = {
      Version_ID: newVerId,
      Question_ID: questionId,
      Version_Number: newVerNum,
      Question_Text: changes.Question_Text,
      Image_URL: changes.Image_URL || '',
      Default_Points: Number(changes.Default_Points) || 2,
      Answer_Guide: changes.Answer_Guide || '',
      Explanation: changes.Explanation || '',
      Created_By: 'ADMIN',
      Created_At: now
    };

    this.data.QUESTION_VERSIONS.push(version);

    if (changes.Options && changes.Options.length > 0) {
      changes.Options.forEach((opt: any, idx: number) => {
        this.data.OPTIONS.push({
          Option_ID: this.generateId('OPT'),
          Version_ID: newVerId,
          Option_Key: opt.Option_Key,
          Option_Text: opt.Option_Text,
          Is_Correct: Boolean(opt.Is_Correct),
          Sort_Order: idx + 1
        });
      });
    }

    question.Current_Version_ID = newVerId;
    question.Updated_At = now;

    this.logAdmin('NEW_VERSION', 'QUESTION', questionId, `Revisi redaksi versi ${newVerNum}`);
    this.persist();
    return { Version_ID: newVerId, Version_Number: newVerNum };
  }

  public duplicateQuestion(questionId: string) {
    const q = this.data.QUESTIONS.find(x => x.Question_ID === questionId);
    if (!q) throw new Error('Soal tidak ditemukan');
    const curVer = this.data.QUESTION_VERSIONS.find(v => v.Version_ID === q.Current_Version_ID);
    if (!curVer) throw new Error('Versi soal tidak ditemukan');
    const opts = this.data.OPTIONS.filter(o => o.Version_ID === curVer.Version_ID);

    const now = new Date().toISOString();
    const newQId = this.generateId('Q');
    const newVId = this.generateId('QV');

    this.data.QUESTIONS.push({
      ...q,
      Question_ID: newQId,
      Current_Version_ID: newVId,
      Created_At: now,
      Updated_At: now
    });

    this.data.QUESTION_VERSIONS.push({
      ...curVer,
      Version_ID: newVId,
      Question_ID: newQId,
      Version_Number: 1,
      Question_Text: curVer.Question_Text + ' (Salinan)',
      Created_At: now
    });

    opts.forEach(o => {
      this.data.OPTIONS.push({
        ...o,
        Option_ID: this.generateId('OPT'),
        Version_ID: newVId
      });
    });

    this.logAdmin('DUPLICATE', 'QUESTION', newQId, `Duplikasi soal ${questionId}`);
    this.persist();
    return { Question_ID: newQId, Version_ID: newVId };
  }

  public archiveQuestion(questionId: string) {
    const q = this.data.QUESTIONS.find(x => x.Question_ID === questionId);
    if (!q) throw new Error('Soal tidak ditemukan');
    q.Status = q.Status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    q.Updated_At = new Date().toISOString();
    this.logAdmin('ARCHIVE', 'QUESTION', questionId, `Status soal diubah ke ${q.Status}`);
    this.persist();
    return { Question_ID: questionId, Status: q.Status };
  }

  // Exams & Runs
  public getExams() {
    const courseMap = new Map(this.data.COURSES.map(c => [c.Course_ID, c]));
    return this.data.EXAMS.map(e => {
      const eqs = this.data.EXAM_QUESTIONS.filter(eq => eq.Exam_ID === e.Exam_ID);
      const totalPts = eqs.reduce((acc, x) => acc + (Number(x.Points) || 0), 0);
      const runCount = this.data.EXAM_RUNS.filter(r => r.Exam_ID === e.Exam_ID).length;
      return {
        ...e,
        Course_Name: courseMap.get(e.Course_ID)?.Course_Name || '',
        Total_Questions: eqs.length,
        Total_Points: totalPts,
        Runs_Count: runCount
      };
    });
  }

  public createExam(payload: Partial<ExamItem>) {
    const now = new Date().toISOString();
    const examId = this.generateId('EXM');
    const exam: ExamItem = {
      Exam_ID: examId,
      Course_ID: payload.Course_ID!,
      Exam_Name: String(payload.Exam_Name || '').trim(),
      Instructions: payload.Instructions || 'Kerjakan dengan jujur dan teliti.',
      Duration_Minutes: Number(payload.Duration_Minutes) || 60,
      Shuffle_Questions: Boolean(payload.Shuffle_Questions),
      Shuffle_Options: Boolean(payload.Shuffle_Options),
      Anti_Cheat_Enabled: Boolean(payload.Anti_Cheat_Enabled !== false),
      Fullscreen_Required: Boolean(payload.Fullscreen_Required !== false),
      Response_Retention_Days: Number(payload.Response_Retention_Days) || 14,
      Status: 'DRAFT',
      Created_By: 'ADMIN',
      Created_At: now,
      Updated_At: now
    };
    this.data.EXAMS.push(exam);
    this.logAdmin('CREATE_EXAM', 'EXAM', examId, `Buat draft ujian ${exam.Exam_Name}`);
    this.persist();
    return exam;
  }

  public setExamQuestions(examId: string, questions: Array<{ Version_ID: string; Question_Number?: number; Points: number; Is_Required?: boolean }>) {
    // Remove previous questions
    this.data.EXAM_QUESTIONS = this.data.EXAM_QUESTIONS.filter(eq => eq.Exam_ID !== examId);
    let total = 0;
    questions.forEach((q, idx) => {
      const pts = Number(q.Points) || 2;
      total += pts;
      this.data.EXAM_QUESTIONS.push({
        Exam_Question_ID: this.generateId('EQ'),
        Exam_ID: examId,
        Version_ID: q.Version_ID, // locked Version_ID
        Question_Number: q.Question_Number || (idx + 1),
        Points: pts,
        Is_Required: q.Is_Required !== false
      });
    });
    this.logAdmin('SET_EXAM_QUESTIONS', 'EXAM', examId, `Pilih ${questions.length} butir soal, total skor ${total}`);
    this.persist();
    return { examId, count: questions.length, totalPoints: total };
  }

  public publishExam(examId: string) {
    const exam = this.data.EXAMS.find(e => e.Exam_ID === examId);
    if (!exam) throw new Error('Ujian tidak ditemukan');
    const eqs = this.data.EXAM_QUESTIONS.filter(eq => eq.Exam_ID === examId);
    if (eqs.length === 0) throw new Error('Ujian belum memiliki soal terpilih.');
    exam.Status = 'PUBLISHED';
    exam.Updated_At = new Date().toISOString();
    this.logAdmin('PUBLISH_EXAM', 'EXAM', examId, `Publish ujian dengan ${eqs.length} soal`);
    this.persist();
    return { Exam_ID: examId, Status: 'PUBLISHED' };
  }

  public getExamRuns(examId?: string) {
    let list = this.data.EXAM_RUNS;
    if (examId) list = list.filter(r => r.Exam_ID === examId);
    return list;
  }

  public createRun(payload: Partial<ExamRunItem>) {
    const now = new Date();
    const runId = this.generateId('RUN');
    const code = payload.Access_Code ? String(payload.Access_Code).trim().toUpperCase() : Math.random().toString(36).substring(2, 8).toUpperCase();
    const retention = Number(payload.Response_Retention_Days) || 14;
    const deleteAfter = new Date(now.getTime() + retention * 24 * 3600 * 1000).toISOString();

    const run: ExamRunItem = {
      Run_ID: runId,
      Exam_ID: payload.Exam_ID!,
      Run_Name: String(payload.Run_Name || '').trim(),
      Class_Name: String(payload.Class_Name || '').trim(),
      Start_At: payload.Start_At || now.toISOString(),
      End_At: payload.End_At || new Date(now.getTime() + 4 * 3600 * 1000).toISOString(),
      Access_Code: code,
      Status: payload.Status || 'OPEN',
      Response_Retention_Days: retention,
      Delete_After: deleteAfter,
      Data_Status: 'ACTIVE',
      Created_By: 'ADMIN',
      Created_At: now.toISOString(),
      Closed_At: '',
      Reset_At: ''
    };

    this.data.EXAM_RUNS.push(run);
    this.logAdmin('CREATE_RUN', 'EXAM_RUN', runId, `Buat sesi ujian ${run.Run_Name}, Kode: ${code}`);
    this.persist();
    return run;
  }

  public updateRunStatus(runId: string, status: ExamRunItem['Status']) {
    const run = this.data.EXAM_RUNS.find(r => r.Run_ID === runId);
    if (!run) throw new Error('Sesi ujian tidak ditemukan');
    run.Status = status;
    if (status === 'CLOSED') run.Closed_At = new Date().toISOString();
    this.logAdmin('UPDATE_RUN_STATUS', 'EXAM_RUN', runId, `Status diubah ke ${status}`);
    this.persist();
    return run;
  }

  // Student Start Attempt & Sanitized Payload
  public studentStart(nim: string, accessCode: string, fullName?: string, className?: string) {
    const cleanNim = String(nim).trim();
    const cleanCode = String(accessCode).trim().toUpperCase();

    let student = this.data.USERS.find(u => u.NIM === cleanNim);
    if (!student) {
      student = {
        User_ID: this.generateId('USR'),
        NIM: cleanNim,
        Full_Name: fullName || `Mahasiswa ${cleanNim}`,
        Class_Name: className || 'Kelas Reguler',
        Role: 'STUDENT',
        Is_Active: true,
        Created_At: new Date().toISOString(),
        Updated_At: new Date().toISOString()
      };
      this.data.USERS.push(student);
    } else {
      if (fullName) student.Full_Name = fullName;
      if (className) student.Class_Name = className;
    }

    if (!student.Is_Active) {
      throw new Error('Akun mahasiswa tidak aktif.');
    }

    const run = this.data.EXAM_RUNS.find(r => r.Access_Code === cleanCode);
    if (!run) throw new Error('Kode akses ujian salah atau tidak ditemukan.');
    if (run.Status === 'CLOSED' || run.Status === 'CANCELLED') {
      throw new Error(`Sesi ujian ${run.Run_Name} berstatus ${run.Status}. Anda tidak dapat masuk.`);
    }

    const exam = this.data.EXAMS.find(e => e.Exam_ID === run.Exam_ID);
    if (!exam) throw new Error('Ujian induk tidak ditemukan.');

    const course = this.data.COURSES.find(c => c.Course_ID === exam.Course_ID);

    // Existing attempt
    let attempt = this.data.ATTEMPTS.find(a => a.Run_ID === run.Run_ID && a.Student_ID === student!.User_ID);
    const now = new Date();
    if (!attempt) {
      const durationMs = exam.Duration_Minutes * 60 * 1000;
      attempt = {
        Attempt_ID: this.generateId('ATT'),
        Run_ID: run.Run_ID,
        Student_ID: student.User_ID,
        Started_At: now.toISOString(),
        Expires_At: new Date(now.getTime() + durationMs).toISOString(),
        Status: 'IN_PROGRESS',
        Objective_Score: 0,
        Essay_Score: 0,
        Final_Score: 0,
        Violation_Count: 0,
        Last_Sync_At: now.toISOString()
      };
      this.data.ATTEMPTS.push(attempt);
      this.persist();
    } else {
      if (attempt.Status === 'SUBMITTED' || attempt.Status === 'TIMEOUT') {
        throw new Error(`Anda sudah menyelesaikan ujian ini (${attempt.Status}).`);
      }
    }

    // Build Sanitized Questions (Strictly NO Is_Correct, NO Answer_Guide)
    const eqList = this.data.EXAM_QUESTIONS.filter(eq => eq.Exam_ID === exam.Exam_ID)
      .sort((a, b) => a.Question_Number - b.Question_Number);

    const versionMap = new Map(this.data.QUESTION_VERSIONS.map(v => [v.Version_ID, v]));
    const questionMap = new Map(this.data.QUESTIONS.map(q => [q.Question_ID, q]));

    const questions: any[] = eqList.map(eq => {
      const ver = versionMap.get(eq.Version_ID);
      const qMaster = ver ? questionMap.get(ver.Question_ID) : undefined;
      let opts = undefined;
      if (qMaster?.Question_Type === 'MCQ' && ver) {
        opts = this.data.OPTIONS.filter(o => o.Version_ID === ver.Version_ID)
          .sort((a, b) => a.Sort_Order - b.Sort_Order)
          .map(o => ({
            Option_ID: o.Option_ID,
            Option_Key: o.Option_Key,
            Option_Text: o.Option_Text,
            Sort_Order: o.Sort_Order
          }));
      }

      // Check if student already answered this question
      const existingAnswer = this.data.ANSWERS.find(a => a.Attempt_ID === attempt!.Attempt_ID && a.Exam_Question_ID === eq.Exam_Question_ID);

      return {
        Exam_Question_ID: eq.Exam_Question_ID,
        Question_Number: eq.Question_Number,
        Question_Type: qMaster?.Question_Type || 'MCQ',
        Question_Text: ver?.Question_Text || '',
        Image_URL: ver?.Image_URL || '',
        Points: eq.Points,
        Is_Required: eq.Is_Required,
        Selected_Option_ID: existingAnswer?.Selected_Option_ID,
        Answer_Text: existingAnswer?.Answer_Text,
        Is_Flagged: false,
        Options: opts
      };
    });

    const remainingSecs = Math.max(0, Math.round((new Date(attempt.Expires_At).getTime() - Date.now()) / 1000));

    return {
      attempt: {
        ...attempt,
        Remaining_Seconds: remainingSecs
      },
      exam: {
        Exam_ID: exam.Exam_ID,
        Exam_Name: exam.Exam_Name,
        Duration_Minutes: exam.Duration_Minutes,
        Course_Name: course?.Course_Name || '',
        Anti_Cheat_Enabled: exam.Anti_Cheat_Enabled,
        Fullscreen_Required: exam.Fullscreen_Required
      },
      student: {
        User_ID: student.User_ID,
        NIM: student.NIM,
        Full_Name: student.Full_Name,
        Class_Name: student.Class_Name
      },
      questions
    };
  }

  // Batch Save Answers with Server Auto-Grading for MCQ
  public saveBatchAnswers(attemptId: string, answers: Array<{ Exam_Question_ID: string; Selected_Option_ID?: string; Answer_Text?: string }>) {
    const attempt = this.data.ATTEMPTS.find(a => a.Attempt_ID === attemptId);
    if (!attempt) throw new Error('Attempt tidak ditemukan');
    if (attempt.Status === 'SUBMITTED' || attempt.Status === 'TIMEOUT') {
      throw new Error('Ujian sudah selesai, jawaban tidak dapat disimpan.');
    }

    const eqMap = new Map(this.data.EXAM_QUESTIONS.map(eq => [eq.Exam_Question_ID, eq]));
    const optMap = new Map(this.data.OPTIONS.map(o => [o.Option_ID, o]));
    const now = new Date().toISOString();

    answers.forEach(item => {
      const eq = eqMap.get(item.Exam_Question_ID);
      let isCorrect = false;
      let autoScore = 0;

      if (item.Selected_Option_ID && eq) {
        const opt = optMap.get(item.Selected_Option_ID);
        if (opt?.Is_Correct) {
          isCorrect = true;
          autoScore = eq.Points;
        }
      }

      const existing = this.data.ANSWERS.find(a => a.Attempt_ID === attemptId && a.Exam_Question_ID === item.Exam_Question_ID);
      if (existing) {
        existing.Selected_Option_ID = item.Selected_Option_ID;
        existing.Answer_Text = item.Answer_Text;
        existing.Is_Correct = isCorrect;
        existing.Auto_Score = autoScore;
        existing.Saved_At = now;
      } else {
        this.data.ANSWERS.push({
          Answer_ID: this.generateId('ANS'),
          Attempt_ID: attemptId,
          Exam_Question_ID: item.Exam_Question_ID,
          Selected_Option_ID: item.Selected_Option_ID,
          Answer_Text: item.Answer_Text,
          Is_Correct: isCorrect,
          Auto_Score: autoScore,
          Manual_Score: 0,
          Lecturer_Feedback: '',
          Saved_At: now
        });
      }
    });

    attempt.Last_Sync_At = now;
    this.persist();
    return { status: 'success', savedAt: now, count: answers.length };
  }

  // Anti-cheat record violation
  public recordViolation(attemptId: string, event: { eventType: ViolationItem['Event_Type']; durationSeconds?: number }) {
    const attempt = this.data.ATTEMPTS.find(a => a.Attempt_ID === attemptId);
    if (!attempt) return { status: 'ignored' };

    const now = new Date();
    const nowIso = now.toISOString();

    // Check active LEAVE_EXAM permission
    const activePerm = this.data.PERMISSIONS.find(p => {
      if (p.Attempt_ID !== attemptId || !p.Is_Active) return false;
      const start = new Date(p.Starts_At).getTime();
      const exp = new Date(p.Expires_At).getTime();
      return now.getTime() >= start && now.getTime() <= exp;
    });

    const isAuthorized = !!activePerm;
    const alarmStatus: ViolationItem['Alarm_Status'] = isAuthorized ? 'MUTED' : 'ACTIVE';
    const violationId = this.generateId('VIO');

    this.data.VIOLATIONS.push({
      Violation_ID: violationId,
      Attempt_ID: attemptId,
      Event_Type: event.eventType || 'OTHER',
      Detected_At: nowIso,
      Duration_Seconds: Number(event.durationSeconds) || 0,
      Is_Authorized: isAuthorized,
      Alarm_Status: alarmStatus,
      Admin_Note: isAuthorized ? `Izin resmi aktif: ${activePerm?.Reason}` : ''
    });

    attempt.Violation_Count += 1;
    attempt.Last_Sync_At = nowIso;
    this.persist();

    return {
      status: 'recorded',
      violationId,
      alarmStatus,
      isAuthorized
    };
  }

  // Final Submit
  public submitExam(attemptId: string, clientSubmissionId?: string) {
    const attempt = this.data.ATTEMPTS.find(a => a.Attempt_ID === attemptId);
    if (!attempt) throw new Error('Attempt tidak ditemukan');

    if (attempt.Status === 'SUBMITTED') {
      return { status: 'already_submitted', submittedAt: attempt.Submitted_At };
    }

    const answers = this.data.ANSWERS.filter(a => a.Attempt_ID === attemptId);
    let totalObj = 0;
    let totalEssay = 0;
    let hasEssay = false;

    answers.forEach(a => {
      if (a.Selected_Option_ID) {
        totalObj += (Number(a.Auto_Score) || 0);
      }
      if (a.Answer_Text && !a.Selected_Option_ID) {
        hasEssay = true;
        totalEssay += (Number(a.Manual_Score) || 0);
      }
    });

    const now = new Date().toISOString();
    attempt.Status = 'SUBMITTED';
    attempt.Submitted_At = now;
    attempt.Objective_Score = totalObj;
    attempt.Essay_Score = totalEssay;
    attempt.Final_Score = hasEssay ? (totalObj + totalEssay) : totalObj;
    attempt.Client_Submission_ID = clientSubmissionId || this.generateId('SUB');
    attempt.Last_Sync_At = now;

    this.persist();
    return {
      status: 'SUBMITTED',
      submittedAt: now,
      objectiveScore: totalObj,
      hasEssay
    };
  }

  // Monitoring
  public getMonitor(runId?: string) {
    let attempts = this.data.ATTEMPTS;
    if (runId) attempts = attempts.filter(a => a.Run_ID === runId);

    const userMap = new Map(this.data.USERS.map(u => [u.User_ID, u]));
    const runMap = new Map(this.data.EXAM_RUNS.map(r => [r.Run_ID, r]));
    const examMap = new Map(this.data.EXAMS.map(e => [e.Exam_ID, e]));
    const now = Date.now();

    return attempts.map(att => {
      const student = userMap.get(att.Student_ID);
      const run = runMap.get(att.Run_ID);
      const exam = run ? examMap.get(run.Exam_ID) : undefined;
      const totalQuestions = exam ? this.data.EXAM_QUESTIONS.filter(eq => eq.Exam_ID === exam.Exam_ID).length : 0;
      const answeredCount = this.data.ANSWERS.filter(a => a.Attempt_ID === att.Attempt_ID && (a.Selected_Option_ID || (a.Answer_Text && a.Answer_Text.trim().length > 0))).length;
      const violations = this.data.VIOLATIONS.filter(v => v.Attempt_ID === att.Attempt_ID);
      const hasActiveAlarm = violations.some(v => v.Alarm_Status === 'ACTIVE');
      const activePermissions = this.data.PERMISSIONS.filter(p => {
        if (p.Attempt_ID !== att.Attempt_ID || !p.Is_Active) return false;
        return new Date(p.Expires_At).getTime() > now;
      });

      return {
        Attempt_ID: att.Attempt_ID,
        Run_ID: att.Run_ID,
        Run_Name: run?.Run_Name || '',
        Student_ID: student?.User_ID || '',
        NIM: student?.NIM || '',
        Full_Name: student?.Full_Name || '',
        Class_Name: student?.Class_Name || '',
        Total_Questions: totalQuestions,
        Answered_Count: answeredCount,
        Started_At: att.Started_At,
        Last_Sync_At: att.Last_Sync_At,
        Status: att.Status,
        Violation_Count: att.Violation_Count,
        Alarm_Status: hasActiveAlarm ? 'ACTIVE' : 'NORMAL',
        Active_Permissions: activePermissions,
        Violations: violations
      };
    });
  }

  public grantPermission(attemptId: string, type: 'LEAVE_EXAM' | 'MUTE_ALARM', expiryMinutes: number, reason: string) {
    const now = new Date();
    const mins = Number(expiryMinutes) || 5;
    const exp = new Date(now.getTime() + mins * 60 * 1000).toISOString();
    const perm: PermissionItem = {
      Permission_ID: this.generateId('PERM'),
      Attempt_ID: attemptId,
      Permission_Type: type,
      Starts_At: now.toISOString(),
      Expires_At: exp,
      Reason: reason || `Izin pengawas ${mins} menit`,
      Granted_By: 'ADMIN',
      Is_Active: true,
      Created_At: now.toISOString()
    };
    this.data.PERMISSIONS.push(perm);

    // Mute any active alarms
    this.data.VIOLATIONS.filter(v => v.Attempt_ID === attemptId && v.Alarm_Status === 'ACTIVE').forEach(v => {
      v.Alarm_Status = 'MUTED';
      v.Admin_Note = `Alarm di-mute oleh izin ${type}`;
    });

    this.logAdmin('GRANT_PERMISSION', 'ATTEMPT', attemptId, `Beri izin ${type} (${mins} menit): ${reason}`);
    this.persist();
    return perm;
  }

  public muteOrResolveViolation(violationId: string, actionType: 'MUTE' | 'RESOLVE', note?: string) {
    const vio = this.data.VIOLATIONS.find(v => v.Violation_ID === violationId);
    if (!vio) throw new Error('Pelanggaran tidak ditemukan');
    vio.Alarm_Status = actionType === 'RESOLVE' ? 'RESOLVED' : 'MUTED';
    vio.Resolved_At = new Date().toISOString();
    vio.Resolved_By = 'ADMIN';
    if (note) vio.Admin_Note = note;
    this.logAdmin(`${actionType}_VIOLATION`, 'VIOLATION', violationId, `Status alarm diubah ke ${vio.Alarm_Status}`);
    this.persist();
    return vio;
  }

  public getViolationsByAttempt(attemptId: string) {
    return this.data.VIOLATIONS.filter(v => v.Attempt_ID === attemptId);
  }

  // Essay Grading & Scores
  public getEssayResponses(runId: string, examQuestionId?: string) {
    const attempts = this.data.ATTEMPTS.filter(a => a.Run_ID === runId);
    const attemptIds = new Set(attempts.map(a => a.Attempt_ID));
    const userMap = new Map(this.data.USERS.map(u => [u.User_ID, u]));
    const attemptMap = new Map(attempts.map(a => [a.Attempt_ID, a]));
    const eqMap = new Map(this.data.EXAM_QUESTIONS.map(eq => [eq.Exam_Question_ID, eq]));
    const versionMap = new Map(this.data.QUESTION_VERSIONS.map(v => [v.Version_ID, v]));

    return this.data.ANSWERS.filter(ans => {
      if (!attemptIds.has(ans.Attempt_ID)) return false;
      if (ans.Selected_Option_ID) return false; // not MCQ
      if (examQuestionId && ans.Exam_Question_ID !== examQuestionId) return false;
      return true;
    }).map(ans => {
      const att = attemptMap.get(ans.Attempt_ID);
      const student = att ? userMap.get(att.Student_ID) : undefined;
      const eq = eqMap.get(ans.Exam_Question_ID);
      const ver = eq ? versionMap.get(eq.Version_ID) : undefined;

      return {
        Answer_ID: ans.Answer_ID,
        Attempt_ID: ans.Attempt_ID,
        Exam_Question_ID: ans.Exam_Question_ID,
        Question_Number: eq?.Question_Number || 1,
        Question_Text: ver?.Question_Text || '',
        Answer_Guide: ver?.Answer_Guide || '',
        Max_Points: eq?.Points || 10,
        Student_ID: student?.User_ID || '',
        NIM: student?.NIM || '',
        Student_Name: student?.Full_Name || '',
        Answer_Text: ans.Answer_Text || '',
        Manual_Score: ans.Manual_Score,
        Lecturer_Feedback: ans.Lecturer_Feedback || '',
        Graded_At: ans.Graded_At || '',
        Graded_By: ans.Graded_By || ''
      };
    });
  }

  public gradeEssay(answerId: string, manualScore: number, feedback: string) {
    const ans = this.data.ANSWERS.find(a => a.Answer_ID === answerId);
    if (!ans) throw new Error('Jawaban tidak ditemukan');
    const eq = this.data.EXAM_QUESTIONS.find(q => q.Exam_Question_ID === ans.Exam_Question_ID);
    const maxPts = eq ? eq.Points : 100;
    const score = Number(manualScore);
    if (isNaN(score) || score < 0 || score > maxPts) {
      throw new Error(`Nilai harus antara 0 dan ${maxPts}`);
    }

    const now = new Date().toISOString();
    ans.Manual_Score = score;
    ans.Lecturer_Feedback = feedback || '';
    ans.Graded_At = now;
    ans.Graded_By = 'DOSEN';

    // Recalculate Attempt Scores
    const attempt = this.data.ATTEMPTS.find(a => a.Attempt_ID === ans.Attempt_ID);
    if (attempt) {
      const allStudentAnswers = this.data.ANSWERS.filter(a => a.Attempt_ID === attempt.Attempt_ID);
      let objTotal = 0;
      let essayTotal = 0;
      allStudentAnswers.forEach(a => {
        if (a.Selected_Option_ID) objTotal += (Number(a.Auto_Score) || 0);
        else essayTotal += (Number(a.Manual_Score) || 0);
      });
      attempt.Objective_Score = objTotal;
      attempt.Essay_Score = essayTotal;
      attempt.Final_Score = objTotal + essayTotal;
    }

    this.logAdmin('GRADE_ESSAY', 'ANSWER', answerId, `Beri nilai essay ${score}/${maxPts}`);
    this.persist();
    return { Answer_ID: answerId, Manual_Score: score, Graded_At: now };
  }

  public getRunResults(runId: string) {
    const attempts = this.data.ATTEMPTS.filter(a => a.Run_ID === runId);
    const userMap = new Map(this.data.USERS.map(u => [u.User_ID, u]));

    return attempts.map(att => {
      const student = userMap.get(att.Student_ID);
      const answers = this.data.ANSWERS.filter(a => a.Attempt_ID === att.Attempt_ID);
      const pendingEssay = answers.some(a => !a.Selected_Option_ID && (a.Manual_Score === undefined || a.Manual_Score === null || a.Manual_Score === 0 && !a.Graded_At));

      return {
        Attempt_ID: att.Attempt_ID,
        Run_ID: att.Run_ID,
        Student_ID: student?.User_ID || '',
        NIM: student?.NIM || '',
        Full_Name: student?.Full_Name || '',
        Class_Name: student?.Class_Name || '',
        Started_At: att.Started_At,
        Submitted_At: att.Submitted_At,
        Status: att.Status,
        Objective_Score: att.Objective_Score,
        Essay_Score: att.Essay_Score,
        Final_Score: att.Final_Score,
        Grading_Status: pendingEssay ? 'PENDING_ESSAY' : 'COMPLETED',
        Violation_Count: att.Violation_Count,
        Last_Sync_At: att.Last_Sync_At
      };
    });
  }

  public getStudentAnswers(attemptId: string) {
    const attempt = this.data.ATTEMPTS.find(a => a.Attempt_ID === attemptId);
    if (!attempt) throw new Error('Attempt tidak ditemukan');
    const student = this.data.USERS.find(u => u.User_ID === attempt.Student_ID);
    const run = this.data.EXAM_RUNS.find(r => r.Run_ID === attempt.Run_ID);
    const exam = run ? this.data.EXAMS.find(e => e.Exam_ID === run.Exam_ID) : undefined;
    const eqList = exam ? this.data.EXAM_QUESTIONS.filter(eq => eq.Exam_ID === exam.Exam_ID).sort((a, b) => a.Question_Number - b.Question_Number) : [];

    const versionMap = new Map(this.data.QUESTION_VERSIONS.map(v => [v.Version_ID, v]));
    const questionMap = new Map(this.data.QUESTIONS.map(q => [q.Question_ID, q]));
    const optionMap = new Map(this.data.OPTIONS.map(o => [o.Option_ID, o]));

    const answers = this.data.ANSWERS.filter(a => a.Attempt_ID === attemptId);
    const answerMap = new Map(answers.map(a => [a.Exam_Question_ID, a]));

    const questions = eqList.map(eq => {
      const ver = versionMap.get(eq.Version_ID);
      const qMaster = ver ? questionMap.get(ver.Question_ID) : undefined;
      const ans = answerMap.get(eq.Exam_Question_ID);
      const selOpt = ans?.Selected_Option_ID ? optionMap.get(ans.Selected_Option_ID) : undefined;
      const allOpts = ver ? this.data.OPTIONS.filter(o => o.Version_ID === ver.Version_ID) : [];
      const correctOpt = allOpts.find(o => o.Is_Correct);

      return {
        Answer_ID: ans?.Answer_ID || '',
        Exam_Question_ID: eq.Exam_Question_ID,
        Question_Number: eq.Question_Number,
        Question_Type: qMaster?.Question_Type || 'MCQ',
        Question_Text: ver?.Question_Text || '',
        Image_URL: ver?.Image_URL || '',
        Max_Points: eq.Points,
        Selected_Option_ID: ans?.Selected_Option_ID || '',
        Selected_Option_Key: selOpt?.Option_Key || '',
        Selected_Option_Text: selOpt?.Option_Text || '',
        Correct_Option_Key: correctOpt?.Option_Key || '',
        Correct_Option_Text: correctOpt?.Option_Text || '',
        Is_Correct: Boolean(ans?.Is_Correct),
        Auto_Score: ans?.Auto_Score || 0,
        Answer_Text: ans?.Answer_Text || '',
        Answer_Guide: ver?.Answer_Guide || '',
        Manual_Score: ans?.Manual_Score,
        Lecturer_Feedback: ans?.Lecturer_Feedback || '',
        Options: allOpts
      };
    });

    return {
      student: {
        NIM: student?.NIM || '',
        Full_Name: student?.Full_Name || '',
        Class_Name: student?.Class_Name || ''
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
      questions
    };
  }

  // Safe Reset Run Responses
  public resetRunResponses(runId: string, confirmation: string) {
    if (!runId) throw new Error('Run ID wajib ditentukan');
    if (confirmation !== runId && confirmation.trim().toUpperCase() !== 'RESET') {
      throw new Error('Konfirmasi tidak valid. Harap masukkan Run_ID atau "RESET".');
    }

    const run = this.data.EXAM_RUNS.find(r => r.Run_ID === runId);
    if (!run) throw new Error('Sesi ujian tidak ditemukan');

    const attempts = this.data.ATTEMPTS.filter(a => a.Run_ID === runId);
    const attemptIds = new Set(attempts.map(a => a.Attempt_ID));

    const ansCountBefore = this.data.ANSWERS.length;
    this.data.ANSWERS = this.data.ANSWERS.filter(a => !attemptIds.has(a.Attempt_ID));
    const deletedAnswers = ansCountBefore - this.data.ANSWERS.length;

    const vioCountBefore = this.data.VIOLATIONS.length;
    this.data.VIOLATIONS = this.data.VIOLATIONS.filter(v => !attemptIds.has(v.Attempt_ID));
    const deletedViolations = vioCountBefore - this.data.VIOLATIONS.length;

    const permCountBefore = this.data.PERMISSIONS.length;
    this.data.PERMISSIONS = this.data.PERMISSIONS.filter(p => !attemptIds.has(p.Attempt_ID));
    const deletedPerms = permCountBefore - this.data.PERMISSIONS.length;

    const attCountBefore = this.data.ATTEMPTS.length;
    this.data.ATTEMPTS = this.data.ATTEMPTS.filter(a => a.Run_ID !== runId);
    const deletedAttempts = attCountBefore - this.data.ATTEMPTS.length;

    const now = new Date().toISOString();
    run.Data_Status = 'RESET';
    run.Reset_At = now;

    this.logAdmin('RESET_RUN', 'EXAM_RUN', runId, `Reset respons: ${deletedAttempts} attempts, ${deletedAnswers} answers, ${deletedViolations} violations dihapus`);
    this.persist();

    return {
      status: 'success',
      runId,
      deletedAttempts,
      deletedAnswers,
      deletedViolations,
      deletedPermissions: deletedPerms,
      resetAt: now
    };
  }

  // Dashboard stats
  public getDashboardStats() {
    const activeCourses = this.data.COURSES.filter(c => c.Status === 'ACTIVE').length;
    const activeQuestions = this.data.QUESTIONS.filter(q => q.Status === 'ACTIVE').length;
    const openRuns = this.data.EXAM_RUNS.filter(r => r.Status === 'OPEN');
    const inProgressAttempts = this.data.ATTEMPTS.filter(a => a.Status === 'IN_PROGRESS').length;
    const pendingEssays = this.data.ANSWERS.filter(a => !a.Selected_Option_ID && a.Answer_Text && (a.Manual_Score === undefined || a.Manual_Score === null || a.Manual_Score === 0 && !a.Graded_At)).length;
    const activeViolations = this.data.VIOLATIONS.filter(v => v.Alarm_Status === 'ACTIVE').length;

    return {
      activeCoursesCount: activeCourses,
      activeQuestionsCount: activeQuestions,
      openRunsCount: openRuns.length,
      inProgressStudentsCount: inProgressAttempts,
      pendingEssaysCount: pendingEssays,
      activeViolationsCount: activeViolations,
      openRuns
    };
  }

  // All Violations with Student and Exam Details
  public getAllViolations(runId?: string, status?: string) {
    let list = this.data.VIOLATIONS;

    if (runId) {
      const runAttempts = new Set(this.data.ATTEMPTS.filter(a => a.Run_ID === runId).map(a => a.Attempt_ID));
      list = list.filter(v => runAttempts.has(v.Attempt_ID));
    }

    if (status && status !== 'ALL') {
      if (status === 'AUTHORIZED') {
        list = list.filter(v => v.Is_Authorized === true);
      } else if (status === 'UNAUTHORIZED') {
        list = list.filter(v => v.Is_Authorized === false);
      } else if (status === 'ALARM_ACTIVE') {
        list = list.filter(v => v.Alarm_Status === 'ACTIVE');
      } else if (status === 'RESOLVED') {
        list = list.filter(v => v.Alarm_Status === 'RESOLVED');
      }
    }

    return list
      .map(v => {
        const attempt = this.data.ATTEMPTS.find(a => a.Attempt_ID === v.Attempt_ID);
        const student = this.data.USERS.find(u => u.User_ID === attempt?.Student_ID || u.NIM === attempt?.Student_ID);
        const run = this.data.EXAM_RUNS.find(r => r.Run_ID === attempt?.Run_ID);
        const exam = this.data.EXAMS.find(e => e.Exam_ID === run?.Exam_ID);

        return {
          ...v,
          Student_Name: student?.Full_Name || 'Mahasiswa',
          NIM: student?.NIM || attempt?.Student_ID || '-',
          Class_Name: student?.Class_Name || run?.Class_Name || '-',
          Run_ID: attempt?.Run_ID || '',
          Run_Name: run?.Run_Name || 'Sesi Ujian',
          Exam_Name: exam?.Exam_Name || 'Ujian CBT'
        };
      })
      .sort((a, b) => new Date(b.Detected_At).getTime() - new Date(a.Detected_At).getTime());
  }

  // Participants (Students) with Exam Participation History
  public getParticipants(search?: string, className?: string) {
    let students = this.data.USERS.filter(u => u.Role === 'STUDENT' || !u.Role);

    if (search) {
      const q = search.toLowerCase().trim();
      students = students.filter(s =>
        s.Full_Name?.toLowerCase().includes(q) ||
        s.NIM?.toLowerCase().includes(q) ||
        (s.Email && s.Email.toLowerCase().includes(q))
      );
    }

    if (className && className !== 'ALL') {
      students = students.filter(s => s.Class_Name === className);
    }

    return students.map(s => {
      const studentAttempts = this.data.ATTEMPTS.filter(a => a.Student_ID === s.User_ID || a.Student_ID === s.NIM);
      const completedAttempts = studentAttempts.filter(a => a.Status === 'SUBMITTED');
      
      const avgScore = completedAttempts.length > 0
        ? Math.round(
            (completedAttempts.reduce((acc, curr) => acc + (curr.Final_Score ?? 0), 0) /
              completedAttempts.length) *
              10
          ) / 10
        : null;

      const latestAttempt = studentAttempts.sort(
        (a, b) => new Date(b.Started_At).getTime() - new Date(a.Started_At).getTime()
      )[0];

      const latestRun = latestAttempt ? this.data.EXAM_RUNS.find(r => r.Run_ID === latestAttempt.Run_ID) : null;
      const latestExam = latestRun ? this.data.EXAMS.find(e => e.Exam_ID === latestRun.Exam_ID) : null;

      return {
        User_ID: s.User_ID,
        NIM: s.NIM,
        Full_Name: s.Full_Name,
        Email: s.Email,
        Class_Name: s.Class_Name || 'Kelas A',
        Created_At: s.Created_At,
        Total_Attempts: studentAttempts.length,
        Completed_Attempts: completedAttempts.length,
        Average_Score: avgScore,
        Last_Exam_Name: latestExam?.Exam_Name || (latestRun ? latestRun.Run_Name : '-'),
        Last_Exam_Status: latestAttempt?.Status || '-',
        Last_Exam_Date: latestAttempt?.Started_At || '-'
      };
    });
  }
}

export const db = new DatabaseService();
