// NFR2: passwords are never stored as plain text.
// Each password gets its own random salt and is hashed with PBKDF2.

const crypto = require('crypto');

const ROUNDS = 120000;

function newSalt() {
  return crypto.randomBytes(16).toString('base64');
}

function hash(password, salt) {
  return crypto.pbkdf2Sync(password, Buffer.from(salt, 'base64'), ROUNDS, 32, 'sha256').toString('base64');
}

function matches(password, salt, storedHash) {
  const attempt = Buffer.from(hash(password, salt));
  const stored = Buffer.from(storedHash);
  // timingSafeEqual compares every byte so the time taken does not give anything away
  return attempt.length === stored.length && crypto.timingSafeEqual(attempt, stored);
}

/** At least 8 characters with a letter and a number. Returns a message, or null if fine. */
function checkStrength(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  let hasLetter = false;
  let hasDigit = false;
  for (const c of password) {
    if (c.toLowerCase() !== c.toUpperCase()) hasLetter = true;
    if (c >= '0' && c <= '9') hasDigit = true;
  }
  if (!hasLetter || !hasDigit) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

module.exports = { newSalt, hash, matches, checkStrength, randomToken };
