// NFR2: passwords are never stored as plain text.
// Each password gets its own random salt and is hashed with PBKDF2.

const crypto = require('crypto');

const ROUNDS = 120000;
const MIN_LENGTH = 10;

// Passwords that are easy to guess, so they are never allowed
const COMMON = ['password', 'petpause', 'welcome', 'qwerty', 'letmein', '123456', 'abc123', 'admin', 'staff'];

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

/**
 * Password rules: at least 10 characters with an upper-case letter, a lower-case letter,
 * a number and a symbol. It can't contain the username or a common word like "password".
 * Returns a message saying what's wrong, or null if the password is fine.
 */
function checkStrength(password, username) {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }
  let upper = false;
  let lower = false;
  let digit = false;
  let symbol = false;
  for (const c of password) {
    if (c >= 'A' && c <= 'Z') upper = true;
    else if (c >= 'a' && c <= 'z') lower = true;
    else if (c >= '0' && c <= '9') digit = true;
    else if (c !== ' ') symbol = true;
  }
  if (!upper || !lower || !digit || !symbol) {
    return 'Password must have an upper-case letter, a lower-case letter, a number and a symbol (like ! # $ &).';
  }
  const lowerPw = password.toLowerCase();
  if (username && lowerPw.includes(String(username).toLowerCase())) {
    return "Password can't contain the username.";
  }
  for (const word of COMMON) {
    if (lowerPw.includes(word)) {
      return `Password can't contain an easy-to-guess word like "${word}".`;
    }
  }
  return null;
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

module.exports = { newSalt, hash, matches, checkStrength, randomToken, MIN_LENGTH };
