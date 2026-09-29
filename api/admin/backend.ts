/**
 * Server-Side Admin Backend API Route for Vercel & Production
 * Route: POST /api/admin/backend
 * Source of truth: Google Apps Script -> Google Sheets
 *
 * IMPORTANT:
 * - Vercel local filesystem is NOT used as a database or persistent cache.
 * - All admin data is read/written through Google Apps Script.
 */

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      ok: false,
      message: 'Method Not Allowed. Route /api/admin/backend hanya menerima request POST.'
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const action = body?.action ? String(body.action).trim() : '';
    const clientData =
      body?.data !== undefined
        ? body.data
        : body?.payload !== undefined
          ? body.payload
          : {};

    if (!action) {
      return res.status(400).json({
        status: 'error',
        ok: false,
        message: 'Action backend wajib disertakan dalam request body.'
      });
    }

    console.log('ADMIN BACKEND API CALLED', action);

    const appsScriptUrl = (process.env.APPS_SCRIPT_API_URL || '').trim();
    const appsScriptSecret = (process.env.APPS_SCRIPT_API_SECRET || '').trim();

    if (!appsScriptUrl) {
      return res.status(500).json({
        status: 'error',
        ok: false,
        message:
          'Konfigurasi server belum lengkap: APPS_SCRIPT_API_URL belum tersedia di Environment Variables Vercel.'
      });
    }

    /**
     * Single path for all communication with Apps Script.
     * The browser never receives the Apps Script secret.
     */
    const forwardToAppsScript = async (targetAction: string, targetData: any) => {
      const payload: any = {
        action: targetAction,
        data: targetData ?? {},
        payload: targetData ?? {}
      };

      if (appsScriptSecret) payload.secret = appsScriptSecret;
      if (body?.token) payload.token = body.token;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        let response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          redirect: 'manual',
          signal: controller.signal
        });

        let redirectCount = 0;
        while (
          response.status >= 300 &&
          response.status < 400 &&
          response.headers.get('location') &&
          redirectCount < 5
        ) {
          redirectCount += 1;
          const redirectUrl = response.headers.get('location')!;
          response = await fetch(redirectUrl, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal
          });
        }

        const rawText = await response.text();
        const text = (rawText || '').trim();

        if (!text) {
          throw new Error('Google Apps Script mengembalikan respons kosong.');
        }

        if (text.startsWith('<!DOCTYPE') || text.toLowerCase().includes('<html')) {
          throw new Error(
            'Google Apps Script mengembalikan halaman HTML. Pastikan deployment Web App disetel ke akses "Anyone" dan URL deployment benar.'
          );
        }

        try {
          return JSON.parse(text);
        } catch {
          throw new Error(
            `Google Apps Script mengembalikan respons non-JSON: ${text.substring(0, 200)}`
          );
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          throw new Error('Koneksi ke Google Apps Script timeout (>45 detik).');
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const scriptSucceeded = (value: any) =>
      value && value.ok !== false && value.status !== 'error';

    const dataFrom = (value: any) =>
      value?.data !== undefined ? value.data : value;

    const normalizeQuestion = (q: any) => {
      const version = q?.Current_Version || {};
      return {
        ...q,
        Question_Text:
          q?.Question_Text || version.Question_Text || q?.question_text || q?.text || '',
        Default_Points:
          q?.Default_Points !== undefined
            ? q.Default_Points
            : version.Default_Points !== undefined
              ? version.Default_Points
              : null,
        Version_Number:
          Number(q?.Version_Number || version.Version_Number) || 1,
        Image_URL: q?.Image_URL || version.Image_URL || '',
        Answer_Guide: q?.Answer_Guide || version.Answer_Guide || '',
        Explanation: q?.Explanation || version.Explanation || ''
      };
    };

    // UI helper: "hapus sesi" tetap menjaga data pengerjaan mahasiswa.
    if (action === 'deleteRun') {
      const runId = clientData?.Run_ID || clientData?.runId;
      if (!runId) {
        return res.status(400).json({
          status: 'error',
          ok: false,
          message: 'Run_ID wajib disertakan.'
        });
      }

      const monitorResponse = await forwardToAppsScript('monitorRun', {
        Run_ID: runId,
        runId
      });
      const attempts = scriptSucceeded(monitorResponse)
        ? dataFrom(monitorResponse)
        : [];
      const attemptsCount = Array.isArray(attempts) ? attempts.length : 0;

      const nextStatus = attemptsCount > 0 ? 'CANCELLED' : 'ARCHIVED';
      const updatePayload: any = {
        Run_ID: runId,
        runId,
        Status: nextStatus,
        status: nextStatus
      };

      if (attemptsCount === 0) {
        updatePayload.Data_Status = 'DELETED';
      }

      const updateResponse = await forwardToAppsScript(
        'updateRun',
        updatePayload
      );

      if (!scriptSucceeded(updateResponse)) {
        const message =
          updateResponse?.error ||
          updateResponse?.message ||
          'Gagal memperbarui sesi ujian.';
        return res.status(400).json({
          status: 'error',
          ok: false,
          message,
          error: message
        });
      }

      return res.status(200).json({
        status: 'success',
        ok: true,
        hasAttempts: attemptsCount > 0,
        data: dataFrom(updateResponse),
        message:
          attemptsCount > 0
            ? `Sesi memiliki data pengerjaan (${attemptsCount} mahasiswa) sehingga status diubah menjadi CANCELLED.`
            : 'Sesi ujian berhasil diarsipkan.'
      });
    }

    // UI helper: topik yang dihapus diarsipkan agar relasi soal lama tetap aman.
    if (action === 'deleteTopic') {
      const topicId = clientData?.Topic_ID || clientData?.topicId;
      if (!topicId) {
        return res.status(400).json({
          status: 'error',
          ok: false,
          message: 'Topic_ID wajib disertakan.'
        });
      }

      let isUsed = false;
      try {
        const questionResponse = await forwardToAppsScript('listQuestions', {});
        const questions = scriptSucceeded(questionResponse)
          ? dataFrom(questionResponse)
          : [];
        if (Array.isArray(questions)) {
          isUsed = questions.some((q: any) => q?.Topic_ID === topicId);
        }
      } catch (error) {
        console.warn('deleteTopic: gagal mengecek penggunaan topik', error);
      }

      const updateResponse = await forwardToAppsScript('updateTopic', {
        Topic_ID: topicId,
        topicId,
        Status: 'ARCHIVED',
        status: 'ARCHIVED'
      });

      if (!scriptSucceeded(updateResponse)) {
        const message =
          updateResponse?.error ||
          updateResponse?.message ||
          'Gagal mengarsipkan topik.';
        return res.status(400).json({
          status: 'error',
          ok: false,
          message,
          error: message
        });
      }

      return res.status(200).json({
        status: 'success',
        ok: true,
        isUsed,
        data: dataFrom(updateResponse),
        message: isUsed
          ? 'Topik sudah digunakan pada soal dan berhasil diarsipkan.'
          : 'Topik berhasil diarsipkan.'
      });
    }

    // Semua action lainnya diteruskan langsung ke Apps Script / Google Sheets.
    const scriptResponse = await forwardToAppsScript(action, clientData);

    if (!scriptSucceeded(scriptResponse)) {
      const message =
        scriptResponse?.error ||
        scriptResponse?.message ||
        'Error dari Google Apps Script';

      return res.status(400).json({
        status: 'error',
        ok: false,
        message,
        error: message
      });
    }

    let resultData = dataFrom(scriptResponse);

    // Buat data Bank Soal mudah dibaca komponen UI tanpa mengubah database.
    if (action === 'listQuestions' && Array.isArray(resultData)) {
      resultData = resultData.map(normalizeQuestion);
    }

    // EXAM_QUESTIONS tetap dibaca dari Google Sheets.
    // Jika Apps Script hanya mengembalikan Version_ID, isi teks soal dari
    // listQuestions agar modal Kelola Soal tetap mudah dibaca.
    if (action === 'getExamQuestions' && Array.isArray(resultData)) {
      const needsDetails = resultData.some(
        (q: any) => !q?.Question_Text || !q?.Question_Type
      );

      if (needsDetails && resultData.length > 0) {
        try {
          const questionsResponse = await forwardToAppsScript(
            'listQuestions',
            {}
          );

          const bankQuestions = scriptSucceeded(questionsResponse)
            ? dataFrom(questionsResponse)
            : [];

          if (Array.isArray(bankQuestions)) {
            const normalizedBank = bankQuestions.map(normalizeQuestion);

            resultData = resultData.map((eq: any, index: number) => {
              const versionId = eq?.Version_ID;
              const matched = normalizedBank.find(
                (q: any) =>
                  q?.Current_Version_ID === versionId ||
                  q?.Version_ID === versionId ||
                  (q?.Current_Version &&
                    q.Current_Version.Version_ID === versionId) ||
                  (eq?.Question_ID && q?.Question_ID === eq.Question_ID)
              );

              return {
                ...eq,
                Exam_Question_ID:
                  eq?.Exam_Question_ID ||
                  `EQ-${clientData?.Exam_ID || clientData?.examId || 'EXAM'}-${index + 1}`,
                Question_Number:
                  Number(eq?.Question_Number) || index + 1,
                Points:
                  Number(eq?.Points) ||
                  Number(matched?.Default_Points) ||
                  0,
                Question_ID: eq?.Question_ID || matched?.Question_ID || '',
                Question_Text:
                  eq?.Question_Text || matched?.Question_Text || '',
                Question_Type:
                  eq?.Question_Type || matched?.Question_Type || '',
                Difficulty:
                  eq?.Difficulty || matched?.Difficulty || '',
                Topic_Name:
                  eq?.Topic_Name || matched?.Topic_Name || '',
                Image_URL:
                  eq?.Image_URL || matched?.Image_URL || '',
                Answer_Guide:
                  eq?.Answer_Guide || matched?.Answer_Guide || '',
                Explanation:
                  eq?.Explanation || matched?.Explanation || '',
                Version_Number:
                  Number(
                    eq?.Version_Number || matched?.Version_Number
                  ) || 1
              };
            });
          }
        } catch (error) {
          // Data relasi ujian tetap dikirim walau enrichment teks gagal.
          console.warn('getExamQuestions enrichment gagal', error);
        }
      }
    }

    return res.status(200).json({
      status: 'success',
      ok: true,
      data: resultData,
      message: scriptResponse?.message || 'Berhasil'
    });
  } catch (error: any) {
    console.error('ADMIN BACKEND HANDLER ERROR:', error);

    return res.status(500).json({
      status: 'error',
      ok: false,
      message:
        error?.message ||
        'Terjadi kesalahan internal server saat memproses data admin.'
    });
  }
}
