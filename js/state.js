/* ============================================================
   Taily v5 — state, appointment machine, selectors. DOM-free.
   (v4's state.js is archived in js/v4/state.js.)

   One `state` object, mutated in place. Transitions are pure with
   respect to the DOM: they take an appointment id, mutate `state`
   and return `{ ok: true, appt }` or `{ ok: false, error }` — a
   guard failure never throws; an unknown id throws. Every success
   pushes `history` and, where it matters, a system message into
   the customer–tailor thread. Nothing here reads the real clock:
   `state.clock.now` is frozen (D-09) and moves only through
   setClock / advanceClock.

   Money is integer cents (money.js); rates and timers come from
   money-config.js. Decisions: D-03 … D-27 in docs/v5/DECISIONS.md.

   Status machine:
     requested → confirmed → fitting → price-change → in-progress → ready → awaiting-handoff → completed
     requested → suggested → confirmed | cancelled(switched | withdrawn)
     requested → declined (terminal) · expired → requested (Try again) · confirmed → cancelled(...)
   ============================================================ */
import { POLICY } from './money-config.js';
import {
  cents, linesFor, quote, estimate, rushFor, depositFor, courierQuote, cancelTerms, noShowPayout,
} from './money.js';
import {
  toDate, isoMinute, isoDay, addDays, addMinutes, strip, dayDiff, weekdayKey, minutesOf, fmtWhen, payoutDay,
} from './dates.js';
import {
  CUSTOMER, TAILORS, SEED_JOB, BLANK_TAILOR, DEMO_NOW, MAX_ITEMS, VISIT_MINUTES, DAY_START_MIN, DAY_END_MIN,
  SLOT_STEP_MIN, SLOT_HORIZON_DAYS, ZIP_INFO, SHOP_RADIUS_MI, SERVICES, GARMENT_TYPES, RETURN_LABEL,
  TAILOR_LIMITS, RUSH_TIERS, ROUTING_BANKS, REVIEW_LIMITS, CHAT_LIMITS, FITTING_LIMITS, DOC_KINDS, servicesForType,
} from './data.js';

export const STATUSES = ['requested', 'suggested', 'declined', 'expired', 'confirmed', 'fitting', 'price-change', 'in-progress', 'ready', 'awaiting-handoff', 'completed', 'cancelled'];
export const TERMINAL = ['declined', 'cancelled', 'completed'];
export const SECTIONS = ['profile', 'services', 'where', 'returns', 'availability', 'payouts'];

const clone = (x) => structuredClone(x);
const MIN_MS = 60000;
const HOUR_MS = 3600000;

function freshSim() {
  /* network 'online'|'offline' · send 'ok'|'fail' (one-shot, D-130) · session 'valid'|'expired' · push 'default'|'prompt'|'granted'|'denied'
     · payout 'ok'|'failed' · server 'ok'|'error' (one-shot, D-140) */
  return { latency: 'normal', card: 'ok', courier: 'ok', network: 'online', push: 'default', send: 'ok', session: 'valid', payout: 'ok', server: 'ok' };
}
function fresh() {
  return {
    persona: 'customer',                       // 'customer' | 'tailor' (D-21)
    clock: { now: toDate(DEMO_NOW).getTime() }, // frozen demo clock (D-09)
    session: { customer: { signedIn: true }, tailor: { signedIn: true } },
    customer: clone(CUSTOMER),
    tailors: clone(TAILORS),
    job: clone(SEED_JOB),
    appts: [],                                 // every appointment; both personas read the same objects
    threads: {},                               // { [tailorId]: { tailorId, customerId, messages: [], read: { customer, tailor } } }
    payouts: [],                               // { apptId, cents, state: 'pending'|'paid'|'failed', date, kind }
    sim: freshSim(),
    ui: {},                                    // screen-local transient UI only; the model never reads it
  };
}

export const state = fresh();

let apptSeq = 1000;
let msgSeq = 0;
let garmentSeq = 0;

/** Restore every field to the seed. Keeps `sim.latency`. */
export function reset() {
  const latency = state.sim.latency;
  const f = fresh();
  for (const k of Object.keys(f)) state[k] = f[k];
  state.sim.latency = latency;
  apptSeq = 1000; msgSeq = 0; garmentSeq = 0;
  return state;
}

const fail = (error, extra = {}) => ({ ok: false, error, ...extra });
const succeed = (appt, extra = {}) => ({ ok: true, appt, ...extra });

/* ---------- clock ---------- */
export const now = () => state.clock.now;
export const nowIso = () => isoMinute(new Date(state.clock.now));
export function setClock(iso) { state.clock.now = toDate(iso).getTime(); return state.clock.now; }
/** Expire every `requested` appointment whose reply window has passed. Returns the expired ids. */
export function tick() {
  const expired = [];
  for (const a of state.appts) {
    if (a.status === 'requested' && toDate(a.expiresAt).getTime() <= state.clock.now) {
      if (expireRequest(a.id).ok) expired.push(a.id);
    } else if (a.status === 'suggested' && state.clock.now >= suggestLapseAt(a)) {
      endSuggestion(a, `${firstName(tailorById(a.tailorId))}’s suggested time passed`, 'Your suggested time passed', 'lapsed');   // D-154
      expired.push(a.id);
    }
  }
  return expired;
}
/** When a suggested time stops being open (D-154): `MIN_LEAD_H` before it starts, or `SUGGEST_EXPIRY_H` after it was suggested,
    whichever comes first. Epoch ms. */
export function suggestLapseAt(a) {
  const byStart = toDate(a.suggested.start).getTime() - POLICY.MIN_LEAD_H * HOUR_MS;
  const bySent = toDate(a.suggested.at ?? a.requestedAt).getTime() + POLICY.SUGGEST_EXPIRY_H * HOUR_MS;
  return Math.min(byStart, bySent);
}
export function advanceClock(minutes) {
  state.clock.now += minutes * MIN_MS;
  return { now: state.clock.now, expired: tick() };
}
/** ms left of the reply window (0 when passed). */
export const msLeft = (appt) => Math.max(0, toDate(appt.expiresAt).getTime() - state.clock.now);

/* ---------- lookups ---------- */
export const getAppt = (id) => state.appts.find((a) => a.id === id);
function must(id) {
  const a = getAppt(id);
  if (!a) throw new Error(`Unknown appointment id "${id}"`);
  return a;
}
export const tailorById = (id) => state.tailors.find((t) => t.id === id);
const firstName = (t) => (t?.name || 'The tailor').split(' ')[0];

/** Newest first. */
export function apptsFor(persona = state.persona) {
  const mine = persona === 'tailor'
    ? state.appts.filter((a) => a.tailorId === state.tailors[0].id)
    : state.appts.filter((a) => a.customerId === state.customer.id);
  return mine.slice().reverse();
}
const isFinalExpiry = (a) => a.status === 'expired' && a.retries >= POLICY.MAX_RETRIES;
/** Newest non-terminal appointment of the customer's (an expired-for-good request is not active). */
export function activeAppt() {
  return apptsFor('customer').find((a) => !TERMINAL.includes(a.status) && !isFinalExpiry(a)) ?? null;
}

export function threadFor(tailorId) {
  return state.threads[tailorId] ?? { tailorId, customerId: state.customer.id, messages: [], read: { customer: 0, tailor: 0 } };
}
function ensureThread(tailorId) {
  if (!state.threads[tailorId]) state.threads[tailorId] = { tailorId, customerId: state.customer.id, messages: [], read: { customer: 0, tailor: 0 } };
  return state.threads[tailorId];
}
/** A message's sequence number: `m12` → 12 (the unit of `thread.read`). */
const msgNum = (m) => Number(String(m?.id ?? '').slice(1)) || 0;
/** The thread's appointment (D-129): the pair's newest one that is not terminal and not finally expired; else the newest that was not
    withdrawn / switched; else null (a question asked before any booking). */
