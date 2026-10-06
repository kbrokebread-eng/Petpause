// FR7: cancel a booking with a reason.

(async function () {
  const { esc, dates } = App;
  await App.start('Bookings');

  const id = App.param('id');
  const res = await App.api('GET', '/api/bookings/' + encodeURIComponent(id));
  if (!res.ok || !res.data.booking.can_change) {
    App.flashNext("That booking can't be cancelled.", true);
    location.href = '/bookings';
    return;
  }
  const b = res.data.booking;
  document.getElementById('heading').textContent = `Cancel booking ${b.code}?`;
  document.getElementById('details').innerHTML = `${esc(b.pet_name)}, ${dates.nice(b.start_date)} to ${dates.nice(b.end_date)}. `
    + `The ${b.nights} nights will be released so other pets can be booked. The owner, ${esc(b.owner_name)}, is not told automatically.`;

  const select = document.getElementById('f_reason');
  for (const r of res.data.cancelReasons) {
    const opt = document.createElement('option');
    opt.textContent = r;
    select.appendChild(opt);
  }

  document.getElementById('cancelForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const out = await App.api('POST', `/api/bookings/${b.id}/cancel`, { reason: select.value });
    App.flashNext(out.ok ? out.data.message : out.data.error, !out.ok);
    location.href = '/bookings';
  });
})();
