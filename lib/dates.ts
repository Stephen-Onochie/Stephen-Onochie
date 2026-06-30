// Site-wide date helpers. The whole personal site treats "today" as Eastern
// time (America/New_York) so a session logged late at night lands on the right
// calendar day no matter where the device clock is set. Use these for any
// date-only YYYY-MM-DD value; keep using `new Date().toISOString()` for instants
// (started_at, ended_at, updated_at), which belong in UTC.

export const SITE_TIMEZONE = 'America/New_York'

/** YYYY-MM-DD for `d` in Eastern time. `en-CA` formats as ISO-style date. */
export function easternDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** Today's date (Eastern) as YYYY-MM-DD. */
export function todayEastern(): string {
  return easternDateStr()
}

/** The Eastern wall-clock weekday for `d` (0=Sun..6=Sat). */
export function easternWeekday(d: Date = new Date()): number {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_TIMEZONE,
    weekday: 'short',
  }).format(d)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name)
}

/** Monday (Eastern) of the week containing `d`, as YYYY-MM-DD. */
export function easternMonday(d: Date = new Date()): string {
  const dow = easternWeekday(d)
  const diff = dow === 0 ? -6 : 1 - dow
  return addDaysToDateStr(easternDateStr(d), diff)
}

/** Add `n` whole days to a YYYY-MM-DD string, returning a YYYY-MM-DD string. */
export function addDaysToDateStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  // Noon UTC anchor keeps the arithmetic clear of any DST/offset edge.
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  anchor.setUTCDate(anchor.getUTCDate() + n)
  const py = anchor.getUTCFullYear()
  const pm = String(anchor.getUTCMonth() + 1).padStart(2, '0')
  const pd = String(anchor.getUTCDate()).padStart(2, '0')
  return `${py}-${pm}-${pd}`
}
