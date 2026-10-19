// FR10 (case study requirement 4): a medical alert flag for every boarded pet with a recorded restriction,
// with the restriction text, plus the pets with a restriction arriving in the next 7 days.

const express = require('express');
const auth = require('../lib/auth');
const dates = require('../lib/dates');
const bookings = require('../db/bookings');
const pets = require('../db/pets');
const status = require('../db/status');
const settings = require('../db/settings');

const router = express.Router();
router.use(auth.requireLogin);

const UPCOMING_DAYS = 7;

/** The medical restriction, followed by the dietary one if there is one. */
function restrictionText(b) {
  let text = (b.medical || '').trim();
  if ((b.dietary || '').trim()) text += (text ? ' ' : '') + 'Diet: ' + b.dietary.trim();
  return text;
}

router.get('/', (req, res) => {
  const today = dates.today();
  // Pets that have been checked out have gone home, so they no longer count as boarded
  const onSite = bookings.onSite(today).filter((b) => !status.findForStay(b.id, 'Checked out'));

  const alerts = onSite.filter((b) => pets.hasAlert(b)).map((b) => ({
    pet_name: b.pet_name, breed: b.breed, text: restrictionText(b)
  }));

  // Pets with a restriction arriving in the next 7 days, so staff are warned before check-in
  const upcoming = bookings.arrivingBetween(today, dates.addDays(today, UPCOMING_DAYS))
    .filter((b) => pets.hasAlert(b))
    .map((b) => ({
      pet_id: b.pet_id, pet_name: b.pet_name, breed: b.breed, start_date: b.start_date, text: restrictionText(b)
    }));

  res.json({
    today,
    capacity: settings.capacity(),
    tonight: bookings.bookedOnNight(today, 0),
    notFed: status.countNotFed(today),
    alerts,
    upcoming,
    upcomingDays: UPCOMING_DAYS,
    onSite: onSite.map((b) => ({
      pet_id: b.pet_id, pet_name: b.pet_name, breed: b.breed, owner_name: b.owner_name,
      owner_contact: b.owner_contact, start_date: b.start_date, end_date: b.end_date, has_alert: pets.hasAlert(b)
    }))
  });
});

module.exports = router;
