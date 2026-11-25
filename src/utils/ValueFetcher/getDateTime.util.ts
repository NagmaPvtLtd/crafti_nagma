/**
 * Formats a date as the UTC `YYYY-MM-DD HH:MM:SS` string MySQL DATETIME expects.
 *
 * @function formatSqlDateTime
 * @description Uses UTC parts (matching `getCurrentDateTime`) so stored timestamps
 *              and comparisons stay timezone-safe.
 *
 * @param {Date} date - Date to format
 *
 * @returns {string} UTC timestamp in SQL DATETIME form
 */
export function formatSqlDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");

  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export function getCurrentDateTime(): string {
  return formatSqlDateTime(new Date());
}
