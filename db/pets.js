// FR3, FR4, FR5: pet profiles.

const db = require('./database');
const dates = require('../lib/dates');

function hasAlert(p) {
  return Boolean((p.medical || '').trim() || (p.dietary || '').trim());
}

/** The restriction text shown on alerts. */
function alertText(p) {
  let text = (p.medical || '').trim();
  const diet = (p.dietary || '').trim();
  if (diet) {
    text += text ? ' | Diet: ' : 'Diet: ';
    text += diet;
  }
  return text;
}

function insert(p, by) {
  const info = db.prepare(`INSERT INTO pets (name, breed, age, weight, owner_name, owner_phone, medical, dietary,
                           vet_practice, vet_phone, updated_at, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(p.name, p.breed, p.age, p.weight, p.owner_name, p.owner_phone, p.medical, p.dietary,
      p.vet_practice, p.vet_phone, dates.nowText(), by);
  return Number(info.lastInsertRowid);
}

function update(p, by) {
  db.prepare(`UPDATE pets SET name=?, breed=?, age=?, weight=?, owner_name=?, owner_phone=?, medical=?, dietary=?,
              vet_practice=?, vet_phone=?, updated_at=?, updated_by=? WHERE id=?`)
    .run(p.name, p.breed, p.age, p.weight, p.owner_name, p.owner_phone, p.medical, p.dietary,
      p.vet_practice, p.vet_phone, dates.nowText(), by, p.id);
}

/** FR4: delete. The profile is hidden rather than wiped so old bookings and reports still add up. */
function remove(id, by) {
  db.prepare('UPDATE pets SET deleted = 1, updated_at = ?, updated_by = ? WHERE id = ?').run(dates.nowText(), by, id);
}

function find(id) {
  return db.prepare('SELECT * FROM pets WHERE id = ? AND deleted = 0').get(id);
}

function list(search) {
  const like = '%' + (search || '').trim() + '%';
  return db.prepare(`SELECT * FROM pets WHERE deleted = 0 AND (name LIKE ? OR owner_name LIKE ? OR breed LIKE ?)
                     ORDER BY name`).all(like, like, like);
}

module.exports = { hasAlert, alertText, insert, update, remove, find, list };
