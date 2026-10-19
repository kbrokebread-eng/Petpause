// FR1: staff log in with a unique username and password. Failed attempts are denied and logged.

const express = require('express');
const auth = require('../lib/auth');
const passwords = require('../lib/passwords');
const staff = require('../db/staff');
const check = require('../lib/check');

const router = express.Router();
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

router.post('/login', (req, res) => {
  const username = check.str(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({ error: 'Enter your username and password.' });
  }

  if (staff.failedInLastMinutes(username, LOCK_MINUTES) >= MAX_FAILED) {
    staff.logAttempt(username, false, req.ip);
    return res.status(400).json({
      error: `Too many failed attempts for this username. Wait ${LOCK_MINUTES} minutes or ask a manager to reset your password.`
    });
  }

  const s = staff.findByUsername(username);
  const ok = Boolean(s && s.active && passwords.matches(password, s.salt, s.password_hash));
  staff.logAttempt(username, ok, req.ip);

  if (!ok) {
    // Same message whatever went wrong, so nobody can find out which usernames exist
    return res.status(400).json({ error: 'Username or password is not correct. This attempt has been recorded.' });
  }

  auth.setCookie(res, auth.start(s));
  res.json({ ok: true, mustChangePassword: s.must_change_password === 1 });
});

/**
 * Staff change their own password. Used at first log-in (after a manager sets a temporary
 * password) and any time someone wants to change theirs.
 */
router.post('/change-password', auth.requireLoginAllowTemporary, (req, res) => {
  const current = typeof req.body.current === 'string' ? req.body.current : '';
  const pw = typeof req.body.password === 'string' ? req.body.password : '';
  const pw2 = typeof req.body.password2 === 'string' ? req.body.password2 : '';
  const me = staff.findById(req.user.id);

  const errors = {};
  if (!passwords.matches(current, me.salt, me.password_hash)) {
    errors.current = 'Your current password is not correct.';
  }
  const problem = passwords.checkStrength(pw, me.username);
  if (problem) errors.password = problem;
  else if (pw === current) errors.password = 'Choose a password different from your current one.';
  else if (pw !== pw2) errors.password2 = "The two passwords don't match.";
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  staff.setPassword(me.id, pw, false);
  // Log out any other devices still using the old password, keep this one logged in
  auth.endAllFor(me.id);
  auth.setCookie(res, auth.start(me));
  res.json({ message: 'Your password has been changed.' });
});

router.post('/logout', (req, res) => {
  auth.end(auth.readCookie(req, auth.COOKIE));
  auth.clearCookie(res);
  res.json({ ok: true });
});

/** Who is logged in. Every page calls this first to draw the top bar. */
router.get('/me', auth.requireLoginAllowTemporary, (req, res) => {
  res.json({
    fullName: req.user.fullName,
    username: req.user.username,
    role: req.user.role,
    isManager: req.user.isManager,
    mustChangePassword: req.user.mustChangePassword,
    timeoutMinutes: auth.TIMEOUT_MINUTES
  });
});

module.exports = router;
