/** Parse the formatted "MM / DD / YYYY" string into { mm, dd, yyyy } digit strings. */
export function parseDobParts(formatted: string) {
  const digits = formatted.replace(/\D/g, '');
  return {
    mm: digits.slice(0, 2),
    dd: digits.slice(2, 4),
    yyyy: digits.slice(4, 8),
    digits,
  };
}

/** Return a Date from the formatted dob if fully valid, otherwise null. */
export function parseDobToDate(formatted: string): Date | null {
  const { mm, dd, yyyy, digits } = parseDobParts(formatted);
  if (digits.length !== 8) return null;
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const year = parseInt(yyyy, 10);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Validate the DOB as the user types and return an error string or null. */
export function validateDob(formatted: string): string | null {
  if (formatted.trim() === '') return null;

  const { mm, dd, yyyy, digits } = parseDobParts(formatted);

  if (digits.length >= 2) {
    const month = parseInt(mm, 10);
    if (month < 1 || month > 12) {
      return 'Invalid month. Enter 01–12.';
    }
  }

  if (digits.length >= 4) {
    const month = parseInt(mm, 10);
    const day = parseInt(dd, 10);
    if (day < 1) {
      return 'Invalid day.';
    }
    const maxDays = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > maxDays[month]) {
      return `Invalid day for ${['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month]}. Max: ${maxDays[month]}.`;
    }
  }

  if (digits.length === 8) {
    const year = parseInt(yyyy, 10);
    if (year < 1900) {
      return 'Year must be 1900 or later.';
    }

    const date = parseDobToDate(formatted);
    if (!date) {
      return 'Invalid date.';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) {
      return 'Date of birth cannot be in the future.';
    }

    const eighteenYearsAgo = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate(),
    );
    if (date > eighteenYearsAgo) {
      return 'You must be at least 18 years old.';
    }
  }

  return null;
}

/** Format a Date to "MM / DD / YYYY" string. */
export function formatDateToDob(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${mm} / ${dd} / ${yyyy}`;
}

/** Format a Date to "YYYY-MM-DD" for HTML date input. */
export function formatDateToISO(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}
