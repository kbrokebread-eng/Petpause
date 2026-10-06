// NFR4: copies the database into the "backups" folder when the program starts and every 24 hours after that.
// The last 14 copies are kept.

const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const dates = require('./dates');

const FOLDER = path.join(__dirname, '..', 'backups');
const KEEP = 14;

async function runOnce() {
  try {
    fs.mkdirSync(FOLDER, { recursive: true });
    const target = path.join(FOLDER, `petpause-${dates.today()}.db`);
    // db.backup makes a clean, complete copy even while the system is in use
    await db.backup(target);
    const old = fs.readdirSync(FOLDER).filter((f) => f.startsWith('petpause-') && f.endsWith('.db')).sort();
    while (old.length > KEEP) fs.unlinkSync(path.join(FOLDER, old.shift()));
    console.log('Backup saved: ' + path.relative(process.cwd(), target));
  } catch (err) {
    console.log('Backup failed: ' + err.message);
  }
}

function startDailyBackups() {
  runOnce();
  setInterval(runOnce, 24 * 60 * 60 * 1000).unref();
}

module.exports = { startDailyBackups, runOnce };
