/* ============================================================
   Taily v5 — driveTo(target): reach any appointment status through
   the real transitions plus clock moves, starting from reset().
   Every milestone's Test-flows setup reuses it. DOM-free.
   ============================================================ */
import {
  state, T, reset, setClock, advanceClock, openSlots, nextOpening, getAppt,
} from '../state.js';
import { addMinutes, isoMinute } from '../dates.js';
import { TAILORS, CUSTOMER, DEMO_NOW, DECLINE_REASONS, CANT_MAKE_IT_REASONS } from '../data.js';
import { cents } from '../money.js';
import { suggestSlots } from '../tailor-data.js';
import * as A from '../account.js';
import { POLICY } from '../money-config.js';
import { PAYOUT_DAYS, SECOND_SLOT_AFTER } from './money-scenarios.js';

const AMARA = TAILORS[0];

/** Chat copy for the M5 threads (not money). */
export const CHAT = {
  ask: 'Can you take in a jacket at the shoulders?',
  reply: 'Yes. Shoulders need a fitting, so book a visit and I’ll pin it on you.',
  after: 'See you on Thursday. Have the jacket on so I can pin the sleeves.',
  later: 'Is Thursday still good for you?',
  photo: 'This is the jacket. The sleeves are the problem.',
  late: 'Running ten minutes late, sorry!',
  phoneCustomer: `Text me at ${CUSTOMER.phone} if you’re running late.`,
  phoneTailor: `Easier to call me: ${AMARA.phone}`,
  email: `Or email me at ${CUSTOMER.email}`,
};

/** Sarah asks Amara a question before booking, and (by default) Amara answers. Does NOT reset; real sendMessage only. */
export function askAmara({ reply = true } = {}) {
  const id = AMARA.id;
  setClock('2026-10-13T09:30');
  const q = T.sendMessage(id, 'customer', { text: CHAT.ask });
  if (!q.ok) throw new Error(`askAmara: question failed (${q.error})`);
  if (reply) {
    setClock('2026-10-13T09:42');
    const r = T.sendMessage(id, 'tailor', { text: CHAT.reply });
    if (!r.ok) throw new Error(`askAmara: reply failed (${r.error})`);
  }
  setClock(DEMO_NOW);
}

export const TARGETS = [
  'requested', 'suggested', 'declined', 'expired', 'expired-2', 'expired-final', 'confirmed', 'cancelled-early',
  'cancelled-late', 'cant-make-it', 'no-show', 'fitting', 'price-change', 'in-progress', 'ready', 'returning',
  'completed', 'reviewed',
];

const must = (r, step) => {
  if (!r.ok) throw new Error(`driveTo: ${step} failed (${r.error})`);
  return r.appt;
};

/** A final-order recipe on top of the booked lines: added = + Taper and Sleeves up $5; removed = − Take in jacket sides;
    repriced = Sleeves up $5; item = − Take in jacket sides + a new Pants / Jeans item with Hem pants (K-01, J6);
    item-removed = − every Suit Pant line; unchanged = the booked lines as they are. */
function changedLines(appt, kind) {
  const lines = appt.lines.map((l) => ({ ...l }));
  if (kind === 'unchanged') return lines;
  if (kind === 'removed') return lines.filter((l) => l.serviceId !== 'jacket-sides');
  if (kind === 'item-removed') return lines.filter((l) => l.garmentId !== 'g1');
  if (kind === 'item') {
    return [...lines.filter((l) => l.serviceId !== 'jacket-sides'),
      { garmentId: 'n1', garmentType: 'Pants / Jeans', serviceId: 'hem-pants', label: 'Hem pants', cents: cents(AMARA.prices['hem-pants']) }];
  }
  for (const l of lines) if (l.serviceId === 'sleeves') l.cents = cents(AMARA.prices.sleeves + 5);
  if (kind === 'repriced') return lines;
  const pant = lines.find((l) => l.serviceId === 'hem-pants');
  return [...lines, { garmentId: pant.garmentId, garmentType: pant.garmentType, serviceId: 'taper', label: 'Taper legs', cents: cents(AMARA.prices.taper) }];
}

/** The tailor's note per recipe (copy, not money) — driveTo sends it with the final order (A6). */
export const PRICE_NOTES = {
  added: 'The sleeve lining has to move too, and tapering the legs will sit better with the shorter jacket.',
  removed: 'Once the sleeves are done the jacket sides already fit, so I took that off.',
  repriced: 'The sleeve lining has to move too.',
  item: 'Sarah asked me to hem her jeans too, and the jacket sides already fit.',
  'item-removed': 'The suit pants fit as they are, so I took them off the order.',
  unchanged: '',
};

