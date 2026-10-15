/** Every duration an Event Type can have: 15 min to 9 h in steps of 15. */
export const durations = Array.from({ length: 36 }, (_, i) => (i + 1) * 15);

/** "15 min", "1 h", "1 h 30 min". */
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours > 0 && `${hours} h`, rest > 0 && `${rest} min`].filter(Boolean).join(' ');
}
