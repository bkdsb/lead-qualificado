import { createHash } from 'crypto';
import { HASHABLE_SIGNALS } from '@/lib/utils/constants';
import { normalizeSignal } from './param-builder';

/**
 * SHA-256 hash a string value.
 * Returns lowercase hex digest.
 */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Normalize and hash a signal value based on its type.
 *
 * Uses the Meta Parameter Builder normalization rules:
 * - email: trim + lowercase
 * - phone: digits only + country code (55 BR)
 * - fn/ln: trim + lowercase (UTF-8)
 * - ct: trim + lowercase + remove spaces/punctuation
 * - st: trim + lowercase letters only
 * - zp: trim + no spaces/hyphens
 * - country: ISO 2-letter lowercase
 * - db: YYYYMMDD digits only
 * - ge: first char lowercase (m/f)
 *
 * For unhashable signals (fbc, fbp, ctwa_clid, external_id, IP, UA),
 * returns the raw value unchanged.
 */
export function hashSignal(signalType: string, value: string): string {
  if (!(HASHABLE_SIGNALS as readonly string[]).includes(signalType)) {
    // Don't hash fbc, fbp, ctwa_clid, external_id, ip, user_agent
    return value;
  }

  // Normalize using the Meta Parameter Builder rules
  const normalized = normalizeSignal(signalType, value);
  if (!normalized) return '';

  return sha256(normalized);
}

// ---- Convenience functions (used by payload-builder) ----

export function hashEmail(email: string): string {
  return hashSignal('email', email);
}

export function hashPhone(phone: string): string {
  return hashSignal('phone', phone);
}

export function hashName(name: string): string {
  return hashSignal('fn', name);
}

export function hashCity(city: string): string {
  return hashSignal('ct', city);
}

export function hashState(state: string): string {
  return hashSignal('st', state);
}

export function hashZip(zip: string): string {
  return hashSignal('zp', zip);
}

export function hashCountry(country: string): string {
  return hashSignal('country', country);
}

export function hashDateOfBirth(dob: string): string {
  return hashSignal('db', dob);
}

export function hashGender(gender: string): string {
  return hashSignal('ge', gender);
}
