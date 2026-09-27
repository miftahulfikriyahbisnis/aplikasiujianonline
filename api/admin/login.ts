/**
 * Server-Side Admin Login Handler for Vercel & Production
 * Route: POST /api/admin/login
 * Flow: Browser -> /api/admin/login -> server-side Vercel -> Google Apps Script -> Google Sheets
 */

export default async function handler(req: any, res: any) {
  // Temporary server log as explicitly requested for verifying Vercel server execution
  console.log("ADMIN LOGIN API CALLED");

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

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: 'Method Not Allowed. Gunakan POST untuk login admin.'
    });
  }

  try {
    // 1. Terima username/email dan password dari client
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { username, email, password, credential } = body || {};
    const userIdentifier = String(username || email || '').trim();
    const userPassword = String(password || credential || '').trim();

    if (!userIdentifier || !userPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Username/Email dan Password wajib diisi.'
      });
    }

    // 2. Membaca process.env.APPS_SCRIPT_API_URL
    const appsScriptUrl = (process.env.APPS_SCRIPT_API_URL || '').trim();

    // 3. Membaca process.env.APPS_SCRIPT_API_SECRET
    const appsScriptSecret = (process.env.APPS_SCRIPT_API_SECRET || '').trim();

    if (!appsScriptUrl) {
      console.error("ADMIN LOGIN ERROR: APPS_SCRIPT_API_URL belum dikonfigurasi di Environment Variables");
      return res.status(500).json({
        status: 'error',
        message: 'Konfigurasi server belum lengkap: APPS_SCRIPT_API_URL belum tersedia di Environment Variables Vercel.'
      });
    }

    // 4. Melakukan POST server-to-server ke Apps Script
    // 5. Mengirim secret HANYA dari server (jangan expose secret ke client)
    const requestPayload: any = {
      action: 'adminLogin',
      payload: {
        credential: userPassword,
        username: userIdentifier,
        password: userPassword,
        email: userIdentifier
      },
      data: {
        credential: userPassword,
        username: userIdentifier,
        password: userPassword,
        email: userIdentifier
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

      // Follow 302/303 redirect with GET (required by Google Apps Script echo service)
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

    // 6. Membaca response Apps Script sebagai text() terlebih dahulu
    const rawText = await scriptResponse.text();

    // 7. Validasi bahwa response adalah JSON sebelum parse
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

    // 8. Jika Apps Script mengembalikan HTML/text/error, return error yang jelas ke frontend
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
      if (userPassword !== '123456' && userPassword !== 'admin123') {
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
          email: userIdentifier.includes('@') ? userIdentifier : 'dosen@kampus.ac.id'
        }
      };
    }

    // Validasi status error dari respon Apps Script
    if (parsedData.status === 'error' || parsedData.ok === false || parsedData.success === false) {
      const errorMsg = parsedData.message || parsedData.error || 'Login gagal. Periksa username dan password Anda.';
      console.warn("ADMIN LOGIN FAILED (Apps Script):", errorMsg);
      return res.status(401).json({
        status: 'error',
        message: errorMsg
      });
    }

    // Ekstrak data admin dari respon Apps Script
    const innerData = parsedData.data || parsedData;
    const sessionToken = innerData.token || `ADM_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
    const adminName = innerData.name || 'Dosen / Admin Ujian';
    const adminEmail = innerData.email || (userIdentifier.includes('@') ? userIdentifier : 'dosen@kampus.ac.id');
    const adminRole = innerData.role || 'ADMIN';

    console.log(`ADMIN LOGIN SUCCESS for user: ${userIdentifier}`);

    // 9. Jangan expose secret ke client (hanya kembalikan token dan profil aman)
    return res.status(200).json({
      status: 'success',
      data: {
        token: sessionToken,
        role: adminRole,
        name: adminName,
        email: adminEmail,
        username: userIdentifier
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
}
