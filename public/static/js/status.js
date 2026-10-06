// FR11: daily status. Each button records one step for one pet and shows who did it and when.

(async function () {
  const { esc, dates } = App;
  await App.start('Daily status');

  const day = App.param('date') || dates.today();
  const filter = App.param('show');
  const isToday = day === dates.today();

  // Day picker
  document.getElementById('sub').textContent = dates.longDay(day) + (isToday
    ? '. Tap a step to record it. Each step is saved with your name and the time.'
    : '. Past and future days can be viewed but not changed.');
  document.querySelector('#dayForm [name=date]').value = day;
  document.getElementById('prevDay').href = '/status?date=' + dates.addDays(day, -1);
  document.getElementById('nextDay').href = '/status?date=' + dates.addDays(day, 1);
  if (isToday) document.getElementById('todayLink').remove();

  // Filter buttons
  const base = '/status?date=' + day + '&show=';
  document.getElementById('chips').innerHTML = chip('All pets', base, filter === '')
    + chip('With alerts', base + 'alerts', filter === 'alerts')
    + chip('Not yet fed', base + 'notfed', filter === 'notfed');

  await load();

  async function load() {
    const res = await App.api('GET', '/api/status?date=' + encodeURIComponent(day));
    draw(res.data.rows);
  }

  function draw(rows) {
    const box = document.getElementById('table');
    if (rows.length === 0) {
      box.innerHTML = "<div class='empty'>No pets are booked in on this day.</div>";
      return;
    }
    let h = "<table><tr><th style='width:26%'>Pet</th><th>Steps</th></tr>";
    let shown = 0;
    for (const r of rows) {
      if (filter === 'alerts' && !r.has_alert) continue;
      if (filter === 'notfed' && (r.fed_today || r.checked_out)) continue;
      shown++;

      h += `<tr><td style='white-space:normal'><a href='/pets/view?id=${r.pet_id}'><strong style='font-size:1.05rem'>`
        + `${esc(r.pet_name)}</strong></a> <span class='muted small'>${esc(r.breed)}</span>`;
      if (r.has_alert) {
        h += `<div style='margin-top:4px'><span class='pill red'>&#9888; ${esc(App.shorten(r.alert, 48))}</span></div>`;
      }
      h += `<div class='muted small' style='margin-top:4px'>${dates.nice(r.start_date)} to ${dates.nice(r.end_date)}</div>`
        + "</td><td><div class='steps'>";

      for (const s of r.steps) {
        if (s.done) {
          let when = dates.timeOf(s.done.recorded_at);
          if (!s.done.recorded_at.startsWith(day)) when = dates.nice(s.done.recorded_at.slice(0, 10)) + ' ' + when;
          h += `<div class='step done'>&#10003; ${s.step}<small>${esc(when)} by ${esc(s.done.recorded_by)}</small></div>`;
        } else {
          h += `<form class='step' data-booking='${r.booking_id}' data-step='${s.step}'>`
            + `<button class='btn sec' type='submit'${s.allowed ? '' : ' disabled'}>Mark ${s.step.toLowerCase()}</button></form>`;
        }
      }
      h += '</div></td></tr>';
    }
    if (shown === 0) h += "<tr><td colspan='2' class='empty'>No pets match this filter.</td></tr>";
    h += "</table><div class='muted small' style='padding:12px 16px;border-top:1px solid var(--line)'>"
      + 'Fed, exercised and checked out unlock once the pet has been checked in.</div>';
    box.innerHTML = h;

    box.querySelectorAll('form.step').forEach((f) => f.addEventListener('submit', mark));
  }

  async function mark(e) {
    e.preventDefault();
    const f = e.currentTarget;
    f.querySelector('button').disabled = true;
    const res = await App.api('POST', '/api/status/mark', { booking_id: Number(f.dataset.booking), step: f.dataset.step });
    if (res.ok) {
      const entryId = res.data.entry_id;
      App.showToast(res.data.message, () => undo(entryId));
    } else {
      App.showError(res.data.error);
    }
    await load();
    window.scrollTo(0, 0);
  }

  async function undo(entryId) {
    const res = await App.api('POST', '/api/status/undo', { entry_id: entryId });
    if (res.ok) App.showToast(res.data.message);
    else App.showError(res.data.error);
    await load();
  }

  function chip(label, href, on) {
    return `<a class='btn ${on ? 'pri' : 'sec'} sm' href='${href}'>${label}</a>`;
  }
})();
