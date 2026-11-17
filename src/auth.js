// Editor sign-in with Google, adapted from alice-new: a plain OAuth 2.0
// authorisation-code flow with no libraries. The OAuth state and the editor
// session are small HMAC-signed cookies, so there is no session store.
//
// Who may sign in: the owners named in ADMIN_EMAILS, plus the editors those
// owners add on the People screen (kept in DATA_DIR/editors.json, which is not
// part of the public content repository).

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from './content.js';

const env = process.env;
const SESSION_COOKIE = 'pcf_editor';
const STATE_COOKIE = 'pcf_oauth_state';
const SESSION_MS = 1000 * 60 * 60 * 24 * 30;
const STATE_MS = 1000 * 60 * 10;
export const CALLBACK_PATH = '/api/auth/google/callback';
const EDITOR_HOME = '/edit';

const secret = env.SESSION_SECRET || randomBytes(32).toString('hex');
const secure = env.NODE_ENV === 'production';
const owners = (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const editorsFile = path.join(dataDir, 'editors.json');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let editors = [];

export async function init() {
  try {
    editors = JSON.parse(await readFile(editorsFile, 'utf8'));
  } catch {
    editors = [];
  }
}

async function persist() {
  const tmp = `${editorsFile}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(editors, null, 2)}\n`);
  await rename(tmp, editorsFile);
}

const normalise = (email) => String(email ?? '').trim().toLowerCase();
export const isOwner = (email) => owners.includes(normalise(email));
export const isEmailAllowed = (email) => isOwner(email) || editors.some((editor) => editor.email === normalise(email));
export const googleConfigured = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && owners.length);

export const listPeople = () => [
  ...owners.map((email) => ({ email, owner: true })),
  ...editors.filter((editor) => !isOwner(editor.email)).map((editor) => ({ ...editor, owner: false })),
];

export async function addEditor(email, addedBy) {
  const clean = normalise(email);
  if (!EMAIL.test(clean)) return { error: 'That does not look like an email address.' };
  if (isEmailAllowed(clean)) return { error: 'That person can already sign in.' };
  editors = [...editors, { email: clean, addedBy, addedAt: new Date().toISOString() }];
  await persist();
  return {};
}

export async function removeEditor(email) {
  editors = editors.filter((editor) => editor.email !== normalise(email));
  await persist();
}

// ---------- Signed cookies ----------
const sign = (value) => createHmac('sha256', secret).update(value).digest('base64url');

const safeEqual = (a, b) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

const pack = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
};

function unpack(value) {
  const [body, mac] = String(value ?? '').split('.');
  if (!body || !mac || !safeEqual(mac, sign(body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

const readCookie = (req, name) =>
  (req.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

// ---------- Session ----------
// The allow-list is checked on every request, so removing someone on the
// People screen locks them out straight away.
export function currentEditor(req) {
  const session = unpack(readCookie(req, SESSION_COOKIE));
  if (!session || !isEmailAllowed(session.email)) return null;
  return { email: session.email, name: session.name || session.email.split('@')[0], owner: isOwner(session.email) };
}

function startSession(res, { email, name }) {
  // Lax, not Strict, so following a link to the site from an email still
  // shows the "Edit this page" link. Changes are protected by sameOrigin below.
  res.cookie(SESSION_COOKIE, pack({ email, name, exp: Date.now() + SESSION_MS }), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: SESSION_MS,
    path: '/',
  });
}

export const endSession = (res) => res.clearCookie(SESSION_COOKIE, { path: '/' });

const sameOrigin = (req) => {
  const origin = req.headers.origin;
  if (!origin) return req.method === 'GET' || req.method === 'HEAD';
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
};

export function requireEditor(req, res, next) {
  const editor = currentEditor(req);
  if (!editor) return res.status(401).json({ error: 'Please sign in again.' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Cross-site request refused.' });
  req.editor = editor;
  return next();
}

export function requireOwner(req, res, next) {
  return requireEditor(req, res, () => (req.editor.owner ? next() : res.status(403).json({ error: 'Only the site owner can do that.' })));
}

// ---------- Google OAuth ----------
const redirectUri = (req) => {
  const origin = env.SITE_ORIGIN ? env.SITE_ORIGIN.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`;
  return `${origin}${CALLBACK_PATH}`;
};

// Returns the verified, lower-cased email and display name for an
// authorisation code, or null.
export async function profileForCode(code, uri, fetchImpl = fetch) {
  const tokenRes = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: uri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error(`token exchange ${tokenRes.status}`);
  const tokens = await tokenRes.json();

  const infoRes = await fetchImpl('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) throw new Error(`userinfo ${infoRes.status}`);
  const info = await infoRes.json();
  if (info.verified_email !== true || !info.email) return null;
  return { email: String(info.email).toLowerCase(), name: String(info.name ?? '').slice(0, 80) };
}

export function startGoogleSignIn(req, res) {
  // Local development only: sign in as DEV_LOGIN_EMAIL without Google.
  if (!secure && env.DEV_LOGIN_EMAIL && isEmailAllowed(env.DEV_LOGIN_EMAIL)) {
    startSession(res, { email: normalise(env.DEV_LOGIN_EMAIL), name: 'Local Developer' });
    return res.redirect(EDITOR_HOME);
  }
  if (!googleConfigured()) return res.status(503).type('text').send('Google sign-in has not been set up yet.');
  const state = randomBytes(16).toString('hex');
  // Lax, not Strict: this cookie has to come back on the redirect from Google.
  res.cookie(STATE_COOKIE, pack({ state, exp: Date.now() + STATE_MS }), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: STATE_MS,
    path: CALLBACK_PATH,
  });
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function finishGoogleSignIn(req, res) {
  if (!googleConfigured()) return res.redirect(EDITOR_HOME);
  const { code, state } = req.query;
  const expected = unpack(readCookie(req, STATE_COOKIE))?.state;
  res.clearCookie(STATE_COOKIE, { path: CALLBACK_PATH });
  if (typeof code !== 'string' || typeof state !== 'string' || !expected || !safeEqual(state, expected)) {
    return res.redirect(`${EDITOR_HOME}?error=auth`);
  }

  try {
    const profile = await profileForCode(code, redirectUri(req));
    if (!profile || !isEmailAllowed(profile.email)) return res.redirect(`${EDITOR_HOME}?error=denied`);
    startSession(res, profile);
    return res.redirect(EDITOR_HOME);
  } catch (error) {
    console.error('Google sign-in failed:', error.message);
    return res.redirect(`${EDITOR_HOME}?error=auth`);
  }
}