export function threadAppt(tailorId) {
  const mine = state.appts.filter((a) => a.tailorId === tailorId).reverse();
  return mine.find((a) => !TERMINAL.includes(a.status) && !isFinalExpiry(a))
    ?? mine.find((a) => !(a.status === 'cancelled' && ['withdrawn', 'switched'].includes(a.cancel?.reason)))
    ?? null;
}
/** Messages after `read[reader]` written by the other person; system lines never count (D-128). */
export function unreadCount(tailorId, reader) {
  const th = state.threads[tailorId];
  if (!th) return 0;
  const other = reader === 'tailor' ? 'customer' : 'tailor';
  const seen = th.read?.[reader] ?? 0;
  return th.messages.filter((m) => m.from === other && msgNum(m) > seen).length;
}
/** One line for a Messages row, from the reader's point of view. */
export function threadPreview(msg, reader = 'customer') {
  if (!msg) return '';
  if (msg.from === 'system') return reader === 'tailor' ? (msg.tailorText ?? msg.text) : msg.text;
  const text = String(msg.text ?? '').replace(/\[(phone|email) hidden\]/g, '($1 hidden)').trim();
  const n = msg.photos || 0;
  const photo = n > 1 ? `${n} photos` : n === 1 ? 'Photo' : '';
  const body = photo && text ? `${photo} · ${text}` : photo || text;
  return msg.from === reader ? `You: ${body}` : body;
}
/** Threads with at least one message for that reader, newest activity first (ties by sequence). */
export function threadsFor(reader = 'customer') {
  const mineId = state.tailors[0].id;
  return Object.values(state.threads)
    .filter((th) => th.messages.length && (reader === 'customer' || th.tailorId === mineId))
    .map((thread) => ({
      tailorId: thread.tailorId, thread, last: thread.messages[thread.messages.length - 1],
      unread: unreadCount(thread.tailorId, reader), appt: threadAppt(thread.tailorId), readOnly: threadReadOnly(thread.tailorId),
    }))
    .sort((a, b) => (a.last.at < b.last.at ? 1 : a.last.at > b.last.at ? -1 : msgNum(b.last) - msgNum(a.last)));
}
/** Read-only after a decline, until the customer books this tailor again. */
export function threadReadOnly(tailorId) {
  const latest = state.appts.filter((a) => a.tailorId === tailorId).pop();
  return !!latest && latest.status === 'declined';
}
function post(tailorId, from, text, extra = {}) {
  const msg = { id: `m${++msgSeq}`, from, text, photos: 0, at: nowIso(), masked: false, ...extra };
  ensureThread(tailorId).messages.push(msg);
  return msg;
}
/** A system line is written from the READER's point of view (R3-2-T-05): `text` is what Sarah reads, `tailorText` what Amara reads
    (same string when the line is neutral). Thread screens print `m.tailorText ?? m.text` on the tailor side (D-98). */
const say = (appt, text, tailorText = text) => post(appt.tailorId, 'system', text, { tailorText });
function setStatus(appt, status) {
  appt.status = status;
  appt.history.push({ status, at: nowIso() });
}

/* ---------- contact masking ---------- */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
export function maskContact(text) {
  const src = String(text ?? '');
  const out = src.replace(EMAIL_RE, '[email hidden]').replace(PHONE_RE, '[phone hidden]');
  return { text: out, masked: out !== src };
}

/* ---------- the job draft ---------- */
export function setJob(patch) { Object.assign(state.job, patch); return { ok: true, job: state.job }; }
/** A fresh draft for a different job: no garments yet, same place, empty declined / hidden lists. */
export function newJob() {
  const home = state.customer.address;                          // null when Sarah removed every saved address (D-133)
  state.job = { garments: [], visitType: 'home', zip: home?.zip ?? state.job.zip, address: home ? { ...home } : null, needBy: state.job.needBy, declinedBy: [], hiddenTailors: [] };
  return { ok: true, job: state.job };
}
export function addGarment(type) {
  if (state.job.garments.length >= MAX_ITEMS) return fail('max-items');
  if (!GARMENT_TYPES[type]) return fail('unknown-type');
  garmentSeq = Math.max(garmentSeq, ...state.job.garments.map((g) => Number(String(g.id).slice(1)) || 0)) + 1;
  const garment = { id: `g${garmentSeq}`, type, services: [], photos: 0 };
  state.job.garments.push(garment);
  return { ok: true, garment, job: state.job };
}
export function removeGarment(id) {
  const i = state.job.garments.findIndex((g) => g.id === id);
  if (i < 0) return fail('unknown-garment');
  state.job.garments.splice(i, 1);
  return { ok: true, job: state.job };
}
export function setServices(garmentId, ids) {
  const g = state.job.garments.find((x) => x.id === garmentId);
  if (!g) return fail('unknown-garment');
  if (ids.some((id) => !SERVICES[id]?.garments.includes(g.type))) return fail('service-not-for-type');
  g.services = [...ids];
  return { ok: true, garment: g, job: state.job };
}
/** step: 'what' | 'where' | omitted (both). → { ok, errors: { field: code } } */
export function validateJob(job = state.job, step = null) {
  const errors = {};
  if (step !== 'where') {
    if (!job.garments?.length) errors.garments = 'no-garments';
    for (const g of job.garments ?? []) if (!g.services?.length) errors[`service:${g.id}`] = `no-service:${g.id}`;
  }
  if (step !== 'what') {
    if (!/^\d{5}$/.test(String(job.zip ?? ''))) errors.zip = 'zip-invalid';
    if (job.visitType === 'home' && !String(job.address?.street ?? '').trim()) errors.address = 'address-required';
    const tomorrow = isoDay(addDays(strip(new Date(state.clock.now)), 1));
    if (!job.needBy) errors.needBy = 'needby-required';
    else if (job.needBy < tomorrow) errors.needBy = 'needby-past';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/* ---------- tailor sections (M2 fills in the screens) ---------- */
export const bookable = (tailor) => !!tailor && SECTIONS.every((s) => tailor.onboarding?.[s]);
const hasWindow = (avail) => Object.values(avail ?? {}).some((w) => (w ?? []).length > 0);
const blank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const isWhole = (n) => Number.isInteger(n);
const zip5 = (z) => /^\d{5}$/.test(String(z ?? ''));
const overlaps = (a, b) => (a ?? []).some(([o1, c1]) => (b ?? []).some(([o2, c2]) => o1 < c2 && o2 < c1));   // touching is fine
const SECTION_RULES = {
  profile: (d) => {
    const e = {};
    if (!String(d.name ?? '').trim()) e.name = 'name-required';
    const bio = String(d.bio ?? '').trim();
    if (!bio) e.bio = 'bio-required';
    else if (bio.length > TAILOR_LIMITS.BIO_MAX) e.bio = 'bio-long';
    /* K-19: the list-card line is required and short; the profile photo is required (no going live without either) */
    const line = String(d.cardLine ?? '').trim();
    if (!line) e.cardLine = 'cardline-required';
    else if ([...line].length > TAILOR_LIMITS.CARD_LINE_MAX) e.cardLine = 'cardline-long';
    if (!d.photo) e.photo = 'photo-required';
    return e;
  },
  services: (d) => {
    const e = {};
    const entries = Object.entries(d.prices ?? {});
    if (!entries.length) { e.prices = 'no-services'; return e; }
    for (const [id, raw] of entries) {
      const n = blank(raw) ? NaN : Number(raw);
      if (!(n > 0)) e[`price-${id}`] = 'price-missing';
      else if (!isWhole(n) || n > TAILOR_LIMITS.PRICE_MAX) e[`price-${id}`] = 'price-invalid';
    }
    return e;
  },
  where: (d) => {
    const e = {};
    if (!d.shop?.enabled && !d.home?.enabled) e.where = 'where-required';
    if (d.shop?.enabled) {
      if (!String(d.shop.street ?? '').trim()) e.street = 'street-required';
      if (!zip5(d.shop.zip)) e.shopZip = 'zip-invalid';
    }
    if (d.home?.enabled) {
      const zips = d.home.zips ?? [];
      if (!zips.length) e.zips = 'zips-required';
      else if (!zips.every(zip5)) e.zips = 'zip-invalid';
      const fee = d.home.fee;
      if (blank(fee) || Number.isNaN(Number(fee))) e.fee = 'fee-missing';
      else if (!isWhole(Number(fee)) || Number(fee) < 0 || Number(fee) > TAILOR_LIMITS.FEE_MAX) e.fee = 'fee-invalid';
    }
    return e;
  },
  returns: (d) => {
    const e = {};
    const r = d.returns ?? {};
    if (!Object.values(r).some(Boolean)) e.returns = 'return-required';
    if (r.pickup && d.shop && !d.shop.enabled) e.pickup = 'pickup-needs-shop';
    return e;
  },
  availability: (d) => {
    const e = {};
    const av = d.availability ?? {};
    for (const type of ['shop', 'home']) {
      if (!d[type]?.enabled) continue;
      if (!hasWindow(av[type])) e[type] = 'hours-required';
      for (const [day, wins] of Object.entries(av[type] ?? {})) {
        if ((wins ?? []).some(([o, c]) => minutesOf(o) >= minutesOf(c))) e[`${type}-${day}`] = 'hours-range';
      }
    }
    if (d.shop?.enabled && d.home?.enabled) {
      for (const day of Object.keys(av.shop ?? {})) if (overlaps(av.shop[day], av.home?.[day])) e[`overlap-${day}`] = 'hours-overlap';
    }
    return e;
  },
  payouts: (d) => {
    const e = {};
    const p = d.payouts ?? {};
    if (!String(p.holder ?? '').trim()) e.holder = 'holder-required';
    if (!/^\d{9}$/.test(String(p.routing ?? ''))) e.routing = 'routing-invalid';
    if (!/^\d{4}$/.test(String(p.last4 ?? ''))) e.last4 = 'account-invalid';
    if (!String(p.bank ?? '').trim()) e.bank = 'bank-required';
    return e;
  },
};
/** `data` is tailor-shaped (the fields of that section; the whole tailor works too). */
export function validateSection(section, data = state.tailors[0]) {
  const rule = SECTION_RULES[section];
  if (!rule) return { ok: false, errors: { section: 'unknown-section' } };
  const errors = rule(data ?? {});
  return { ok: Object.keys(errors).length === 0, errors, soft: SECTION_SOFT[section]?.(data ?? {}) ?? {} };
}
/** Soft notes (D-162): never block a save. The profile's bio, card line and shop name hide a phone number or email (`maskContact`) when saved. */
const SECTION_SOFT = {
  profile: (d) => {
    const soft = {};
    if (maskContact(d.bio).masked) soft.bio = 'contact-hidden';
    if (maskContact(d.cardLine).masked) soft.cardLine = 'contact-hidden';
    if (maskContact(d.shopName).masked) soft.shopName = 'contact-hidden';
    return soft;
  },
};
const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v);
function deepMerge(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete target[k];
    else if (isPlain(v) && isPlain(target[k])) deepMerge(target[k], v);
    else target[k] = clone(v);
  }
  return target;
}
const REPLACED = ['prices', 'availability'];   // a patch replaces these (so an unticked service / closed day disappears)
/** Merge `patch` into the (only) tailor and re-derive that section's onboarding flag; `live` turns true the first time
    the tailor is bookable and never back (D-56). */
