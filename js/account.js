/* ============================================================
   Taily v5 — the customer sign-in model (D-33). DOM-free.
   K-52 (D-420 / D-421): + Log in (`sendLoginCode`, never a silent sign-up) and the admin's own sign-in (email → a code by email →
   a second factor; state.session.admin).
   Simulated: any 6 digits verify except 000000 (the demo's wrong
   code); Sarah's number is an existing account, any other number
   is a new one (→ the name step). Mutates only
   state.session.customer and state.customer (+ state.sim.card for
   the decline recovery of D-40). Every fn returns
   { ok, … } | { ok: false, error } (field forms: errors { field: code }).
   ============================================================ */
import { state, now, nowIso, blankTailor, nextSection, TERMINAL, deleteBlocker, newJob } from './state.js';
import { POLICY } from './money-config.js';
import { SHOP_CITY, placeForZip, BLANK_CUSTOMER, BOOKING_LIMITS, ADMIN_ACCOUNT, NEED_BY_DEFAULT_D } from './data.js';
import { isoDay, addDays } from './dates.js';
import { LEGAL_VERSION } from './policies.js';

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
  /* S-24 (pre-MVP B2): Send code is the button that creates the account — the terms she agreed to and when ride with the code */
  session(who).pending = { phone: formatPhone(raw), sentAt: now(), isNew, agreed: { version: LEGAL_VERSION, at: nowIso() } };
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
    const agreed = session(who).pending?.agreed ?? null;
    blankTailor();                              // D-20
    state.tailors[0].phone = phone;
    state.tailors[0].agreed = agreed;           // S-24 (pre-MVP B2): the Tailor Terms version + when, logged at sign-up
    state.session.tailor = { signedIn: true, pending: null };
    return { ok: true, isNew: true, next: 'profile' };
  }
  if (!st.isNew) {
    state.session.customer = { signedIn: true, pending: null };
    return { ok: true, isNew: false };
  }
  return { ok: true, isNew: true };
}

/** New account: names the one seed customer record (D-33). K-54 P1 (D-460): a NEW number starts empty — no sample draft, saved address
    or card (the record kept the seed's until K-54); Home opens on an empty order, Where and when asks for her address, Review and send for a
    card. D-02 (pre-MVP A1): booking texts are their own opt-in (`texts`, an unticked box on c-name) — off unless she ticks it; sign-in codes
    always go. */
export function saveName({ first = '', last = '', texts = false } = {}) {
  const f = String(first).trim();
  const l = String(last).trim();
  const errors = {};
  if (!f) errors.first = 'first-required';
  if (!l) errors.last = 'last-required';
  if (Object.keys(errors).length) return { ok: false, errors };
  if (session().pending?.isNew) {
    Object.assign(state.customer, { addresses: [], address: null, cards: [], applePay: false });
    newJob();
    Object.assign(state.job, { zip: '', needBy: isoDay(addDays(new Date(now()), NEED_BY_DEFAULT_D)) });
  }
  Object.assign(state.customer, {
    first: f, last: l, initials: `${f[0]}${l[0]}`.toUpperCase(),
    phone: session().pending?.phone ?? state.customer.phone,
    agreed: session().pending?.agreed ?? null,   // S-24 (pre-MVP B2): the Terms + Privacy version and when, logged at sign-up
  });
  state.session.customer = { signedIn: true, pending: null };
  state.texts.customer = { on: !!texts, stoppedAt: null, changedAt: nowIso() };
  return { ok: true, customer: state.customer };
}

/** D-07 / B-09 (pre-MVP B2, D-372): 'apple' | 'google' is only the first half of signing in — every account needs a mobile number checked
    by code before anything else (texts, sign-in codes and the re-auth sheet all go there). The provider hands over the name on the account
    (PROTOTYPE: the seed name), kept on the session for c-name; nobody is signed in until c-code (a known number) or c-name (a new one). */
export function signInWith(provider) {
  if (provider !== 'apple' && provider !== 'google') return fail('provider');
  state.session.customer = { signedIn: false, pending: null, social: { provider, first: state.customer.first || 'Sarah', last: state.customer.last || 'Chen' } };
  return { ok: true, provider, needsPhone: true };
}
/** The Apple / Google sign-in still waiting for its phone step, or null. */
export const socialPending = () => state.session.customer?.social ?? null;
/** K-53 Q9 (D-423): Continue with Apple / Google show only while POLICY.SOCIAL_SIGN_IN is on (off for the pilot: phone only). The code stays;
    `state.sim.social = 'on'` shows them in a Test flow (c-welcome--social) without changing the policy. */
