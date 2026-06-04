import { isRequestAuthenticated } from '../../../lib/server/auth';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    return res.status(200).json({ authenticated: isRequestAuthenticated(req) });
  } catch (err) {
    console.error('Session check error:', err.message);
    return res.status(200).json({
      authenticated: false,
      configured: false,
      error: 'JOBBOT_ACCESS_SECRET is not set on Vercel',
    });
  }
}
