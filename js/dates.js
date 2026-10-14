/* ============================================================
   Taily v5 — ISO date helpers (D-09). DOM-free.
   Visit times are local ISO strings '2026-10-15T17:00'; need-by is
   '2026-10-23'. Nothing here reads the real clock: screens and the
   model read `now()` from state.js.
   ============================================================ */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
const MS_DAY = 86400000;

/** ISO string ('2026-10-15' or '2026-10-15T17:00') | Date | ms → Date (local time). */
export function toDate(v) {
  if (v instanceof Date) return new Date(v.getTime());
  if (typeof v === 'number') return new Date(v);
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) throw new Error(`dates.toDate: bad ISO string "${v}"`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), 0, 0);
}
export const isoDay = (d) => { const x = toDate(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
export const isoMinute = (d) => { const x = toDate(d); return `${isoDay(x)}T${pad(x.getHours())}:${pad(x.getMinutes())}`; };
export const addDays = (d, n) => { const x = toDate(d); x.setDate(x.getDate() + n); return x; };
export const addMinutes = (d, n) => new Date(toDate(d).getTime() + n * 60000);
export const strip = (d) => { const x = toDate(d); x.setHours(0, 0, 0, 0); return x; };
/** Calendar days from a to b (DST-safe). */
export function dayDiff(a, b) {
  const x = toDate(a); const y = toDate(b);
  return Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) - Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / MS_DAY);
}
export const weekdayKey = (d) => WEEKDAY_KEYS[toDate(d).getDay()];
/** '17:30' → 1050. */
export const minutesOf = (hhmm) => { const [h, m] = String(hhmm).split(':'); return Number(h) * 60 + Number(m ?? 0); };
/** Minutes since midnight of an ISO string / Date. */
export const minuteOfDay = (d) => { const x = toDate(d); return x.getHours() * 60 + x.getMinutes(); };

/* R3-2-C-03: the time and its AM / PM are joined by a no-break space (U+00A0), so "5:30 PM" never splits
   across lines in a toast, a note or a heading. Text checks normalise whitespace (\s matches U+00A0). */
const clock = (d) => `${((d.getHours() + 11) % 12) + 1}:${pad(d.getMinutes())}\u00a0${d.getHours() >= 12 ? 'PM' : 'AM'}`;
/** "Thu, Oct 15 · 5:00 PM" */
export const fmtWhen = (iso) => { const d = toDate(iso); return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()} · ${clock(d)}`; };
/** "Thu, Oct 15" */
export const fmtDay = (iso) => { const d = toDate(iso); return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`; };
/** The Friday strictly after that day ('YYYY-MM-DD'); a Friday → the next Friday (D-24, D-136). */
export const payoutDay = (iso) => { const d = toDate(iso); return isoDay(addDays(d, (5 - d.getDay() + 7) % 7 || 7)); };
/** "5:00 PM" */
export const fmtTime = (iso) => clock(toDate(iso));
/** Keep a formatted date / time together on one line (R1-1-C-06): non-breaking spaces inside each part, normal ones around the " · ". */
export const nb = (s) => String(s).split(' · ').map((p) => p.replace(/ /g, '\u00A0')).join(' · ');
/** "Oct 15" */
export const fmtShort = (iso) => { const d = toDate(iso); return `${MON[d.getMonth()]} ${d.getDate()}`; };
/** "10/15/26" */
export const fmtMdy = (iso) => { const d = toDate(iso); return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`; };
/** "2h" / "2h 5m" / "52m" / "Expired" — a zero minutes part is dropped */
export function fmtCountdown(ms) {
  if (ms <= 0) return 'Expired';
  const total = Math.ceil(ms / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? (m ? `${h}h ${m}m` : `${h}h`) : `${total}m`;
}
/** Scheduler labels: "Oct 15" / "Thu, Oct 15". */
export const dayStamp = (d) => fmtShort(d);
export const dayLabel = (d) => fmtDay(d);
