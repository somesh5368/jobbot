import {
  createSessionToken,
  setSessionCookie,
  verifyPasscode,
} from '../../../lib/server/auth';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    const { passcode } = req.body || {};
    if (!passcode || typeof passcode !== 'string') {
      return res.status(400).json({ detail: 'Passcode is required' });
    }

    if (!verifyPasscode(passcode)) {
      return res.status(403).json({ detail: 'Invalid passcode' });
    }

    const token = createSessionToken();
    setSessionCookie(res, token);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unlock error:', err.message);
    return res.status(500).json({
      detail:
        err.message === 'JOBBOT_ACCESS_SECRET is not configured'
          ? 'Server auth is not configured. Set JOBBOT_ACCESS_SECRET.'
          : 'Unlock failed',
    });
  }
}
