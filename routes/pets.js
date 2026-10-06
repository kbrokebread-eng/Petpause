// FR3 register a pet, FR4 view / update / delete, FR5 emergency vet details are required.

const express = require('express');
const auth = require('../lib/auth');
const check = require('../lib/check');
const pets = require('../db/pets');
const bookings = require('../db/bookings');
const dates = require('../lib/dates');

const router = express.Router();
router.use(auth.requireLogin);

function withAlert(p) {
  return Object.assign({}, p, { has_alert: pets.hasAlert(p), alert_text: pets.alertText(p) });
}

router.get('/', (req, res) => {
  res.json({ pets: pets.list(req.query.q).map(withAlert) });
});

router.get('/:id', (req, res) => {
  const p = pets.find(Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Pet not found.' });
  const today = dates.today();
  const stays = bookings.forPet(p.id).map((b) => ({
    id: b.id, code: bookings.code(b.id), start_date: b.start_date, end_date: b.end_date,
    nights: bookings.nights(b), status: bookings.status(b, today)
  }));
  res.json({ pet: withAlert(p), bookings: stays });
});

/** Reads and checks the form. Returns { pet, errors }. */
function validate(body) {
  const p = {
    name: check.str(body.name),
    breed: check.str(body.breed),
    age: null,
    weight: null,
    owner_name: check.str(body.owner_name),
    owner_phone: check.str(body.owner_phone),
    medical: check.str(body.medical),
    dietary: check.str(body.dietary),
    vet_practice: check.str(body.vet_practice),
    vet_phone: check.str(body.vet_phone)
  };
  const errors = {};
  if (!p.name) errors.name = "Enter the pet's name.";
  if (!p.breed) errors.breed = 'Enter or choose a breed.';
  if (!check.blank(body.age)) {
    p.age = check.toInt(body.age);
    if (p.age === null || p.age < 0 || p.age > 40) {
      errors.age = 'Age must be a whole number from 0 to 40.';
      p.age = null;
    }
  }
  p.weight = check.toNumber(body.weight);
  if (p.weight === null || p.weight <= 0 || p.weight > 150) {
    errors.weight = 'Enter a weight in kg, for example 12.5.';
  }
  if (!p.owner_name) errors.owner_name = "Enter the owner's name.";
  if (!check.phone(p.owner_phone)) errors.owner_phone = 'Enter a 10-digit phone number.';
  // FR5: reject the save without emergency vet details
  if (!p.vet_practice) errors.vet_practice = 'Vet practice is required.';
  if (!p.vet_phone) errors.vet_phone = 'Vet phone number is required.';
  else if (!check.phone(p.vet_phone)) errors.vet_phone = 'Enter a 10-digit phone number.';
  return { pet: p, errors };
}

router.post('/', (req, res) => {
  const v = validate(req.body);
  if (Object.keys(v.errors).length) return res.status(400).json({ errors: v.errors });
  const id = pets.insert(v.pet, req.user.fullName);
  res.json({ id, message: `${v.pet.name}'s profile has been created.` });
});

router.put('/:id', (req, res) => {
  const existing = pets.find(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Pet not found.' });
  const v = validate(req.body);
  if (Object.keys(v.errors).length) return res.status(400).json({ errors: v.errors });
  v.pet.id = existing.id;
  pets.update(v.pet, req.user.fullName);
  res.json({ id: existing.id, message: `${v.pet.name}'s profile has been updated.` });
});

router.delete('/:id', (req, res) => {
  const p = pets.find(Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Pet not found.' });
  if (bookings.activeFutureCountForPet(p.id) > 0) {
    return res.status(400).json({
      error: `${p.name} has a current or upcoming booking. Cancel it before deleting the profile.`
    });
  }
  pets.remove(p.id, req.user.fullName);
  res.json({ message: `${p.name}'s profile has been deleted.` });
});

module.exports = router;
