// FR2: a manager creates, updates, deactivates and assigns roles to staff.

const express = require('express');
const auth = require('../lib/auth');
const check = require('../lib/check');
const passwords = require('../lib/passwords');
const staff = require('../db/staff');

const router = express.Router();
router.use(auth.requireManager);

/** Never send password hashes to the browser. */
function publicFields(s) {
  return {
    id: s.id, full_name: s.full_name, username: s.username, role: s.role, active: s.active === 1,
    last_login: s.last_login || null, failed: s.failed || 0, last_failed: s.last_failed || null
  };
}

router.get('/', (req, res) => {
  const list = staff.list(req.query.q, req.query.status).map(publicFields);
  res.json({ staff: list, me: req.user.id, failedAttempts: staff.recentFailedAttempts(10), roles: staff.ROLES });
});

router.get('/:id', (req, res) => {
  const s = staff.findById(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Staff member not found.' });
  res.json({ staff: publicFields(s), roles: staff.ROLES });
});

/** Shared checks for add and edit. Returns an object of field -> message. */
function validate(body, existing) {
  const errors = {};
  const isNew = !existing;
  const name = check.str(body.full_name);
  const username = check.str(body.username).toLowerCase();
  const role = check.str(body.role);
  const pw = typeof body.password === 'string' ? body.password : '';
  const pw2 = typeof body.password2 === 'string' ? body.password2 : '';

  if (!name) errors.full_name = "Enter the staff member's full name.";
  if (isNew) {
    if (!check.username(username)) errors.username = 'Use 3 to 30 letters, numbers, dots or underscores.';
    else if (staff.findByUsername(username)) errors.username = 'That username is already taken.';
  }
  if (!staff.isValidRole(role)) errors.role = 'Choose a role.';
  if (isNew || pw !== '') {
    const problem = passwords.checkStrength(pw);
    if (problem) errors.password = problem;
    else if (pw !== pw2) errors.password2 = "The two passwords don't match.";
  }
  // Never leave the system without a manager
  if (!isNew && staff.isManager(existing.role) && !staff.isManager(role) && existing.active
      && staff.countActiveManagers() <= 1) {
    errors.role = 'This is the only active manager. Add another manager first.';
  }
  return { errors, name, username, role, pw };
}

router.post('/', (req, res) => {
  const v = validate(req.body, null);
  if (Object.keys(v.errors).length) return res.status(400).json({ errors: v.errors });
  staff.create(v.name, v.username, v.pw, v.role);
  res.json({ message: `Account created for ${v.name}.` });
});

router.put('/:id', (req, res) => {
  const existing = staff.findById(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Staff member not found.' });
  const v = validate(req.body, existing);
  if (Object.keys(v.errors).length) return res.status(400).json({ errors: v.errors });
  staff.update(existing.id, v.name, v.role);
  if (v.pw !== '') {
    staff.setPassword(existing.id, v.pw);
    if (existing.id !== req.user.id) auth.endAllFor(existing.id); // they must log in again with the new password
  }
  res.json({ message: `Changes saved for ${v.name}.` });
});

router.post('/:id/active', (req, res) => {
  const s = staff.findById(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Staff member not found.' });
  const makeActive = req.body.active === true;
  if (s.id === req.user.id) {
    return res.status(400).json({ error: "You can't deactivate your own account." });
  }
  if (!makeActive && staff.isManager(s.role) && staff.countActiveManagers() <= 1) {
    return res.status(400).json({ error: `${s.full_name} is the only active manager and can't be deactivated.` });
  }
  staff.setActive(s.id, makeActive);
  if (!makeActive) auth.endAllFor(s.id);
  res.json({ message: s.full_name + (makeActive ? ' can log in again.' : ' has been deactivated and logged out.') });
});

module.exports = router;