/** driveTo(target, { ask = false, visitType = 'home', rush = false, priceChange = 'added' | 'removed' | 'repriced' | 'item' | 'item-removed' | 'unchanged', returnOption = 'pickup' }) → appt.
    `price-change` carries a change (default 'added'); later targets send the unchanged order and approve it (K-01, D-120)
    unless `priceChange` is passed explicitly. */
export function driveTo(target, opts = {}) {
  const { ask = false, visitType = 'home', rush = false, priceChange = 'added', returnOption = 'pickup' } = opts;
  if (!TARGETS.includes(target)) throw new Error(`driveTo: unknown target "${target}"`);
  reset();
  if (ask) askAmara();                                          // M5: a question and an answer before the booking
  T.setJob({ visitType, ...(rush ? { needBy: '2026-10-16' } : {}) });
  const tailorId = state.tailors[0].id;
  const slotStart = nextOpening(tailorId, visitType, { until: state.job.needBy });
  const appt = must(T.requestBooking({ tailorId, slotStart, cardId: 'visa-4242' }), 'requestBooking');
  const id = appt.id;
  if (target === 'requested') return appt;

  if (target === 'suggested') {
    return must(T.tailorSuggest(id, suggestSlots(appt)[0]), 'tailorSuggest');   // D-77: SUGGESTED_SLOT on the seed
  }
  if (target === 'declined') return must(T.tailorDecline(id, DECLINE_REASONS[0]), 'tailorDecline');
  if (target === 'expired' || target === 'expired-2' || target === 'expired-final') {
    const tries = { expired: 0, 'expired-2': 1, 'expired-final': 2 }[target];
    const wait = POLICY.REQUEST_EXPIRY_H * 60;                 // to the exact expiry, so every deadline reads on :00 / :30 (R3-2-T-10)
    advanceClock(wait);
    for (let i = 0; i < tries; i += 1) { must(T.tryAgain(id), 'tryAgain'); advanceClock(wait); }
    return getAppt(id);
  }

  must(T.tailorAccept(id), 'tailorAccept');
  if (target === 'confirmed') return getAppt(id);
  if (target === 'cancelled-early') return must(T.cancelBooking(id), 'cancelBooking');
  if (target === 'cancelled-late') {
    setClock(isoMinute(addMinutes(getAppt(id).slot.start, -8 * 60)));         // inside the 24 h window
    return must(T.cancelBooking(id), 'cancelBooking');
  }
  if (target === 'cant-make-it') return must(T.tailorCantMakeIt(id, CANT_MAKE_IT_REASONS[0]), 'tailorCantMakeIt');
  if (target === 'no-show') {
    setClock(isoMinute(addMinutes(getAppt(id).slot.start, 20)));
    return must(T.markNoShow(id), 'markNoShow');
  }

  setClock(getAppt(id).slot.start);
  must(T.startFitting(id), 'startFitting');
  if (target === 'fitting') return getAppt(id);
  const recipe = target === 'price-change' || 'priceChange' in opts ? priceChange : 'unchanged';
  must(T.sendPriceChange(id, changedLines(getAppt(id), recipe), { note: PRICE_NOTES[recipe] ?? '' }), 'sendPriceChange');
  if (target === 'price-change') return getAppt(id);
  must(T.approvePriceChange(id), 'approvePriceChange');
  if (target === 'in-progress') return getAppt(id);
  must(T.markReady(id), 'markReady');
  if (target === 'ready') return getAppt(id);
  must(T.chooseReturn(id, returnOption), 'chooseReturn');
  must(T.payBalance(id, 'visa-4242'), 'payBalance');
  if (target === 'returning') return getAppt(id);
  must(T.markCompleted(id), 'markCompleted');
  if (target === 'completed') return getAppt(id);
  return must(T.leaveReview(id, { stars: 5, text: 'Perfect fit, and she was on time.', photos: 0 }), 'leaveReview');
}

/** addRequest({ accept = false, after = null }) → appt. A second request for the CURRENT draft job (D-86): the first open slot
    >= `after` (ISO) through the real requestBooking (and tailorAccept when `accept`). Does NOT reset; throws on failure. */
