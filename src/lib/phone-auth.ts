/**
 * Normalizes a Zimbabwean phone number to E.164-ish form (+263XXXXXXXXX).
 *
 * Dealers and admins will mostly type the local format (0771234567)
 * rather than international (+263771234567) — this assumes Zimbabwe
 * specifically and rewrites local-format numbers accordingly, rather than
 * trying to guess a country from an unprefixed number.
 *
 * Returns null if the input doesn't match a recognizable Zimbabwean
 * pattern, so callers can reject with a clear error instead of silently
 * accepting something that will never match later.
 */
export function normalizeZimPhone(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  // Strip spaces, dashes, parentheses — keep only leading + and digits.
  const cleaned = raw.trim().replace(/[\s\-()]/g, '');

  let digits: string;
  if (cleaned.startsWith('+263')) {
    digits = cleaned.slice(4);
  } else if (cleaned.startsWith('263')) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    digits = cleaned.slice(1);
  } else {
    return null;
  }

  // Zimbabwean mobile numbers are 9 digits after the country code/leading 0
  // (e.g. 771234567). Reject anything that doesn't fit that shape rather
  // than silently storing a malformed number.
  if (!/^\d{9}$/.test(digits)) {
    return null;
  }

  return `+263${digits}`;
}

/**
 * Builds a deterministic, non-deliverable synthetic email for phone-based
 * dealer logins. Supabase Auth requires an email under the hood even when
 * the dealer-facing identifier is a phone number — this email is never
 * shown to the dealer and never receives mail; the .internal TLD is not
 * a real, routable domain.
 */
export function phoneToSyntheticEmail(normalizedPhone: string): string {
  // normalizedPhone is always "+263XXXXXXXXX" — strip the + for a clean,
  // valid local-part (some email validators reject a leading +).
  const digitsOnly = normalizedPhone.replace('+', '');
  return `${digitsOnly}@dealer.tauranesu.internal`;
}
