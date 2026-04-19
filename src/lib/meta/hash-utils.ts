import { createHash } from 'crypto';
import { HASHABLE_SIGNALS } from '@/lib/utils/constants';

/**
 * SHA-256 hash a string value.
 * Returns lowercase hex digest.
 */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Normalize and hash an email address per Meta's requirements.
 * - Trim whitespace
 * - Convert to lowercase
 * - SHA-256 hash
 */
export function hashEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return sha256(normalized);
}

/**
 * Normalize and hash a phone number per Meta's requirements.
 * - Remove all non-digit characters except leading +
 * - Remove leading zeros (after country code extraction)
 * - Should include country code (e.g., 55 for Brazil)
 * - SHA-256 hash
 */
export function hashPhone(phone: string): string {
  // Remove everything except digits
  let normalized = phone.replace(/[^\d]/g, '');

  // If starts with 0, remove leading zero (but not country code)
  if (normalized.startsWith('0')) {
    normalized = normalized.slice(1);
  }

  // If it doesn't start with country code (55 for BR), add it
  // This is a heuristic — adjust as needed
  if (normalized.length === 10 || normalized.length === 11) {
    // Likely Brazilian number without country code
    normalized = '55' + normalized;
  }

  return sha256(normalized);
}

/**
 * Normalize and hash a name (fn or ln) per Meta's requirements.
 * - Trim whitespace
 * - Convert to lowercase
 * - No punctuation removal (Meta wants UTF-8 lowercase)
 * - SHA-256 hash
 */
export function hashName(name: string): string {
  const normalized = name.trim().toLowerCase();
  return sha256(normalized);
}

/**
 * Normalize and hash a city per Meta's requirements.
 * - Trim, lowercase, remove spaces and punctuation
 */
export function hashCity(city: string): string {
  const normalized = city.trim().toLowerCase().replace(/[^a-záàâãéèêíïóôõúüç\u0080-\uffff]/gi, '');
  return sha256(normalized);
}

/**
 * Normalize and hash a state per Meta's requirements.
 * - Lowercase two-letter code
 */
export function hashState(state: string): string {
  const normalized = state.trim().toLowerCase().replace(/[^a-z]/g, '');
  return sha256(normalized);
}

/**
 * Normalize and hash a zip code per Meta's requirements.
 * - Lowercase, no spaces or dashes
 */
export function hashZip(zip: string): string {
  const normalized = zip.trim().toLowerCase().replace(/[\s-]/g, '');
  return sha256(normalized);
}

/**
 * Normalize and hash a country code per Meta's requirements.
 * - Two-letter lowercase ISO code
 */
export function hashCountry(country: string): string {
  const normalized = country.trim().toLowerCase().slice(0, 2);
  return sha256(normalized);
}

/**
 * Normalize and hash a date of birth per Meta's requirements.
 * - Format: YYYYMMDD
 */
export function hashDateOfBirth(dob: string): string {
  // Try to normalize from various formats to YYYYMMDD
  const cleaned = dob.replace(/[^0-9]/g, '');
  // If already 8 digits, assume YYYYMMDD
  const normalized = cleaned.length === 8 ? cleaned : cleaned;
  return sha256(normalized);
}

/**
 * Normalize and hash a gender per Meta's requirements.
 * - Single lowercase letter: m or f
 */
export function hashGender(gender: string): string {
  const normalized = gender.trim().toLowerCase().charAt(0);
  return sha256(normalized);
}

/**
 * Hash a signal value based on its type.
 * Returns the hashed value for hashable signals, or the raw value for unhashable ones.
 */
export function hashSignal(signalType: string, value: string): string {
  if (!(HASHABLE_SIGNALS as readonly string[]).includes(signalType)) {
    // Don't hash fbc, fbp, ctwa_clid, external_id, ip, user_agent
    return value;
  }

  switch (signalType) {
    case 'email':
      return hashEmail(value);
    case 'phone':
      return hashPhone(value);
    case 'fn':
    case 'ln':
      return hashName(value);
    case 'ct':
      return hashCity(value);
    case 'st':
      return hashState(value);
    case 'zp':
      return hashZip(value);
    case 'country':
      return hashCountry(value);
    case 'db':
      return hashDateOfBirth(value);
    case 'ge':
      return hashGender(value);
    default:
      return sha256(value.trim().toLowerCase());
  }
}