export function setTailorSection(section, patch) {
  if (!SECTIONS.includes(section)) return fail('unknown-section');
  const t = state.tailors[0];
  const rest = { ...patch };
  for (const k of REPLACED) {
    if (!(k in rest)) continue;
    t[k] = Object.fromEntries(Object.entries(rest[k] ?? {}).filter(([, v]) => v !== undefined).map(([id, v]) => [id, clone(v)]));
    delete rest[k];
  }
  deepMerge(t, rest);
  let soft = {};
  if (section === 'profile') {
    soft = validateSection(section, t).soft;                    // D-162: what she typed, before the mask
    if ('bio' in soft) t.bio = maskContact(t.bio).text;
    if ('cardLine' in soft) t.cardLine = maskContact(t.cardLine).text;
    if ('shopName' in soft) t.shopName = maskContact(t.shopName).text;
  }
  const v = validateSection(section, t);
  t.onboarding[section] = v.ok;
  if (bookable(t)) t.live = true;
  return { ok: true, tailor: t, valid: v.ok, errors: v.errors, soft, bookable: bookable(t), live: !!t.live };
}
/** D-161: the shop's "Taking requests" switch. Off, eligible() answers nothing-open for new requests; booked jobs are untouched. */
export function setTakingRequests(on) {
  const t = state.tailors[0];
  t.takingRequests = !!on;
  return { ok: true, tailor: t, takingRequests: t.takingRequests };
}
/** Payouts: the full account number is validated here and never stored — only its last 4 (D-63). Blank account keeps
    the stored last4 (edit mode) only while the routing number is unchanged — a new bank needs its account number. */
