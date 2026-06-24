// Epic 6: pure aggregation/formatting helpers shared by the analytics reports
// and CSV exports. Kept side-effect free so they can be unit-tested directly.

/** Escape a single CSV field per RFC 4180 (quote when it contains , " or newline). */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  if (/[",\n\r]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }

  return str;
}

/** Build a CSV document from a header row and data rows. Always ends with a newline. */
export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => csvField(cell)).join(","),
  );

  return `${lines.join("\n")}\n`;
}

/** Whole-number percentage of `part` out of `total` (0 when total is 0). */
export function percentage(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

/** Bar width as a percentage of the largest value in a series (0 when max is 0). */
export function barScale(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.round((value / max) * 100);
}

/** Count items grouped by a derived key, returned as a plain record. */
export function groupByCount<T>(
  items: T[],
  keyFn: (item: T) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

/**
 * Average elapsed milliseconds between paired start/end timestamps. Pairs whose
 * end is missing or precedes the start are ignored. Returns null when there is
 * no valid pair (so callers can render "n/a" rather than a misleading 0).
 */
export function averageDurationMs(
  pairs: Array<{ start: Date; end: Date | null | undefined }>,
): number | null {
  const durations = pairs
    .filter((pair): pair is { start: Date; end: Date } => pair.end != null)
    .map((pair) => pair.end.getTime() - pair.start.getTime())
    .filter((ms) => ms >= 0);

  if (durations.length === 0) {
    return null;
  }

  const total = durations.reduce((sum, ms) => sum + ms, 0);

  return Math.round(total / durations.length);
}

/** Human-friendly duration from milliseconds (e.g. "2d 3h", "5h 12m", "8m"). */
export function formatDuration(ms: number | null): string {
  if (ms === null) {
    return "n/a";
  }

  if (ms < 60000) {
    return "<1m";
  }

  const totalMinutes = Math.floor(ms / 60000);

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

/** Profile completion: share of the tracked optional fields that are filled in. */
export function profileCompletion(user: {
  studentId: string | null;
  department: string | null;
  phone: string | null;
}): number {
  const fields = [user.studentId, user.department, user.phone];
  const filled = fields.filter((value) => Boolean(value && value.trim())).length;

  return percentage(filled, fields.length);
}

/** Parse a yyyy-mm-dd filter string into a Date, or null when invalid/empty. */
export function parseDateFilter(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Build a Prisma-style createdAt range filter from optional from/to dates.
 * `to` is treated as inclusive of the whole day. Returns undefined when neither
 * bound is set so callers can spread it into a `where` clause cleanly.
 */
export function dateRangeFilter(
  from: Date | null,
  to: Date | null,
): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) {
    return undefined;
  }

  const range: { gte?: Date; lte?: Date } = {};

  if (from) {
    range.gte = from;
  }

  if (to) {
    range.lte = new Date(to.getTime() + (24 * 60 * 60 * 1000 - 1));
  }

  return range;
}
