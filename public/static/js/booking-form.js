// FR6 / FR7 / FR8 / FR9: create or amend a booking.
// "Check availability" asks the server to run every check without saving.
// "Confirm" only unlocks when every night of the stay has a free place.

(async function () {
  const { esc, dates } = App;
  await App.start('Bookings');

  const form = document.getElementById('bookingForm');
  const confirmBtn = document.getElementById('confirmBtn');
  const confirmHelp = document.getElementById('confirmHelp');
  const id = App.param('id');
  const isNew = !id;
  let capacity = 20;
  let lastPressed = 'check';

  if (isNew) {
    // FR8: the pet list only holds registered pets
    const res = await App.api('GET', '/api/pets');
    const select = form.pet_id;
    const wanted = App.param('pet');
    for (const p of res.data.pets) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.dataset.phone = p.owner_phone;
      opt.textContent = `${p.name} (${p.breed}, owner ${p.owner_name})`;
      if (String(p.id) === wanted) {
        opt.selected = true;
        form.owner_contact.value = p.owner_phone;
      }
      select.appendChild(opt);
    }
    form.start.value = dates.today();
    form.end.value = dates.addDays(dates.today(), 1);
    select.addEventListener('change', function () {
      const opt = select.options[select.selectedIndex];
      if (opt && opt.dataset.phone) form.owner_contact.value = opt.dataset.phone;
      lock();
    });
  } else {
    const res = await App.api('GET', '/api/bookings/' + encodeURIComponent(id));
    if (!res.ok || !res.data.booking.can_change) {
      App.flashNext("That booking can't be changed.", true);
      location.href = '/bookings';
      return;
    }
    const b = res.data.booking;
    capacity = res.data.capacity;
    document.title = 'Amend booking | PetPause';
    document.getElementById('heading').textContent = 'Amend booking ' + b.code;
    document.getElementById('petChooser').remove();
    document.getElementById('petFixed').hidden = false;
    document.getElementById('petFixedName').value = `${b.pet_name} (${b.breed})`;
    form.start.value = b.start_date;
    form.end.value = b.end_date;
    form.owner_contact.value = b.owner_contact;
    form.notes.value = b.notes || '';
    confirmBtn.textContent = 'Save changes';
  }
  document.getElementById('capText').textContent = capacity;

  // Changing a date means capacity must be checked again
  form.start.addEventListener('change', lock);
  form.end.addEventListener('change', lock);

  function lock() {
    confirmBtn.disabled = true;
    confirmBtn.title = 'Check availability first';
    confirmHelp.hidden = false;
  }

  form.querySelectorAll("button[name='action']").forEach((btn) => {
    btn.addEventListener('click', function () {
      lastPressed = btn.value;
    });
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const data = App.formData(form);
    if (!isNew) data.id = Number(id);

    let res;
    if (lastPressed === 'confirm') {
      res = isNew ? await App.api('POST', '/api/bookings', data) : await App.api('PUT', '/api/bookings/' + id, data);
      if (res.ok) {
        App.flashNext(res.data.message);
        location.href = '/bookings';
        return;
      }
    } else {
      res = await App.api('POST', '/api/bookings/check', data);
    }
    if (res.data.error) {
      App.flashNext(res.data.error, true);
      location.href = '/bookings';
      return;
    }
    show(res.data);
  });

  /** Draws the capacity boxes, the warnings and the state of the Confirm button. */
  function show(result) {
    capacity = result.capacity;
    document.getElementById('capText').textContent = capacity;
    const errors = result.errors || {};
    App.showErrors(form, errors);

    // Capacity boxes, one per night
    const box = document.getElementById('nights');
    if (!result.nights) {
      box.innerHTML = "<p class='muted'>Choose the dates and press <strong>Check availability</strong> to see the places left on each night.</p>";
    } else {
      let h = "<div class='nights'>";
      for (const n of result.nights) {
        const after = n.booked + 1;
        const isFull = after > capacity;
        const cls = isFull ? 'night full' : (capacity - after <= 3 ? 'night mid' : 'night');
        const pct = Math.min(100, Math.floor((n.booked * 100) / Math.max(1, capacity)));
        h += `<div class='${cls}'><div class='d'>${dates.shortDay(n.date)}</div><div class='n'>${n.booked}/${capacity}</div>`
          + `<div class='bar'><i style='width:${pct}%'></i></div><div class='left'>`
          + (isFull ? 'FULL' : (capacity - n.booked) + ' places left') + '</div></div>';
      }
      box.innerHTML = h + '</div>';
    }

    // Warnings
    let banners = '';
    if (errors.capacity) {
      const days = result.full.map((d) => dates.shortDay(d)).join(', ');
      banners += "<div class='banner red' role='alert' style='margin-top:18px'><strong>&#9888; This booking can't be confirmed.</strong> "
        + `The daycare is full on ${esc(days)} (${capacity} of ${capacity} places booked). Change the dates to avoid `
        + (result.full.length === 1 ? 'that night.' : 'those nights.') + '</div>';
    }
    if (errors.overlap) {
      banners += `<div class='banner red' role='alert' style='margin-top:18px'>&#9888; ${esc(errors.overlap)}</div>`;
    }
    if (result.ok) {
      banners += "<div class='banner info' style='margin-top:18px'>&#10003; Places are available on every night. "
        + 'Press <strong>Confirm booking</strong> to save it.</div>';
    }
    document.getElementById('banners').innerHTML = banners;

    confirmBtn.disabled = !result.ok;
    confirmBtn.title = result.ok ? '' : 'Check availability first';
    confirmHelp.hidden = result.ok;
  }
})();