export function setPayouts({ holder = '', routing = '', account = '' } = {}) {
  const t = state.tailors[0];
  const h = String(holder).trim();
  const r = String(routing).trim();
  const a = String(account).replace(/\s/g, '');
  const errors = {};
  if (!h) errors.holder = 'holder-required';
  if (!/^\d{9}$/.test(r)) errors.routing = 'routing-invalid';
  const keep = !!t.payouts?.last4 && r === String(t.payouts?.routing ?? '');
  if (a ? !/^\d{4,17}$/.test(a) : !keep) errors.account = 'account-invalid';
  if (Object.keys(errors).length) return { ok: false, errors };
  const res = setTailorSection('payouts', { payouts: { holder: h, routing: r, bank: ROUTING_BANKS[r] ?? 'Your bank', last4: a ? a.slice(-4) : t.payouts.last4 } });
  /* D-136: new bank details re-queue every payout the bank sent back, for the next Friday */
  let requeued = 0;
  let requeuedCents = 0;
  for (const p of state.payouts) {
    if (p.state !== 'failed') continue;
    p.state = 'pending'; p.date = payoutDay(nowIso()); p.retried = true;
    delete p.failedAt; delete p.bank; delete p.last4;
    requeued += 1; requeuedCents += p.cents;
  }
  return { ok: true, tailor: res.tailor, bookable: res.bookable, live: res.live, requeued, requeuedCents };
}
/** Rush editor draft `{ on, fees: { 1, 2, 3 } }` → `{ ok } | { ok: false, errors: { d1: code, … } }` (D-64). */
export function validateRush({ on = false, fees = {} } = {}) {
  if (!on) return { ok: true, errors: {} };
  const errors = {};
  for (const d of RUSH_TIERS) {
    const raw = fees[d];
    const n = blank(raw) ? NaN : Number(raw);
    if (Number.isNaN(n)) errors[`d${d}`] = 'fee-missing';
    else if (!isWhole(n) || n < 0 || n > TAILOR_LIMITS.RUSH_MAX) errors[`d${d}`] = 'fee-invalid';
    else if (d > 1 && !errors[`d${d - 1}`] && !blank(fees[d - 1]) && n > Number(fees[d - 1])) errors[`d${d}`] = 'fee-order';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
export function setRush(draft = {}) {
  const v = validateRush(draft);
  if (!v.ok) return { ok: false, errors: v.errors };
  const t = state.tailors[0];
  t.rush = draft.on ? RUSH_TIERS.map((days) => ({ days, fee: Number(draft.fees[days]) })).filter((r) => r.fee > 0) : [];
  return { ok: true, tailor: t };
}
/** The first onboarding section not yet valid, or null. */
export const nextSection = (tailor = state.tailors[0]) => SECTIONS.find((s) => !tailor?.onboarding?.[s]) ?? null;
/** Onboarding flows start from a blank profile with the same id (D-20). */
export function blankTailor() { state.tailors[0] = clone(BLANK_TAILOR); return state.tailors[0]; }

/* ---------- slots ---------- */
function busyIntervals(tailorId, exclude) {
  const out = [];
  for (const a of state.appts) {
    if (a.tailorId !== tailorId || a.id === exclude) continue;
    let start = null;
    if (a.status === 'requested' || a.status === 'confirmed') start = a.slot.start;
    else if (a.status === 'suggested') start = a.suggested.start;
    if (!start) continue;
    const from = toDate(start).getTime();
    out.push([from, from + VISIT_MINUTES[a.job.visitType] * MIN_MS]);
  }
  return out;
}
/** Open visit starts (ISO strings) for one tailor: the tailor's own weekly hours, 9 AM–9 PM, on :00 / :30,
    at least MIN_LEAD_H ahead, on a day before `until` (the need-by, D-18), clear of that tailor's other bookings. */
export function openSlots(tailorId, visitType, { until = null, exclude = null } = {}) {
  const t = tailorById(tailorId);
  if (!t || !t[visitType]?.enabled) return [];
  const windows = t.availability?.[visitType] ?? {};
  const dur = VISIT_MINUTES[visitType];
  const earliest = state.clock.now + POLICY.MIN_LEAD_H * HOUR_MS;
  const today = strip(new Date(state.clock.now));
  const horizon = addDays(today, SLOT_HORIZON_DAYS);
  const busy = busyIntervals(tailorId, exclude);
  const slots = [];
  for (let d = today; d < horizon; d = addDays(d, 1)) {
    if (until && dayDiff(d, until) < 1) break;
    for (const [open, close] of windows[weekdayKey(d)] ?? []) {
      const from = Math.max(minutesOf(open), DAY_START_MIN);
      const to = Math.min(minutesOf(close), DAY_END_MIN);
      for (let m = Math.ceil(from / SLOT_STEP_MIN) * SLOT_STEP_MIN; m + dur <= to; m += SLOT_STEP_MIN) {
        const start = new Date(d); start.setHours(Math.floor(m / 60), m % 60, 0, 0);   // wall-clock, so a DST changeover day keeps its hours
        const s = start.getTime();
        if (s < earliest) continue;
        if (busy.some(([a, b]) => s < b && a < s + dur * MIN_MS)) continue;
        slots.push(isoMinute(start));
      }
    }
  }
  return slots;
}
export const nextOpening = (tailorId, visitType, opts) => openSlots(tailorId, visitType, opts)[0] ?? null;
const slotEnd = (startIso, visitType) => isoMinute(addMinutes(startIso, VISIT_MINUTES[visitType]));

/* ---------- eligibility + the list ---------- */
const areaReason = (tailor, job) => {
  if (!bookable(tailor)) return job.visitType === 'shop' ? 'shop-off' : 'zip';   // D-27
  if (job.visitType === 'home') return tailor.home?.enabled && tailor.home.zips.includes(job.zip) ? null : 'zip';
  if (!tailor.shop?.enabled) return 'shop-off';
  return (ZIP_INFO[job.zip]?.miles ?? Infinity) <= SHOP_RADIUS_MI ? null : 'zip';   // D-19
};
/** → { ok, reason: 'zip' | 'shop-off' | 'hidden' | 'declined' | 'nothing-open' } */
export function eligible(tailor, job = state.job) {
  const area = areaReason(tailor, job);
  if (area) return { ok: false, reason: area };
  if ((job.hiddenTailors ?? []).includes(tailor.id)) return { ok: false, reason: 'hidden' };
  if ((job.declinedBy ?? []).includes(tailor.id)) return { ok: false, reason: 'declined' };
  if (tailor.takingRequests === false) return { ok: false, reason: 'nothing-open' };   // D-161: paused from her shop; jobs already booked are untouched
  if (!nextOpening(tailor.id, job.visitType, { until: job.needBy })) return { ok: false, reason: 'nothing-open' };
  return { ok: true, reason: null };
}
/** Quote for a draft job with the tailor's next opening deciding the rush tier. */
export function estimateNext(tailor, job = state.job) {
  return estimate(tailor, job, nextOpening(tailor.id, job.visitType, { until: job.needBy }));
}
/** → { rows: [{ tailor, quote, distanceMi, nextOpening, declined }], empty: null | 'zip' | 'shop' | 'nothing-open' | 'none-left' }
    precedence: area filter → hidden → open slots. A declined tailor stays as a row (D-08). */
export function tailorsFor(job = state.job) {
  const inArea = [];
  let area = null;
  for (const t of state.tailors) {
    const r = areaReason(t, job);
    if (r) area = area ?? r; else inArea.push(t);
  }
  if (!inArea.length) return { rows: [], empty: area === 'shop-off' ? 'shop' : 'zip' };
  const shown = inArea.filter((t) => !(job.hiddenTailors ?? []).includes(t.id));
  if (!shown.length) return { rows: [], empty: 'none-left' };
  const rows = [];
  for (const t of shown) {
    if (t.takingRequests === false) continue;                    // D-161
    const next = nextOpening(t.id, job.visitType, { until: job.needBy });
    if (!next) continue;
    rows.push({
      tailor: t, quote: estimate(t, job, next), distanceMi: ZIP_INFO[job.zip]?.miles ?? null,
      nextOpening: next, declined: (job.declinedBy ?? []).includes(t.id),
    });
  }
  return { rows, empty: rows.length ? null : 'nothing-open' };
}

/* ---------- the booking machine ---------- */
const jobCopy = (job) => ({ garments: clone(job.garments), visitType: job.visitType, zip: job.zip, address: job.address ? clone(job.address) : null, needBy: job.needBy });
/** Put an appointment's job back as the draft, keeping the declined / hidden lists. */
function restoreDraft(appt) {
  state.job = { ...clone(appt.job), declinedBy: state.job.declinedBy ?? [], hiddenTailors: state.job.hiddenTailors ?? [] };
}
/** Passive endings (expiry, a lapsed or withdrawn suggestion, a customer cancel) bring the job back only when the draft is still the
    empty one left by sending the request, so they never overwrite a new job she has started since (D-158). */
function restoreDraftIfEmpty(appt) {
  if (!(state.job.garments ?? []).length) restoreDraft(appt);
}
function addPayout(appt, centsAmount, kind) {
  state.payouts.push({ apptId: appt.id, cents: centsAmount, state: 'pending', date: payoutDay(nowIso()), kind, createdAt: nowIso() });   // the following Friday (D-24)
}
/** The weekly Friday run (D-136): every pending payout due by today is paid — or, with `sim.payout = 'failed'`, sent back — with the bank
    snapshotted. Never called by tick() / advanceClock(); fixtures call it. */
export function settlePayouts() {
  const today = isoDay(nowIso());
  const bank = state.tailors[0].payouts ?? {};
  const paid = [];
  const failed = [];
  for (const p of state.payouts) {
    if (p.state !== 'pending' || p.date > today) continue;
    p.bank = bank.bank ?? '';
    p.last4 = bank.last4 ?? '';
    if (state.sim.payout === 'failed') { p.state = 'failed'; p.failedAt = nowIso(); failed.push(p); }
    else { p.state = 'paid'; p.paidAt = nowIso(); paid.push(p); }
  }
  return { ok: true, paid, failed };
}
const expiryIso = () => isoMinute(new Date(state.clock.now + POLICY.REQUEST_EXPIRY_H * HOUR_MS));

export function requestBooking({ tailorId, slotStart, cardId = null, threeDS = false } = {}) {
  const job = state.job;
  const v = validateJob(job);
  if (!v.ok) return fail('job-invalid', { errors: v.errors });
  if (state.sim.server === 'error') { state.sim.server = 'ok'; return fail('server-error'); }   // one-shot (D-140): nothing authorized
  const tailor = tailorById(tailorId);
  if (!tailor) return fail('unknown-tailor');
  const el = eligible(tailor, job);
  if (!el.ok) return fail(el.reason);
  if (!openSlots(tailorId, job.visitType, { until: job.needBy }).includes(slotStart)) return fail('slot-unavailable');
  const lines = linesFor(tailor, job.garments);
  if (lines.missing.length) return fail('service-not-offered', { missing: lines.missing });
  if (state.sim.card === 'declined') return fail('card-declined');
  if (state.sim.card === '3ds' && !threeDS) return fail('needs-3ds');

  const homeFee = job.visitType === 'home' ? cents(tailor.home.fee) : 0;
  const rush = rushFor(tailor, slotStart, job.needBy);
  const money = quote({ lines, homeFee, rush: rush.cents });
  money.rushDays = rush.days;
  const appt = {
    id: `A-${++apptSeq}`, customerId: state.customer.id, tailorId,
    job: jobCopy(job), lines,
    slot: { start: slotStart, end: slotEnd(slotStart, job.visitType) },
    status: 'requested', requestedAt: nowIso(), expiresAt: expiryIso(), retries: 0,
    suggested: null, declineReason: '', cardId,
    money,
    payments: { deposit: { cents: money.deposit, state: 'authorized' }, balance: { cents: money.balance, state: 'pending' } },
    priceChange: null, returnOption: null, courier: null, cancel: null, review: null,
    docs: {}, docSeq: 0,                                        // K-02 (D-175): the tailor's working fitting documentation
    history: [{ status: 'requested', at: nowIso() }],
  };
  state.appts.push(appt);
  const { zip, address, visitType, declinedBy, hiddenTailors } = job;
  newJob();                                                   // D-158: the draft is spent; a decline, expiry or cancel brings it back (restoreDraft)
  Object.assign(state.job, { zip, address, visitType, declinedBy, hiddenTailors });   // the job's own who-said-no lists travel with it
  say(appt, 'You sent a request', `${state.customer.first} sent a request`);
  return succeed(appt);
}

export function withdrawRequest(id) {
  const a = must(id);
  if (a.status !== 'requested' && a.status !== 'suggested') return fail('not-pending');
  setStatus(a, 'cancelled');
  a.cancel = { by: 'customer', reason: 'withdrawn', at: nowIso(), refund: 0, kept: 0, tailorPaid: 0 };
  a.payments.deposit.state = 'released';
  restoreDraft(a);
  say(a, 'You withdrew the request', `${state.customer.first} withdrew the request`);
  return succeed(a);
}

export function tailorAccept(id) {
  const a = must(id);
  if (a.status === 'expired' || (a.status === 'requested' && toDate(a.expiresAt).getTime() <= state.clock.now)) return fail('expired');
  if (a.status !== 'requested') return fail('not-requested');
  setStatus(a, 'confirmed');
  a.payments.deposit.state = 'captured';
  say(a, `${firstName(tailorById(a.tailorId))} accepted`, 'You accepted');
  return succeed(a);
}

export function tailorSuggest(id, slotStart) {
  const a = must(id);
  if (a.status !== 'requested') return fail('not-requested');
  if (toDate(a.expiresAt).getTime() <= state.clock.now) return fail('expired');
  if (!openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).includes(slotStart)) return fail('slot-unavailable');
  const rushNew = rushFor(tailorById(a.tailorId), slotStart, a.job.needBy).cents;
  a.suggested = { start: slotStart, at: nowIso(), rush: Math.min(a.money.rush, rushNew) };   // D-155: the price never goes up
  setStatus(a, 'suggested');
  say(a, `${firstName(tailorById(a.tailorId))} suggested ${fmtWhen(slotStart)}`, `You suggested ${fmtWhen(slotStart)}`);
  return succeed(a);
}

export function acceptSuggestion(id) {
  const a = must(id);
  if (a.status !== 'suggested') return fail('not-suggested');
  if (state.clock.now >= suggestLapseAt(a)) return fail('slot-passed');   // D-154
  a.slot = { start: a.suggested.start, end: slotEnd(a.suggested.start, a.job.visitType) };
  repriceForSlot(a, a.slot.start);                            // D-155
  setStatus(a, 'confirmed');
  a.confirmedVia = 'suggestion';                              // R3-1-C-08: the customer accepted the tailor's new time
  a.payments.deposit.state = 'captured';
  say(a, `Booked ${fmtWhen(a.slot.start)}`);
  return succeed(a);
}

/** A suggested time that lapsed or that Amara withdrew (D-154): the request ends as a final expiry, the deposit hold is released and the
    time is open again (a non-`suggested` status holds no slot). */
function endSuggestion(a, text, tailorText, ended = 'lapsed') {
  setStatus(a, 'expired');
  a.suggested = { ...a.suggested, ended };                    // 'lapsed' | 'withdrawn' — c-request words the two differently
  a.retries = POLICY.MAX_RETRIES;
  a.payments.deposit.state = 'released';
  if (!state.job.hiddenTailors.includes(a.tailorId)) state.job.hiddenTailors.push(a.tailorId);   // D-07
  restoreDraftIfEmpty(a);
  say(a, text, tailorText);
}
export function withdrawSuggestion(id) {
  const a = must(id);
  if (a.status !== 'suggested') return fail('not-suggested');
  endSuggestion(a, `${firstName(tailorById(a.tailorId))} withdrew the suggested time`, 'You withdrew your suggested time', 'withdrawn');
  return succeed(a);
}

export function findAnotherTailor(id) {
  const a = must(id);
  if (!(a.status === 'declined' || a.status === 'suggested' || isFinalExpiry(a))) return fail('not-allowed');
  if (a.status === 'suggested') {
    setStatus(a, 'cancelled');
    a.cancel = { by: 'customer', reason: 'switched', at: nowIso(), refund: 0, kept: 0, tailorPaid: 0 };
    a.payments.deposit.state = 'released';
    say(a, 'You’re looking for another tailor', `${state.customer.first} is looking for another tailor`);
  }
  restoreDraft(a);
  return succeed(a);
}

export function tailorDecline(id, reason = '') {
  const a = must(id);
  if (a.status !== 'requested') return fail('not-requested');
  setStatus(a, 'declined');
  a.declineReason = reason;
  a.payments.deposit.state = 'released';
  if (!state.job.declinedBy.includes(a.tailorId)) state.job.declinedBy.push(a.tailorId);
  restoreDraft(a);
  say(a, `${firstName(tailorById(a.tailorId))} declined`, 'You declined');
  return succeed(a);
}

export function expireRequest(id) {
  const a = must(id);
  if (a.status !== 'requested') return fail('not-requested');
  setStatus(a, 'expired');
  a.payments.deposit.state = 'released';
  restoreDraftIfEmpty(a);
  if (a.retries >= POLICY.MAX_RETRIES && !state.job.hiddenTailors.includes(a.tailorId)) state.job.hiddenTailors.push(a.tailorId);   // D-07
  say(a, 'Request expired. Your hold was released.', 'Request expired');
  return succeed(a);
}

export function tryAgain(id) {
  const a = must(id);
  if (a.status !== 'expired') return fail('not-expired');
  if (a.retries >= POLICY.MAX_RETRIES) return fail('no-retries');
  if (toDate(a.slot.start).getTime() <= state.clock.now) return fail('slot-passed');
  if (!openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).includes(a.slot.start)) return fail('slot-unavailable');   // someone else may have taken it since
  if (state.sim.card === 'declined') return fail('card-declined');
  a.retries += 1;
  a.sentAt = nowIso();                                        // R3-1-C-02: the resend time; requestedAt stays the first send
  a.expiresAt = expiryIso();
  a.payments.deposit.state = 'authorized';                    // D-15
  setStatus(a, 'requested');
  say(a, 'You sent the request again', `${state.customer.first} sent the request again`);
  return succeed(a);
}

