// Shared code used by every page: the top bar, messages, the log-out countdown,
// talking to the server and showing form errors.

const App = (function () {
  const PAW = "<svg viewBox='0 0 24 24' width='26' height='26' fill='currentColor' aria-hidden='true'>"
    + "<circle cx='6' cy='9' r='2'/><circle cx='10' cy='5.3' r='2'/><circle cx='14' cy='5.3' r='2'/><circle cx='18' cy='9' r='2'/>"
    + "<path d='M7.3 17.6c0-3.3 2.2-5.8 4.7-5.8s4.7 2.5 4.7 5.8c0 2.1-1.9 2.6-4.7 2.6s-4.7-.5-4.7-2.6z'/></svg>";

  /** Makes text safe to put inside HTML so typed-in data can never run as code. */
  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** A value from the address bar, for example ?id=3 */
  function param(name) {
    return new URLSearchParams(location.search).get(name) || '';
  }

  // ---------------- talking to the server ----------------

  /** Sends a request to the server. Returns { ok, status, data }. */
  async function api(method, url, body) {
    const options = { method, headers: {} };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(url, options);
    } catch (e) {
      return { ok: false, status: 0, data: { error: 'Could not reach the server. Check that it is running.' } };
    }
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      location.href = data.error === 'timeout' ? '/login?timeout=1' : '/login';
      return new Promise(() => {}); // stop here, the page is changing
    }
    restartCountdown();
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  /** Reads every named field of a form into an object. */
  function formData(form) {
    const out = {};
    for (const el of form.elements) {
      if (el.name && !el.disabled) out[el.name] = el.value;
    }
    return out;
  }

  // ---------------- top bar and page start-up ----------------

  let me = null;

  /** Draws the top bar, shows any waiting message and starts the log-out countdown. */
  async function start(active) {
    const res = await api('GET', '/api/me');
    me = res.data;
    const links = [['/dashboard', 'Dashboard'], ['/pets', 'Pets'], ['/bookings', 'Bookings'], ['/status', 'Daily status']];
    if (me.isManager) links.push(['/reports', 'Reports'], ['/staff', 'Staff'], ['/settings', 'Settings']);

    let nav = '';
    for (const [href, label] of links) {
      nav += `<a href='${href}'${label === active ? " class='on' aria-current='page'" : ''}>${label}</a>`;
    }
    document.querySelector('.topbar').innerHTML =
      `<a class='brand' href='/dashboard'>${PAW}<span>PetPause<small>Records &amp; Bookings</small></span></a>`
      + `<nav>${nav}</nav><div class='who'><div><strong>${esc(me.fullName)}</strong><span>${esc(me.role)}`
      + ` &middot; <span id='countdown'>Auto log-out in ${me.timeoutMinutes}:00</span></span></div>`
      + `<a class='btn sec sm' href='/logout'>Log out</a></div>`;

    showWaitingMessage();
    startCountdown(me.timeoutMinutes * 60);
    return me;
  }

  // NFR2: count down to automatic log-out, matching the 15 minute server time-out.
  // Every time the page talks to the server the server's clock restarts, so this one does too.
  let fullSeconds = 0;
  let secondsLeft = 0;

  function startCountdown(seconds) {
    fullSeconds = seconds;
    secondsLeft = seconds;
    const el = document.getElementById('countdown');
    setInterval(function () {
      secondsLeft--;
      if (secondsLeft <= 0) {
        location.href = '/logout?timeout=1';
        return;
      }
      const m = Math.floor(secondsLeft / 60);
      const s = secondsLeft % 60;
      el.textContent = 'Auto log-out in ' + m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);
  }

  function restartCountdown() {
    if (fullSeconds) secondsLeft = fullSeconds;
  }

  // ---------------- messages ----------------

  /** Keeps a message to show on the next page (after moving to another address). */
  function flashNext(message, isError) {
    try {
      sessionStorage.setItem('flash', JSON.stringify({ message, isError: Boolean(isError) }));
    } catch (e) { /* private browsing: skip the message */ }
  }

  function showWaitingMessage() {
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem('flash') || 'null');
      sessionStorage.removeItem('flash');
    } catch (e) { saved = null; }
    if (saved) {
      if (saved.isError) showError(saved.message);
      else showToast(saved.message);
    }
  }

  /** Dark message bar at the top of the page, with an optional Undo button. */
  function showToast(message, onUndo) {
    clearMessages();
    const div = document.createElement('div');
    div.className = 'toast';
    div.setAttribute('role', 'status');
    div.innerHTML = '&#10003; ' + esc(message);
    if (onUndo) {
      const form = document.createElement('form');
      form.style.marginLeft = 'auto';
      form.innerHTML = "<button type='submit'>Undo</button>";
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        onUndo();
      });
      div.appendChild(form);
    }
    document.querySelector('main').prepend(div);
  }

  /** Red message box at the top of the page. */
  function showError(message) {
    clearMessages();
    const div = document.createElement('div');
    div.className = 'banner red msg';
    div.setAttribute('role', 'alert');
    div.innerHTML = '&#9888; ' + esc(message);
    document.querySelector('main').prepend(div);
  }

  function clearMessages() {
    document.querySelectorAll('main > .toast, main > .msg').forEach((el) => el.remove());
  }

  function errorBox(html) {
    return "<div class='banner red' role='alert'>&#9888; " + html + '</div>';
  }

  // ---------------- form errors ----------------

  function clearErrors(form) {
    form.querySelectorAll('.err').forEach((el) => {
      el.classList.remove('err');
      el.removeAttribute('aria-invalid');
    });
    form.querySelectorAll('.errmsg').forEach((el) => el.remove());
  }

  /** Marks each field named in "errors" in red and puts the message under it. */
  function showErrors(form, errors) {
    clearErrors(form);
    for (const name of Object.keys(errors || {})) {
      const input = form.querySelector(`[name='${name}']`);
      if (!input || input.type === 'hidden') continue;
      input.classList.add('err');
      input.setAttribute('aria-invalid', 'true');
      const msg = document.createElement('div');
      msg.className = 'errmsg';
      msg.innerHTML = '&#9888; ' + esc(errors[name]);
      input.insertAdjacentElement('afterend', msg);
    }
  }

  /** Coloured status label. */
  function pill(text) {
    let cls = 'grey';
    if (text === 'Active' || text === 'Upcoming') cls = 'green';
    else if (text === 'In progress') cls = 'blue';
    else if (text === 'Cancelled' || text === 'Inactive') cls = 'red';
    return `<span class='pill ${cls}'>${esc(text)}</span>`;
  }

  function shorten(s, max) {
    return s.length <= max ? s : s.slice(0, max - 1) + '…';
  }

  // ---------------- dates (same formats as the server) ----------------

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  function utc(iso) {
    return new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
  }
  function iso(d) {
    const p = (n) => (n < 10 ? '0' + n : String(n));
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
  }
  const dates = {
    today() {
      const d = new Date();
      return iso(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
    },
    addDays(s, n) {
      const d = utc(s);
      d.setUTCDate(d.getUTCDate() + n);
      return iso(d);
    },
    nice(s) {
      const d = utc(s);
      return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()].slice(0, 3) + ' ' + d.getUTCFullYear();
    },
    shortDay(s) {
      const d = utc(s);
      return DAYS[d.getUTCDay()].slice(0, 3) + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()].slice(0, 3);
    },
    longDay(s) {
      const d = utc(s);
      return DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    },
    dayName(s) {
      return DAYS[utc(s).getUTCDay()].slice(0, 3);
    },
    dayNum(s) {
      const d = utc(s);
      return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()].slice(0, 3);
    },
    timeOf(stamp) {
      return stamp && stamp.length >= 16 ? stamp.slice(11, 16) : '';
    }
  };

  return {
    PAW, esc, param, api, formData, start, flashNext, showToast, showError, clearMessages, errorBox,
    clearErrors, showErrors, pill, shorten, dates, me: () => me
  };
})();
