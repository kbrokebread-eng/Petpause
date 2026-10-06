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
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  auth.end(auth.readCookie(req, auth.COOKIE));
  auth.clearCookie(res);
  res.json({ ok: true });
});

/** Who is logged in. Every page calls this first to draw the top bar. */
router.get('/me', auth.requireLogin, (req, res) => {
  res.json({
    fullName: req.user.fullName,
    role: req.user.role,
    isManager: req.user.isManager,
    timeoutMinutes: auth.TIMEOUT_MINUTES
  });
});

module.exports = router;