export function cancelBooking(id) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  const terms = cancelTerms(a, state.clock.now);
  setStatus(a, 'cancelled');
  if (terms.window === 'early') {
    a.payments.deposit.state = 'refunded';
    a.cancel = { by: 'customer', reason: 'customer-early', at: nowIso(), refund: terms.refund, kept: 0, tailorPaid: 0 };
  } else {
    a.payments.deposit.state = 'kept';
    a.cancel = { by: 'customer', reason: 'customer-late', at: nowIso(), refund: 0, kept: terms.kept, tailorPaid: terms.kept };   // D-05
    addPayout(a, terms.kept, 'kept-deposit');
  }
  restoreDraftIfEmpty(a);
  say(a, 'You cancelled the booking', `${state.customer.first} cancelled the booking`);
  return succeed(a, { terms });
}

export function rescheduleBooking(id, slotStart) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  if (cancelTerms(a, state.clock.now).window !== 'early') return fail('too-late');   // D-12
  if (!openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).includes(slotStart)) return fail('slot-unavailable');
  const from = a.slot.start;
  a.slot = { start: slotStart, end: slotEnd(slotStart, a.job.visitType) };
  repriceForSlot(a, slotStart);                                                      // D-155: rush = min(booked, new slot); the deposit stays
  a.history.push({ status: 'rescheduled', at: nowIso(), from });                     // R3-1-T-10: t-job says what it moved from
  say(a, `You moved the visit to ${fmtWhen(slotStart)}`, `${state.customer.first} moved the visit to ${fmtWhen(slotStart)}`);
  return succeed(a);
}

export function tailorCantMakeIt(id, reason = '') {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  setStatus(a, 'cancelled');
  a.payments.deposit.state = 'refunded';
  a.cancel = { by: 'tailor', reason: 'tailor-cant-make-it', note: reason, at: nowIso(), refund: a.payments.deposit.cents, kept: 0, tailorPaid: 0 };
  restoreDraft(a);
  say(a, `${firstName(tailorById(a.tailorId))} can’t make it`, 'You can’t make it');
  return succeed(a);
}

export function markNoShow(id) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  if (state.clock.now < toDate(a.slot.start).getTime() + POLICY.NO_SHOW_WAIT_MIN * MIN_MS) return fail('too-early');
  const pay = noShowPayout(a.payments.deposit.cents);                                // D-06
  setStatus(a, 'cancelled');
  a.payments.deposit.state = 'kept';
  a.cancel = { by: 'tailor', reason: 'no-show', at: nowIso(), refund: 0, kept: a.payments.deposit.cents, tailorPaid: pay };
  addPayout(a, pay, 'no-show');
  say(a, `${firstName(tailorById(a.tailorId))} marked the visit as a no-show`, `You marked ${state.customer.first} as a no-show`);
  return succeed(a);
}

export function startFitting(id) {
  const a = must(id);
  if (a.status !== 'confirmed') return fail('not-confirmed');
  if (state.clock.now < toDate(a.slot.start).getTime()) return fail('too-early');
  setStatus(a, 'fitting');
  return succeed(a);
}

