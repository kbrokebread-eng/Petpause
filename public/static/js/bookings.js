// FR7: list of bookings with search and status filter.

(async function () {
  const { esc, dates } = App;
  await App.start('Bookings');

  const q = App.param('q');
  const status = App.param('status') || 'All';
  const form = document.getElementById('filterForm');
  form.q.value = q;
  form.status.value = status;

  const res = await App.api('GET', '/api/bookings?q=' + encodeURIComponent(q) + '&status=' + encodeURIComponent(status));
  const list = res.data.bookings;
  const box = document.getElementById('list');

  if (list.length === 0) {
    box.innerHTML = "<div class='empty'>No bookings match. <a href='/bookings/new'>Create a booking</a>.</div>";
    return;
  }
  let h = '<table><tr><th>Booking</th><th>Pet</th><th>Owner</th><th>From</th><th>To</th><th>Nights</th>'
    + "<th>Status</th><th class='right'>Actions</th></tr>";
  for (const b of list) {
    h += `<tr><td><strong>${b.code}</strong></td><td><a href='/pets/view?id=${b.pet_id}'>${esc(b.pet_name)}</a>`
      + (b.has_alert ? " <span class='pill red' title='Has a medical or dietary restriction'>&#9888;</span>" : '')
      + `</td><td>${esc(b.owner_name)}<div class='muted small'>${esc(b.owner_contact)}</div></td>`
      + `<td>${dates.nice(b.start_date)}</td><td>${dates.nice(b.end_date)}</td><td>${b.nights}</td><td>${App.pill(b.status)}`
      + (b.cancelled && b.cancel_reason ? `<div class='muted small'>${esc(b.cancel_reason)}</div>` : '')
      + "</td><td class='right'>"
      + (b.can_change
        ? `<div class='actions' style='justify-content:flex-end'><a class='btn sec sm' href='/bookings/edit?id=${b.id}'>Amend</a>`
          + `<a class='btn dan sm' href='/bookings/cancel?id=${b.id}'>Cancel</a></div>`
        : "<span class='muted small'>No changes allowed</span>")
      + '</td></tr>';
  }
  box.innerHTML = h + '</table>';
})();