export const socialSignIn = () => !!POLICY.SOCIAL_SIGN_IN || state.sim.social === 'on';

/* ---------- K-52 (D-420): Log in — a returning person's number, the same code step, never a silent sign-up ---------- */
/** Is there an account on this number? (customer: Sarah's seed number; tailor: the shop's phone, D-55). A deleted account has none. */
export function hasAccount(raw, who = 'customer') {
  const known = who === 'tailor' ? state.tailors[0]?.phone : state.customer?.phone;
  return !!known && phoneDigits(raw) === phoneDigits(known);
}
/** The Log in path's Send code: a code only to a number that has an account. → `{ ok, phone }` | `phone-invalid` | `no-account`
    (the screen offers "Create one", which is the sign-up path's Send code). */
export function sendLoginCode(raw, who = 'customer') {
  const v = validatePhone(raw);
  if (!v.ok) return v;
  if (!hasAccount(raw, who)) return fail('no-account');
  session(who).pending = { phone: formatPhone(raw), sentAt: now(), isNew: false, login: true };
  return { ok: true, phone: session(who).pending.phone };
}

/* ---------- K-52 (D-421): the admin's own sign-in — email, a code by email, then a second factor (simulated) ----------
   Its own entry (`?admin`, a-login), never linked from the customer or tailor app. Any 6 digits verify except 000000 (the demo's wrong
   code) at both steps. state.session.admin = { signedIn, email, at, test?, pending: { email, sentAt, step: 'code' | 'second' } }. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const admin = () => (state.session.admin ??= { signedIn: false, pending: null });
/** Signed in as the admin (a-* screens need it, D-421). */
export const adminSignedIn = () => !!state.session.admin?.signedIn;
/** Step 1: the admin's email → a code by email. Errors: email-invalid · not-admin (only the Taily admin account signs in here). */
export function adminSendCode(raw) {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return fail('email-invalid');
  if (email !== ADMIN_ACCOUNT.email) return fail('not-admin');
  state.session.admin = { signedIn: false, pending: { email, sentAt: now(), step: 'code' } };
  return { ok: true, email };
}
/** `{ email, step, msToResend, expired }` for the sign-in in flight; null without one. */
export function adminStatus() {
  const p = admin().pending;
  if (!p) return null;
  return { email: p.email, step: p.step, msToResend: Math.max(0, p.sentAt + POLICY.CODE_RESEND_S * 1000 - now()), expired: p.step === 'code' && now() >= p.sentAt + POLICY.CODE_TTL_MIN * 60000 };
}
export function adminResendCode() {
  const st = adminStatus();
  if (!st || st.step !== 'code') return fail('no-code');
  if (st.msToResend > 0) return fail('too-soon');
  admin().pending.sentAt = now();
  return { ok: true };
}
const sixDigits = (code) => String(code ?? '').replace(/\s/g, '');
/** Step 2: the emailed code. no-code · code-format · code-expired · code-wrong → else the second factor is next. */
export function adminVerifyCode(code) {
  const st = adminStatus();
  if (!st || st.step !== 'code') return fail('no-code');
  const d = sixDigits(code);
  if (!/^\d{6}$/.test(d)) return fail('code-format');
  if (st.expired) return fail('code-expired');
  if (d === WRONG_CODE) return fail('code-wrong');
  admin().pending.step = 'second';
  return { ok: true, next: 'second' };
}
/** Step 3: the 6-digit code from the authenticator app (simulated). no-code · code-format · code-wrong → signed in. */
export function adminVerifySecond(code) {
  const st = adminStatus();
  if (!st || st.step !== 'second') return fail('no-code');
  const d = sixDigits(code);
  if (!/^\d{6}$/.test(d)) return fail('code-format');
  if (d === WRONG_CODE) return fail('code-wrong');
  state.session.admin = { signedIn: true, email: st.email, at: nowIso(), pending: null };
  return { ok: true };
}
export function adminSignOut() {
  state.session.admin = { signedIn: false, pending: null };
  return { ok: true };
}
/** K-53 a8 (D-422): the Test-flows tools are the admin's — a flow (and the harness's ?test=1 / ?flow= / ?study= boot) runs inside his signed-in
    session. Called by flows.js resetDemo / app.js boot, never by a screen. */
