// FR3 register a pet / FR4 edit a pet. FR5: the server rejects the save without emergency vet details.

(async function () {
  const { esc } = App;
  await App.start('Pets');

  const form = document.getElementById('petForm');
  const id = App.param('id');
  const isNew = !id;

  if (!isNew) {
    const res = await App.api('GET', '/api/pets/' + encodeURIComponent(id));
    if (!res.ok) {
      location.href = '/pets';
      return;
    }
    const p = res.data.pet;
    document.title = 'Edit pet | PetPause';
    document.getElementById('heading').textContent = 'Edit ' + p.name;
    document.getElementById('crumb').textContent = p.name;
    document.getElementById('saveBtn').textContent = 'Save changes';
    document.getElementById('cancelLink').href = '/pets/view?id=' + p.id;
    for (const name of ['name', 'breed', 'age', 'weight', 'owner_name', 'owner_phone', 'medical', 'dietary', 'vet_practice', 'vet_phone']) {
      form.elements[name].value = p[name] === null ? '' : p[name];
    }
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const data = App.formData(form);
    const res = isNew
      ? await App.api('POST', '/api/pets', data)
      : await App.api('PUT', '/api/pets/' + encodeURIComponent(id), data);

    if (res.ok) {
      App.flashNext(res.data.message);
      location.href = '/pets/view?id=' + res.data.id;
      return;
    }
    const errors = res.data.errors || {};
    let msg = 'The profile has not been saved. Fix the fields marked in red.';
    if (errors.vet_practice || errors.vet_phone) {
      msg = '<strong>Emergency vet details are required on every pet profile.</strong> The profile has not been saved.';
    }
    if (res.data.error) msg = esc(res.data.error);
    document.getElementById('formError').innerHTML = App.errorBox(msg);
    App.showErrors(form, errors);
    window.scrollTo(0, 0);
  });
})();
