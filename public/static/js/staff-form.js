// FR2: add a staff member, or edit one (name, role, optional new password).

(async function () {
  await App.start('Staff');

  const form = document.getElementById('staffForm');
  const id = App.param('id');
  const isNew = !id;

  if (!isNew) {
    const res = await App.api('GET', '/api/staff/' + encodeURIComponent(id));
    if (!res.ok) {
      location.href = '/staff';
      return;
    }
    const s = res.data.staff;
    document.title = 'Edit staff | PetPause';
    document.getElementById('heading').textContent = 'Edit ' + s.full_name;
    document.getElementById('crumb').textContent = 'Edit';
    document.getElementById('newUsername').remove();
    document.getElementById('fixedUsername').hidden = false;
    document.getElementById('fixedUsernameValue').value = s.username;
    document.getElementById('pwHeading').textContent = 'Reset password (optional)';
    document.getElementById('pwKeep').hidden = false;
    document.getElementById('pwReq1').remove();
    document.getElementById('pwReq2').remove();
    form.password.required = false;
    form.password2.required = false;
    document.getElementById('saveBtn').textContent = 'Save changes';
    form.full_name.value = s.full_name;
    form.role.value = s.role;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const data = App.formData(form);
    const res = isNew
      ? await App.api('POST', '/api/staff', data)
      : await App.api('PUT', '/api/staff/' + encodeURIComponent(id), data);
    if (res.ok) {
      App.flashNext(res.data.message);
      location.href = '/staff';
      return;
    }
    document.getElementById('formError').innerHTML = App.errorBox(
      res.data.error ? App.esc(res.data.error) : 'Nothing was saved. Fix the fields marked in red.');
    App.showErrors(form, res.data.errors);
    form.password.value = '';
    form.password2.value = '';
    window.scrollTo(0, 0);
  });
})();
