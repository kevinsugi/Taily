/* ============================================================
   Taily v5 — the customer sign-in model (D-33). DOM-free.
   Simulated: any 6 digits verify except 000000 (the demo's wrong
   code); Sarah's number is an existing account, any other number
   is a new one (→ the name step). Mutates only
   state.session.customer and state.customer (+ state.sim.card for
   the decline recovery of D-40). Every fn returns
   { ok, … } | { ok: false, error } (field forms: errors { field: code }).
   ============================================================ */
import { state, now, blankTailor, nextSection } from './state.js';
import { POLICY } from './money-config.js';

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

/** New account: names the one seed customer record (D-33), keeps its address and card. */
export function saveName({ first = '', last = '' } = {}) {
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
