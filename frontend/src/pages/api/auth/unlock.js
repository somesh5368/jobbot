import {
  createSessionToken,
  getAccessSecret,
  getBackendApiUrl,
  setSessionCookie,
  verifyPasscode,
} from '../../../lib/server/auth';

async function verifyBackendKey() {
  const backendKey = getAccessSecret();
  const profileUrl = `${getBackendApiUrl()}/profile`;

  const profileRes = await fetch(profileUrl, {
    method: 'GET',
    headers: {
      'X-JobBot-Key': backendKey,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(60000),
  });

  if (profileRes.status === 403) {
    const err = new Error(
      'Render rejected the API key. Set X_JOBBOT_KEY on Render to the same value as JOBBOT_ACCESS_SECRET on Vercel.'
    );
    err.code = 'BACKEND_KEY_MISMATCH';
    throw err;
  }

  if (profileRes.status === 404) {
    const data = await profileRes.json().catch(() => ({}));
    if (String(data.detail || '').toLowerCase().includes('not initialized')) {
      return {
        full_name: 'New User',
        email: '',
        education: [],
        experience: [],
        needs_setup: true,
      };
    }
  }

  if (!profileRes.ok) {
    const text = await profileRes.text().catch(() => '');
    const err = new Error(`Backend error (${profileRes.status}): ${text.slice(0, 120)}`);
    err.code = 'BACKEND_ERROR';
    throw err;
  }

  return profileRes.json();
}

export default async function handler(req, res) {
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

    let profile;
    try {
      profile = await verifyBackendKey();
    } catch (err) {
      if (err.code === 'BACKEND_KEY_MISMATCH') {
        return res.status(503).json({ detail: err.message, code: err.code });
      }
      if (err.name === 'TimeoutError') {
        return res.status(504).json({
          detail: 'Render backend timed out (free tier cold start). Wait 60 seconds and try again.',
          code: 'BACKEND_TIMEOUT',
        });
      }
      return res.status(502).json({
        detail: err.message || 'Backend unavailable. Check BACKEND_API_URL on Vercel.',
        code: err.code || 'BACKEND_UNAVAILABLE',
      });
    }

    const token = createSessionToken();
    setSessionCookie(res, token);
    return res.status(200).json({ ok: true, profile });
  } catch (err) {
    console.error('Unlock error:', err.message);
    if (err.message === 'JOBBOT_ACCESS_SECRET is not configured') {
      return res.status(500).json({
        detail: 'Server auth is not configured. Set JOBBOT_ACCESS_SECRET on Vercel.',
        code: 'NOT_CONFIGURED',
      });
    }
    return res.status(500).json({ detail: 'Unlock failed', code: 'INTERNAL_ERROR' });
  }
}
