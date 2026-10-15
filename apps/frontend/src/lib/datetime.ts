const dayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** The UTC date "2026-10-16" of a datetime. */
export function utcDate(datetime: string) {
  return datetime.slice(0, 10);
}

/** "Fri 16 Oct" for the plain date "2026-10-16" or a UTC datetime on that day. */
export function formatDay(date: string) {
  return dayFormat.format(new Date(`${utcDate(date)}T00:00:00Z`));
}

/** Like `formatDay`, but "Today" for today's UTC date. */
export function formatRelativeDay(date: string, now = new Date()) {
  return utcDate(date) === utcDate(now.toISOString()) ? 'Today' : formatDay(date);
}

/** "09:30" for a UTC datetime. */
export function formatTime(datetime: string) {
  return datetime.slice(11, 16);
}
