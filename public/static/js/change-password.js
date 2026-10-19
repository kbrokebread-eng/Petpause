// FR1 / NFR2: change your own password. Required after a manager sets a temporary one.

(async function () {
  const form = document.getElementById('pwForm');
  const res = await App.api('GET', '/api/me');
  const me = res.data;

  document.getElementById('who').textContent = `${me.fullName} (${me.username})`;
  if (me.mustChangePassword) {
    document.getElementById('heading').textContent = 'Choose your own password';
    document.getElementById('note').innerHTML = "<div class='banner amber'>Your manager gave you a temporary password. "
      + 'Choose your own before you can use the system. Nobody else, including your manager, will know it.</div>';
    document.getElementById('back').remove();
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const out = await App.api('POST', '/api/change-password', App.formData(form));
    if (out.ok) {
      App.flashNext(out.data.message);
      location.href = '/dashboard';
      return;
    }
    document.getElementById('error').innerHTML = App.errorBox(App.esc(out.data.error || 'Your password was not changed. Fix the fields marked in red.'));
    App.showErrors(form, out.data.errors);
    form.current.value = '';
    form.password.value = '';
    form.password2.value = '';
  });
})();
