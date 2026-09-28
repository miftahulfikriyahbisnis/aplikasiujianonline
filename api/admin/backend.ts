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
    const resultData = parsedData.data !== undefined ? parsedData.data : parsedData;
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
