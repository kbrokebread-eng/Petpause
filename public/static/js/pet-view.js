// FR4: one pet's profile, its stays, and the delete button.

(async function () {
  const { esc, dates } = App;
  await App.start('Pets');

  const id = App.param('id');
  const res = await App.api('GET', '/api/pets/' + encodeURIComponent(id));
  if (!res.ok) {
    location.href = '/pets';
    return;
  }
  const p = res.data.pet;
  document.title = p.name + ' | PetPause';

  document.getElementById('petName').textContent = p.name;
  document.getElementById('petSub').innerHTML = `<a href='/pets'>Pets</a> / ${esc(p.name)} &middot; Last updated `
    + `${esc(p.updated_at.slice(0, 16))} by ${esc(p.updated_by)}`;
  document.getElementById('newBooking').href = '/bookings/new?pet=' + p.id;
  document.getElementById('editLink').href = '/pets/edit?id=' + p.id;

  if (p.has_alert) {
    document.getElementById('alert').innerHTML = `<div class='bigalert' role='alert'>&#9888; MEDICAL ALERT: ${esc(p.alert_text)}</div>`;
  }

  document.getElementById('petCard').insertAdjacentHTML('beforeend',
    row('Breed', p.breed)
    + row('Age', p.age === null ? 'Not recorded' : p.age + ' years')
    + row('Weight', p.weight + ' kg')
    + row('Medical restrictions', p.medical || 'None')
    + row('Dietary restrictions', p.dietary || 'None'));
  document.getElementById('ownerCard').insertAdjacentHTML('beforeend', row('Name', p.owner_name) + row('Phone', p.owner_phone));
  document.getElementById('vetCard').insertAdjacentHTML('beforeend', row('Practice', p.vet_practice) + row('Phone', p.vet_phone));

  const stays = res.data.bookings;
  const box = document.getElementById('stays');
  if (stays.length === 0) {
    box.innerHTML = "<div class='empty'>No bookings yet.</div>";
  } else {
    let h = '<table><tr><th>Booking</th><th>From</th><th>To</th><th>Nights</th><th>Status</th></tr>';
    for (const b of stays) {
      h += `<tr><td>${b.code}</td><td>${dates.nice(b.start_date)}</td><td>${dates.nice(b.end_date)}</td>`
        + `<td>${b.nights}</td><td>${App.pill(b.status)}</td></tr>`;
    }
    box.innerHTML = h + '</table>';
  }

  // FR4: delete, after an "Are you sure?" question
  document.getElementById('deleteForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!confirm(`Delete ${p.name}'s profile? This can't be undone from the screen.`)) return;
    const del = await App.api('DELETE', '/api/pets/' + p.id);
    if (del.ok) {
      App.flashNext(del.data.message);
      location.href = '/pets';
    } else {
      App.showError(del.data.error);
    }
  });

  function row(label, value) {
    return `<div class='field'><div class='muted small'>${esc(label)}</div><div><strong>${esc(value)}</strong></div></div>`;
  }
})();
