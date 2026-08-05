/**
 * The schedule arithmetic for recurring invoices (2.2 #14).
 *
 * Deliberately pure and dependency-free: no database, no clock of its own beyond
 * what is passed in. Date maths is where scheduling bugs live, and a function
 * that takes a date and returns a date can be tested exhaustively without a
 * MongoDB or a fake timer.
 *
 * Two things here are load-bearing:
 *
 *  1. **`periodKey`** is derived from the *scheduled* date, never from "now".
 *     That is what makes the whole thing idempotent: a sweep that runs late, or
 *     twice, or on two instances, computes the same key for the same period and
 *     collides on the unique index instead of issuing a second invoice.
 *  2. **`nextOccurrence` advances by exactly one period** from the previous
 *     scheduled date, not from today. After a week of downtime a daily schedule
 *     is seven periods behind and catches up one per sweep — which is slow but
 *     correct. Jumping to "today plus one period" would silently skip six
 *     invoices, and a tenant would only find out by reconciling their revenue.
 */

/** Month-end clamping: the day-of-month a monthly schedule *wants*, capped to
 *  what the target month actually has. Without this, the 31st of January
 *  advances to the 3rd of March (JS rolls over), and a schedule that started on
 *  the 31st drifts forward a few days every other month. */
function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addMonthsClamped(date, months, anchorDay) {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const target = new Date(Date.UTC(year, monthIndex + months, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth();
  // The anchor is the day the schedule was *started* on, so a run that landed on
  // the 28th of February does not permanently move a 31st-of-the-month schedule
  // to the 28th.
  const day = Math.min(anchorDay || date.getUTCDate(), daysInMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, day,
    date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

/** Months per step, for the frequencies that step in months. */
const MONTHS_PER = { monthly: 1, quarterly: 3, yearly: 12 };

/**
 * The next scheduled date after `from`.
 *
 * `anchorDay` is the day-of-month of the schedule's `startDate`; passing it keeps
 * a monthly schedule pinned to its original day across short months.
 */
function nextOccurrence(from, { frequency, interval = 1, anchorDay } = {}) {
  const step = Math.max(1, Number(interval) || 1);
  const date = new Date(from);

  if (frequency === 'daily') return addDays(date, step);
  if (frequency === 'weekly') return addDays(date, 7 * step);

  const months = MONTHS_PER[frequency];
  if (!months) throw new Error(`Unknown recurrence frequency: ${frequency}`);
  return addMonthsClamped(date, months * step, anchorDay);
}

/** ISO-8601 week number, for a weekly schedule's period key. */
function isoWeek(date) {
  // Thursday of the current week determines the ISO year and week.
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = (thursday.getUTCDay() + 6) % 7; // Mon = 0
  thursday.setUTCDate(thursday.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  const week = 1 + Math.round((thursday - firstThursday) / (7 * 86400000));
  return { year: thursday.getUTCFullYear(), week };
}

/**
 * The idempotency key for one period of one schedule.
 *
 * Granularity matches the frequency on purpose. A monthly schedule keyed by day
 * would let a corrected `nextRunAt` produce a second August invoice; keyed by
 * month, it cannot. A daily schedule genuinely does need day granularity, so it
 * gets it.
 */
function periodKeyFor(scheduledFor, frequency) {
  const date = new Date(scheduledFor);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  switch (frequency) {
    case 'daily':
      return `${year}-${month}-${day}`;
    case 'weekly': {
      const { year: isoYear, week } = isoWeek(date);
      return `${isoYear}-W${String(week).padStart(2, '0')}`;
    }
    case 'quarterly':
      return `${year}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
    case 'yearly':
      return String(year);
    case 'monthly':
    default:
      return `${year}-${month}`;
  }
}

/**
 * Whether a schedule has run its course.
 *
 * Checked *after* incrementing the occurrence count, so `endAfterCount: 12`
 * produces exactly twelve invoices. Checked against the *next* scheduled date
 * for `endsOn`, so "ends on 31 March" does not generate an April invoice.
 */
function isComplete({ occurrences, endAfterCount, endsOn, nextRunAt }) {
  if (endAfterCount && occurrences >= endAfterCount) return true;
  if (endsOn && nextRunAt && new Date(nextRunAt) > new Date(endsOn)) return true;
  return false;
}

/**
 * A human description of the schedule, for the list and for the audit entry.
 * Built here rather than in the frontend so the API, the PDF and the log all say
 * the same thing.
 */
function describeSchedule({ frequency, interval = 1 }) {
  const step = Math.max(1, Number(interval) || 1);
  const unit = { daily: 'day', weekly: 'week', monthly: 'month', quarterly: 'quarter', yearly: 'year' }[frequency] || frequency;
  if (step === 1) {
    return { daily: 'Every day', weekly: 'Every week', monthly: 'Every month', quarterly: 'Every quarter', yearly: 'Every year' }[frequency]
      || `Every ${unit}`;
  }
  return `Every ${step} ${unit}s`;
}

module.exports = {
  nextOccurrence,
  periodKeyFor,
  isComplete,
  describeSchedule,
  addDays,
  addMonthsClamped,
  isoWeek,
  MONTHS_PER
};
