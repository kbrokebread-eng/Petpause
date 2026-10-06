// Simple checks used by the forms.

function blank(s) {
  return s === undefined || s === null || String(s).trim() === '';
}

/** A South African phone number: 10 digits (or 11 with a leading 27), spaces and dashes allowed. */
function phone(s) {
  if (blank(s)) return false;
  let digits = 0;
  for (const c of String(s)) {
    if (c >= '0' && c <= '9') {
      digits++;
    } else if (c !== ' ' && c !== '-' && c !== '+' && c !== '(' && c !== ')') {
      return false;
    }
  }
  return digits === 10 || digits === 11;
}

/** Letters, numbers, dots and underscores only, 3 to 30 characters. */
function username(s) {
  if (typeof s !== 'string' || s.length < 3 || s.length > 30) return false;
  for (const c of s) {
    const ok = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '.' || c === '_';
    if (!ok) return false;
  }
  return true;
}

function toInt(s) {
  if (blank(s)) return null;
  const text = String(s).trim();
  const n = Number(text);
  return Number.isInteger(n) ? n : null;
}

function toNumber(s) {
  if (blank(s)) return null;
  const n = Number(String(s).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Turns any value from a form into a trimmed string. */
function str(v) {
  return v === undefined || v === null ? '' : String(v).trim();
}

module.exports = { blank, phone, username, toInt, toNumber, str };
