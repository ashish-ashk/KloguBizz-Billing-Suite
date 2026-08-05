/**
 * The recurring-invoice schedule arithmetic (2.2 #14).
 *
 * Pure unit tests, no database — `recurrenceService` takes dates and returns
 * dates, which is deliberate: date maths is where scheduling bugs live, and the
 * ones that matter (month-end drift, a period key that changes when it should
 * not) are cheap to pin down here and expensive to discover from a customer's
 * duplicated invoice.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  nextOccurrence, periodKeyFor, isComplete, describeSchedule, isoWeek
} = require('../src/services/recurrenceService');

const utc = (y, m, d, h = 0) => new Date(Date.UTC(y, m - 1, d, h));
const iso = date => date.toISOString().slice(0, 10);

// ── Stepping ─────────────────────────────────────

test('daily and weekly schedules step by whole days', () => {
  assert.equal(iso(nextOccurrence(utc(2026, 8, 3), { frequency: 'daily' })), '2026-08-04');
  assert.equal(iso(nextOccurrence(utc(2026, 8, 3), { frequency: 'daily', interval: 10 })), '2026-08-13');
  assert.equal(iso(nextOccurrence(utc(2026, 8, 3), { frequency: 'weekly' })), '2026-08-10');
  assert.equal(iso(nextOccurrence(utc(2026, 8, 3), { frequency: 'weekly', interval: 2 })), '2026-08-17');
});

test('monthly, quarterly and yearly step in months', () => {
  assert.equal(iso(nextOccurrence(utc(2026, 8, 15), { frequency: 'monthly' })), '2026-09-15');
  assert.equal(iso(nextOccurrence(utc(2026, 8, 15), { frequency: 'monthly', interval: 2 })), '2026-10-15');
  assert.equal(iso(nextOccurrence(utc(2026, 8, 15), { frequency: 'quarterly' })), '2026-11-15');
  assert.equal(iso(nextOccurrence(utc(2026, 8, 15), { frequency: 'yearly' })), '2027-08-15');
});

test('a month-end schedule is clamped, not rolled over', () => {
  // JS rolls 31 Jan + 1 month over into 3 March. A monthly retainer started on
  // the 31st must land on the last day of February, not drift into March.
  assert.equal(iso(nextOccurrence(utc(2026, 1, 31), { frequency: 'monthly', anchorDay: 31 })), '2026-02-28');
  assert.equal(iso(nextOccurrence(utc(2024, 1, 31), { frequency: 'monthly', anchorDay: 31 })), '2024-02-29', 'leap year');
});

test('the anchor day survives a short month rather than sticking to it', () => {
  // The 31st → 28 Feb → back to 31 March. Without the anchor, a schedule that
  // once landed on the 28th would stay on the 28th for ever — silently moving a
  // month-end retainer three days earlier.
  const feb = nextOccurrence(utc(2026, 1, 31), { frequency: 'monthly', anchorDay: 31 });
  assert.equal(iso(feb), '2026-02-28');
  assert.equal(iso(nextOccurrence(feb, { frequency: 'monthly', anchorDay: 31 })), '2026-03-31');
});

test('the time of day is preserved across a step', () => {
  const stepped = nextOccurrence(utc(2026, 8, 15, 9), { frequency: 'monthly', anchorDay: 15 });
  assert.equal(stepped.getUTCHours(), 9);
});

test('an unknown frequency is refused rather than silently treated as monthly', () => {
  assert.throws(() => nextOccurrence(utc(2026, 8, 1), { frequency: 'fortnightly' }), /Unknown recurrence frequency/);
});

// ── Period keys: the idempotency guarantee ───────

test('the period key has the granularity of its frequency', () => {
  assert.equal(periodKeyFor(utc(2026, 8, 3), 'daily'), '2026-08-03');
  assert.equal(periodKeyFor(utc(2026, 8, 3), 'monthly'), '2026-08');
  assert.equal(periodKeyFor(utc(2026, 8, 3), 'quarterly'), '2026-Q3');
  assert.equal(periodKeyFor(utc(2026, 8, 3), 'yearly'), '2026');
  assert.match(periodKeyFor(utc(2026, 8, 3), 'weekly'), /^2026-W\d{2}$/);
});

test('two different days in the same month share a monthly key', () => {
  // This is what stops a corrected `nextRunAt` producing a second August
  // invoice: the unique {recurringId, periodKey} index sees the same key.
  assert.equal(periodKeyFor(utc(2026, 8, 1), 'monthly'), periodKeyFor(utc(2026, 8, 31), 'monthly'));
  assert.notEqual(periodKeyFor(utc(2026, 8, 31), 'monthly'), periodKeyFor(utc(2026, 9, 1), 'monthly'));
});

test('quarter boundaries land in the right quarter', () => {
  assert.equal(periodKeyFor(utc(2026, 3, 31), 'quarterly'), '2026-Q1');
  assert.equal(periodKeyFor(utc(2026, 4, 1), 'quarterly'), '2026-Q2');
  assert.equal(periodKeyFor(utc(2026, 12, 31), 'quarterly'), '2026-Q4');
});

test('the ISO week number rolls over the year correctly', () => {
  // 1 Jan 2027 is a Friday, which ISO-8601 places in week 53 of 2026 — the case
  // a naive "week of year" calculation gets wrong, producing a duplicate key
  // for two different weeks.
  const { year, week } = isoWeek(utc(2027, 1, 1));
  assert.equal(year, 2026);
  assert.equal(week, 53);
  assert.equal(periodKeyFor(utc(2027, 1, 1), 'weekly'), '2026-W53');
});

// ── Completion ───────────────────────────────────

test('endAfterCount completes on exactly that many invoices', () => {
  assert.equal(isComplete({ occurrences: 11, endAfterCount: 12 }), false);
  assert.equal(isComplete({ occurrences: 12, endAfterCount: 12 }), true);
});

test('endsOn does not generate a period past the end date', () => {
  const endsOn = utc(2026, 3, 31);
  assert.equal(isComplete({ occurrences: 3, endsOn, nextRunAt: utc(2026, 3, 15) }), false);
  assert.equal(isComplete({ occurrences: 3, endsOn, nextRunAt: utc(2026, 4, 1) }), true);
});

test('an open-ended schedule never completes', () => {
  assert.equal(isComplete({ occurrences: 500, nextRunAt: utc(2030, 1, 1) }), false);
});

// ── Labels ───────────────────────────────────────

test('the schedule reads as English, singular and plural', () => {
  assert.equal(describeSchedule({ frequency: 'monthly' }), 'Every month');
  assert.equal(describeSchedule({ frequency: 'monthly', interval: 2 }), 'Every 2 months');
  assert.equal(describeSchedule({ frequency: 'quarterly' }), 'Every quarter');
  assert.equal(describeSchedule({ frequency: 'quarterly', interval: 3 }), 'Every 3 quarters');
});
