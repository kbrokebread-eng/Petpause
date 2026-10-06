// NFR2: keeps track of who is logged in, logs them out after 15 minutes of doing nothing,
// and restricts pages and data by role.

const passwords = require('./passwords');
const staff = require('../db/staff');

const TIMEOUT_MINUTES = 15;
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;
const COOKIE = 'PETPAUSE_SESSION';

const sessions = new Map(); // token -> { staffId, lastSeen }

function start(staffRow) {
  const token = passwords.randomToken();
  sessions.set(token, { staffId: staffRow.id, lastSeen: Date.now() });
  return token;
}

function end(token) {
  if (token) sessions.delete(token);
}

/** Used when a manager deactivates someone or resets their password. */
function endAllFor(staffId) {
  for (const [token, s] of sessions) {
    if (s.staffId === staffId) sessions.delete(token);
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function setCookie(res, token) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict`);
}

function clearCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

/**
 * Finds the logged-in staff member for this request.
 * Returns { user } when logged in, or { reason: 'login' | 'timeout' } when not.
 */
function current(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return { reason: 'login' };
  const s = sessions.get(token);
  if (!s) return { reason: 'timeout' };
  if (Date.now() - s.lastSeen > TIMEOUT_MS) {
    sessions.delete(token);
    return { reason: 'timeout' };
  }
  // Pick up role changes or deactivation straight away
  const me = staff.findById(s.staffId);
  if (!me || !me.active) {
    sessions.delete(token);
    return { reason: 'login' };
  }
  s.lastSeen = Date.now();
  return {
    user: { id: me.id, fullName: me.full_name, role: me.role, isManager: staff.isManager(me.role), token }
  };
}

/** For JSON API routes: 401 if not logged in. */
function requireLogin(req, res, next) {
  const c = current(req);
  if (!c.user) return res.status(401).json({ error: c.reason });
  req.user = c.user;
  next();
}

/** For JSON API routes that only managers may use. */
function requireManager(req, res, next) {
  requireLogin(req, res, () => {
    if (!req.user.isManager) {
      return res.status(403).json({ error: 'Only managers can do this.' });
    }
    next();
  });
}

module.exports = {
  TIMEOUT_MINUTES, start, end, endAllFor, readCookie, setCookie, clearCookie, current,
  requireLogin, requireManager, COOKIE
};