/* ---------- fitting documentation (K-02, D-175…D-183) ---------- */
const emptyDoc = () => ({ before: [], pinned: [], comment: '', commentMasked: false });
/** The revise window: at the fitting, or while the sent order is pending / messaged. After approval the record is locked (D-175). */
export const docsEditable = (a) => a.status === 'fitting' || (a.status === 'price-change' && ['pending', 'messaged'].includes(a.priceChange?.state));
/** A booked garment (job or lines) or a draft new item `n<k>` (K-01, D-121). */
export function docGarment(a, garmentId) {
  if (a.job?.garments?.some((g) => g.id === garmentId) || a.lines?.some((l) => l.garmentId === garmentId)) return true;
  return /^n[1-9]\d*$/.test(String(garmentId));
}
const docEntry = (a, garmentId) => (a.docs[garmentId] ??= emptyDoc());
/** The working entry (or the sent snapshot entry with `sent: true`), or an empty one. Never undefined. */
export function docsOf(appt, garmentId, { sent = false } = {}) {
  const src = sent ? appt.priceChange?.docs : appt.docs;
  return src?.[garmentId] ?? emptyDoc();
}
/** What a reader sees: the customer only ever sees the sent snapshot; the tailor sees the working docs at the fitting. */
export function docsFor(appt, reader) {
  if (reader === 'tailor' && appt.status === 'fitting') return appt.docs ?? {};
  return appt.priceChange?.docs ?? {};
}
/** The garments in `garmentIds` (in that order) that lack a Before or a Pinned photo, from the working docs. */
export function docsMissing(appt, garmentIds) {
  const out = [];
  for (const garmentId of garmentIds) {
    const d = docsOf(appt, garmentId);
    const before = d.before.length < 1;
    const pinned = d.pinned.length < 1;
    if (before || pinned) out.push({ garmentId, before, pinned });
  }
  return out;
}
/** Working vs sent, for these ids: photo ids per kind and the comment text. */
export function docsDiffer(appt, garmentIds) {
  const ids = (list) => list.map((p) => p.id).join(',');
  return garmentIds.some((gid) => {
    const w = docsOf(appt, gid);
    const s = docsOf(appt, gid, { sent: true });
    return ids(w.before) !== ids(s.before) || ids(w.pinned) !== ids(s.pinned) || w.comment !== s.comment;
  });
}
/** One more than the highest `n<k>` anywhere, so a new item never inherits a discarded item's photos (D-182). */
export function nextItemId(appt) {
  const found = [
    ...Object.keys(appt.docs ?? {}), ...(appt.lines ?? []).map((l) => l.garmentId),
    ...(appt.priceChange?.lines ?? []).map((l) => l.garmentId), ...(appt.job?.garments ?? []).map((g) => g.id),
    ...Object.keys(appt.priceChange?.docs ?? {}),
  ];
  const top = found.reduce((n, id) => { const m = /^n([1-9]\d*)$/.exec(String(id)); return m ? Math.max(n, Number(m[1])) : n; }, 0);
  return `n${top + 1}`;
}
export function addFittingPhoto(id, garmentId, kind) {
  const a = must(id);
  if (!docsEditable(a)) return fail('not-editable');
  if (!docGarment(a, garmentId)) return fail('unknown-garment');
  if (!DOC_KINDS.includes(kind)) return fail('photo-kind');
  if (docsOf(a, garmentId)[kind].length >= FITTING_LIMITS.PHOTOS_MAX) return fail('too-many-photos');
  a.docSeq += 1;
  const photo = { id: `p${a.docSeq}`, kind, at: nowIso(), tone: (a.docSeq - 1) % 4 };
  docEntry(a, garmentId)[kind].push(photo);
  return succeed(a, { photo });
}
export function removeFittingPhoto(id, garmentId, photoId) {
  const a = must(id);
  if (!docsEditable(a)) return fail('not-editable');
  const d = a.docs[garmentId];
  const kind = d && DOC_KINDS.find((k) => d[k].some((p) => p.id === photoId));
  if (!kind) return fail('not-found');
  const index = d[kind].findIndex((p) => p.id === photoId);
  const [photo] = d[kind].splice(index, 1);
  return succeed(a, { photo, index });
}
export function restoreFittingPhoto(id, garmentId, photo, index) {
  const a = must(id);
  if (!docsEditable(a)) return fail('not-editable');
  if (!docGarment(a, garmentId)) return fail('unknown-garment');
  const d = docEntry(a, garmentId);
  if (DOC_KINDS.some((k) => d[k].some((p) => p.id === photo?.id))) return fail('duplicate');
  if (!DOC_KINDS.includes(photo?.kind)) return fail('photo-kind');
  if (d[photo.kind].length >= FITTING_LIMITS.PHOTOS_MAX) return fail('too-many-photos');
  const at = Math.max(0, Math.min(Number.isInteger(index) ? index : d[photo.kind].length, d[photo.kind].length));
  d[photo.kind].splice(at, 0, clone(photo));
  return succeed(a);
}
export function setFittingComment(id, garmentId, text) {
  const a = must(id);
  if (!docsEditable(a)) return fail('not-editable');
  if (!docGarment(a, garmentId)) return fail('unknown-garment');
  const t = String(text ?? '').trim();
  if ([...t].length > FITTING_LIMITS.COMMENT_MAX) return fail('comment-long');
  const m = maskContact(t);
  const d = docEntry(a, garmentId);
  d.comment = m.text;
  d.commentMasked = m.masked;
  return succeed(a, { masked: m.masked });
}

const lineKey = (l) => `${l.garmentId}:${l.serviceId}`;
function priceMarks(oldLines, newLines) {
  const before = new Map(oldLines.map((l) => [lineKey(l), l]));
  const after = new Map(newLines.map((l) => [lineKey(l), l]));
  const marks = [];
  for (const [k, l] of after) {
    const old = before.get(k);
    if (!old) marks.push({ garmentId: l.garmentId, serviceId: l.serviceId, kind: 'added', from: null, to: l.cents });
    else if (old.cents !== l.cents) marks.push({ garmentId: l.garmentId, serviceId: l.serviceId, kind: 'repriced', from: old.cents, to: l.cents });
  }
  for (const [k, l] of before) if (!after.has(k)) marks.push({ garmentId: l.garmentId, serviceId: l.serviceId, kind: 'removed', from: l.cents, to: null });
  return marks;
}
/** "Send the final order" (K-01, D-120/D-121). First send: `fitting` → `price-change`. Revise (D-101): while the order is still `pending`
    or `messaged`, sending again replaces it (status unchanged, `state` back to `pending`, `revisions` + 1). `lines` is the whole final
    order; a new item is lines on a `garmentId` that is not booked, removing an item = sending none of its lines. An unchanged order is
    allowed (`changed: false`). Marks are always vs the BOOKED lines. The note is masked (D-101). */
export function sendPriceChange(id, lines, { note = '' } = {}) {
  const a = must(id);
  const revising = a.status === 'price-change' && ['pending', 'messaged'].includes(a.priceChange?.state);
  if (a.status !== 'fitting' && !revising) return fail('not-fitting');
  if (!Array.isArray(lines) || !lines.length) return fail('no-items');
  const lo = cents(1);
  const hi = cents(TAILOR_LIMITS.PRICE_MAX);
  if (lines.some((l) => !Number.isInteger(l.cents) || l.cents % 100 !== 0 || l.cents < lo || l.cents > hi)) return fail('price-invalid');
  const bookedType = new Map(a.lines.map((l) => [l.garmentId, l.garmentType]));
  for (const l of lines) {
    if (!GARMENT_TYPES[l.garmentType] || (bookedType.has(l.garmentId) && bookedType.get(l.garmentId) !== l.garmentType)) return fail('garment-type');
    if (!servicesForType(l.garmentType).includes(l.serviceId)) return fail('service-type');
  }
  const tailor = tailorById(a.tailorId);
  const booked = new Set(a.lines.map(lineKey));
  if (lines.some((l) => !booked.has(lineKey(l)) && typeof tailor?.prices?.[l.serviceId] !== 'number')) return fail('service-not-offered');
  if (new Set(lines.map(lineKey)).size !== lines.length) return fail('duplicate-line');
  if (new Set(lines.map((l) => l.garmentId)).size > MAX_ITEMS) return fail('max-items');
  const sentIds = [...new Set(lines.map((l) => l.garmentId))];
  const gaps = docsMissing(a, sentIds);
  if (gaps.length) return fail('photos-missing', { missing: gaps });                    // K-02 (D-178)
  const text = String(note ?? '').trim();
  if (text.length > TAILOR_LIMITS.NOTE_MAX) return fail('note-long');
  const masked = maskContact(text);
  const revisions = revising ? (a.priceChange.revisions ?? 0) + 1 : 0;
  const marks = priceMarks(a.lines, lines);
  a.priceChange = {
    lines: clone(lines), marks, changed: marks.length > 0, sentAt: nowIso(), state: 'pending',
    note: masked.text, noteMasked: masked.masked, revisions,
    docs: Object.fromEntries(sentIds.map((gid) => [gid, clone(docsOf(a, gid))])),          // K-02 (D-175): the snapshot Sarah sees
  };
  const first = firstName(tailor);
  if (revising) {
    say(a, `${first} updated your final order`, 'You updated the final order');
  } else {
    setStatus(a, 'price-change');
    say(a, `${first} sent your final order`, 'You sent the final order');
  }
  return succeed(a);
}
/** Allowed while pending, and after the customer messaged (disputes settle in chat, then she approves) — D-26. Rebuilds `job.garments`
    from the approved lines (D-121). */
