// NFR6: change kennel capacity and the nightly rate.

(async function () {
  await App.start('Settings');

  const form = document.getElementById('settingsForm');
  const res = await App.api('GET', '/api/settings');
  form.capacity.value = res.data.capacity;
  form.nightly_rate.value = res.data.nightly_rate;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const out = await App.api('PUT', '/api/settings', App.formData(form));
    if (out.ok) {
      document.getElementById('formError').innerHTML = '';
      App.clearErrors(form);
      App.showToast(out.data.message);
      return;
    }
    App.clearMessages();
    document.getElementById('formError').innerHTML = App.errorBox('Nothing was saved. Fix the fields marked in red.');
    App.showErrors(form, out.data.errors);
  });
})();
