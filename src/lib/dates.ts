/**
 * Local-date helpers. Work days are keyed by the device's local calendar
 * date; this module is the only place YYYY-MM-DD strings are produced.
 */

const toDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Today's work date (YYYY-MM-DD) in device local time. */
export const localWorkDate = (): string => toDateString(new Date());

/** Start of the local day as an ISO timestamp, for timestamptz filters. */
export const startOfLocalDayISO = (): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

/** Work date string offset by `days` from a base date (default today). */
export const workDateOffset = (days: number, from?: string): string => {
  const d = from ? new Date(`${from}T00:00:00`) : new Date();
  d.setDate(d.getDate() + days);
  return toDateString(d);
};

/** Monday of the current local week (YYYY-MM-DD). */
export const startOfWeekDate = (): string => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return toDateString(d);
};

/** "Mon, Jun 10" style label for a work date string. */
export const formatWorkDate = (workDate: string): string =>
  new Date(`${workDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

/** Hour-block label, e.g. 9 -> "9:00 – 10:00 AM" simplified to "9 AM". */
export const formatHour = (hour: number): string => {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? "AM" : "PM"}`;
};
