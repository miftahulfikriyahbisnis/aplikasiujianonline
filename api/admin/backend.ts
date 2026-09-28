/**
 * Server-Side Admin Backend API Route for Vercel & Production
 * Route: POST /api/admin/backend
 * Flow: Browser -> /api/admin/backend -> Vercel server -> Google Apps Script -> Google Sheets
 */

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Hanya menerima request POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      ok: false,
      message: 'Method Not Allowed. Route /api/admin/backend hanya menerima request POST.'
    });
  }

  try {
    // 2. Menerima action dan data dari frontend
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const action = body?.action ? String(body.action).trim() : '';
    const clientData = body?.data !== undefined ? body.data : (body?.payload !== undefined ? body.payload : {});

    // Required temporary server log
    console.log("ADMIN BACKEND API CALLED", action);

    if (!action) {
      return res.status(400).json({
        status: 'error',
        ok: false,
        message: 'Action backend wajib disertakan dalam request body.'
      });
    }

    // 3. Membaca process.env.APPS_SCRIPT_API_URL dan process.env.APPS_SCRIPT_API_SECRET
    const appsScriptUrl = (process.env.APPS_SCRIPT_API_URL || '').trim();
    const appsScriptSecret = (process.env.APPS_SCRIPT_API_SECRET || '').trim();

    if (!appsScriptUrl) {
      console.error("ADMIN BACKEND ERROR: APPS_SCRIPT_API_URL belum dikonfigurasi di Environment Variables");
      return res.status(500).json({
        status: 'error',
        ok: false,
        message: 'Konfigurasi server belum lengkap: APPS_SCRIPT_API_URL belum tersedia di Environment Variables Vercel.'
      });
    }

    // Helper to send action to Google Apps Script
    async function forwardToAppsScript(targetAction: string, targetData: any) {
      const payload: any = {
        action: targetAction,
        data: targetData,
        payload: targetData
      };
      if (appsScriptSecret) payload.secret = appsScriptSecret;
      if (body?.token) payload.token = body.token;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      try {
        let resp = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          redirect: 'manual',
          signal: controller.signal
        });
        let redirectCount = 0;
        while (resp.status >= 300 && resp.status < 400 && resp.headers.get('location') && redirectCount < 5) {
          redirectCount++;
          const redirectUrl = resp.headers.get('location')!;
          resp = await fetch(redirectUrl, { method: 'GET', signal: controller.signal, redirect: 'manual' });
        }
        const text = await resp.text();
        const trimmed = (text || '').trim();
        try {
          return JSON.parse(trimmed);
        } catch {
          return { ok: false, status: 'error', message: trimmed };
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // Exam questions local persistence path
    const fs = await import('fs');
    const path = await import('path');
    const examQuestionsStorePath = path.join(process.cwd(), 'exam_questions_store.json');

    function loadExamQuestionsStore(): Record<string, any[]> {
      try {
        if (fs.existsSync(examQuestionsStorePath)) {
          return JSON.parse(fs.readFileSync(examQuestionsStorePath, 'utf-8'));
        }
        // Fallback: check database_sheets_store.json
        const dbPath = path.join(process.cwd(), 'database_sheets_store.json');
        if (fs.existsSync(dbPath)) {
          const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
          if (Array.isArray(dbData.EXAM_QUESTIONS)) {
            const mapped: Record<string, any[]> = {};
            dbData.EXAM_QUESTIONS.forEach((eq: any) => {
              if (!mapped[eq.Exam_ID]) mapped[eq.Exam_ID] = [];
              mapped[eq.Exam_ID].push(eq);
            });
            return mapped;
          }
        }
      } catch (e) {
        console.warn("Failed to load exam questions store:", e);
      }
      return {};
    }

    function saveExamQuestionsStore(store: Record<string, any[]>) {
      try {
        fs.writeFileSync(examQuestionsStorePath, JSON.stringify(store, null, 2), 'utf-8');
      } catch (e) {
        console.warn("Failed to save exam questions store:", e);
      }
    }

    // -------------------------------------------------------------
    // Custom Handlers for deleteRun & deleteTopic & getExamQuestions
    // -------------------------------------------------------------
    if (action === 'deleteRun') {
      const runId = clientData.Run_ID || clientData.runId;
      if (!runId) {
        return res.status(400).json({ status: 'error', ok: false, message: 'Run_ID wajib disertakan.' });
      }

      // Selalu cek ATTEMPTS berdasarkan Run_ID sebelum melakukan hapus
      let attemptsCount = 0;
      try {
        const monitorRes = await forwardToAppsScript('monitorRun', { Run_ID: runId, runId });
        if (monitorRes && Array.isArray(monitorRes.data)) {
          attemptsCount = monitorRes.data.length;
        }
      } catch (err) {
        console.warn("deleteRun monitor check error:", err);
      }

      if (attemptsCount > 0) {
        // Jika Run_ID SUDAH memiliki ATTEMPTS: jangan hard delete, ubah status menjadi CANCELLED/ARCHIVED
        const updateRes = await forwardToAppsScript('updateRun', {
          Run_ID: runId,
          runId,
          Status: 'CANCELLED',
          status: 'CANCELLED'
        });
        return res.status(200).json({
          status: 'success',
          ok: true,
          hasAttempts: true,
          data: updateRes?.data,
          message: `Sesi ujian telah memiliki data pengerjaan (${attemptsCount} mahasiswa). Status sesi diubah menjadi CANCELLED untuk menjaga integritas riwayat jawaban.`
        });
      } else {
        // Jika Run_ID BELUM memiliki ATTEMPTS: tandai sebagai ARCHIVED / DELETED di Google Sheets
        const updateRes = await forwardToAppsScript('updateRun', {
          Run_ID: runId,
          runId,
          Status: 'ARCHIVED',
          status: 'ARCHIVED',
          Data_Status: 'DELETED'
        });
        return res.status(200).json({
          status: 'success',
          ok: true,
          hasAttempts: false,
          data: updateRes?.data,
          message: 'Sesi ujian berhasil dihapus.'
        });
      }
    }

    if (action === 'deleteTopic') {
      const topicId = clientData.Topic_ID || clientData.topicId;
      if (!topicId) {
        return res.status(400).json({ status: 'error', ok: false, message: 'Topic_ID wajib disertakan.' });
      }

      // Cek apakah Topic_ID sudah digunakan di QUESTIONS
      let isUsed = false;
      try {
        const qRes = await forwardToAppsScript('listQuestions', {});
        if (qRes && Array.isArray(qRes.data)) {
          isUsed = qRes.data.some((q: any) => q.Topic_ID === topicId);
        }
      } catch (err) {
        console.warn("deleteTopic questions check error:", err);
      }

      // Ubah Status = ARCHIVED di Google Sheets via updateTopic
      const updateRes = await forwardToAppsScript('updateTopic', {
        Topic_ID: topicId,
        topicId,
        Status: 'ARCHIVED',
        status: 'ARCHIVED'
      });

      return res.status(200).json({
        status: 'success',
        ok: true,
        isUsed,
        data: updateRes?.data,
        message: isUsed
          ? 'Topik ini telah digunakan pada soal Bank Soal dan berhasil diarsipkan (Status: ARCHIVED).'
          : 'Topik berhasil dihapus/diarsipkan.'
      });
    }

    if (action === 'getExamQuestions') {
      const examId = clientData.Exam_ID || clientData.examId;
      const store = loadExamQuestionsStore();
      const list = store[examId] || [];
      return res.status(200).json({
        status: 'success',
        ok: true,
        data: list,
        message: 'Berhasil mengambil daftar soal ujian'
      });
    }

    // 4. Menambahkan secret HANYA di server
    // 5. POST server-to-server ke Google Apps Script
    // 6. Mengirim struktur:
    // {
    //   "action": "NAMA_ACTION",
    //   "secret": "SERVER_SECRET",
    //   "data": {},
    //   "payload": {}
    // }
    const requestPayload: any = {
      action,
      data: clientData,
      payload: clientData
    };

    if (appsScriptSecret) {
      requestPayload.secret = appsScriptSecret;
    }

    // Teruskan token jika ada (misal session token admin)
    if (body?.token) {
      requestPayload.token = body.token;
    }

    // Abort controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

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

      // 9. Menangani redirect Google Apps Script (302/303 GET)
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
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({
          status: 'error',
          ok: false,
          message: 'Koneksi ke Google Apps Script timeout (>90 detik).'
        });
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    // 7. Membaca respons Apps Script dengan text() terlebih dahulu
    const rawText = await scriptResponse.text();

    // 8. Validasi JSON sebelum JSON.parse
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

    if (!isValidJson || parsedData === null) {
      console.error("ADMIN BACKEND APPS SCRIPT NON-JSON RESPONSE:", trimmedText.substring(0, 300));
      if (trimmedText.startsWith('<!DOCTYPE') || trimmedText.toLowerCase().includes('<html')) {
        return res.status(502).json({
          status: 'error',
          ok: false,
          message: 'Google Apps Script mengembalikan halaman HTML. Pastikan deployment Web App Apps Script disetel ke akses "Anyone" (Siapa saja) dan URL benar.'
        });
      }
      return res.status(502).json({
        status: 'error',
        ok: false,
        message: `Google Apps Script mengembalikan respon non-JSON: ${trimmedText.substring(0, 200)}`
      });
    }

    // 10. Jika backend mengembalikan error, teruskan pesan error sebenarnya ke frontend
    if (parsedData.ok === false || parsedData.status === 'error') {
      const errMsg = parsedData.error || parsedData.message || 'Error dari Google Apps Script';
      return res.status(400).json({
        status: 'error',
        ok: false,
        message: errMsg,
        error: errMsg
      });
    }

    // 11. Teruskan data asli dari Google Sheets ke frontend (jangan gunakan dummy)
    let resultData = parsedData.data !== undefined ? parsedData.data : parsedData;

    // Sinkronisasi lokal store untuk setExamQuestions
    if (action === 'setExamQuestions') {
      const examId = clientData.Exam_ID || clientData.examId;
      if (examId) {
        const store = loadExamQuestionsStore();
        store[examId] = Array.isArray(clientData.questions)
          ? clientData.questions
          : (Array.isArray(resultData) ? resultData : []);
        saveExamQuestionsStore(store);
      }
    }

    // Enrich listExams dengan Total_Questions, Total_Points, dan questions
    if (action === 'listExams' && Array.isArray(resultData)) {
      const store = loadExamQuestionsStore();
      resultData = resultData.map((e: any) => {
        const eqList = store[e.Exam_ID] || [];
        const totalPoints = eqList.reduce((sum: number, q: any) => sum + (Number(q.Points) || 0), 0);
        return {
          ...e,
          Total_Questions: eqList.length,
          Total_Points: totalPoints > 0 ? totalPoints : (Number(e.Total_Points) || 0),
          questions: eqList
        };
      });
    }

    // Enrich listQuestions dengan meratakan properti Current_Version ke level atas
    if (action === 'listQuestions' && Array.isArray(resultData)) {
      resultData = resultData.map((q: any) => {
        const ver = q.Current_Version || {};
        return {
          ...q,
          Question_Text: q.Question_Text || ver.Question_Text || '',
          Default_Points: q.Default_Points !== undefined ? q.Default_Points : (ver.Default_Points !== undefined ? ver.Default_Points : null),
          Version_Number: Number(q.Version_Number || ver.Version_Number) || 1,
          Image_URL: q.Image_URL || ver.Image_URL || '',
          Answer_Guide: q.Answer_Guide || ver.Answer_Guide || '',
          Explanation: q.Explanation || ver.Explanation || ''
        };
      });
    }

    return res.status(200).json({
      status: 'success',
      ok: true,
      data: resultData,
      message: parsedData.message || 'Berhasil'
    });
  } catch (error: any) {
    console.error("ADMIN BACKEND HANDLER ERROR:", error);
    return res.status(500).json({
      status: 'error',
      ok: false,
      message: error.message || 'Terjadi kesalahan internal server saat memproses data admin.'
    });
  }
}
