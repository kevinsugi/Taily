/* ============================================================
   Taily v5 — the customer sign-in model (D-33). DOM-free.
   Simulated: any 6 digits verify except 000000 (the demo's wrong
   code); Sarah's number is an existing account, any other number
   is a new one (→ the name step). Mutates only
   state.session.customer and state.customer (+ state.sim.card for
   the decline recovery of D-40). Every fn returns
   { ok, … } | { ok: false, error } (field forms: errors { field: code }).
   ============================================================ */
import { state, now, nowIso, blankTailor, nextSection, TERMINAL } from './state.js';
import { POLICY } from './money-config.js';
import { SHOP_CITY } from './data.js';

const WRONG_CODE = '000000';

const session = (who = 'customer') => state.session[who];
const fail = (error) => ({ ok: false, error });

/** The 10 national digits of whatever was typed (strips +1, spaces, punctuation). */
export function phoneDigits(raw) {
  const all = String(raw ?? '').replace(/\D/g, '');
  const intl = /^\s*\+/.test(String(raw ?? '')) || all.length > 10;
  return (intl && all.startsWith('1') ? all.slice(1) : all).slice(0, 10);
}

/** (718) 555-0142 — partial input formats progressively: (7 · (718 · (718) 55 · (718) 555-01. */
export function formatPhone(raw) {
  const d = phoneDigits(raw);
  if (!d) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** 10 digits, area code not starting 0 or 1. */
export function validatePhone(raw) {
  const d = phoneDigits(raw);
  return d.length === 10 && !/^[01]/.test(d) ? { ok: true } : fail('phone-invalid');
}

export function signOut(who = 'customer') {
  state.session[who] = { signedIn: false, pending: null };
  return { ok: true };
}

/** Text a code: remembers the number, when it was sent and whether the account is new. */
export function sendCode(raw, who = 'customer') {
  const v = validatePhone(raw);
  if (!v.ok) return v;
  const known = who === 'tailor' ? state.tailors[0].phone : state.customer.phone;   // D-55: the seed number is the existing account
  const isNew = phoneDigits(raw) !== phoneDigits(known);
  session(who).pending = { phone: formatPhone(raw), sentAt: now(), isNew };
  return { ok: true, phone: session(who).pending.phone, isNew };
}

/** { phone, isNew, msToResend, expired } for the code in flight; null without one. */
export function codeStatus(who = 'customer') {
  const p = session(who).pending;
  if (!p) return null;
  return {
    phone: p.phone,
    isNew: p.isNew,
    msToResend: Math.max(0, p.sentAt + POLICY.CODE_RESEND_S * 1000 - now()),
    expired: now() >= p.sentAt + POLICY.CODE_TTL_MIN * 60000,
  };
}

export function resendCode(who = 'customer') {
  const st = codeStatus(who);
  if (!st) return fail('no-code');
  if (st.msToResend > 0) return fail('too-soon');
  session(who).pending.sentAt = now();
  return { ok: true };
}

/** 'no-code' · 'code-format' · 'code-expired' · 'code-wrong' (000000) · else ok.
    Existing account → signed in; new account → { isNew: true }, signed in after saveName. */
export function verifyCode(code, who = 'customer') {
  const st = codeStatus(who);
  if (!st) return fail('no-code');
  const digits = String(code ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(digits)) return fail('code-format');
  if (st.expired) return fail('code-expired');
  if (digits === WRONG_CODE) return fail('code-wrong');
  if (who === 'tailor') {                      // D-55: a new tailor has no name step — the Profile step asks
    if (!st.isNew) {
      state.session.tailor = { signedIn: true, pending: null };
      return { ok: true, isNew: false, next: nextSection() };
    }
    const phone = st.phone;
    blankTailor();                              // D-20
    state.tailors[0].phone = phone;
    state.session.tailor = { signedIn: true, pending: null };
    return { ok: true, isNew: true, next: 'profile' };
  }
  if (!st.isNew) {
    state.session.customer = { signedIn: true, pending: null };
    return { ok: true, isNew: false };
  }
  return { ok: true, isNew: true };
}

/** New account: names the one seed customer record (D-33), keeps its address and card. D-02 (pre-MVP A1): booking texts are their own
    opt-in (`texts`, an unticked box on c-name) — off unless she ticks it; sign-in codes always go. */
export function saveName({ first = '', last = '', texts = false } = {}) {
  const f = String(first).trim();
  const l = String(last).trim();
  const errors = {};
  if (!f) errors.first = 'first-required';
  if (!l) errors.last = 'last-required';
  if (Object.keys(errors).length) return { ok: false, errors };
  Object.assign(state.customer, {
    first: f, last: l, initials: `${f[0]}${l[0]}`.toUpperCase(),
    phone: session().pending?.phone ?? state.customer.phone,
  });
  state.session.customer = { signedIn: true, pending: null };
  state.texts.customer = { on: !!texts, stoppedAt: null, changedAt: nowIso() };
  return { ok: true, customer: state.customer };
}

/** 'apple' | 'google' sign in as the seed customer. */
export function signInWith(provider) {
  if (provider !== 'apple' && provider !== 'google') return fail('provider');
  state.session.customer = { signedIn: true, pending: null };
  return { ok: true, provider };
}

/* A simulated decline sticks to the declined method; another method or a new card clears it (D-40). */
function clearDecline() {
  if (state.sim.card === 'declined') state.sim.card = 'ok';
}

const BRAND = { 4: 'Visa', 5: 'Mastercard', 3: 'Amex' };

/** Per-field errors: number card-number · exp card-exp · cvc card-cvc · zip card-zip. */
export function addCard({ number = '', exp = '', cvc = '', zip = '' } = {}) {
  const digits = String(number).replace(/\D/g, '');
  const errors = {};
  if (digits.length < 15 || digits.length > 16) errors.number = 'card-number';
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(exp).trim());
  const when = new Date(now());
  const nowYM = (when.getFullYear() % 100) * 12 + when.getMonth() + 1;
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12 || Number(m[2]) * 12 + Number(m[1]) < nowYM) errors.exp = 'card-exp';
  if (!/^\d{3,4}$/.test(String(cvc).trim())) errors.cvc = 'card-cvc';
  if (!/^\d{5}$/.test(String(zip).trim())) errors.zip = 'card-zip';
  if (Object.keys(errors).length) return { ok: false, errors };
  const last4 = digits.slice(-4);
  const id = `card-${last4}`;
  let card = state.customer.cards.find((c) => c.id === id);
  if (!card) {
    card = { id, brand: BRAND[digits[0]] ?? 'Card', last4, exp: `${m[1]}/${m[2]}`, default: false };
    state.customer.cards.push(card);
  }
  clearDecline();
  return { ok: true, card };
}

