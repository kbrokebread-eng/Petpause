// FR6 to FR9: bookings and the capacity check.
//
// A stay from start_date to end_date uses one place for every NIGHT,
// so a stay from Mon to Thu uses Mon, Tue and Wed nights (3 nights).
// The pet is still on site on the end date until it is collected.

const db = require('./database');
const dates = require('../lib/dates');

const SELECT = `SELECT b.*, p.name AS pet_name, p.breed, p.owner_name, p.medical, p.dietary
                FROM bookings b JOIN pets p ON p.id = b.pet_id`;

function nights(b) {
  return dates.daysBetween(b.start_date, b.end_date);
}

function status(b, today) {
  if (b.cancelled) return 'Cancelled';
  if (b.start_date > today) return 'Upcoming';
  if (b.end_date < today) return 'Completed';
  return 'In progress';
}

/** Only bookings that have not finished can be amended or cancelled. */
function canChange(b, today) {
  const s = status(b, today);
  return s === 'Upcoming' || s === 'In progress';
}

function code(id) {
  return 'BK-' + (1000 + id);
}

function insert(b) {
  const info = db.prepare(`INSERT INTO bookings (pet_id, start_date, end_date, owner_contact, notes, created_by, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(b.pet_id, b.start_date, b.end_date, b.owner_contact, b.notes || '', b.created_by, dates.nowText());
  return Number(info.lastInsertRowid);
}

function update(b) {
  db.prepare('UPDATE bookings SET start_date = ?, end_date = ?, owner_contact = ?, notes = ? WHERE id = ?')
    .run(b.start_date, b.end_date, b.owner_contact, b.notes || '', b.id);
}

function cancel(id, reason) {
  db.prepare('UPDATE bookings SET cancelled = 1, cancel_reason = ? WHERE id = ?').run(reason, id);
}

function find(id) {
  return db.prepare(SELECT + ' WHERE b.id = ?').get(id);
}

/** All bookings, newest stays first, filtered by text and status. */
function list(search, statusFilter) {
  const like = '%' + (search || '').trim() + '%';
  const all = db.prepare(SELECT + ` WHERE (p.name LIKE ? OR p.owner_name LIKE ? OR ('BK-' || (1000 + b.id)) LIKE ?)
                                    ORDER BY b.start_date DESC, b.id DESC`).all(like, like, like);
  if (!statusFilter || statusFilter === 'All') return all;
  const today = dates.today();
  return all.filter((b) => status(b, today) === statusFilter);
}

function forPet(petId) {
  return db.prepare(SELECT + ' WHERE b.pet_id = ? ORDER BY b.start_date DESC').all(petId);
}

/** Pets on site on a day: arrived on or before the day and not yet collected. */
function onSite(day) {
  return db.prepare(SELECT + ' WHERE b.cancelled = 0 AND b.start_date <= ? AND b.end_date >= ? ORDER BY p.name').all(day, day);
}

/** Number of places taken on one night (optionally ignoring one booking while it is being amended). */
function bookedOnNight(night, ignoreBookingId) {
  return db.prepare(`SELECT COUNT(*) AS n FROM bookings
                     WHERE cancelled = 0 AND start_date <= ? AND end_date > ? AND id <> ?`)
    .get(night, night, ignoreBookingId || 0).n;
}

/** FR9: places taken on every night of a requested stay. */
function nightsFor(start, end, ignoreBookingId) {
  const result = [];
  for (let d = start; d < end; d = dates.addDays(d, 1)) {
    result.push({ date: d, booked: bookedOnNight(d, ignoreBookingId) });
  }
  return result;
}

/** A pet cannot have two stays that share a night. */
function overlappingStay(petId, start, end, ignoreBookingId) {
  return db.prepare(SELECT + ` WHERE b.pet_id = ? AND b.cancelled = 0 AND b.id <> ?
                               AND b.start_date < ? AND b.end_date > ?`).get(petId, ignoreBookingId || 0, end, start);
}

function activeFutureCountForPet(petId) {
  return db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE pet_id = ? AND cancelled = 0 AND end_date >= ?')
    .get(petId, dates.today()).n;
}

module.exports = {
  nights, status, canChange, code, insert, update, cancel, find, list, forPet, onSite,
  bookedOnNight, nightsFor, overlappingStay, activeFutureCountForPet
};
