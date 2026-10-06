// FR6 create a booking, FR7 view / amend / cancel, FR8 every booking is linked to exactly one pet,
// FR9 capacity is checked for every night before the booking is confirmed.

const express = require('express');
const auth = require('../lib/auth');
const check = require('../lib/check');
const dates = require('../lib/dates');
const pets = require('../db/pets');
const bookings = require('../db/bookings');
const settings = require('../db/settings');

const router = express.Router();
router.use(auth.requireLogin);

const CANCEL_REASONS = ['Owner changed plans', 'Pet is unwell', 'Booked in error', 'Other'];
const MAX_NIGHTS = 60;

/** Extra fields the pages need for each booking. */
function describe(b, today) {
  return Object.assign({}, b, {
    code: bookings.code(b.id),
    nights: bookings.nights(b),
    status: bookings.status(b, today),
    can_change: bookings.canChange(b, today),
    has_alert: pets.hasAlert(b)
  });
}

// ---------------- list (FR7 view) ----------------

router.get('/', (req, res) => {
  const today = dates.today();
  res.json({ bookings: bookings.list(req.query.q, req.query.status).map((b) => describe(b, today)) });
});

router.get('/:id', (req, res) => {
  const b = bookings.find(Number(req.params.id));
  if (!b) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ booking: describe(b, dates.today()), cancelReasons: CANCEL_REASONS, capacity: settings.capacity() });
});

// ---------------- the checks shared by "Check availability" and "Confirm" ----------------

function evaluate(body, existing) {
  const today = dates.today();
  const input = {
    pet_id: existing ? existing.pet_id : Number(body.pet_id) || 0, // the pet on a booking can't be swapped
    start: check.str(body.start),
    end: check.str(body.end),
    owner_contact: check.str(body.owner_contact),
    notes: check.str(body.notes)
  };
  const errors = {};

  // FR8: must be linked to exactly one registered pet
  const pet = input.pet_id > 0 ? pets.find(input.pet_id) : null;
  if (!pet) errors.pet_id = "Choose a registered pet. A booking can't be saved without one.";

  const start = dates.parse(input.start);
  const end = dates.parse(input.end);
  if (!start) errors.start = 'Choose a start date.';
  if (!end) errors.end = 'Choose an end date.';
  if (start && end) {
    const startChanged = !existing || existing.start_date !== start;
    if (startChanged && start < today) errors.start = "The start date can't be in the past.";
    if (end <= start) errors.end = 'The end date must be after the start date.';
    else if (dates.daysBetween(start, end) > MAX_NIGHTS) errors.end = `A stay can't be longer than ${MAX_NIGHTS} nights.`;
  }
  if (!check.phone(input.owner_contact)) errors.owner_contact = "Enter the owner's 10-digit contact number.";

  const ignoreId = existing ? existing.id : 0;
  if (pet && !errors.start && !errors.end) {
    const clash = bookings.overlappingStay(pet.id, start, end, ignoreId);
    if (clash) {
      errors.overlap = `${pet.name} already has booking ${bookings.code(clash.id)} from ${dates.nice(clash.start_date)}`
        + ` to ${dates.nice(clash.end_date)}. A pet can't have two stays on the same night.`;
    }
  }

  // FR9: check every night of the stay
  const capacity = settings.capacity();
  let nights = null;
  const full = [];
  if (start && end && end > start && !errors.end) {
    nights = bookings.nightsFor(start, end, ignoreId);
    for (const n of nights) {
      if (n.booked + 1 > capacity) full.push(n.date);
    }
    if (full.length) errors.capacity = 'full';
  }

  return { input, pet, start, end, errors, nights, full, capacity };
}

function checkResult(e) {
  return {
    errors: e.errors,
    capacity: e.capacity,
    nights: e.nights,
    full: e.full,
    ok: Object.keys(e.errors).length === 0 && e.nights !== null
  };
}

/** "Check availability": runs every check but saves nothing. */
router.post('/check', (req, res) => {
  let existing = null;
  if (req.body.id) {
    existing = bookings.find(Number(req.body.id));
    if (!existing || !bookings.canChange(existing, dates.today())) {
      return res.status(400).json({ error: "That booking can't be changed." });
    }
  }
  res.json(checkResult(evaluate(req.body, existing)));
});

// Node runs one request at a time and SQLite saves straight away, so two staff pressing
// Confirm at the same moment can't both take the last place.

router.post('/', (req, res) => {
  const e = evaluate(req.body, null);
  const result = checkResult(e);
  if (!result.ok) return res.status(400).json(result);
  const b = {
    pet_id: e.pet.id, start_date: e.start, end_date: e.end,
    owner_contact: e.input.owner_contact, notes: e.input.notes, created_by: req.user.fullName
  };
  b.id = bookings.insert(b);
  res.json({
    message: `Booking ${bookings.code(b.id)} confirmed for ${e.pet.name}, ${dates.nice(e.start)} to ${dates.nice(e.end)}`
      + ` (${bookings.nights(b)} nights).`
  });
});

router.put('/:id', (req, res) => {
  const existing = bookings.find(Number(req.params.id));
  if (!existing || !bookings.canChange(existing, dates.today())) {
    return res.status(400).json({ error: "That booking can't be changed." });
  }
  const e = evaluate(req.body, existing);
  const result = checkResult(e);
  if (!result.ok) return res.status(400).json(result);
  bookings.update({
    id: existing.id, start_date: e.start, end_date: e.end, owner_contact: e.input.owner_contact, notes: e.input.notes
  });
  res.json({ message: `Booking ${bookings.code(existing.id)} has been amended.` });
});

// ---------------- cancel (FR7) ----------------

router.post('/:id/cancel', (req, res) => {
  const b = bookings.find(Number(req.params.id));
  if (!b || !bookings.canChange(b, dates.today())) {
    return res.status(400).json({ error: "That booking can't be cancelled." });
  }
  const reason = CANCEL_REASONS.includes(req.body.reason) ? req.body.reason : 'Other';
  bookings.cancel(b.id, `${reason} (by ${req.user.fullName})`);
  res.json({ message: `Booking ${bookings.code(b.id)} for ${b.pet_name} has been cancelled.` });
});

module.exports = router;
