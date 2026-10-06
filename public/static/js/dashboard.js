// FR10: dashboard with medical alerts first, then today's numbers and the pets on site.

(async function () {
  const { esc, dates } = App;
  await App.start('Dashboard');
  const res = await App.api('GET', '/api/dashboard');
  const d = res.data;
  const today = d.today;

  document.getElementById('today').textContent = dates.longDay(today);

  // FR10 alerts
  const alerts = document.getElementById('alerts');
  if (d.alerts.length === 0) {
    alerts.innerHTML = "<section class='alerts none'><h2>&#10003; No medical alerts for pets on site today</h2></section>";
  } else {
    let h = "<section class='alerts' role='alert' aria-label='Medical alerts'><div class='head'><h2>&#9888; Medical alerts: "
      + d.alerts.length + (d.alerts.length === 1 ? ' pet' : ' pets')
      + " on site today</h2><strong style='color:var(--red-dark)'>Read before feeding or giving medication</strong></div><div class='grid3'>";
    for (const a of d.alerts) {
      h += `<div class='alert'><div class='name'>${esc(a.pet_name)} <span>${esc(a.breed)}</span></div>`
        + `<div class='text'>${esc(a.text)}</div></div>`;
    }
    alerts.innerHTML = h + '</div></section>';
  }

  // Today's numbers
  const arriving = d.onSite.filter((b) => b.start_date === today);
  const leaving = d.onSite.filter((b) => b.end_date === today);
  const names = (list) => list.map((b) => b.pet_name).join(', ');
  document.getElementById('stats').innerHTML =
    stat('Pets on site now', d.onSite.length, `${d.tonight} of ${d.capacity} places booked tonight`, '')
    + stat('Arriving today', arriving.length, arriving.length ? names(arriving) : 'None', 'color:var(--blue)')
    + stat('Going home today', leaving.length, leaving.length ? names(leaving) : 'None', '')
    + stat('Not yet fed today', d.notFed, d.notFed === 0 ? 'All pets fed' : 'Record feeding on Daily status',
      d.notFed > 0 ? 'color:var(--amber)' : 'color:var(--green)');

  // Pets on site
  const box = document.getElementById('onSite');
  if (d.onSite.length === 0) {
    box.innerHTML = "<div class='empty'>No pets are booked in today.</div>";
  } else {
    let h = '<table><tr><th>Pet</th><th>Breed</th><th>Owner</th><th>Stay</th><th>Today</th></tr>';
    for (const b of d.onSite) {
      const move = b.start_date === today ? "<span class='pill blue'>Arriving</span>"
        : b.end_date === today ? "<span class='pill grey'>Going home today</span>" : "<span class='pill green'>Staying</span>";
      h += `<tr><td><a href='/pets/view?id=${b.pet_id}'><strong>${esc(b.pet_name)}</strong></a>`
        + (b.has_alert ? " <span class='pill red'>&#9888; Alert</span>" : '')
        + `</td><td>${esc(b.breed)}</td><td>${esc(b.owner_name)}<div class='muted small'>${esc(b.owner_contact)}</div></td>`
        + `<td>${dates.nice(b.start_date)} to ${dates.nice(b.end_date)}</td><td>${move}</td></tr>`;
    }
    box.innerHTML = h + '</table>';
  }

  function stat(label, value, note, style) {
    return `<div class='card stat'><div class='label'>${esc(label)}</div><div class='value' style='${style}'>`
      + `${esc(value)}</div><div class='note'>${esc(note)}</div></div>`;
  }
})();
