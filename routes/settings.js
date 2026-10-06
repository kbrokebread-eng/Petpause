// NFR6: a manager can change kennel capacity and the nightly rate without any code changes.

const express = require('express');
const auth = require('../lib/auth');
const check = require('../lib/check');
const dates = require('../lib/dates');
const bookings = require('../db/bookings');
const settings = require('../db/settings');

const router = express.Router();
router.use(auth.requireManager);

router.get('/', (req, res) => {
  res.json({ capacity: settings.get('capacity', '20'), nightly_rate: settings.get('nightly_rate', '250') });
});

router.put('/', (req, res) => {
  const errors = {};
  const cap = check.toInt(req.body.capacity);
  if (cap === null || cap < 1 || cap > 500) {
    errors.capacity = 'Capacity must be a whole number from 1 to 500.';
  } else {
    // Don't allow a capacity lower than what is already booked from today on
    let d = dates.today();
    for (let i = 0; i < 365; i++) {
      const booked = bookings.bookedOnNight(d, 0);
      if (booked > cap) {
        errors.capacity = `${dates.nice(d)} already has ${booked} pets booked. Capacity can't go below that.`;
        break;
      }
      d = dates.addDays(d, 1);
    }
  }
  const rate = check.toNumber(req.body.nightly_rate);
  if (rate === null || rate < 0 || rate > 100000) errors.nightly_rate = 'Enter the rate in rand, for example 250.';

  if (Object.keys(errors).length) return res.status(400).json({ errors });
  settings.set('capacity', cap);
  settings.set('nightly_rate', rate);
  res.json({ message: `Settings saved. Capacity is now ${cap} places a night.` });
});

module.exports = router;
