/**
 * Server-Side Admin Session Verify for Vercel
 * Route: GET /api/admin/verify
 */

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-admin-token'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers?.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.headers?.['x-admin-token'] || req.query?.adminToken;

  if (!token || typeof token !== 'string' || !token.startsWith('ADM')) {
    return res.status(401).json({
      status: 'error',
      valid: false,
      message: 'Sesi Dosen / Admin tidak valid atau telah berakhir.'
    });
  }

  return res.status(200).json({
    status: 'success',
    data: {
      valid: true,
      role: 'ADMIN',
      name: 'Dosen / Admin Ujian',
      email: 'dosen@kampus.ac.id',
      username: 'admin'
    }
  });
}
