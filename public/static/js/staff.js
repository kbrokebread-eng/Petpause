// FR2: staff list with deactivate / reactivate. FR1: log of failed log-in attempts.

(async function () {
  const { esc } = App;
  await App.start('Staff');

  const form = document.getElementById('filterForm');
  form.q.value = App.param('q');
  form.status.value = App.param('status');

  await load();

  async function load() {
    const res = await App.api('GET', '/api/staff?q=' + encodeURIComponent(form.q.value) + '&status=' + encodeURIComponent(form.status.value));
    drawStaff(res.data.staff, res.data.me);
    drawFailed(res.data.failedAttempts);
  }

  function drawStaff(staff, meId) {
    const box = document.getElementById('list');
    if (staff.length === 0) {
      box.innerHTML = "<div class='empty'>No staff match your search.</div>";
      return;
    }
    let h = '<table><tr><th>Name</th><th>Role</th><th>Status</th><th>Last log-in</th>'
      + "<th>Failed log-ins (7 days)</th><th class='right'>Actions</th></tr>";
    for (const s of staff) {
      const me = s.id === meId;
      h += `<tr${s.failed > 0 ? " class='hl'" : ''}>`
        + `<td><strong>${esc(s.full_name)}</strong>${me ? " <span class='muted'>(you)</span>" : ''}`
        + `<div class='muted small'>${esc(s.username)}</div></td>`
        + `<td>${esc(s.role)}</td><td>${App.pill(s.active ? 'Active' : 'Inactive')}</td>`
        + `<td>${s.last_login ? esc(s.last_login.slice(0, 16)) : "<span class='muted'>Never</span>"}</td>`
        + (s.failed > 0
          ? `<td><span class='pill amber'>&#9888; ${s.failed} failed</span><div class='muted small'>Last: ${esc(s.last_failed.slice(0, 16))}</div></td>`
          : "<td><span class='muted'>None</span></td>")
        + "<td class='right'><div class='actions' style='justify-content:flex-end'>"
        + `<a class='btn sec sm' href='/staff/edit?id=${s.id}'>Edit</a>`;
      if (!me) {
        h += s.active
          ? `<form class='inline' data-id='${s.id}' data-active='0' data-name='${esc(s.full_name)}'><button class='btn dan sm' type='submit'>Deactivate</button></form>`
          : `<form class='inline' data-id='${s.id}' data-active='1' data-name='${esc(s.full_name)}'><button class='btn sec sm' type='submit'>Reactivate</button></form>`;
      }
      h += '</div></td></tr>';
    }
    box.innerHTML = h + '</table>';
    box.querySelectorAll('form.inline').forEach((f) => f.addEventListener('submit', toggle));
  }

  function drawFailed(rows) {
    const box = document.getElementById('failed');
    if (rows.length === 0) {
      box.innerHTML = "<div class='empty'>No failed attempts recorded.</div>";
      return;
    }
    let h = '<table><tr><th>When</th><th>Username typed</th><th>Computer address</th></tr>';
    for (const f of rows) {
      h += `<tr><td>${esc(f.attempted_at)}</td><td>${esc(f.username)}</td><td class='muted'>${esc(f.ip_address)}</td></tr>`;
    }
    box.innerHTML = h + '</table>';
  }

  /** Deactivate or reactivate, after an "Are you sure?" question. */
  async function toggle(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const makeActive = f.dataset.active === '1';
    const name = f.dataset.name;
    const question = makeActive
      ? `Reactivate ${name}?`
      : `Deactivate ${name}? They will not be able to log in. Their records are kept.`;
    if (!confirm(question)) return;
    const res = await App.api('POST', `/api/staff/${f.dataset.id}/active`, { active: makeActive });
    if (res.ok) App.showToast(res.data.message);
    else App.showError(res.data.error);
    await load();
  }
})();
