import { validateDob } from '../utils/dob-validation';

describe('DOB Validation (validateDob)', () => {
  // --- Empty / partial input ---
  it('returns null for empty string', () => {
    expect(validateDob('')).toBeNull();
    expect(validateDob('   ')).toBeNull();
  });

  it('returns null for valid partial month (1 digit)', () => {
    expect(validateDob('0')).toBeNull();
    expect(validateDob('1')).toBeNull();
  });

  // --- Month validation (2+ digits) ---
  it('rejects month 00', () => {
    expect(validateDob('00')).toBe('Invalid month. Enter 01–12.');
  });

  it('rejects month 13', () => {
    expect(validateDob('13')).toBe('Invalid month. Enter 01–12.');
  });

  it('rejects month 99', () => {
    expect(validateDob('99')).toBe('Invalid month. Enter 01–12.');
  });

  it('accepts valid months 01–12', () => {
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      expect(validateDob(mm)).toBeNull();
    }
  });

  // --- Day validation (4+ digits) ---
  it('rejects day 00', () => {
    expect(validateDob('01 / 00')).toBe('Invalid day.');
  });

  it('rejects day 32 for January', () => {
    expect(validateDob('01 / 32')).toBe('Invalid day for January. Max: 31.');
  });

  it('rejects day 30 for February', () => {
    expect(validateDob('02 / 30')).toBe('Invalid day for February. Max: 29.');
  });

  it('rejects day 31 for April', () => {
    expect(validateDob('04 / 31')).toBe('Invalid day for April. Max: 30.');
  });

  it('accepts day 29 for February (before year is known)', () => {
    expect(validateDob('02 / 29')).toBeNull();
  });

  it('accepts day 31 for January', () => {
    expect(validateDob('01 / 31')).toBeNull();
  });

  // --- Full date validation (8 digits) ---
  it('rejects year before 1900', () => {
    expect(validateDob('01 / 01 / 1899')).toBe('Year must be 1900 or later.');
  });

  it('rejects invalid date like Feb 29 on non-leap year', () => {
    expect(validateDob('02 / 29 / 2023')).toBe('Invalid date.');
  });

  it('accepts Feb 29 on leap year', () => {
    // 2000 was a leap year, and person would be well over 18
    expect(validateDob('02 / 29 / 2000')).toBeNull();
  });

  it('rejects future dates', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const mm = String(future.getMonth() + 1).padStart(2, '0');
    const dd = String(future.getDate()).padStart(2, '0');
    const yyyy = String(future.getFullYear());
    expect(validateDob(`${mm} / ${dd} / ${yyyy}`)).toBe('Date of birth cannot be in the future.');
  });

  it('rejects age under 18', () => {
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 10);
    const mm = String(recent.getMonth() + 1).padStart(2, '0');
    const dd = String(recent.getDate()).padStart(2, '0');
    const yyyy = String(recent.getFullYear());
    expect(validateDob(`${mm} / ${dd} / ${yyyy}`)).toBe('You must be at least 18 years old.');
  });

  it('accepts a valid date for someone exactly 18 today', () => {
    const exactly18 = new Date();
    exactly18.setFullYear(exactly18.getFullYear() - 18);
    const mm = String(exactly18.getMonth() + 1).padStart(2, '0');
    const dd = String(exactly18.getDate()).padStart(2, '0');
    const yyyy = String(exactly18.getFullYear());
    expect(validateDob(`${mm} / ${dd} / ${yyyy}`)).toBeNull();
  });

  it('accepts a valid date for someone over 18', () => {
    expect(validateDob('06 / 15 / 1990')).toBeNull();
  });

  it('accepts a valid old date', () => {
    expect(validateDob('01 / 01 / 1900')).toBeNull();
  });

  // --- Auto-formatting test (digits → formatted) ---
  it('validateDob works with raw digit strings too', () => {
    // The function strips non-digits internally via parseDobParts
    expect(validateDob('06151990')).toBeNull();
    expect(validateDob('13011990')).toBe('Invalid month. Enter 01–12.');
  });
});
