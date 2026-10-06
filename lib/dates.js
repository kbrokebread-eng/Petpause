// Small date helpers. Dates are stored in SQLite as text: "2026-09-25".
// Working with plain date strings avoids time-zone surprises.

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

/** Today's date on this computer, as "YYYY-MM-DD". */
function today() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/** Date and time now, as "YYYY-MM-DD HH:MM:SS". */
function nowText() {
  const d = new Date();
  return today() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

/** Returns null if the text is empty or not a real date. */
function parse(text) {
  if (typeof text !== 'string') return null;
  text = text.trim();
  if (text.length !== 10 || text[4] !== '-' || text[7] !== '-') return null;
  const y = Number(text.slice(0, 4));
  const m = Number(text.slice(5, 7));
  const d = Number(text.slice(8, 10));
  if (!y || !m || !d) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return text;
}

function toUtc(iso) {
  return new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))));
}

function fromUtc(d) {
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

function addDays(iso, n) {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

/** Number of nights between two dates. */
function daysBetween(a, b) {
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

function mondayOf(iso) {
  const day = toUtc(iso).getUTCDay(); // 0 = Sunday
  return addDays(iso, day === 0 ? -6 : 1 - day);
}

/** "25 Sep 2026" */
function nice(iso) {
  const d = toUtc(iso);
  return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()].slice(0, 3) + ' ' + d.getUTCFullYear();
}

/** "Fri 25 Sep" */
function shortDay(iso) {
  const d = toUtc(iso);
  return DAYS[d.getUTCDay()].slice(0, 3) + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()].slice(0, 3);
}

/** "Friday 25 September 2026" */
function longDay(iso) {
  const d = toUtc(iso);
  return DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

/** "2026-09-23 12:10:44" becomes "12:10". */
function timeOf(stamp) {
  return stamp && stamp.length >= 16 ? stamp.slice(11, 16) : '';
}

module.exports = { today, nowText, parse, addDays, daysBetween, mondayOf, nice, shortDay, longDay, timeOf };
