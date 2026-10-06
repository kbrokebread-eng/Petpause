// FR12: weekly occupancy report - pets boarded per day, occupancy % against capacity and the peak day.

const express = require('express');
const auth = require('../lib/auth');
const dates = require('../lib/dates');
const bookings = require('../db/bookings');
const settings = require('../db/settings');

const router = express.Router();
router.use(auth.requireManager);

router.get('/', (req, res) => {
  const monday = dates.mondayOf(dates.parse(req.query.week) || dates.today());
  const capacity = settings.capacity();
  const rate = settings.nightlyRate();

  const days = [];
  let total = 0;
  let peak = 0;
  let quiet = 0;
  for (let i = 0; i < 7; i++) {
    const date = dates.addDays(monday, i);
    const boarded = bookings.bookedOnNight(date, 0);
    days.push({ date, boarded });
    total += boarded;
    if (boarded > days[peak].boarded) peak = i;
    if (boarded < days[quiet].boarded) quiet = i;
  }

  res.json({
    monday,
    sunday: dates.addDays(monday, 6),
    prevWeek: dates.addDays(monday, -7),
    nextWeek: dates.addDays(monday, 7),
    capacity,
    rate,
    days,
    total,
    peak,
    quiet,
    average: Math.round((total * 100) / (capacity * 7)),
    revenue: total * rate,
    producedAt: dates.nowText().slice(0, 16),
    producedBy: req.user.fullName
  });
});

module.exports = router;
