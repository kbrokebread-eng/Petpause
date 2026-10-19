// FR12: weekly occupancy report. The bar chart is plain HTML so it prints cleanly.

(async function () {
  const { esc, dates } = App;
  await App.start('Reports');
  document.title = 'Occupancy and revenue report | PetPause';

  const res = await App.api('GET', '/api/reports?week=' + encodeURIComponent(App.param('week')));
  const r = res.data;
  const cap = r.capacity;
  const pct = (n) => Math.round((n * 100) / cap);
  const peakDay = r.days[r.peak];
  const quietDay = r.days[r.quiet];

  document.getElementById('sub').textContent = `${dates.nice(r.monday)} to ${dates.nice(r.sunday)}. `
    + `Pets boarded per night against a capacity of ${cap} places.`;
  document.getElementById('prevWeek').href = '/reports?week=' + r.prevWeek;
  document.getElementById('nextWeek').href = '/reports?week=' + r.nextWeek;

  document.getElementById('stats').innerHTML =
    stat('Average occupancy', r.average + '%', `${r.total} of ${cap * 7} places used`)
    + stat('Peak day', dates.dayName(peakDay.date) + ' ' + dates.dayNum(peakDay.date),
      `${peakDay.boarded} of ${cap} places (${pct(peakDay.boarded)}%)`)
    + stat('Quietest day', dates.dayName(quietDay.date) + ' ' + dates.dayNum(quietDay.date),
      `${quietDay.boarded} of ${cap} places (${pct(quietDay.boarded)}%)`)
    + stat('Revenue this week', 'R ' + money(r.revenue), `${r.total} nights from ${r.revenueRows.length} bookings`);

  // Bar chart
  const top = Math.max(cap, peakDay.boarded);
  let chart = `<div class='cap' style='bottom:${Math.floor((cap * 85) / top)}%'><span>Capacity (${cap})</span></div>`;
  let labels = '';
  r.days.forEach((d, i) => {
    chart += `<div class='col${i === r.peak && d.boarded > 0 ? ' peak' : ''}'><b>${d.boarded}</b>`
      + `<i style='height:${Math.floor((d.boarded * 85) / top)}%'></i></div>`;
    labels += `<div>${dates.dayName(d.date)}<small>${dates.dayNum(d.date)}</small></div>`;
  });
  document.getElementById('chart').innerHTML = chart;
  document.getElementById('labels').innerHTML = labels;

  // Table
  let h = '<table><tr><th>Day</th><th>Pets boarded</th><th>Places free</th><th>Occupancy</th></tr>';
  r.days.forEach((d, i) => {
    const isPeak = i === r.peak && d.boarded > 0;
    h += `<tr${isPeak ? " class='hl'" : ''}><td>${isPeak ? '<strong>' : ''}${esc(dates.shortDay(d.date))}`
      + (isPeak ? "</strong> <span class='pill blue'>Peak</span>" : '')
      + `</td><td>${d.boarded}</td><td>${Math.max(0, cap - d.boarded)}</td><td>${pct(d.boarded)}%</td></tr>`;
  });
  h += `<tr><td><strong>Week total</strong></td><td><strong>${r.total}</strong></td><td>${cap * 7 - r.total}</td>`
    + `<td><strong>${r.average}%</strong></td></tr></table>`;
  document.getElementById('table').innerHTML = h;

  // Revenue summary: one row per booking, based on how many nights of its stay fall in this week
  document.getElementById('revenueNote').textContent = `Each booking is charged R ${Math.round(r.rate)} a night `
    + 'for the nights it stays this week. Longer stays that cross into other weeks are split between those weeks.';
  const rev = document.getElementById('revenue');
  if (r.revenueRows.length === 0) {
    rev.innerHTML = "<div class='empty'>No bookings this week.</div>";
  } else {
    let t = "<table><tr><th>Booking</th><th>Pet</th><th>Owner</th><th>Stay</th><th>Stay length</th>"
      + "<th>Nights this week</th><th class='right'>Amount</th></tr>";
    for (const b of r.revenueRows) {
      t += `<tr><td><strong>${esc(b.code)}</strong></td><td>${esc(b.pet_name)}</td><td>${esc(b.owner_name)}</td>`
        + `<td>${dates.nice(b.start_date)} to ${dates.nice(b.end_date)}</td>`
        + `<td>${b.stay_nights} ${b.stay_nights === 1 ? 'night' : 'nights'}</td><td>${b.nights_this_week}</td>`
        + `<td class='right'>R ${money(b.amount)}</td></tr>`;
    }
    t += `<tr class='hl'><td colspan='4'><strong>Total: ${r.revenueRows.length} `
      + `${r.revenueRows.length === 1 ? 'booking' : 'bookings'}</strong> <span class='muted small'>`
      + `(average stay ${r.averageStay} nights)</span></td><td></td><td><strong>${r.total}</strong></td>`
      + `<td class='right'><strong>R ${money(r.revenue)}</strong></td></tr></table>`;
    rev.innerHTML = t;
  }

  document.getElementById('footer').textContent = `Report produced ${r.producedAt} by ${r.producedBy}. `
    + 'A pet counts on every night it stays; the collection day is not counted.';

  function stat(label, value, note) {
    return `<div class='card stat'><div class='label'>${esc(label)}</div><div class='value'>${esc(value)}</div>`
      + `<div class='note'>${esc(note)}</div></div>`;
  }

  /** 5250 becomes "5 250", the South African way of writing thousands. */
  function money(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
})();
