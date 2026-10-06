// NFR6: kennel capacity and nightly rate are stored in the database, not in the code.

const db = require('./database');

function get(name, defaultValue) {
  const row = db.prepare('SELECT value FROM settings WHERE name = ?').get(name);
  return row ? row.value : defaultValue;
}

function set(name, value) {
  db.prepare('INSERT INTO settings (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value')
    .run(name, String(value));
}

function capacity() {
  return parseInt(get('capacity', '20'), 10);
}

function nightlyRate() {
  return parseFloat(get('nightly_rate', '250'));
}

module.exports = { get, set, capacity, nightlyRate };
