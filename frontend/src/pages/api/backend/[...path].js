import {
  getAccessSecret,
  getBackendApiUrl,
  isRequestAuthenticated,
} from '../../../lib/server/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (!isRequestAuthenticated(req)) {
    return res.status(401).json({ detail: 'Unauthorized: sign in required' });
  }

  let backendKey;
  try {
    backendKey = getAccessSecret();
  } catch (err) {
    console.error('Proxy config error:', err.message);
    return res.status(500).json({ detail: 'Server auth is not configured' });
  }

  const pathParam = req.query.path;
  const path = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || '';
  const { path: _omit, ...restQuery } = req.query;
  const qs = new URLSearchParams();
  Object.entries(restQuery).forEach(([key, value]) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, String(v)));
    } else {
      qs.append(key, String(value));
    }
  });
  const queryString = qs.toString();
  const targetUrl = `${getBackendApiUrl()}/${path}${queryString ? `?${queryString}` : ''}`;

  const headers = {
    'X-JobBot-Key': backendKey,
  };
  ['content-type', 'content-length', 'accept'].forEach((name) => {
    if (req.headers[name]) headers[name] = req.headers[name];
  });

  const init = { method: req.method, headers };
  if (!['GET', 'HEAD'].includes(req.method)) {
    init.body = req;
    init.duplex = 'half';
  }

  try {
    const backendRes = await fetch(targetUrl, {
      ...init,
      signal: AbortSignal.timeout(85000),
    });
    const body = Buffer.from(await backendRes.arrayBuffer());

    res.status(backendRes.status);
    const contentType = backendRes.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    return res.send(body);
  } catch (err) {
    const msg = err.name === 'TimeoutError' ? 'Backend timed out (cold start?)' : err.message;
    console.error('Backend proxy error:', msg);
    return res.status(502).json({ detail: 'Backend unavailable', error: msg });
  }
}