/** The customer picked a method other than the declined one. */
export function useOtherMethod() {
  clearDecline();
  return { ok: true };
}

/* ---------- re-auth (M5, D-138) ---------- */
/** Verify a code on an expired session; ok also marks the session valid. */
export function reauth(code, who = 'customer') {
  const r = verifyCode(code, who);
  if (r.ok) state.sim.session = 'valid';
  return r;
}
/** Test hook only: the session has expired. */
export function expireSession() {
  state.sim.session = 'expired';
  return { ok: true };
}

/* ---------- saved addresses (M5, D-133) ---------- */
const FIELDS = ['street', 'unit', 'city', 'state', 'zip'];
/** `customer.address` always equals the default saved address's fields, or null when none is saved. */
function syncAddress() {
  const d = state.customer.addresses.find((a) => a.default);
  state.customer.address = d ? Object.fromEntries(FIELDS.map((k) => [k, d[k] ?? ''])) : null;
}
const addrNum = (a) => Number(String(a.id).replace(/^addr-/, '')) || 0;

/** `{ label, street, unit, zip, makeDefault }` → `{ ok, address } | { ok: false, errors: { street, zip, label } }`. City and state from SHOP_CITY. */
export function addAddress({ label = '', street = '', unit = '', zip = '', makeDefault = false } = {}) {
  const errors = {};
  if (!String(label).trim()) errors.label = 'label-required';
  if (!String(street).trim()) errors.street = 'street-required';
  if (!/^\d{5}$/.test(String(zip).trim())) errors.zip = 'zip-invalid';
  if (Object.keys(errors).length) return { ok: false, errors };
  const list = state.customer.addresses;
  const address = {
    id: `addr-${Math.max(0, ...list.map(addrNum)) + 1}`, label: String(label).trim(), street: String(street).trim(), unit: String(unit).trim(),
    city: SHOP_CITY.city, state: SHOP_CITY.state, zip: String(zip).trim(), default: false,
  };
  if (makeDefault || !list.some((a) => a.default)) { for (const a of list) a.default = false; address.default = true; }
  list.push(address);
  syncAddress();
  return { ok: true, address };
}

/** → `{ ok, removed, index, newDefault }` (`newDefault` = the promoted address id, or null). Removing the last one leaves `customer.address === null`. */
export function removeAddress(id) {
  const list = state.customer.addresses;
  const index = list.findIndex((a) => a.id === id);
  if (index < 0) return fail('unknown-address');
  const [removed] = list.splice(index, 1);
  let newDefault = null;
  if (removed.default && list.length) { list[0].default = true; newDefault = list[0].id; }
  syncAddress();
  return { ok: true, removed, index, newDefault };
}

/** Undo: puts the address back where it was, default flag included. */
export function restoreAddress(removed, index = 0) {
  if (!removed) return fail('unknown-address');
  const list = state.customer.addresses;
  if (removed.default) for (const a of list) a.default = false;
  list.splice(Math.min(index, list.length), 0, { ...removed });
  syncAddress();
  return { ok: true, address: removed };
}

export function setDefaultAddress(id) {
  const list = state.customer.addresses;
  if (!list.some((a) => a.id === id)) return fail('unknown-address');
  for (const a of list) a.default = a.id === id;
  syncAddress();
  return { ok: true };
}

/* ---------- saved cards (M5, D-134) ---------- */
const isFinalExpiry = (a) => a.status === 'expired' && a.retries >= POLICY.MAX_RETRIES;
const holdsCard = (a, id) => a.cardId === id && !TERMINAL.includes(a.status) && !isFinalExpiry(a);
/** The newest open appointment paying with this card, or null. */
export function cardInUse(id) {
  return state.appts.filter((a) => holdsCard(a, id)).pop() ?? null;
}

export function setDefaultCard(id) {
  const cards = state.customer.cards;
  if (!cards.some((c) => c.id === id)) return fail('unknown-card');
  for (const c of cards) c.default = c.id === id;
  return { ok: true };
}

/** → `{ ok, removed, movedTo, appts }` | `unknown-card` | `in-use` (the only card of an open booking). Open bookings move to the new default. */
export function removeCard(id) {
  const cards = state.customer.cards;
  const index = cards.findIndex((c) => c.id === id);
  if (index < 0) return fail('unknown-card');
  const open = state.appts.filter((a) => holdsCard(a, id));
  if (open.length && cards.length === 1) return fail('in-use');
  const [removed] = cards.splice(index, 1);
  if (removed.default && cards.length) cards[0].default = true;
  let movedTo = null;
  if (open.length) {
    movedTo = (cards.find((c) => c.default) ?? cards[0]).id;
    for (const a of open) a.cardId = movedTo;
  }
  return { ok: true, removed, movedTo, appts: open.map((a) => a.id) };
}
