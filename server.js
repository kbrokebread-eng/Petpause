// PetPause Daycare - Pet Records and Booking System (PRBS).
// Run "npm start", then open http://localhost:8080 in a web browser.

const path = require('path');
const fs = require('fs');
const express = require('express');

require('./db/seed').loadIfEmpty();
const auth = require('./lib/auth');
const backup = require('./lib/backup');

const app = express();
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const VIEWS = path.join(__dirname, 'views');

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Security headers on every response
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Simple protection against forms posted from other websites
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin && host && !origin.endsWith('//' + host)) {
      return res.status(403).json({ error: 'That form was not sent from this system.' });
    }
  }
  next();
});

// CSS and JavaScript files
app.use('/static', express.static(path.join(__dirname, 'public', 'static'), { maxAge: '5m' }));

// ---------------- JSON API used by the pages ----------------
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api', require('./routes/login'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/pets', require('./routes/pets'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/status', require('./routes/status'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// ---------------- HTML pages ----------------
// Same addresses as before. Each one sends an HTML file from the "views" folder.

function errorPage(res, status, title, message) {
  const html = fs.readFileSync(path.join(VIEWS, 'error.html'), 'utf8')
    .split('{{title}}').join(title)
    .split('{{message}}').join(message);
  res.status(status).setHeader('Cache-Control', 'no-store');
  res.type('html').send(html);
}

/** access is "public", "staff" or "manager" */
function page(url, file, access) {
  app.get(url, (req, res) => {
    if (access !== 'public') {
      const c = auth.current(req);
      if (!c.user) return res.redirect(303, c.reason === 'timeout' ? '/login?timeout=1' : '/login');
      if (access === 'manager' && !c.user.isManager) {
        return errorPage(res, 403, 'No access',
          'Only managers can open this page. Ask a manager if you need this information.');
      }
    }
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(VIEWS, file));
  });
}

app.get('/', (req, res) => res.redirect(303, '/dashboard'));
app.get('/login', (req, res) => {
  if (auth.current(req).user) return res.redirect(303, '/dashboard');
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(VIEWS, 'login.html'));
});
app.get('/logout', (req, res) => {
  auth.end(auth.readCookie(req, auth.COOKIE));
  auth.clearCookie(res);
  res.redirect(303, req.query.timeout === '1' ? '/login?timeout=1' : '/login?out=1');
});

// Increment 1: FR2 staff accounts, FR3-FR5 pet profiles
page('/staff', 'staff.html', 'manager');
page('/staff/new', 'staff-form.html', 'manager');
page('/staff/edit', 'staff-form.html', 'manager');
page('/pets', 'pets.html', 'staff');
page('/pets/new', 'pet-form.html', 'staff');
page('/pets/edit', 'pet-form.html', 'staff');
page('/pets/view', 'pet-view.html', 'staff');

// Increment 2: FR6-FR9 bookings and capacity
page('/bookings', 'bookings.html', 'staff');
page('/bookings/new', 'booking-form.html', 'staff');
page('/bookings/edit', 'booking-form.html', 'staff');
page('/bookings/cancel', 'booking-cancel.html', 'staff');

// Increment 3: FR10 dashboard, FR11 daily status, FR12 report
page('/dashboard', 'dashboard.html', 'staff');
page('/status', 'status.html', 'staff');
page('/reports', 'reports.html', 'manager');

// NFR6: capacity and nightly rate
page('/settings', 'settings.html', 'manager');

app.use((req, res) => errorPage(res, 404, 'Page not found', 'That address does not exist.'));

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: 'The system could not finish that action. Nothing was saved. Try again.' });
  }
  errorPage(res, 500, 'Something went wrong',
    'The system could not finish that action. Nothing was saved. Go back and try again.');
});

app.listen(PORT, () => {
  backup.startDailyBackups();
  console.log('PetPause PRBS is running.');
  console.log(`Open http://localhost:${PORT} in your browser.`);
  console.log('Sample log-in: manager / PetPause2026!   (care staff: thandi / Staff2026!)');
  console.log('Press Ctrl+C to stop.');
});
