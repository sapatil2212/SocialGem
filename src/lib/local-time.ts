// Wall-clock time in a named zone, to and from UTC, without a library.
function parts(date: Date, zone: string) {
  const out: Record<string, number> = {};
  for (const p of new Intl.DateTimeFormat("en-GB", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(date)) out[p.type] = Number(p.value);
  return out;
}

const offset = (date: Date, zone: string) => {
  const p = parts(date, zone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
};

/** "2026-11-30" plus days and "18:30" in a zone, as a UTC date. */
export function localToUtc(day: string, plusDays: number, time: string, zone: string) {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d + plusDays, h, min);
  const first = new Date(wall - offset(new Date(wall), zone));
  // Asked again, for days when the clocks change.
  return new Date(wall - offset(first, zone));
}

export function localDay(date: Date, zone: string) {
  const p = parts(date, zone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
