/* ============================================================
   Taily v5 — driveTo(target): reach any appointment status through
   the real transitions plus clock moves, starting from reset().
   Every milestone's Test-flows setup reuses it. DOM-free.
   ============================================================ */
import {
  state, T, reset, setClock, advanceClock, openSlots, nextOpening, getAppt,
} from '../state.js';
import { addMinutes, isoMinute } from '../dates.js';
import { TAILORS, DECLINE_REASONS, CANT_MAKE_IT_REASONS } from '../data.js';
import { suggestSlots } from '../tailor-data.js';
import * as A from '../account.js';
import { POLICY } from '../money-config.js';

export const TARGETS = [
  'requested', 'suggested', 'declined', 'expired', 'expired-2', 'expired-final', 'confirmed', 'cancelled-early',
  'cancelled-late', 'cant-make-it', 'no-show', 'fitting', 'price-change', 'in-progress', 'ready', 'returning',
  'completed', 'reviewed',
];

const must = (r, step) => {
  if (!r.ok) throw new Error(`driveTo: ${step} failed (${r.error})`);
  return r.appt;
};

/** A price-change recipe on top of the booked lines: added = + Taper $40 and Sleeves $45 → $50;
    removed = − Take in jacket sides; repriced = Sleeves $45 → $50. */
function changedLines(appt, kind) {
  const lines = appt.lines.map((l) => ({ ...l }));
  if (kind === 'removed') return lines.filter((l) => l.serviceId !== 'jacket-sides');
  for (const l of lines) if (l.serviceId === 'sleeves') l.cents = 5000;
  if (kind === 'repriced') return lines;
  const pant = lines.find((l) => l.serviceId === 'hem-pants');
  return [...lines, { garmentId: pant.garmentId, garmentType: pant.garmentType, serviceId: 'taper', label: 'Taper legs', cents: 4000 }];
}

/** driveTo(target, { visitType = 'home', rush = false, priceChange = 'added' | 'removed' | 'repriced', returnOption = 'pickup' }) → appt.
    `price-change` always carries a change (default 'added'); later targets keep the booked price (confirmNoChange)
    unless `priceChange` is passed explicitly. */
export function driveTo(target, opts = {}) {
  const { visitType = 'home', rush = false, priceChange = 'added', returnOption = 'pickup' } = opts;
  if (!TARGETS.includes(target)) throw new Error(`driveTo: unknown target "${target}"`);
  reset();
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
  if (target === 'price-change' || 'priceChange' in opts) {
    must(T.sendPriceChange(id, changedLines(getAppt(id), priceChange)), 'sendPriceChange');
    if (target === 'price-change') return getAppt(id);
    must(T.approvePriceChange(id), 'approvePriceChange');
  } else {
    must(T.confirmNoChange(id), 'confirmNoChange');
  }
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
