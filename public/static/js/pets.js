// FR4: list of pets with a search box.

(async function () {
  const { esc } = App;
  await App.start('Pets');

  const q = App.param('q');
  document.querySelector('#searchForm [name=q]').value = q;

  const res = await App.api('GET', '/api/pets?q=' + encodeURIComponent(q));
  const pets = res.data.pets;
  const box = document.getElementById('list');

  if (pets.length === 0) {
    box.innerHTML = "<div class='empty'>No pets found. <a href='/pets/new'>Register a new pet</a>.</div>";
    return;
  }
  let h = "<table><tr><th>Pet</th><th>Breed</th><th>Owner</th><th>Owner phone</th><th>Restrictions</th><th class='right'></th></tr>";
  for (const p of pets) {
    h += `<tr><td><a href='/pets/view?id=${p.id}'><strong>${esc(p.name)}</strong></a></td>`
      + `<td>${esc(p.breed)}</td><td>${esc(p.owner_name)}</td><td>${esc(p.owner_phone)}</td><td>`
      + (p.has_alert ? `<span class='pill red'>&#9888; ${esc(App.shorten(p.alert_text, 40))}</span>` : "<span class='muted'>None</span>")
      + `</td><td class='right'><a class='btn sec sm' href='/pets/view?id=${p.id}'>Open</a></td></tr>`;
  }
  box.innerHTML = h + '</table>';
})();
