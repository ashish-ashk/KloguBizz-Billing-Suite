import { describe, expect, it } from 'vitest';
import { fmtINR, fmtINRCompact, isValidGSTIN, numberToWords, stateName, monthLabel } from './format';

/**
 * Formatting is not cosmetic here — `numberToWords` prints on a tax invoice.
 *
 * The amount in words is a legal element of an Indian invoice and the figure a
 * dispute is read against. It is also the kind of function nobody re-reads after
 * it works once on a round number, and its edges (the Indian lakh/crore
 * grouping, the teens, paise) are exactly where an off-by-one hides for years.
 */

describe('numberToWords', () => {
  it('handles the boundaries the Indian grouping turns on', () => {
    expect(numberToWords(0)).toBe('Zero Rupees Only');
    expect(numberToWords(1)).toBe('One Rupees Only');
    // The teens are their own words, not "Ten Five".
    expect(numberToWords(15)).toBe('Fifteen Rupees Only');
    expect(numberToWords(100)).toBe('One Hundred Rupees Only');
    expect(numberToWords(1000)).toBe('One Thousand Rupees Only');
    // Where Indian grouping departs from the Western one: 100,000 is a lakh,
    // not "one hundred thousand", and 10,000,000 is a crore.
    expect(numberToWords(100000)).toBe('One Lakh Rupees Only');
    expect(numberToWords(10000000)).toBe('One Crore Rupees Only');
  });

  it('writes a realistic invoice total correctly', () => {
    // 12,34,567 — a figure that exercises lakh, thousand and hundred at once.
    expect(numberToWords(1234567)).toBe(
      'Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees Only'
    );
  });

  it('includes paise only when there are any', () => {
    expect(numberToWords(1500.5)).toBe('One Thousand Five Hundred Rupees and Fifty Paise Only');
    // A whole rupee amount must not read "... and Zero Paise Only".
    expect(numberToWords(1500)).toBe('One Thousand Five Hundred Rupees Only');
    // Rounded to the nearest paisa rather than truncated: 0.005 is half a paisa
    // and dropping it would make the words disagree with the printed total.
    expect(numberToWords(10.005)).toBe('Ten Rupees and One Paise Only');
  });

  it('does not print a minus sign on a negative amount', () => {
    // A credit note carries its own sign; "Minus Five Hundred Rupees" on a
    // document that already says CREDIT NOTE reads as a double negative.
    expect(numberToWords(-500)).toBe('Five Hundred Rupees Only');
  });
});

describe('fmtINR', () => {
  it('groups the Indian way, not in thousands', () => {
    // 12,34,567 — not 1,234,567. Getting this wrong on an invoice is immediately
    // visible to every Indian customer and to nobody who built it.
    expect(fmtINR(1234567)).toContain('12,34,567');
  });

  it('treats null and undefined as zero rather than printing NaN', () => {
    // Every one of these reaches the formatter from an optional API field.
    expect(fmtINR(null)).toContain('0');
    expect(fmtINR(undefined)).toContain('0');
    expect(fmtINR(0)).toContain('0');
  });

  it('rounds to whole rupees only when asked', () => {
    expect(fmtINR(99.5)).toContain('99.5');
    expect(fmtINR(99.5, true)).not.toContain('.5');
  });
});

describe('fmtINRCompact', () => {
  it('abbreviates in lakhs and crores', () => {
    // Headline tiles are narrow; a full ₹14,56,79,011 overflows and a truncated
    // number is worse than an abbreviated one.
    expect(fmtINRCompact(840000)).toMatch(/8\.4\s*L/);
    expect(fmtINRCompact(15000000)).toMatch(/1\.5\s*Cr/);
    expect(fmtINRCompact(999)).toContain('999');
  });
});

describe('stateName', () => {
  it('resolves GST state codes', () => {
    expect(stateName('27')).toBe('Maharashtra');
    expect(stateName('07')).toBe('Delhi');
  });

  it('returns the code when it does not recognise it', () => {
    // Better a code the reader can look up than a blank cell that implies the
    // field is empty.
    expect(stateName('99')).toBe('99');
  });
});

describe('monthLabel', () => {
  it('renders a YYYY-MM bucket', () => {
    expect(monthLabel('2026-04')).toMatch(/Apr/);
  });
});

/**
 * The browser's GSTIN check has to agree with the server's.
 *
 * It used to test the pattern only, so a transposed pair passed here and was
 * refused by the API — the field said nothing was wrong, and the rejection
 * arrived as a failed save instead of as a message beside the input.
 */
describe('isValidGSTIN', () => {
  it('accepts real GSTINs', () => {
    expect(isValidGSTIN('27AAPFU0939F1ZV')).toBe(true);
    expect(isValidGSTIN('33AAACT2727Q1Z3')).toBe(true);
    expect(isValidGSTIN('29AAACT2727Q1ZS')).toBe(true);
    // Case is not the user's problem.
    expect(isValidGSTIN('27aapfu0939f1zv')).toBe(true);
  });

  it('rejects a wrong checksum that has the right shape', () => {
    // The last character is the checksum, and this is the failure the pattern
    // check could never see.
    expect(isValidGSTIN('27AAPFU0939F1ZZ')).toBe(false);
    expect(isValidGSTIN('27AAPFU0939F1ZA')).toBe(false);
  });

  it('rejects the plainly malformed', () => {
    expect(isValidGSTIN('')).toBe(false);
    expect(isValidGSTIN('27AAPFU0939F1Z')).toBe(false);
    expect(isValidGSTIN('27AAPFU0939F1ZVX')).toBe(false);
    expect(isValidGSTIN('AAPFU0939F1ZV27')).toBe(false);
    // The fourteenth character is always Z.
    expect(isValidGSTIN('27AAPFU0939F1YV')).toBe(false);
  });
});
