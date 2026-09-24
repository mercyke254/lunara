/**
 * Date utilities for Lunara.
 *
 * IMPORTANT - one convention, everywhere:
 * Calendar days are represented as a `Date` pinned to **UTC midnight**.
 * Postgres `date` columns come back from Prisma as UTC midnight, so all
 * comparisons and arithmetic use the `getUTC*` accessors exclusively.
 *
 * Mixing local-time helpers into this model is the classic source of
 * off-by-one-day bugs in cycle trackers, so we deliberately do not use them.
 */

const MS_PER_DAY = 86_400_000;

/** Normalise anything date-like to UTC midnight of its UTC calendar day. */
export function toDateOnly(value: Date | string | number): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("toDateOnly received an invalid date value");
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Today, as a UTC-midnight day key. */
export function today(now: Date = new Date()): Date {
  return toDateOnly(now);
}

/** `YYYY-MM-DD` (the value format of `<input type="date">`). */
export function toISODate(value: Date | string): string {
  const d = toDateOnly(value);
  return `${d.getUTCFullYear().toString().padStart(4, "0")}-${(d.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`;
}

/** Parse `YYYY-MM-DD` into a UTC-midnight day key. Returns null if invalid. */
export function fromISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject overflow such as 2026-02-30.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function addDays(value: Date, days: number): Date {
  return new Date(toDateOnly(value).getTime() + days * MS_PER_DAY);
}

export function addMonths(value: Date, months: number): Date {
  const d = toDateOnly(value);
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1),
  );
  // Clamp to the last valid day of the target month.
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      Math.min(d.getUTCDate(), lastDay),
    ),
  );
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((toDateOnly(to).getTime() - toDateOnly(from).getTime()) / MS_PER_DAY);
}

/** Inclusive day count - e.g. a 5-day period starting and ending on the same day is 1. */
export function inclusiveDayCount(start: Date, end: Date): number {
  return daysBetween(start, end) + 1;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateOnly(a).getTime() === toDateOnly(b).getTime();
}

export function isBeforeDay(a: Date, b: Date): boolean {
  return toDateOnly(a).getTime() < toDateOnly(b).getTime();
}

export function isAfterDay(a: Date, b: Date): boolean {
  return toDateOnly(a).getTime() > toDateOnly(b).getTime();
}

/** True when `day` falls within `[start, end]` inclusive. */
export function isWithinInclusive(day: Date, start: Date, end: Date): boolean {
  const t = toDateOnly(day).getTime();
  return t >= toDateOnly(start).getTime() && t <= toDateOnly(end).getTime();
}

export function startOfMonth(value: Date): Date {
  const d = toDateOnly(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function endOfMonth(value: Date): Date {
  const d = toDateOnly(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

/** Monday-based start of week. */
export function startOfWeek(value: Date): Date {
  const d = toDateOnly(value);
  const dow = d.getUTCDay(); // 0 = Sunday
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDays(d, delta);
}

export function endOfWeek(value: Date): Date {
  return addDays(startOfWeek(value), 6);
}

/** Monday-first weekday labels, for calendar headers. */
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** All days from `start` to `end` inclusive. */
export function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cursor = toDateOnly(start);
  const last = toDateOnly(end);
  if (last.getTime() < cursor.getTime()) return days;
  while (cursor.getTime() <= last.getTime()) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/**
 * Build a fixed 6x7 = 42-cell month grid (Monday-first), so month heights
 * never jump between 5- and 6-week months.
 */
export function monthGrid(value: Date): Date[] {
  const first = startOfWeek(startOfMonth(value));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

// ---------------------------------------------------------------------------
// Formatting - driven by Intl so output follows the requested locale.
// ---------------------------------------------------------------------------

const shortFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const longFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const mediumFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

export function formatShort(value: Date | string): string {
  return shortFormatter.format(toDateOnly(value));
}

export function formatMedium(value: Date | string): string {
  return mediumFormatter.format(toDateOnly(value));
}

export function formatLong(value: Date | string): string {
  return longFormatter.format(toDateOnly(value));
}

export function formatMonthYear(value: Date | string): string {
  return monthYearFormatter.format(toDateOnly(value));
}

export function formatWeekday(value: Date | string): string {
  return weekdayFormatter.format(toDateOnly(value));
}

export function formatDayNumber(value: Date | string): number {
  return toDateOnly(value).getUTCDate();
}

/**
 * Human phrasing for a day relative to today, used on the dashboard.
 * Deliberately avoids "in 1 days".
 */
export function relativeDayLabel(target: Date, reference: Date = today()): string {
  const diff = daysBetween(reference, target);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export function ageInYears(dateOfBirth: Date, reference: Date = today()): number {
  const dob = toDateOnly(dateOfBirth);
  const ref = toDateOnly(reference);
  let age = ref.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = ref.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && ref.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}
