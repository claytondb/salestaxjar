/**
 * Normalize whatever a store or marketplace export puts in its "state" column
 * ("CA", "ca", "California", "N.Y.", "new york ") into a two-letter code for
 * the 50 states + DC. Returns null for anything else (territories, military
 * addresses, blanks, other countries' provinces).
 *
 * Never guess by truncating ("Texas" is not "TE", "New York" is not "NE").
 */

import { STATE_NEXUS_THRESHOLDS } from './nexus-thresholds';

const CODES = new Set(STATE_NEXUS_THRESHOLDS.map((s) => s.stateCode));

const NAME_TO_CODE = new Map<string, string>();
for (const s of STATE_NEXUS_THRESHOLDS) {
  NAME_TO_CODE.set(squash(s.stateName), s.stateCode);
}
// Common alternate spellings
NAME_TO_CODE.set(squash('Washington DC'), 'DC');
NAME_TO_CODE.set(squash('Washington D.C.'), 'DC');
NAME_TO_CODE.set(squash('District of Columbia'), 'DC');
NAME_TO_CODE.set(squash('D.C.'), 'DC');

function squash(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

export function toStateCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // "US-CA" style
  const iso = /^US[-_ ]([A-Za-z]{2})$/i.exec(trimmed);
  if (iso) {
    const code = iso[1].toUpperCase();
    return CODES.has(code) ? code : null;
  }

  const letters = squash(trimmed);
  if (letters.length === 2) {
    const code = letters.toUpperCase();
    return CODES.has(code) ? code : null;
  }
  return NAME_TO_CODE.get(letters) ?? null;
}

export function isUsStateCode(code: string): boolean {
  return CODES.has(code.toUpperCase());
}

const US_COUNTRY_NAMES = new Set(['US', 'USA', 'UNITEDSTATES', 'UNITEDSTATESOFAMERICA']);

/** "United States", "USA", "us" → "US"; anything else is returned trimmed. */
export function toCountryCode(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (US_COUNTRY_NAMES.has(trimmed.toUpperCase().replace(/[^A-Z]/g, ''))) return 'US';
  return trimmed;
}