export function approvePriceChange(id) {
  const a = must(id);
  if (a.status !== 'price-change' || a.priceChange?.state === 'approved') return fail('not-pending');
  a.lines = clone(a.priceChange.lines);
  a.money = repriceMoney(a);
  a.payments.balance.cents = a.money.balance;
  a.priceChange.state = 'approved';
  const byGarment = new Map();
  for (const l of a.lines) {
    if (!byGarment.has(l.garmentId)) byGarment.set(l.garmentId, { type: l.garmentType, services: [] });
    byGarment.get(l.garmentId).services.push(l.serviceId);
  }
  const garments = [];
  for (const g of a.job.garments) {
    const hit = byGarment.get(g.id);
    if (hit) { garments.push({ ...g, services: hit.services }); byGarment.delete(g.id); }
  }
  for (const [gid, hit] of byGarment) garments.push({ id: gid, type: hit.type, services: hit.services, photos: 0, added: true });
  a.job.garments = garments;
  setStatus(a, 'in-progress');
  say(a, 'You approved the order', `${state.customer.first} approved the order`);
  return succeed(a);
}
export function messageAboutPriceChange(id) {
  const a = must(id);
  if (a.status !== 'price-change' || a.priceChange?.state !== 'pending') return fail('not-pending');
  a.priceChange.state = 'messaged';
  return succeed(a);
}
/** Quote from the booked appointment's own lines; the captured deposit never changes (D-23). */
function repriceMoney(a, rush = a.money.rush) {
  const q = quote({
    lines: a.lines, homeFee: a.money.homeFee, rush,
    courier: a.courier?.state === 'ready' ? a.courier.cents : 0, deposit: a.payments.deposit.cents,
  });
  q.rushDays = a.money.rushDays;
  return q;
}

/** A visit moved to `slotStart` (accepted suggestion, reschedule): rush = min(what was booked, the rush for the new slot), so the price never
    goes up and never charges rush for non-rush work (D-155). The captured deposit excludes rush, so it does not move. */
function repriceForSlot(a, slotStart) {
  const r = rushFor(tailorById(a.tailorId), slotStart, a.job.needBy);
  const q = repriceMoney(a, Math.min(a.money.rush, r.cents));
  q.rushDays = r.days;
  a.money = q;
  a.payments.balance.cents = q.balance;
}

/** What the tailor offers for getting the order back: `returns` (a subset of her Shop returns), default every one that is on (D-99). */
export function markReady(id, { returns } = {}) {
  const a = must(id);
  if (a.status !== 'in-progress') return fail('not-in-progress');
  const tailor = tailorById(a.tailorId);
  const on = Object.keys(RETURN_LABEL).filter((k) => tailor.returns?.[k] === true);
  const offer = returns === undefined ? on : Object.keys(RETURN_LABEL).filter((k) => Array.isArray(returns) && returns.includes(k));
  if (!offer.length) return fail('return-required');
  if (offer.some((k) => !on.includes(k)) || (Array.isArray(returns) && returns.some((k) => !RETURN_LABEL[k]))) return fail('not-offered');
  a.returnOffer = offer;
  setStatus(a, 'ready');
  a.payments.balance = { cents: a.money.balance, state: 'due' };
  if (a.money.refund > 0) a.payments.refund = { cents: a.money.refund, state: 'pending' };   // D-23, D-156: settled by holdBalance
  say(a, 'Ready. Choose how to get it back.', `You marked it ready. Waiting for ${state.customer.first} to choose how to get it back.`);
  return succeed(a);
}

/** Where a drop-off or courier delivers (D-106: Sarah's saved address, also for shop visits), as ONE line on both sides:
    street + unit ("145 N 7th St, 2R"). The visit block alone adds the city (R4-2-C-06). */
export function returnAddress() {
  const ad = state.customer.address ?? {};
  return [ad.street, ad.unit].filter(Boolean).join(', ');
}

/** D-160 (moved here from tailor-data.js, K16-2-02 / D-245): the courier's pickup window (the tailor's strip and the customer's route block): the next half hour an hour after Sarah paid the balance, 30 minutes long.
    `{ from, to }` as ISO minutes; null when no courier is booked. */
export function courierWindow(appt) {
  if (appt.returnOption !== 'courier' || !appt.courier) return null;
  const paidAt = [...appt.history].reverse().find((h) => h.status === 'awaiting-handoff')?.at ?? appt.history[appt.history.length - 1]?.at;
  if (!paidAt) return null;
  const t = toDate(paidAt);
  const m = t.getHours() * 60 + t.getMinutes() + 60;
  const start = new Date(t); start.setHours(0, 0, 0, 0); start.setMinutes(Math.ceil(m / 30) * 30);
  return { from: isoMinute(start), to: isoMinute(addMinutes(isoMinute(start), 30)) };
}

/** The ways back on a ready order, RETURN_LABEL order. */
export function returnOffer(appt) {
  if (!appt) return [];
  if (appt.returnOffer) return appt.returnOffer.slice();
  const tailor = tailorById(appt.tailorId);
  return Object.keys(RETURN_LABEL).filter((k) => tailor?.returns?.[k] === true);
}

export function chooseReturn(id, option) {
  const a = must(id);
  if (a.status !== 'ready') return fail('not-ready');
  if (!RETURN_LABEL[option] || !returnOffer(a).includes(option) || !tailorById(a.tailorId).returns?.[option]) return fail('not-offered');
  a.returnOption = option;
  if (option === 'courier') {
    const quoted = courierQuote(ZIP_INFO[a.job.zip]?.miles ?? 0);
    const s = state.sim.courier;
    const ready = s !== 'fail' && s !== 'loading';
    a.courier = {
      miles: quoted.miles, quote: ready ? quoted.quote : 0, markup: ready ? quoted.markup : 0, cents: ready ? quoted.cents : 0,
      state: s === 'fail' ? 'failed' : s === 'loading' ? 'loading' : 'ready',
    };
  } else {
    a.courier = null;
  }
  a.money = repriceMoney(a);
  a.payments.balance.cents = a.money.balance;
  if (a.money.refund > 0) a.payments.refund = { cents: a.money.refund, state: 'pending' };   // D-156: re-priced with the courier
  else delete a.payments.refund;
  return succeed(a);
}

export function holdBalance(id, cardId = null, { threeDS = false } = {}) {
  const a = must(id);
  if (a.status !== 'ready') return fail('not-ready');
  if (!a.returnOption) return fail('return-required');
  if (a.returnOption === 'courier' && a.courier?.state !== 'ready') return fail('courier-unavailable');
  const charge = a.money.balance > 0;                                                         // M6-M-03: a $0 balance only settles the refund, nothing to decline
  if (charge && state.sim.card === 'declined') { a.payments.balance.state = 'failed'; a.payments.balance.failedCardId = cardId; return fail('card-declined'); }
  if (charge && state.sim.card === '3ds' && !threeDS) return fail('needs-3ds');
  a.payments.balance = { cents: a.money.balance, state: 'paid' };
  if (a.payments.refund?.cents > 0) a.payments.refund.state = 'refunded';                   // D-156
  a.balanceCardId = cardId;
  setStatus(a, 'awaiting-handoff');
  say(a, 'You paid the balance', `${state.customer.first} paid the balance`);
  return succeed(a);
}

export function markCompleted(id) {
  const a = must(id);
  if (a.status !== 'awaiting-handoff') return fail('not-awaiting-handoff');
  setStatus(a, 'completed');
  addPayout(a, a.money.payout, 'job');                               // pending until the weekly run (D-24)
  say(a, 'Completed');
  return succeed(a);
}