export function adminTestSession({ test = true } = {}) {
  state.session.admin = { signedIn: true, email: ADMIN_ACCOUNT.email, at: nowIso(), test, pending: null };
  return { ok: true };
}

/* ---------- Account v2 (DG-3 option A, pre-MVP B2) ---------- */
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Personal info: names (required) and an optional email for receipts. → `{ ok, customer, changed }` | `{ ok: false, errors: { first, last, email } }`. */
export function saveProfile({ first = state.customer.first, last = state.customer.last, email = state.customer.email ?? '' } = {}) {
  const f = String(first ?? '').trim();
  const l = String(last ?? '').trim();
  const e = String(email ?? '').trim();
  const errors = {};
  if (!f) errors.first = 'first-required';
  if (!l) errors.last = 'last-required';
  if (e && !EMAIL_OK.test(e)) errors.email = 'email-invalid';
  if (Object.keys(errors).length) return { ok: false, errors };
  const c = state.customer;
  const changed = f !== c.first || l !== c.last || e !== (c.email ?? '');
  Object.assign(c, { first: f, last: l, initials: `${f[0]}${l[0]}`.toUpperCase(), email: e });
  return { ok: true, customer: c, changed };
}

const phoneOf = (who) => (who === 'tailor' ? state.tailors[0].phone : state.customer.phone);
/** Change the number every text goes to (DG-3 A): a code to the NEW number first. Errors: phone-invalid · phone-same. */
export function startPhoneChange(raw, who = 'customer') {
  const v = validatePhone(raw);
  if (!v.ok) return v;
  if (phoneDigits(raw) === phoneDigits(phoneOf(who))) return fail('phone-same');
  session(who).change = { phone: formatPhone(raw), sentAt: now() };
  return { ok: true, phone: session(who).change.phone };
}
/** { phone, msToResend, expired } for the change code in flight; null without one. */
export function phoneChangeStatus(who = 'customer') {
  const c = session(who)?.change;
  if (!c) return null;
  return { phone: c.phone, msToResend: Math.max(0, c.sentAt + POLICY.CODE_RESEND_S * 1000 - now()), expired: now() >= c.sentAt + POLICY.CODE_TTL_MIN * 60000 };
}
export function resendPhoneChange(who = 'customer') {
  const st = phoneChangeStatus(who);
  if (!st) return fail('no-code');
  if (st.msToResend > 0) return fail('too-soon');
  session(who).change.sentAt = now();
  return { ok: true };
}
export function cancelPhoneChange(who = 'customer') {
  if (session(who)) delete session(who).change;
  return { ok: true };
}
/** 'no-code' · 'code-format' · 'code-expired' · 'code-wrong' (000000) · else the number is changed and every text from now on goes to it
    (state.js notify stamps the number on each outbox entry). A STOP belonged to the old number, so its note is cleared; on / off stays. */
export function verifyPhoneChange(code, who = 'customer') {
  const st = phoneChangeStatus(who);
  if (!st) return fail('no-code');
  const digits = String(code ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(digits)) return fail('code-format');
  if (st.expired) return fail('code-expired');
  if (digits === WRONG_CODE) return fail('code-wrong');
  const was = phoneOf(who);
  if (who === 'tailor') state.tailors[0].phone = st.phone; else state.customer.phone = st.phone;
  const p = state.texts[who];
  if (p?.stoppedAt) p.stoppedAt = null;
  delete session(who).change;
  return { ok: true, phone: st.phone, was };
}

/** Delete the account (DG-3 A). Blocked while a visit, an order or money is still open (state.js `deleteBlocker`) → `{ ok: false, error: 'open', block }`.
    Customer: name, number, email, addresses and cards go; past orders, receipts and messages stay with the old id (COUNSEL #9: retention);
    signed out with `deletedAt` (c-welcome says so). Tailor: profile, prices, hours and bank details go, she is unlisted; payout and tax
    records stay; signed out (t-phone says so). PROTOTYPE: one seed record per persona, so the blank record keeps the tailor's id. */
