// Sample staff, pets and bookings, loaded the first time the program runs.
// Dates are set around today so the dashboard is never empty.

const db = require('./database');
const settings = require('./settings');
const staff = require('./staff');
const pets = require('./pets');
const dates = require('../lib/dates');

function loadIfEmpty() {
  if (db.prepare('SELECT COUNT(*) AS n FROM staff').get().n > 0) return;

  settings.set('capacity', '20');
  settings.set('nightly_rate', '250');

  staff.create('Sipho Nkosi', 'manager', 'PetPause2026!', 'Manager');
  staff.create('Thandi Mokoena', 'thandi', 'Staff2026!', 'Care staff');
  staff.create('Johan van Wyk', 'johan', 'Staff2026!', 'Receptionist');
  staff.create('Lerato Dlamini', 'lerato', 'Staff2026!', 'Care staff');

  const samplePets = [
    // name, breed, age, weight, owner, owner phone, medical, dietary, vet practice, vet phone
    ['Bella', 'Labrador Retriever', 4, 29, 'Nomsa Khumalo', '082 555 0143',
      'Severe peanut allergy. No treats or food containing peanut or peanut butter.',
      'Own food only, 2 cups at 08:00 and 16:00', 'Lyttelton Animal Hospital', '012 555 0101'],
    ['Rocky', 'Beagle', 6, 12, 'Ayanda Zulu', '071 555 0177',
      'Epilepsy medication at 12:00, given with food.', '', 'Centurion Vet Clinic', '012 555 0202'],
    ['Max', 'Jack Russell', 3, 7, 'Pieter Botha', '083 555 0198', '', '', 'Irene Vet', '012 555 0303'],
    ['Coco', 'Poodle', 2, 6, 'Megan Smith', '084 555 0120', '', '', 'Lyttelton Animal Hospital', '012 555 0101'],
    ['Oscar', 'Dachshund', 8, 9, 'Riaan Venter', '082 555 0165', '', 'No chicken or poultry products.',
      'Centurion Vet Clinic', '012 555 0202'],
    ['Nala', 'Staffordshire Terrier', 5, 18, 'Zanele Ndlovu', '073 555 0154', '', '', 'Irene Vet', '012 555 0303'],
    ['Simba', 'Boerboel', 3, 58, 'Thabo Mahlangu', '076 555 0132', '', '', 'Midstream Vet', '012 555 0404']
  ];
  for (const p of samplePets) {
    pets.insert({
      name: p[0], breed: p[1], age: p[2], weight: p[3], owner_name: p[4], owner_phone: p[5],
      medical: p[6], dietary: p[7], vet_practice: p[8], vet_phone: p[9]
    }, 'System');
  }

  const today = dates.today();
  addBooking(1, dates.addDays(today, -2), dates.addDays(today, 2)); // Bella - in progress
  addBooking(2, dates.addDays(today, -1), today);                   // Rocky - going home today
  addBooking(3, dates.addDays(today, -1), dates.addDays(today, 3)); // Max
  addBooking(4, today, dates.addDays(today, 4));                    // Coco - arriving today
  addBooking(5, dates.addDays(today, -3), dates.addDays(today, 1)); // Oscar
  addBooking(6, dates.addDays(today, 5), dates.addDays(today, 8));  // Nala - upcoming

  // Completed stays two weeks back so the weekly report has history
  const oldMonday = dates.addDays(dates.mondayOf(today), -14);
  for (let petId = 1; petId <= 7; petId++) {
    const s = dates.addDays(oldMonday, petId % 3);
    addBooking(petId, s, dates.addDays(s, 2 + (petId % 3)));
  }
}

function addBooking(petId, start, end) {
  db.prepare(`INSERT INTO bookings (pet_id, start_date, end_date, owner_contact, notes, created_by, created_at)
              SELECT id, ?, ?, owner_phone, '', 'System', ? FROM pets WHERE id = ?`)
    .run(start, end, dates.nowText(), petId);
}

module.exports = { loadIfEmpty };
