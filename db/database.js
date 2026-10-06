// Opens the SQLite database file, creates the tables the first time the
// program runs and loads some sample data so every screen has something to show.

const path = require('path');
const Database = require('better-sqlite3');

const DB_FILE = process.env.PETPAUSE_DB || path.join(__dirname, '..', 'petpause.db');
const db = new Database(DB_FILE);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  -- FR1: every log-in attempt (good or bad) is written here
  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    success INTEGER NOT NULL,
    attempted_at TEXT NOT NULL,
    ip_address TEXT
  );

  -- FR3 + FR5: vet_practice and vet_phone are NOT NULL
  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    breed TEXT NOT NULL,
    age INTEGER,
    weight REAL NOT NULL,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    medical TEXT,
    dietary TEXT,
    vet_practice TEXT NOT NULL,
    vet_phone TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  );

  -- FR8: pet_id is NOT NULL and must point at a real pet
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER NOT NULL REFERENCES pets(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    owner_contact TEXT NOT NULL,
    notes TEXT,
    cancelled INTEGER NOT NULL DEFAULT 0,
    cancel_reason TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- FR11: one row per step per pet per day
  CREATE TABLE IF NOT EXISTS daily_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL REFERENCES bookings(id),
    status_date TEXT NOT NULL,
    step TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    recorded_by TEXT NOT NULL,
    UNIQUE (booking_id, status_date, step)
  );

  -- NFR6: capacity and nightly rate can be changed by a manager
  CREATE TABLE IF NOT EXISTS settings (
    name TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

module.exports = db;
module.exports.DB_FILE = DB_FILE;
