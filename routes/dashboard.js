// FR10: a medical alert flag for every boarded pet with a recorded restriction, with the restriction text.

const express = require('express');
const auth = require('../lib/auth');
const dates = require('../lib/dates');
const bookings = require('../db/bookings');
const pets = require('../db/pets');
const status = require('../db/status');
const settings = require('../db/settings');

const router = express.Router();
router.use(auth.requireLogin);

router.get('/', (req, res) => {
  const today = dates.today();
  // Pets that have been checked out have gone home, so they no longer count as boarded
  const onSite = bookings.onSite(today).filter((b) => !status.findForStay(b.id, 'Checked out'));

  const alerts = onSite.filter((b) => pets.hasAlert(b)).map((b) => {
    let text = (b.medical || '').trim();
    if ((b.dietary || '').trim()) text += (text ? ' ' : '') + 'Diet: ' + b.dietary.trim();
    return { pet_name: b.pet_name, breed: b.breed, text };
  });

  res.json({
    today,
    capacity: settings.capacity(),
    tonight: bookings.bookedOnNight(today, 0),
    notFed: status.countNotFed(today),
    alerts,
    onSite: onSite.map((b) => ({
      pet_id: b.pet_id, pet_name: b.pet_name, breed: b.breed, owner_name: b.owner_name,
      owner_contact: b.owner_contact, start_date: b.start_date, end_date: b.end_date, has_alert: pets.hasAlert(b)
    }))
  });
});

module.exports = router;
