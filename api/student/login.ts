/**
 * Server-Side Student Login Handler for Vercel
 * Route: POST /api/student/login
 *
 * Flow:
 * Browser -> /api/student/login -> Vercel -> Google Apps Script -> Google Sheets
 */

export default async function handler(req: any, res: any) {
  console.log("STUDENT LOGIN API CALLED");

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      status: 'error',
      message: 'Method Not Allowed. Gunakan POST untuk login mahasiswa.'
    });
  }

  try {
    // =========================
    // 1. BACA DATA DARI FRONTEND
    // =========================
    let body = req.body;

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    /*
     * Mendukung beberapa variasi nama field agar frontend lama
     * tetap bisa digunakan.
     */
    const nim = String(
      body?.NIM ??
      body?.nim ??
      ''
    ).trim();

    const fullName = String(
      body?.Full_Name ??
      body?.fullName ??
      body?.name ??
      body?.full_name ??
      ''
    ).trim();

    const className = String(
      body?.Class_Name ??
      body?.className ??
      body?.class_name ??
      body?.kelas ??
      ''
    ).trim();

    const accessCode = String(
      body?.Access_Code ??
      body?.accessCode ??
      body?.access_code ??
      body?.code ??
      ''
    ).trim();

    if (!fullName) {
      return res.status(400).json({
        ok: false,
        status: 'error',
        message: 'Nama mahasiswa wajib diisi.'
      });
    }

    if (!nim) {
      return res.status(400).json({
        ok: false,
        status: 'error',
        message: 'NIM wajib diisi.'
      });
    }

    if (!className) {
      return res.status(400).json({
        ok: false,
        status: 'error',
        message: 'Kelas wajib diisi.'
      });
    }

    if (!accessCode) {
      return res.status(400).json({
        ok: false,
        status: 'error',
        message: 'Kode akses ujian wajib diisi.'
      });
    }

    // =========================
    // 2. ENVIRONMENT VARIABLES
    // =========================
    const appsScriptUrl =
      (process.env.APPS_SCRIPT_API_URL || '').trim();

    const appsScriptSecret =
      (process.env.APPS_SCRIPT_API_SECRET || '').trim();

    if (!appsScriptUrl) {
      console.error(
        "STUDENT LOGIN ERROR: APPS_SCRIPT_API_URL belum tersedia"
      );

      return res.status(500).json({
        ok: false,
        status: 'error',
        message:
          'Konfigurasi server belum lengkap: APPS_SCRIPT_API_URL belum tersedia di Environment Variables Vercel.'
      });
    }

    if (!appsScriptSecret) {
      console.error(
        "STUDENT LOGIN ERROR: APPS_SCRIPT_API_SECRET belum tersedia"
      );

      return res.status(500).json({
        ok: false,
        status: 'error',
        message:
          'Konfigurasi server belum lengkap: APPS_SCRIPT_API_SECRET belum tersedia di Environment Variables Vercel.'
      });
    }

    // =========================
    // 3. DATA UNTUK APPS SCRIPT
    // =========================
    const studentData = {
      NIM: nim,
      Full_Name: fullName,
      Class_Name: className,
      Access_Code: accessCode
    };

    /*
     * Kirim data dan payload sekaligus agar kompatibel
     * dengan dispatcher Apps Script yang sudah ada.
     *
     * Secret hanya dikirim dari Vercel server.
     */
    const requestPayload = {
      action: 'studentLogin',
      secret: appsScriptSecret,

      data: studentData,

      payload: studentData
    };

    console.log(
      `STUDENT LOGIN REQUEST: NIM=${nim}, CLASS=${className}`
    );

    // =========================
    // 4. POST KE GOOGLE APPS SCRIPT
    // =========================
    const controller = new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      60000
    );

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

      /*
       * Google Apps Script dapat melakukan redirect
       * ke googleusercontent.com.
       */
      let redirectCount = 0;

      while (
        scriptResponse.status >= 300 &&
        scriptResponse.status < 400 &&
        scriptResponse.headers.get('location') &&
        redirectCount < 5
      ) {
        redirectCount++;

        const redirectUrl =
          scriptResponse.headers.get('location')!;

        scriptResponse = await fetch(redirectUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal
        });
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // =========================
    // 5. BACA SEBAGAI TEXT DULU
    // =========================
    const rawText =
      await scriptResponse.text();

    const trimmedText =
      (rawText || '').trim();

    if (!trimmedText) {
      console.error(
        'STUDENT LOGIN: Apps Script memberi response kosong.'
      );

      return res.status(502).json({
        ok: false,
        status: 'error',
        message:
          'Google Apps Script tidak mengembalikan data.'
      });
    }

    // =========================
    // 6. VALIDASI JSON
    // =========================
    let parsedData: any;

    try {
      parsedData =
        JSON.parse(trimmedText);
    } catch {
      console.error(
        'STUDENT LOGIN NON-JSON RESPONSE:',
        trimmedText.substring(0, 300)
      );

      if (
        trimmedText.startsWith('<!DOCTYPE') ||
        trimmedText
          .toLowerCase()
          .includes('<html')
      ) {
        return res.status(502).json({
          ok: false,
          status: 'error',
          message:
            'Google Apps Script mengembalikan halaman HTML. Periksa deployment Web App Apps Script dan izin aksesnya.'
        });
      }

      return res.status(502).json({
        ok: false,
        status: 'error',
        message:
          `Google Apps Script mengembalikan respon non-JSON: ${trimmedText.substring(0, 200)}`
      });
    }

    // =========================
    // 7. JIKA APPS SCRIPT MENOLAK LOGIN
    // =========================
    if (
      parsedData?.ok === false ||
      parsedData?.success === false ||
      parsedData?.status === 'error'
    ) {
      const errorMessage =
        parsedData?.message ||
        parsedData?.error ||
        'Login mahasiswa gagal.';

      console.warn(
        `STUDENT LOGIN FAILED: ${errorMessage}`
      );

      return res.status(400).json({
        ...parsedData,

        ok: false,

        status:
          parsedData?.status || 'error',

        message: errorMessage
      });
    }

    // =========================
    // 8. LOGIN BERHASIL
    // =========================
    console.log(
      `STUDENT LOGIN SUCCESS: ${nim}`
    );

    /*
     * PENTING:
     * Response dari Apps Script dipertahankan.
     *
     * Jadi token, student, run, exam, dll yang
     * sudah dibuat backend tidak diubah.
     */
    return res.status(200).json(parsedData);

  } catch (err: any) {

    console.error(
      'STUDENT LOGIN SERVER ERROR:',
      err?.message || err
    );

    if (err?.name === 'AbortError') {
      return res.status(504).json({
        ok: false,
        status: 'error',
        message:
          'Koneksi ke Google Apps Script timeout (>60 detik).'
      });
    }

    return res.status(500).json({
      ok: false,
      status: 'error',
      message:
        `Terjadi kesalahan pada server saat login mahasiswa: ${err?.message || 'Unknown error'}`
    });
  }
}
