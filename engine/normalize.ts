// Normalization helpers (brief §5.1).

/** Title-case an address-like string and collapse internal whitespace. */
export function normalizeAddress(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) =>
      word.length > 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word,
    )
    .join(' ');
}

/** Round square footage to the nearest whole SF. */
export function normalizeSf(value: number): number {
  return Math.round(value);
}

/** Currency to 2 decimals. */
export function normalizeCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Case-insensitive, trimmed enum coercion. Returns undefined if not in the set. */
export function coerceEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toLowerCase().replace(/\s+/g, '_');
  return allowed.find((a) => a === v);
}

/**
 * MVP proximity check for the consolidation opportunity (brief §4.4).
 * The MVP has no geocoding, so "within 15 miles" is approximated as
 * same city + state (case-insensitive). Phase 2 upgrades this to true distance
 * once geocoding / CoStar data is available.
 */
export function withinProximity(
  a: { city: string; state: string },
  b: { city: string; state: string },
): boolean {
  return (
    a.city.trim().toLowerCase() === b.city.trim().toLowerCase() &&
    a.state.trim().toLowerCase() === b.state.trim().toLowerCase()
  );
}

/** Round to n decimal places (default 2), guarding against NaN/Infinity. */
export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