export function addRequest({ accept = false, after = null } = {}) {
  const tailorId = state.tailors[0].id;
  const { visitType, needBy } = state.job;
  const slotStart = openSlots(tailorId, visitType, { until: needBy }).find((s) => !after || s >= after);
  if (!slotStart) throw new Error(`addRequest: no open slot${after ? ` after ${after}` : ''}`);
  const appt = must(T.requestBooking({ tailorId, slotStart, cardId: 'visa-4242' }), 'requestBooking');
  return accept ? must(T.tailorAccept(appt.id), 'tailorAccept') : appt;
}

export const NEW_TAILOR_PHONE = '(646) 555-0127';
const STEPS = ['profile', 'services', 'where', 'returns', 'availability', 'payouts', 'done'];

/** reset → blank tailor (D-20) signed in with `phone` → every section BEFORE `step` saved with the seed's values (D-66).
    step: 'profile' | 'services' | 'where' | 'returns' | 'availability' | 'payouts' | 'done'. Returns the tailor. */
export function onboardTo(step, { phone = NEW_TAILOR_PHONE } = {}) {
  const upTo = STEPS.indexOf(step);
  if (upTo < 0) throw new Error(`onboardTo: unknown step "${step}"`);
  reset();
  const sent = A.sendCode(phone, 'tailor');
  if (!sent.ok) throw new Error(`onboardTo: sendCode failed (${sent.error})`);
  const verified = A.verifyCode('123456', 'tailor');
  if (!verified.ok) throw new Error(`onboardTo: verifyCode failed (${verified.error})`);
  const seed = TAILORS[0];
  const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, structuredClone(o[k])]));
  const saves = {
    profile: () => T.setTailorSection('profile', pick(seed, ['name', 'shopName', 'initials', 'bio', 'years', 'photo', 'workPhotos'])),
    services: () => T.setTailorSection('services', { prices: structuredClone(seed.prices) }),
    where: () => T.setTailorSection('where', pick(seed, ['shop', 'home'])),
    returns: () => T.setTailorSection('returns', { returns: structuredClone(seed.returns) }),
    availability: () => T.setTailorSection('availability', { availability: structuredClone(seed.availability) }),
    payouts: () => T.setPayouts({ holder: seed.payouts.holder, routing: seed.payouts.routing, account: '000123456789' }),
  };
  STEPS.slice(0, upTo).forEach((id) => {
    const r = saves[id]();
    if (!r.ok || r.valid === false) throw new Error(`onboardTo: ${id} did not validate (${JSON.stringify(r.errors)})`);
  });
  return state.tailors[0];
}

/** completeJob(id, { returnOption = 'pickup' }) — the real chain on an accepted appointment: fitting → final order (unchanged) →
    approve → ready → return → balance → completed. Throws on failure. */
export function completeJob(id, { returnOption = 'pickup' } = {}) {
  setClock(getAppt(id).slot.start);
  must(T.startFitting(id), 'startFitting');
  must(T.sendPriceChange(id, getAppt(id).lines.map((l) => ({ ...l })), { note: '' }), 'sendPriceChange');
  must(T.approvePriceChange(id), 'approvePriceChange');
  must(T.markReady(id), 'markReady');
  must(T.chooseReturn(id, returnOption), 'chooseReturn');
  must(T.payBalance(id, 'visa-4242'), 'payBalance');
  return must(T.markCompleted(id), 'markCompleted');
}

/** earningsTo(kind) — kind: 'pending' | 'paid' | 'failed' | 'kept' (M5 A7).
    pending: one completed job, its payout scheduled for PAYOUT_DAYS.first · paid: that Friday's run paid it, then a second (shop) job is
    completed on Sat, Oct 17 (next payout PAYOUT_DAYS.second) · failed: the Friday run sent it back · kept: a late cancellation's kept deposit. */
export function earningsTo(kind) {
  if (kind === 'kept') return driveTo('cancelled-late');
  const first = driveTo('completed');
  if (kind === 'pending') return first;
  setClock(`${PAYOUT_DAYS.first}T18:00`);
  if (kind === 'failed') {
    state.sim.payout = 'failed';
    T.settlePayouts();
    return first;
  }
  if (kind !== 'paid') throw new Error(`earningsTo: unknown kind "${kind}"`);
  T.settlePayouts();
  T.setJob({ visitType: 'shop' });
  const second = addRequest({ accept: true, after: SECOND_SLOT_AFTER });
  return completeJob(second.id);
}
