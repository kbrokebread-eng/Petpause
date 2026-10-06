// FR1 and FR2: staff accounts and the log-in attempt log.

const db = require('./database');
const passwords = require('../lib/passwords');
const dates = require('../lib/dates');

const ROLES = ['Care staff', 'Receptionist', 'Manager', 'Administrator'];

function isManager(role) {
  return role === 'Manager' || role === 'Administrator';
}

function isValidRole(role) {
  return ROLES.includes(role);
}

function create(fullName, username, password, role) {
  const salt = passwords.newSalt();
  const info = db.prepare(`INSERT INTO staff (full_name, username, password_hash, salt, role, active, created_at)
                           VALUES (?, ?, ?, ?, ?, 1, ?)`)
    .run(fullName, username.toLowerCase(), passwords.hash(password, salt), salt, role, dates.nowText());
  return Number(info.lastInsertRowid);
}

function findByUsername(username) {
  return db.prepare('SELECT * FROM staff WHERE username = ?').get(String(username).toLowerCase());
}

function findById(id) {
  return db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
}

/** Staff list with last log-in and failed attempts in the last 7 days. */
function list(search, statusFilter) {
  const weekAgo = stampMinutesAgo(7 * 24 * 60);
  let sql = `SELECT s.*,
      (SELECT MAX(attempted_at) FROM login_attempts a WHERE a.username = s.username AND a.success = 1) AS last_login,
      (SELECT COUNT(*) FROM login_attempts a WHERE a.username = s.username AND a.success = 0 AND a.attempted_at >= ?) AS failed,
      (SELECT MAX(attempted_at) FROM login_attempts a WHERE a.username = s.username AND a.success = 0) AS last_failed
    FROM staff s WHERE (s.full_name LIKE ? OR s.username LIKE ?)`;
  if (statusFilter === 'active') sql += ' AND s.active = 1';
  if (statusFilter === 'inactive') sql += ' AND s.active = 0';
  sql += ' ORDER BY s.active DESC, s.full_name';
  const like = '%' + (search || '').trim() + '%';
  return db.prepare(sql).all(weekAgo, like, like);
}

function update(id, fullName, role) {
  db.prepare('UPDATE staff SET full_name = ?, role = ? WHERE id = ?').run(fullName, role, id);
}

function setActive(id, active) {
  db.prepare('UPDATE staff SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
}

function setPassword(id, password) {
  const salt = passwords.newSalt();
  db.prepare('UPDATE staff SET password_hash = ?, salt = ? WHERE id = ?').run(passwords.hash(password, salt), salt, id);
}

function countActiveManagers() {
  return db.prepare("SELECT COUNT(*) AS n FROM staff WHERE active = 1 AND role IN ('Manager', 'Administrator')").get().n;
}

/** FR1: every attempt is logged, good or bad. */
function logAttempt(username, success, ip) {
  db.prepare('INSERT INTO login_attempts (username, success, attempted_at, ip_address) VALUES (?, ?, ?, ?)')
    .run(String(username).toLowerCase(), success ? 1 : 0, dates.nowText(), ip || '');
}

/** Failed attempts for one username in the last few minutes, since their last good log-in. */
function failedInLastMinutes(username, minutes) {
  const u = String(username).toLowerCase();
  return db.prepare(`SELECT COUNT(*) AS n FROM login_attempts
      WHERE username = ? AND success = 0 AND attempted_at >= ?
      AND attempted_at > COALESCE((SELECT MAX(attempted_at) FROM login_attempts WHERE username = ? AND success = 1), '')`)
    .get(u, stampMinutesAgo(minutes), u).n;
}

/** Recent failed attempts, newest first, for the manager to review. */
function recentFailedAttempts(limit) {
  return db.prepare(`SELECT attempted_at, username, ip_address FROM login_attempts
                     WHERE success = 0 ORDER BY attempted_at DESC, id DESC LIMIT ?`).all(limit);
}

function stampMinutesAgo(minutes) {
  const d = new Date(Date.now() - minutes * 60000);
  const p = (n) => (n < 10 ? '0' + n : String(n));
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' '
    + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

module.exports = {
  ROLES, isManager, isValidRole, create, findByUsername, findById, list, update, setActive,
  setPassword, countActiveManagers, logAttempt, failedInLastMinutes, recentFailedAttempts
};
