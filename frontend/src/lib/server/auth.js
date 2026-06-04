import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE = 'jobbot_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

export function getAccessSecret() {
  const secret = process.env.JOBBOT_ACCESS_SECRET?.trim();
  if (!secret) {
    throw new Error('JOBBOT_ACCESS_SECRET is not configured');
  }
  return secret;
}

export function getBackendApiUrl() {
  const url = (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000/api'
  ).replace(/\/$/, '');
  return url;
}

export function createSessionToken() {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payload = String(exp);
  const sig = createHmac('sha256', getAccessSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', getAccessSecret())
    .update(payload)
    .digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  });
  return out;
}

export function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE];
}

export function isRequestAuthenticated(req) {
  return verifySessionToken(getSessionFromRequest(req));
}

export function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SEC}${secure}`
  );
}

export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
  );
}

export function verifyPasscode(passcode) {
  const secret = getAccessSecret();
  const input = Buffer.from(passcode.trim());
  const expected = Buffer.from(secret);
  if (input.length !== expected.length) return false;
  return timingSafeEqual(input, expected);
}
