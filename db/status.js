// FR11: daily status steps for each pet on site.

const db = require('./database');
const dates = require('../lib/dates');
const bookings = require('./bookings');

const STEPS = ['Checked in', 'Fed', 'Exercised', 'Checked out'];

function isValidStep(step) {
  return STEPS.includes(step);
}

/** Steps already recorded for a booking on a day, keyed by step name. */
function forDay(bookingId, day) {
  const map = {};
  for (const row of db.prepare('SELECT * FROM daily_status WHERE booking_id = ? AND status_date = ?').all(bookingId, day)) {
    map[row.step] = row;
  }
  return map;
}

/** Checked in and checked out belong to the whole stay, so look across every day of it. */
function findForStay(bookingId, step) {
  return db.prepare('SELECT * FROM daily_status WHERE booking_id = ? AND step = ? ORDER BY recorded_at LIMIT 1')
    .get(bookingId, step);
}

/** Returns the new entry's id, or 0 if that step was already recorded today. */
function record(bookingId, day, step, by) {
  const info = db.prepare(`INSERT OR IGNORE INTO daily_status (booking_id, status_date, step, recorded_at, recorded_by)
                           VALUES (?, ?, ?, ?, ?)`).run(bookingId, day, step, dates.nowText(), by);
  return info.changes === 1 ? Number(info.lastInsertRowid) : 0;
}

/** One recorded step, with the pet's name (used by Undo). */
function findEntry(id) {
  return db.prepare(`SELECT d.*, p.name AS pet_name FROM daily_status d JOIN bookings b ON b.id = d.booking_id
                     JOIN pets p ON p.id = b.pet_id WHERE d.id = ?`).get(id);
}

function countOtherSteps(bookingId, entryId) {
  return db.prepare('SELECT COUNT(*) AS n FROM daily_status WHERE booking_id = ? AND id <> ?').get(bookingId, entryId).n;
}

function undo(id) {
  db.prepare('DELETE FROM daily_status WHERE id = ?').run(id);
}

/** Pets on site today that have not been marked fed. Used on the dashboard. */
function countNotFed(day) {
  let count = 0;
  for (const b of bookings.onSite(day)) {
    if (!findForStay(b.id, 'Checked out') && !forDay(b.id, day).Fed) count++;
  }
  return count;
}

module.exports = { STEPS, isValidStep, forDay, findForStay, record, findEntry, countOtherSteps, undo, countNotFed };
