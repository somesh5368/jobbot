import { getAccessSecret, getBackendApiUrl } from '../../../lib/server/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  let secretConfigured = false;
  let backendUrl = '';

  try {
    getAccessSecret();
    secretConfigured = true;
    backendUrl = getBackendApiUrl();
  } catch (err) {
    return res.status(200).json({
      ready: false,
      secretConfigured: false,
      backendUrl: '',
      backendOk: false,
      message: 'Set JOBBOT_ACCESS_SECRET on Vercel (must match Render X_JOBBOT_KEY).',
    });
  }

  try {
    const healthRes = await fetch(backendUrl.replace(/\/api$/, '') + '/health', {
      signal: AbortSignal.timeout(25000),
    });
    const health = await healthRes.json().catch(() => ({}));
    const backendOk = healthRes.ok && health.status === 'ok';

    return res.status(200).json({
      ready: backendOk && secretConfigured,
      secretConfigured,
      backendUrl,
      backendOk,
      database: health.database || 'unknown',
      message: backendOk
        ? 'Ready — enter your access key to unlock.'
        : 'Backend reachable but unhealthy. Check Render logs.',
    });
  } catch (err) {
    return res.status(200).json({
      ready: false,
      secretConfigured,
      backendUrl,
      backendOk: false,
      message:
        'Cannot reach Render backend. Set BACKEND_API_URL on Vercel or wait for cold start (~60s).',
    });
  }
}
