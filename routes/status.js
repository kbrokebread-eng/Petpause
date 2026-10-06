// FR11: staff record a pet's daily status: checked in, fed, exercised, checked out.
// Each step is saved with the time and the staff member's name.

const express = require('express');
const auth = require('../lib/auth');
const dates = require('../lib/dates');
const bookings = require('../db/bookings');
const pets = require('../db/pets');
const status = require('../db/status');

const router = express.Router();
router.use(auth.requireLogin);

router.get('/', (req, res) => {
  const today = dates.today();
  const day = dates.parse(req.query.date) || today;
  const rows = bookings.onSite(day).map((b) => {
    const todays = status.forDay(b.id, day);
    const checkedIn = status.findForStay(b.id, 'Checked in');
    const checkedOut = status.findForStay(b.id, 'Checked out');
    const steps = status.STEPS.map((step) => {
      let done;
      if (step === 'Checked in') done = checkedIn;
      else if (step === 'Checked out') done = checkedOut;
      else done = todays[step];

      // Work out if the button can be pressed
      let allowed = day === today;
      if (step !== 'Checked in' && !checkedIn) allowed = false; // nothing else happens before the pet arrives
      if (step !== 'Checked out' && step !== 'Checked in' && checkedOut) allowed = false; // already gone home
      if (step === 'Checked in' && checkedOut) allowed = false;

      return {
        step,
        done: done ? { recorded_at: done.recorded_at, recorded_by: done.recorded_by } : null,
        allowed
      };
    });
    return {
      booking_id: b.id, pet_id: b.pet_id, pet_name: b.pet_name, breed: b.breed,
      start_date: b.start_date, end_date: b.end_date,
      has_alert: pets.hasAlert(b),
      alert: (b.medical || '').trim() ? b.medical.trim() : 'Diet: ' + (b.dietary || '').trim(),
      fed_today: Boolean(todays.Fed),
      checked_out: Boolean(checkedOut),
      steps
    };
  });
  res.json({ day, today, rows });
});

router.post('/mark', (req, res) => {
  const today = dates.today();
  const step = req.body.step;
  const b = bookings.find(Number(req.body.booking_id));

  if (!b || b.cancelled || b.start_date > today || b.end_date < today || !status.isValidStep(step)) {
    return res.status(400).json({ error: "That step can't be recorded for this pet today." });
  }
  const checkedIn = status.findForStay(b.id, 'Checked in');
  const checkedOut = status.findForStay(b.id, 'Checked out');
  if (step !== 'Checked in' && !checkedIn) {
    return res.status(400).json({ error: `${b.pet_name} must be checked in first.` });
  }
  if (checkedOut || (step === 'Checked in' && checkedIn)) {
    return res.status(400).json({ error: `That step has already been recorded for ${b.pet_name}.` });
  }
  const entryId = status.record(b.id, today, step, req.user.fullName);
  if (!entryId) {
    return res.status(400).json({ error: `That step has already been recorded for ${b.pet_name} today.` });
  }
  res.json({
    entry_id: entryId,
    message: `${b.pet_name} marked as ${step} at ${dates.timeOf(dates.nowText())} by ${req.user.fullName}.`
  });
});

router.post('/undo', (req, res) => {
  const e = status.findEntry(Number(req.body.entry_id));
  // Only today's steps can be undone
  if (!e || e.status_date !== dates.today()) {
    return res.status(400).json({ error: "Only today's steps can be undone." });
  }
  if (e.step === 'Checked in' && status.countOtherSteps(e.booking_id, e.id) > 0) {
    return res.status(400).json({ error: 'Undo the other steps first. Checked in can only be undone on its own.' });
  }
  status.undo(e.id);
  res.json({ message: `${e.step} for ${e.pet_name} has been undone.` });
});

module.exports = router;
