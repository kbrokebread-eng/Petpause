// FR1: log in. The server checks the password, logs the attempt and locks the username after 5 failures.

(function () {
  const form = document.getElementById('loginForm');
  const note = document.getElementById('note');
  const error = document.getElementById('error');

  if (App.param('timeout') === '1') {
    note.innerHTML = "<div class='banner info'>You were logged out after 15 minutes of no activity. Please log in again.</div>";
  } else if (App.param('out') === '1') {
    note.innerHTML = "<div class='banner info'>You have been logged out.</div>";
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value;
    const res = await App.api('POST', '/api/login', { username, password });
    if (res.ok) {
      location.href = '/dashboard';
      return;
    }
    note.innerHTML = '';
    error.innerHTML = App.errorBox(App.esc(res.data.error || 'Could not log in.'));
    form.password.value = '';
    form.username.focus();
  });
})();