export function deleteAccount(who = 'customer') {
  const block = deleteBlocker(who);
  if (block) return { ok: false, error: 'open', block };
  const at = nowIso();
  if (who === 'tailor') {
    const t = blankTailor();
    t.closedAt = at;
    state.texts.tailor = { on: false, stoppedAt: null, changedAt: at };
    state.session.tailor = { signedIn: false, pending: null, deletedAt: at };
    return { ok: true, at };
  }
  const old = state.customer;
  state.customer = { ...structuredClone(BLANK_CUSTOMER), closed: { id: old.id, at } };
  state.texts.customer = { on: false, stoppedAt: null, changedAt: at };
  newJob();
  state.session.customer = { signedIn: false, pending: null, deletedAt: at };
  return { ok: true, at };
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
  state.customer.address = d ? { ...Object.fromEntries(FIELDS.map((k) => [k, d[k] ?? ''])), ...(d.notes ? { notes: d.notes } : {}) } : null;   // S-27: access notes travel with it
}
/** S-27 (pre-MVP B2): the shared address rules (Saved addresses + the booking's address sheet) → `{ street, zip, notes }` codes. */
export function addressErrors({ street = '', zip = '', notes = '' } = {}) {
  const errors = {};
  if (!String(street).trim()) errors.street = 'street-required';
  if (!/^\d{5}$/.test(String(zip).trim())) errors.zip = 'zip-invalid';
  if ([...String(notes ?? '').trim()].length > BOOKING_LIMITS.ACCESS_MAX) errors.notes = 'notes-long';
  return errors;
}
const addrNum = (a) => Number(String(a.id).replace(/^addr-/, '')) || 0;

/** `{ label, street, unit, zip, notes, makeDefault }` → `{ ok, address } | { ok: false, errors: { street, zip, label, notes } }`. City and state from the ZIP (S-42),
    SHOP_CITY outside the grid. S-27 (pre-MVP B2): optional access notes (buzzer, gate code; ≤ BOOKING_LIMITS.ACCESS_MAX) the tailor sees once she accepts. */
export function addAddress({ label = '', street = '', unit = '', zip = '', notes = '', makeDefault = false } = {}) {
  const errors = { ...(String(label).trim() ? {} : { label: 'label-required' }), ...addressErrors({ street, zip, notes }) };
  if (Object.keys(errors).length) return { ok: false, errors };
  const list = state.customer.addresses;
  const address = {
    id: `addr-${Math.max(0, ...list.map(addrNum)) + 1}`, label: String(label).trim(), street: String(street).trim(), unit: String(unit).trim(),
    city: placeForZip(zip)?.city ?? SHOP_CITY.city, state: placeForZip(zip)?.state ?? SHOP_CITY.state, zip: String(zip).trim(), default: false,
    ...(String(notes ?? '').trim() ? { notes: String(notes).trim() } : {}),
  };
  if (makeDefault || !list.some((a) => a.default)) { for (const a of list) a.default = false; address.default = true; }
  list.push(address);
  syncAddress();
  return { ok: true, address };
}

/** S-27 (pre-MVP B2): edit a saved address (label, street, unit, ZIP, access notes) → `{ ok, address } | unknown-address | { ok: false, errors }`. */
export function updateAddress(id, { label, street, unit, zip, notes } = {}) {
  const a = state.customer.addresses.find((x) => x.id === id);
  if (!a) return fail('unknown-address');
  const next = { label: label ?? a.label, street: street ?? a.street, unit: unit ?? a.unit ?? '', zip: zip ?? a.zip, notes: notes ?? a.notes ?? '' };
  const errors = { ...(String(next.label).trim() ? {} : { label: 'label-required' }), ...addressErrors(next) };
  if (Object.keys(errors).length) return { ok: false, errors };
  Object.assign(a, {
    label: String(next.label).trim(), street: String(next.street).trim(), unit: String(next.unit).trim(), zip: String(next.zip).trim(),
    city: placeForZip(next.zip)?.city ?? SHOP_CITY.city, state: placeForZip(next.zip)?.state ?? SHOP_CITY.state,
  });
  if (String(next.notes).trim()) a.notes = String(next.notes).trim(); else delete a.notes;
  syncAddress();
  return { ok: true, address: a };
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