export function leaveReview(id, { stars, text = '', photos = 0 } = {}) {
  const a = must(id);
  if (a.status !== 'completed') return fail('not-completed');
  if (a.review) return fail('already-reviewed');
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return fail('stars-required');
  const count = Array.isArray(photos) ? photos.length : photos;
  if (count > REVIEW_LIMITS.PHOTOS_MAX) return fail('too-many-photos');
  const raw = String(text ?? '').trim();
  if (raw.length > REVIEW_LIMITS.TEXT_MAX) return fail('text-long');
  text = maskContact(raw).text;                                      // D-107: contact details never reach a public review
  const tailor = tailorById(a.tailorId);
  a.review = { stars, text, photos: count, date: isoDay(new Date(state.clock.now)) };
  const total = tailor.rating.avg * tailor.rating.count + stars;
  tailor.rating = { avg: Math.round((total / (tailor.rating.count + 1)) * 10) / 10, count: tailor.rating.count + 1 };
  tailor.reviews.unshift({
    id: `r-${a.id}`, name: `${state.customer.first} ${state.customer.last[0]}.`, initials: state.customer.initials,
    stars, date: a.review.date, photos: count, text,
  });
  return succeed(a);
}

export function sendMessage(tailorId, from, { text = '', photos = 0 } = {}) {
  if (!tailorById(tailorId)) return fail('unknown-tailor');
  if (threadReadOnly(tailorId)) return fail('read-only');
  const count = Array.isArray(photos) ? photos.length : photos;
  if (!String(text).trim() && !count) return fail('empty');
  if (count > CHAT_LIMITS.PHOTOS_MAX) return fail('too-many-photos');
  if (state.sim.network === 'offline') return fail('offline');
  if (state.sim.send === 'fail') { state.sim.send = 'ok'; return fail('send-failed'); }   // one-shot: a dropped connection (D-130)
  const m = maskContact(text);
  const message = post(tailorId, from, m.text, { photos: count, masked: m.masked });
  ensureThread(tailorId).read[from] = msgNum(message);          // your own message is never unread (D-128)
  /* R4-2-C-02: a pending price change becomes "messaged" only when Sarah actually writes, never on opening the chat */
  if (from === 'customer') {
    for (const a of state.appts) {
      if (a.tailorId === tailorId && a.status === 'price-change' && a.priceChange?.state === 'pending') messageAboutPriceChange(a.id);
    }
  }
  return { ok: true, masked: m.masked, message };
}

/** Mark everything in the thread as seen by `reader` ('customer' | 'tailor'). No-op without a thread. */
export function markThreadRead(tailorId, reader) {
  const th = state.threads[tailorId];
  if (!th || !th.messages.length) return { ok: true };
  th.read[reader] = msgNum(th.messages[th.messages.length - 1]);
  return { ok: true };
}

/** The latest chat message (customer or tailor, never a system line) from `sentAt` on, in thread order, or null (D-112).
    Whose move a messaged price change is follows this: Sarah spoke last → Amara replies; Amara spoke last → Sarah approves. */
export function lastSpeakerSince(appt, sentAt = appt?.priceChange?.sentAt ?? null) {
  if (!appt) return null;
  const msgs = threadFor(appt.tailorId).messages.filter((m) => (m.from === 'customer' || m.from === 'tailor') && (!sentAt || m.at >= sentAt));
  return msgs[msgs.length - 1] ?? null;
}

/** D-73: a confirmed booking is "just confirmed" for POLICY.JUST_BOOKED_MIN minutes after the LAST accept
    (tailorAccept and acceptSuggestion both write `confirmed`). */
export function justConfirmed(appt) {
  if (!appt || appt.status !== 'confirmed') return false;
  const last = appt.history.filter((h) => h.status === 'confirmed').pop();
  if (!last) return false;
  return state.clock.now - toDate(last.at).getTime() < POLICY.JUST_BOOKED_MIN * 60000;
}

/* ---------- status → screen (table in SCREENS.md) ---------- */
export function statusScreen(appt, persona = state.persona) {
  if (!appt) return null;
  const s = appt.status;
  if (persona === 'tailor') return ['requested', 'suggested', 'declined', 'expired'].includes(s) ? 't-request' : 't-job';
  if (['requested', 'suggested', 'declined', 'expired'].includes(s)) return 'c-request';
  if (s === 'price-change') return 'c-price-change';
  if (s === 'ready' && appt.payments.balance.state !== 'paid') return 'c-ready';
  if (s === 'completed' && !appt.review) return 'c-complete';
  return 'c-booking';
}

/* ---------- the price change, as rows (A4) ---------- */
/** `priceChangeView(appt, lines = appt.priceChange?.lines ?? appt.lines)` — the booked lines vs `lines`, per garment, in booked order
    (added rows last in their garment), plus both quotes. `before` is the booked money; `after` keeps the captured deposit (D-23). */
export function priceChangeView(appt, lines = appt?.priceChange?.lines ?? appt?.lines ?? []) {
  const booked = appt.lines ?? [];
  const m = appt.money;
  const after = quote({ lines, homeFee: m.homeFee, rush: m.rush, deposit: appt.payments.deposit.cents });
  after.rushDays = m.rushDays;
  const next = new Map(lines.map((l) => [lineKey(l), l]));
  const prev = new Map(booked.map((l) => [lineKey(l), l]));
  const garments = [];
  const bucket = (garmentId, type) => {
    let g = garments.find((x) => x.id === garmentId);
    if (!g) { g = { id: garmentId, type: type ?? appt.job?.garments?.find((x) => x.id === garmentId)?.type ?? '', rows: [] }; garments.push(g); }
    return g;
  };
  const labelOf = (l) => SERVICES[l.serviceId]?.label ?? l.label;
  for (const l of booked) {
    const n = next.get(lineKey(l));
    const kind = !n ? 'removed' : n.cents !== l.cents ? 'repriced' : 'same';
    bucket(l.garmentId, l.garmentType).rows.push({ key: lineKey(l), label: labelOf(l), kind, from: l.cents, to: n ? n.cents : null });
  }
  for (const l of lines) {
    if (prev.has(lineKey(l))) continue;
    bucket(l.garmentId, l.garmentType).rows.push({ key: lineKey(l), label: labelOf(l), kind: 'added', from: null, to: l.cents });
  }
  const bookedIds = new Set(booked.map((l) => l.garmentId));
  const present = new Set(lines.map((l) => l.garmentId));
  for (const g of garments) {
    g.kind = !bookedIds.has(g.id) ? 'added' : !present.has(g.id) ? 'removed' : g.rows.some((r) => r.kind !== 'same') ? 'changed' : 'same';
  }
  const counts = { itemsAdded: 0, itemsRemoved: 0, servicesAdded: 0, servicesRemoved: 0, repriced: 0 };
  for (const g of garments) {
    if (g.kind === 'added') counts.itemsAdded += 1;
    else if (g.kind === 'removed') counts.itemsRemoved += 1;
    for (const r of g.rows) {
      if (r.kind === 'repriced') counts.repriced += 1;
      if (g.kind === 'added' || g.kind === 'removed') continue;
      if (r.kind === 'added') counts.servicesAdded += 1;
      else if (r.kind === 'removed') counts.servicesRemoved += 1;
    }
  }
  const pc = appt.priceChange;
  return {
    garments, before: m, after, delta: after.total - m.total,
    changed: garments.some((g) => g.rows.some((r) => r.kind !== 'same')), counts,
    note: pc?.note ?? '', noteMasked: !!pc?.noteMasked, sentAt: pc?.sentAt ?? null, state: pc?.state ?? null, revisions: pc?.revisions ?? 0,
  };
}

/** Every transition and clock move, in one object, so screens and flow setups call `T.tailorAccept(id)`. */
export const T = {
  setJob, newJob, addGarment, removeGarment, setServices, validateJob,
  requestBooking, withdrawRequest, tailorAccept, tailorSuggest, acceptSuggestion, withdrawSuggestion, findAnotherTailor,
  tailorDecline, expireRequest, tryAgain, cancelBooking, rescheduleBooking, tailorCantMakeIt, markNoShow,
  startFitting, addFittingPhoto, removeFittingPhoto, restoreFittingPhoto, setFittingComment, sendPriceChange, approvePriceChange, messageAboutPriceChange, markReady,
  chooseReturn, holdBalance, markCompleted, leaveReview, sendMessage, markThreadRead, settlePayouts, maskContact,
  setTailorSection, setTakingRequests, validateSection, blankTailor, setPayouts, setRush, validateRush, nextSection,
  now, setClock, advanceClock, tick, suggestLapseAt,
};
