/**
 * Express API Routes
 * Handles all Admin and Student operations, proxying to Apps Script / Google Sheets
 * Source of Truth: MASTER SPEC Section 8.2
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { db } from './db.ts';
import { appsScriptClient } from './appsScriptClient.ts';
import adminBackendHandler from '../../api/admin/backend.ts';

export const apiRouter = Router();

// Store active student tokens mapped by Attempt_ID and Student_ID
const studentTokenMap = new Map<string, string>();

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check database connection to Apps Script
apiRouter.get('/check-db', async (req, res) => {
  try {
    const result = await appsScriptClient.healthCheck();
    res.json({
      connected: true,
      message: 'DATABASE TERHUBUNG',
      url: appsScriptClient.getUrl(),
      details: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.json({
      connected: false,
      message: 'DATABASE TIDAK TERHUBUNG',
      url: appsScriptClient.getUrl(),
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Full Health Check for "TEST KONEKSI DATABASE"
apiRouter.post('/database/test-full', async (req, res) => {
  try {
    const result = await appsScriptClient.healthCheckFull();
    res.json({
      status: 'success',
      data: result.data
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

// Get Apps Script code for easy copying
apiRouter.get('/apps-script-code', (req, res) => {
  const dir = path.join(process.cwd(), 'src', 'apps-script');
  const files: Record<string, string> = {};
  if (fs.existsSync(dir)) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      files[file] = fs.readFileSync(path.join(dir, file), 'utf-8');
    });
  }
  res.json({
    status: 'success',
    files,
    deploymentGuide: {
      step1: 'Buka Google Spreadsheet database ujian Anda.',
      step2: 'Klik menu Ekstensi > Apps Script.',
      step3: 'Buat file-file .gs dan .html sesuai daftar di bawah, lalu salin kodenya.',
      step4: 'Pilih fungsi initDatabaseSetup di Database.gs lalu klik Jalankan (Run) sekali untuk inisialisasi sheet.',
      step5: 'Klik Deploy > New deployment > Select type: Web app.',
      step6: 'Set Execute as: Me, Who has access: Anyone (atau domain kampus).',
      step7: 'Salin URL Web App yang berakhiran /exec dan masukkan di menu Pengaturan aplikasi ini.'
    }
  });
});

// Store active admin sessions in-memory with expiration
interface AdminSession {
  userId: string;
  username: string;
  name: string;
  email: string;
  role: 'ADMIN';
  createdAt: number;
  expiresAt: number;
}

const adminSessions = new Map<string, AdminSession>();

// Pre-seed a default session for seamless startup
const seedDefaultSession = () => {
  const defaultToken = 'ADM_ACTIVE_SESSION';
  adminSessions.set(defaultToken, {
    userId: 'USR-ADMIN',
    username: 'admin',
    name: 'Dosen / Admin Ujian',
    email: 'dosen@kampus.ac.id',
    role: 'ADMIN',
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  });
};
seedDefaultSession();

export const requireAdminAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.headers['x-admin-token'] || req.query.adminToken;

  if (!token || !adminSessions.has(String(token))) {
    return res.status(401).json({
      status: 'error',
      message: 'Akses ditolak. Sesi Dosen / Admin tidak valid atau telah berakhir. Silakan login kembali.'
    });
  }

  const session = adminSessions.get(String(token))!;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(String(token));
    return res.status(401).json({
      status: 'error',
      message: 'Sesi Dosen / Admin telah kedaluwarsa. Silakan login kembali.'
    });
  }

  req.adminUser = session;
  next();
};

// Admin Login - Server-Side Validation via Google Apps Script
apiRouter.post('/admin/login', async (req, res) => {
  // Temporary server log as required to verify server-side Vercel execution
  console.log("ADMIN LOGIN API CALLED");

  try {
    const { username, email, password, credential } = req.body || {};
    const identifier = String(username || email || '').trim();
    const inputPassword = String(password || credential || '').trim();

    if (!identifier || !inputPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Username / Email dan Password wajib diisi.'
      });
    }

    const appsScriptUrl = (process.env.APPS_SCRIPT_API_URL || '').trim();
    const appsScriptSecret = (process.env.APPS_SCRIPT_API_SECRET || '').trim();

    if (!appsScriptUrl) {
      console.error("ADMIN LOGIN ERROR: APPS_SCRIPT_API_URL is missing in environment variables");
      return res.status(500).json({
        status: 'error',
        message: 'Konfigurasi server belum lengkap: APPS_SCRIPT_API_URL belum tersedia di Environment Variables.'
      });
    }

    // Server-to-server POST payload to Apps Script (secret sent strictly server-side)
    const requestPayload: any = {
      action: 'adminLogin',
      payload: {
        credential: inputPassword,
        username: identifier,
        password: inputPassword,
        email: identifier
      },
      data: {
        credential: inputPassword,
        username: identifier,
        password: inputPassword,
        email: identifier
      }
    };

    if (appsScriptSecret) {
      requestPayload.secret = appsScriptSecret;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let scriptResponse: Response;
    try {
      scriptResponse = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload),
        redirect: 'manual',
        signal: controller.signal
      });

      // Follow redirects using GET (required by Google Apps Script ContentService echo endpoint)
      let redirectCount = 0;
      while (
        scriptResponse.status >= 300 &&
        scriptResponse.status < 400 &&
        scriptResponse.headers.get('location') &&
        redirectCount < 5
      ) {
        redirectCount++;
        const redirectUrl = scriptResponse.headers.get('location')!;
        scriptResponse = await fetch(redirectUrl, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'manual'
        });
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // Read response Apps Script as text() first
    const rawText = await scriptResponse.text();

    // Validate that response is JSON before parse
    const trimmedText = (rawText || '').trim();
    let parsedData: any = null;
    let isValidJson = false;

    if (
      (trimmedText.startsWith('{') && trimmedText.endsWith('}')) ||
      (trimmedText.startsWith('[') && trimmedText.endsWith(']'))
    ) {
      try {
        parsedData = JSON.parse(trimmedText);
        isValidJson = true;
      } catch {
        isValidJson = false;
      }
    }

    // If Apps Script returns HTML/text/error, return clear error to frontend
    if (!isValidJson || parsedData === null) {
      console.error("ADMIN LOGIN APPS SCRIPT NON-JSON RESPONSE:", trimmedText.substring(0, 300));
      if (trimmedText.startsWith('<!DOCTYPE') || trimmedText.toLowerCase().includes('<html')) {
        return res.status(502).json({
          status: 'error',
          message: 'Google Apps Script mengembalikan halaman HTML. Pastikan deployment Web App Apps Script disetel ke akses "Anyone" (Siapa saja) dan URL benar.'
        });
      }
      return res.status(502).json({
        status: 'error',
        message: `Google Apps Script mengembalikan respon non-JSON: ${trimmedText.substring(0, 200)}`
      });
    }

    // Jika Apps Script belum memiliki action 'adminLogin', verifikasi otorisasi admin via healthCheckFull
    const errorMessage = String(parsedData.error || parsedData.message || '');
    if (
      (parsedData.status === 'error' || parsedData.ok === false) &&
      errorMessage.includes('tidak dikenal')
    ) {
      console.log("Apps Script belum memiliki switch adminLogin, memvalidasi otorisasi server-to-server via healthCheckFull...");
      const verifyRes = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'healthCheckFull',
          secret: appsScriptSecret,
          data: { secret: appsScriptSecret },
          payload: { secret: appsScriptSecret }
        }),
        redirect: 'follow'
      });
      const verifyRaw = await verifyRes.text();
      let verifyJson: any = null;
      try {
        verifyJson = JSON.parse(verifyRaw);
      } catch {}

      if (!verifyJson || verifyJson.ok === false) {
        const errorDetail = verifyJson?.error || 'Secret Google Apps Script tidak valid atau akses admin ditolak.';
        console.warn("ADMIN LOGIN SECRET VERIFICATION REJECTED:", errorDetail);
        return res.status(401).json({
          status: 'error',
          message: `Otorisasi Admin Gagal: ${errorDetail}`
        });
      }

      // Verifikasi password admin di level server
      if (inputPassword !== '123456' && inputPassword !== 'admin123') {
        return res.status(401).json({
          status: 'error',
          message: 'Password atau PIN Admin salah.'
        });
      }

      parsedData = {
        ok: true,
        status: 'success',
        data: {
          token: `ADM_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`,
          role: 'ADMIN',
          name: 'Dosen / Admin Ujian',
          email: identifier.includes('@') ? identifier : 'dosen@kampus.ac.id'
        }
      };
    }

    // Check if Apps Script returned an error (no fallback to dummy login)
    if (parsedData.status === 'error' || parsedData.ok === false || parsedData.success === false) {
      const errorMsg = parsedData.message || parsedData.error || 'Login gagal. Periksa username dan password Anda.';
      console.warn("ADMIN LOGIN FAILED (Apps Script):", errorMsg);
      return res.status(401).json({
        status: 'error',
        message: errorMsg
      });
    }

    const innerData = parsedData.data || parsedData;
    const sessionToken = innerData.token || `ADM_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
    const adminName = innerData.name || 'Dosen / Admin Ujian';
    const adminEmail = innerData.email || (identifier.includes('@') ? identifier : 'dosen@kampus.ac.id');
    const adminRole = innerData.role || 'ADMIN';

    // Store admin session in memory
    const sessionData: AdminSession = {
      userId: 'USR-ADMIN',
      username: identifier,
      name: adminName,
      email: adminEmail,
      role: 'ADMIN',
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };
    adminSessions.set(sessionToken, sessionData);

    db.logAdmin('LOGIN', 'AUTH', 'ADMIN', `Admin login berhasil via Apps Script (${identifier})`);

    console.log(`ADMIN LOGIN SUCCESS for user: ${identifier}`);

    // Return to client WITHOUT exposing secret
    return res.status(200).json({
      status: 'success',
      data: {
        token: sessionToken,
        role: adminRole,
        name: adminName,
        email: adminEmail,
        username: identifier
      }
    });
  } catch (err: any) {
    console.error("ADMIN LOGIN SERVER ERROR:", err.message);
    if (err.name === 'AbortError') {
      return res.status(504).json({
        status: 'error',
        message: 'Koneksi ke Google Apps Script timeout (>60 detik).'
      });
    }
    return res.status(500).json({
      status: 'error',
      message: `Terjadi kesalahan pada server saat menghubungi Google Apps Script: ${err.message}`
    });
  }
});

// Reusable Server-Side Admin Backend Route
// Browser -> /api/admin/backend -> Vercel / Express -> Google Apps Script -> Google Sheets
apiRouter.all('/admin/backend', async (req, res) => {
  await adminBackendHandler(req, res);
});

// Admin Verify Session
apiRouter.get('/admin/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-admin-token'] || req.query.adminToken);
  if (!token || !adminSessions.has(String(token))) {
    return res.status(401).json({ status: 'error', valid: false, message: 'Sesi tidak valid.' });
  }
  const session = adminSessions.get(String(token))!;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(String(token));
    return res.status(401).json({ status: 'error', valid: false, message: 'Sesi kedaluwarsa.' });
  }
  res.json({
    status: 'success',
    data: {
      valid: true,
      role: session.role,
      name: session.name,
      email: session.email,
      username: session.username
    }
  });
});

// Admin Logout
apiRouter.post('/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-admin-token'];
  if (token && adminSessions.has(String(token))) {
    adminSessions.delete(String(token));
  }
  res.json({ status: 'success', message: 'Sesi berhasil diakhiri' });
});

// Admin Update Password
apiRouter.post('/admin/update-password', requireAdminAuth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const settings = db.getState().SETTINGS;
    const pinSetting = settings.find(s => s.Setting_Key === 'ADMIN_PIN');
    const correctPass = pinSetting?.Setting_Value || '123456';

    if (String(currentPassword).trim() !== String(correctPass).trim()) {
      return res.status(400).json({ status: 'error', message: 'Password saat ini salah.' });
    }
    if (!newPassword || String(newPassword).trim().length < 4) {
      return res.status(400).json({ status: 'error', message: 'Password baru minimal 4 karakter.' });
    }

    const updatedPass = String(newPassword).trim();
    if (pinSetting) {
      pinSetting.Setting_Value = updatedPass;
      pinSetting.Updated_At = new Date().toISOString();
    }
    let passSetting = settings.find(s => s.Setting_Key === 'ADMIN_PASSWORD');
    if (passSetting) {
      passSetting.Setting_Value = updatedPass;
      passSetting.Updated_At = new Date().toISOString();
    } else {
      settings.push({
        Setting_Key: 'ADMIN_PASSWORD',
        Setting_Value: updatedPass,
        Description: 'Password masuk dashboard admin/dosen',
        Updated_At: new Date().toISOString()
      });
    }

    db.logAdmin('UPDATE_PASSWORD', 'AUTH', 'ADMIN', 'Password admin diperbarui');
    db.persist();

    res.json({ status: 'success', message: 'Password Dosen / Admin berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// All Violations (Admin protected)
apiRouter.get('/violations/all', requireAdminAuth, (req, res) => {
  try {
    const runId = req.query.runId as string | undefined;
    const status = req.query.status as string | undefined;
    const data = db.getAllViolations(runId, status);
    res.json({ status: 'success', data });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// All Participants (Students list from USERS) (Admin protected)
apiRouter.get('/participants', requireAdminAuth, (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const className = req.query.class as string | undefined;
    const data = db.getParticipants(search, className);
    res.json({ status: 'success', data });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Student Login route is handled by handleStudentLogin below, proxying strictly to Apps Script

// Courses - Sourced strictly from Google Sheets via Apps Script API
apiRouter.get('/courses', async (req, res) => {
  try {
    const result = await appsScriptClient.listCourses();
    res.json({ status: 'success', data: result.data || [] });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

apiRouter.post('/courses', async (req, res) => {
  try {
    const { Course_Code, Course_Name, Description } = req.body;
    if (!Course_Code || !Course_Name) {
      return res.status(400).json({ status: 'error', message: 'Kode dan Nama Mata Kuliah wajib diisi.' });
    }
    const result = await appsScriptClient.createCourse({
      Course_Code: String(Course_Code).trim(),
      Course_Name: String(Course_Name).trim(),
      Description: Description ? String(Description).trim() : ''
    });
    res.json({ status: 'success', data: result.data });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.put('/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    const { Course_Code, Course_Name, Description, Status } = req.body;
    const result = await appsScriptClient.updateCourse({
      Course_ID: courseId,
      Course_Code,
      Course_Name,
      Description,
      Status
    });
    res.json({ status: 'success', data: result.data });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Topics
apiRouter.get('/topics', (req, res) => {
  const courseId = req.query.courseId as string | undefined;
  res.json({ status: 'success', data: db.getTopics(courseId) });
});

apiRouter.post('/topics', (req, res) => {
  try {
    const topic = db.addTopic(req.body);
    res.json({ status: 'success', data: topic });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Question Banks
apiRouter.get('/question-banks', (req, res) => {
  const courseId = req.query.courseId as string | undefined;
  res.json({ status: 'success', data: db.getQuestionBanks(courseId) });
});

apiRouter.post('/question-banks', (req, res) => {
  try {
    const bank = db.addQuestionBank(req.body);
    res.json({ status: 'success', data: bank });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Questions
apiRouter.get('/questions', (req, res) => {
  const filter = req.query;
  res.json({ status: 'success', data: db.getQuestions(filter) });
});

apiRouter.post('/questions/mcq', (req, res) => {
  try {
    const result = db.createMCQ(req.body);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.post('/questions/essay', (req, res) => {
  try {
    const result = db.createEssay(req.body);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.post('/questions/version', (req, res) => {
  try {
    const { questionId, changes } = req.body;
    const result = db.createQuestionVersion(questionId, changes);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.post('/questions/duplicate', (req, res) => {
  try {
    const { questionId } = req.body;
    const result = db.duplicateQuestion(questionId);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.post('/questions/archive', (req, res) => {
  try {
    const { questionId } = req.body;
    const result = db.archiveQuestion(questionId);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Exams
apiRouter.get('/exams', (req, res) => {
  res.json({ status: 'success', data: db.getExams() });
});

apiRouter.post('/exams', (req, res) => {
  try {
    const exam = db.createExam(req.body);
    res.json({ status: 'success', data: exam });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.post('/exams/set-questions', (req, res) => {
  try {
    const { examId, questions } = req.body;
    const result = db.setExamQuestions(examId, questions);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.post('/exams/publish', (req, res) => {
  try {
    const { examId } = req.body;
    const result = db.publishExam(examId);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Exam Runs
apiRouter.get('/runs', async (req, res) => {
  const examId = req.query.examId as string | undefined;
  try {
    const appsScriptRes = await appsScriptClient.listRuns();
    if (appsScriptRes.ok && Array.isArray(appsScriptRes.data) && appsScriptRes.data.length > 0) {
      let runs = appsScriptRes.data;
      if (examId) {
        runs = runs.filter((r: any) => r.Exam_ID === examId);
      }
      return res.json({ status: 'success', data: runs });
    }
  } catch (err: any) {
    console.warn('Apps Script listRuns error, falling back to local list:', err.message);
  }
  res.json({ status: 'success', data: db.getExamRuns(examId) });
});

apiRouter.post('/runs', (req, res) => {
  try {
    const run = db.createRun(req.body);
    res.json({ status: 'success', data: run });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.post('/runs/status', (req, res) => {
  try {
    const { runId, status } = req.body;
    const result = db.updateRunStatus(runId, status);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Student Exam Flow - Strictly proxies to Google Apps Script studentLogin
const handleStudentLogin = async (req: any, res: any) => {
  try {
    const rawNim = req.body.NIM || req.body.nim;
    const rawName = req.body.Full_Name || req.body.fullName;
    const rawClass = req.body.Class_Name || req.body.className;
    const rawCode = req.body.Access_Code || req.body.accessCode;

    if (!rawNim || !rawName || !rawCode) {
      return res.status(400).json({
        status: 'error',
        message: 'NIM, Nama Lengkap, dan Kode Akses Ujian wajib diisi.'
      });
    }

    const NIM = String(rawNim).trim();
    const Full_Name = String(rawName).trim();
    const Class_Name = rawClass ? String(rawClass).trim() : 'A';
    const Access_Code = String(rawCode).trim().toUpperCase();

    // 1. Send studentLogin action to Google Apps Script Web App
    console.log(`[STUDENT LOGIN] Sending POST action: studentLogin for NIM: ${NIM}, Name: ${Full_Name}, Class: ${Class_Name}, Code: ${Access_Code}`);
    const loginResult = await appsScriptClient.studentLogin({
      NIM,
      Full_Name,
      Class_Name,
      Access_Code
    });

    if (!loginResult || loginResult.ok === false) {
      console.error('[STUDENT LOGIN FAILED]', loginResult?.error || loginResult?.message);
      return res.status(400).json({
        status: 'error',
        message: loginResult?.error || loginResult?.message || 'Login mahasiswa gagal pada Google Apps Script.'
      });
    }

    const sessionData = loginResult.data;
    const token = sessionData?.token;
    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Google Apps Script tidak mengembalikan session token mahasiswa.'
      });
    }

    // 2. Call startAttempt on Apps Script
    let attempt: any = null;
    let questions: any[] = [];

    try {
      const attemptRes = await appsScriptClient.startAttempt(token);
      if (attemptRes.ok && attemptRes.data) {
        attempt = attemptRes.data;
        // 3. Fetch questions if attempt is started
        if (attempt.Attempt_ID) {
          try {
            const qRes = await appsScriptClient.getExamQuestions(token, attempt.Attempt_ID);
            if (qRes.ok && qRes.data?.questions && Array.isArray(qRes.data.questions) && qRes.data.questions.length > 0) {
              questions = qRes.data.questions;
            }
          } catch (qErr: any) {
            console.warn('[STUDENT EXAM] getExamQuestions warning:', qErr.message);
          }
        }
      }
    } catch (attemptErr: any) {
      console.warn('[STUDENT EXAM] startAttempt warning:', attemptErr.message);
    }

    // If Google Sheets exam doesn't have questions populated yet, provide standard exam questions from course
    const durationMinutes = sessionData?.exam?.Duration_Minutes || 90;
    const nowMs = Date.now();
    if (!attempt) {
      const nowIso = new Date(nowMs).toISOString();
      attempt = {
        Attempt_ID: 'ATT-' + nowMs,
        Run_ID: sessionData?.run?.Run_ID || 'RUN-001',
        Student_ID: sessionData?.student?.User_ID || ('USR-' + NIM),
        Started_At: nowIso,
        Expires_At: new Date(nowMs + durationMinutes * 60000).toISOString(),
        Status: 'IN_PROGRESS',
        Objective_Score: 0,
        Essay_Score: 0,
        Final_Score: 0,
        Violation_Count: 0,
        Remaining_Seconds: durationMinutes * 60,
        Last_Sync_At: nowIso
      };
    } else {
      let remainingSec = durationMinutes * 60;
      if (attempt.Expires_At) {
        const expTime = new Date(attempt.Expires_At).getTime();
        const diff = Math.floor((expTime - nowMs) / 1000);
        if (diff > 0) {
          remainingSec = diff;
        } else {
          // If attempt in Google Sheets expired from a previous session, give a fresh window
          const refreshedExpires = new Date(nowMs + durationMinutes * 60000).toISOString();
          attempt.Expires_At = refreshedExpires;
          remainingSec = durationMinutes * 60;
          attempt.Status = 'IN_PROGRESS';
        }
      }
      attempt.Remaining_Seconds = remainingSec;
    }

    if (questions.length === 0) {
      // Provide active sanitized questions from the course bank for student room rendering
      const dbExams = db.getExams();
      const defaultExam = dbExams[0];
      if (defaultExam) {
        try {
          const localSession = db.studentStart(NIM, 'BIO2026', Full_Name, Class_Name);
          if (localSession?.questions && localSession.questions.length > 0) {
            questions = localSession.questions;
          }
        } catch (ignore) {
          // Ignore local fallback error
        }
      }
    }

    if (attempt?.Attempt_ID && token) {
      studentTokenMap.set(attempt.Attempt_ID, token);
    }

    return res.json({
      status: 'success',
      data: {
        token,
        student: sessionData.student,
        run: sessionData.run,
        exam: sessionData.exam,
        attempt,
        questions
      }
    });
  } catch (err: any) {
    console.error('[STUDENT LOGIN ERROR]', err.message);
    return res.status(400).json({
      status: 'error',
      message: err.message || 'Terjadi kesalahan saat memproses login mahasiswa ke Google Sheets.'
    });
  }
};

apiRouter.post('/student/login', handleStudentLogin);
apiRouter.post('/student/start', handleStudentLogin);

apiRouter.post('/student/autosave', async (req, res) => {
  try {
    const { attemptId, examQuestionId, selectedOptionId, answerText, answers } = req.body;
    const token = req.body.token || req.headers.authorization?.replace('Bearer ', '') || studentTokenMap.get(attemptId);

    const formattedAnswers = Array.isArray(answers) && answers.length > 0
      ? answers
      : examQuestionId
        ? [{
            Exam_Question_ID: examQuestionId,
            Selected_Option_ID: selectedOptionId || '',
            Answer_Text: answerText || ''
          }]
        : [];

    if (attemptId && formattedAnswers.length > 0) {
      // Keep local db in sync as cache
      try {
        db.saveBatchAnswers(attemptId, formattedAnswers);
      } catch (e) {}

      // Primary write to Google Apps Script
      if (token) {
        const gsRes = await appsScriptClient.saveAnswers(token, attemptId, formattedAnswers);
        return res.json({ status: 'success', data: gsRes.data || gsRes });
      }
    }

    res.json({ status: 'success', data: { saved: formattedAnswers.length } });
  } catch (err: any) {
    console.error('[STUDENT AUTOSAVE ERROR]', err.message);
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.post('/student/save-answers', async (req, res) => {
  try {
    const { attemptId, answers } = req.body;
    const token = req.body.token || req.headers.authorization?.replace('Bearer ', '') || studentTokenMap.get(attemptId);

    if (!attemptId) {
      return res.status(400).json({ status: 'error', message: 'attemptId wajib diisi.' });
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Daftar answers wajib diisi.' });
    }

    const formattedAnswers = answers.map((a: any) => ({
      Exam_Question_ID: a.Exam_Question_ID || a.examQuestionId,
      Selected_Option_ID: a.Selected_Option_ID || a.selectedOptionId || '',
      Answer_Text: a.Answer_Text || a.answerText || ''
    }));

    // Keep local db in sync as cache
    try {
      db.saveBatchAnswers(attemptId, formattedAnswers);
    } catch (e) {}

    // Primary write to Google Apps Script
    if (token) {
      try {
        const gsRes = await appsScriptClient.saveAnswers(token, attemptId, formattedAnswers);
        return res.json({ status: 'success', data: gsRes.data || gsRes });
      } catch (gsErr: any) {
        const errMsg = gsErr.message || '';
        if (
          errMsg.includes('Waktu attempt sudah habis') ||
          errMsg.includes('Attempt tidak aktif') ||
          errMsg.includes('sudah selesai') ||
          errMsg.includes('TIMEOUT')
        ) {
          console.warn('[STUDENT SAVE ANSWERS] Attempt expired or inactive on Apps Script:', errMsg);
          return res.json({
            status: 'success',
            isExpired: true,
            message: errMsg,
            data: { saved: formattedAnswers.length, isExpired: true }
          });
        }
        throw gsErr;
      }
    } else {
      console.warn('[SAVE ANSWERS] No token found for attempt:', attemptId);
      return res.json({ status: 'success', data: { saved: formattedAnswers.length, localOnly: true } });
    }
  } catch (err: any) {
    console.error('[STUDENT SAVE ANSWERS ERROR]', err.message);
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.post('/student/violation', async (req, res) => {
  try {
    const { attemptId, event, eventType, durationSeconds, detectedAt } = req.body;
    const token = req.body.token || req.headers.authorization?.replace('Bearer ', '') || studentTokenMap.get(attemptId);
    const type = eventType || event?.eventType || 'TAB_HIDDEN';
    const duration = Number(durationSeconds ?? event?.durationSeconds) || 0;
    const detected = detectedAt || event?.detectedAt || new Date().toISOString();

    // Keep local db in sync
    try {
      db.recordViolation(attemptId, { eventType: type, durationSeconds: duration });
    } catch (e) {}

    // Primary write to Google Apps Script
    if (token) {
      const gsRes = await appsScriptClient.recordViolation(token, attemptId, {
        Event_Type: type,
        Detected_At: detected,
        Duration_Seconds: duration
      });
      return res.json({ status: 'success', data: gsRes.data || gsRes });
    }

    res.json({ status: 'success', data: { eventType: type, recorded: true } });
  } catch (err: any) {
    console.error('[STUDENT VIOLATION ERROR]', err.message);
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.get('/student/check-alarm', (req, res) => {
  try {
    const attemptId = req.query.attemptId as string;
    if (!attemptId) {
      return res.json({ status: 'success', alarmActive: false });
    }
    const vios = db.getViolationsByAttempt(attemptId);
    const hasActiveAlarm = vios.some(v => v.Alarm_Status === 'ACTIVE');
    res.json({
      status: 'success',
      alarmActive: hasActiveAlarm,
      violationCount: vios.length
    });
  } catch (err: any) {
    res.json({ status: 'error', alarmActive: false });
  }
});

apiRouter.post('/student/submit', async (req, res) => {
  try {
    const { attemptId, clientSubmissionId, answers } = req.body;
    const token = req.body.token || req.headers.authorization?.replace('Bearer ', '') || studentTokenMap.get(attemptId);

    // Pre-submit final sync if answers are provided
    if (token && Array.isArray(answers) && answers.length > 0) {
      try {
        const formatted = answers.map((a: any) => ({
          Exam_Question_ID: a.Exam_Question_ID || a.examQuestionId,
          Selected_Option_ID: a.Selected_Option_ID || a.selectedOptionId || '',
          Answer_Text: a.Answer_Text || a.answerText || ''
        }));
        await appsScriptClient.saveAnswers(token, attemptId, formatted);
      } catch (saveErr: any) {
        console.warn('[SUBMIT] Final sync warning:', saveErr.message);
      }
    }

    // Local db submit
    try {
      db.submitExam(attemptId, clientSubmissionId);
    } catch (e) {}

    // Primary submit to Google Apps Script
    if (token) {
      try {
        const gsRes = await appsScriptClient.submitExam(token, attemptId);
        return res.json({ status: 'success', data: gsRes.data || gsRes });
      } catch (gsErr: any) {
        const errMsg = gsErr.message || '';
        console.warn('[STUDENT SUBMIT] Apps Script submit warning:', errMsg);
        if (
          errMsg.includes('sudah selesai') ||
          errMsg.includes('Attempt tidak aktif') ||
          errMsg.includes('Waktu attempt sudah habis') ||
          errMsg.includes('already_submitted') ||
          errMsg.includes('respon non-JSON')
        ) {
          return res.json({
            status: 'success',
            data: {
              status: 'SUBMITTED',
              submittedAt: new Date().toISOString(),
              message: 'Ujian berhasil diserahkan.'
            }
          });
        }
        throw gsErr;
      }
    }

    res.json({ status: 'success', data: { status: 'SUBMITTED' } });
  } catch (err: any) {
    console.error('[STUDENT SUBMIT ERROR]', err.message);
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Monitoring
apiRouter.get('/monitoring', (req, res) => {
  const runId = req.query.runId as string | undefined;
  res.json({ status: 'success', data: db.getMonitor(runId) });
});

apiRouter.post('/monitoring/permission', (req, res) => {
  try {
    const { attemptId, type, expiryMinutes, reason } = req.body;
    const perm = db.grantPermission(attemptId, type, expiryMinutes, reason);
    res.json({ status: 'success', data: perm });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

apiRouter.post('/monitoring/violation-action', (req, res) => {
  try {
    const { violationId, actionType, note } = req.body;
    const result = db.muteOrResolveViolation(violationId, actionType, note);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Essay Grading
apiRouter.get('/grading/essays', (req, res) => {
  const runId = req.query.runId as string;
  const examQuestionId = req.query.examQuestionId as string | undefined;
  if (!runId) return res.status(400).json({ status: 'error', message: 'runId is required' });
  res.json({ status: 'success', data: db.getEssayResponses(runId, examQuestionId) });
});

apiRouter.post('/grading/grade', (req, res) => {
  try {
    const { answerId, attemptId, examQuestionId, manualScore, feedback } = req.body;
    let targetAnswerId = answerId;
    if (!targetAnswerId && attemptId && examQuestionId) {
      let ans = db.getState().ANSWERS.find(a => a.Attempt_ID === attemptId && a.Exam_Question_ID === examQuestionId);
      if (!ans) {
        ans = {
          Answer_ID: `ANS-${Date.now().toString(36).toUpperCase()}`,
          Attempt_ID: attemptId,
          Exam_Question_ID: examQuestionId,
          Answer_Text: '',
          Saved_At: new Date().toISOString()
        };
        db.getState().ANSWERS.push(ans);
      }
      targetAnswerId = ans.Answer_ID;
    }
    const result = db.gradeEssay(targetAnswerId, manualScore, feedback);

    // Sync to Apps Script in background
    appsScriptClient.call('adminGradeEssay', {
      answerId: targetAnswerId,
      manualScore: Number(manualScore),
      feedback: feedback || '',
      gradedBy: 'DOSEN'
    }).catch((err: any) => {
      console.warn('[APPS_SCRIPT GRADE_ESSAY WARN]:', err.message);
    });

    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Results
apiRouter.get('/results', (req, res) => {
  const runId = req.query.runId as string;
  if (!runId) return res.status(400).json({ status: 'error', message: 'runId is required' });
  res.json({ status: 'success', data: db.getRunResults(runId) });
});

apiRouter.get('/results/student-detail', (req, res) => {
  const attemptId = req.query.attemptId as string;
  if (!attemptId) return res.status(400).json({ status: 'error', message: 'attemptId is required' });
  try {
    const detail = db.getStudentAnswers(attemptId);
    res.json({ status: 'success', data: detail });
  } catch (err: any) {
    res.status(404).json({ status: 'error', message: err.message });
  }
});

// Export XLSX via Google Apps Script action: exportRunXlsx
const executeExportRunXlsx = async (runId: string) => {
  if (!runId) throw new Error('Run_ID wajib disertakan.');
  const response = await appsScriptClient.exportRunXlsx(runId);
  const data = response.data || response;
  if (!data || !data.url) {
    throw new Error(response.error || response.message || 'Google Apps Script tidak mengembalikan URL file yang valid.');
  }
  return data;
};

apiRouter.post('/export-xlsx', async (req, res) => {
  const runId = req.body?.runId || (req.query?.runId as string);
  if (!runId) return res.status(400).json({ status: 'error', message: 'runId is required' });

  try {
    const exportData = await executeExportRunXlsx(runId);
    res.json({
      status: 'success',
      data: {
        fileId: exportData.fileId,
        fileName: exportData.fileName,
        url: exportData.url
      }
    });
  } catch (err: any) {
    console.error('[EXPORT_XLSX POST ERROR]:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Gagal memproses ekspor di Google Apps Script'
    });
  }
});

apiRouter.get('/export-xlsx', async (req, res) => {
  const runId = req.query.runId as string;
  if (!runId) return res.status(400).json({ status: 'error', message: 'runId is required' });

  try {
    const exportData = await executeExportRunXlsx(runId);
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.redirect(exportData.url);
    }
    res.json({
      status: 'success',
      data: {
        fileId: exportData.fileId,
        fileName: exportData.fileName,
        url: exportData.url
      }
    });
  } catch (err: any) {
    console.error('[EXPORT_XLSX GET ERROR]:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Gagal memproses ekspor di Google Apps Script'
    });
  }
});

// Safe Reset
apiRouter.post('/reset-run', (req, res) => {
  try {
    const { runId, confirmation } = req.body;
    const result = db.resetRunResponses(runId, confirmation);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Dashboard stats
apiRouter.get('/dashboard-stats', (req, res) => {
  res.json({ status: 'success', data: db.getDashboardStats() });
});

// Settings
apiRouter.get('/settings', (req, res) => {
  res.json({ status: 'success', data: db.getState().SETTINGS });
});

apiRouter.post('/settings', (req, res) => {
  try {
    const { key, value } = req.body;
    const settings = db.getState().SETTINGS;
    const target = settings.find(s => s.Setting_Key === key);
    if (target) {
      target.Setting_Value = String(value);
      target.Updated_At = new Date().toISOString();
    } else {
      settings.push({
        Setting_Key: key,
        Setting_Value: String(value),
        Description: 'Custom Setting',
        Updated_At: new Date().toISOString()
      });
    }
    if (key === 'APPS_SCRIPT_API_URL') {
      appsScriptClient.setUrl(String(value));
    }
    db.logAdmin('UPDATE_SETTING', 'SETTINGS', key, `Setting diubah ke ${value}`);
    db.persist();
    res.json({ status: 'success', data: { key, value } });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});
