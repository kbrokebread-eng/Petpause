// FR12 (case study requirement 10): weekly occupancy report - pets boarded per day, occupancy % against
// capacity and the peak day - plus a revenue summary based on stay durations and bookings.

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

  // Revenue summary: every booking with nights in this week, charged per night at the nightly rate
  const dayAfterSunday = dates.addDays(monday, 7);
  const revenueRows = bookings.withNightsBetween(monday, dayAfterSunday).map((b) => {
    const firstNight = b.start_date > monday ? b.start_date : monday;
    const endOfWeek = b.end_date < dayAfterSunday ? b.end_date : dayAfterSunday;
    const nightsThisWeek = dates.daysBetween(firstNight, endOfWeek);
    return {
      code: bookings.code(b.id), pet_name: b.pet_name, owner_name: b.owner_name,
      start_date: b.start_date, end_date: b.end_date,
      stay_nights: bookings.nights(b), nights_this_week: nightsThisWeek, amount: nightsThisWeek * rate
    };
  });
  const totalStayNights = revenueRows.reduce((sum, r) => sum + r.stay_nights, 0);

  res.json({
    revenueRows,
    averageStay: revenueRows.length ? Math.round((totalStayNights / revenueRows.length) * 10) / 10 : 0,
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
