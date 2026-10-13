/* ============================================================
   Taily v5 — driveTo(target): reach any appointment status through
   the real transitions plus clock moves, starting from reset().
   Every milestone's Test-flows setup reuses it. DOM-free.
   ============================================================ */
import {
  state, T, reset, setClock, advanceClock, openSlots, nextOpening, getAppt,
} from '../state.js';
import { addMinutes, isoMinute } from '../dates.js';

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
    const alt = openSlots(tailorId, visitType, { until: state.job.needBy, exclude: id }).find((s) => s !== slotStart);
    return must(T.tailorSuggest(id, alt), 'tailorSuggest');
  }
  if (target === 'declined') return must(T.tailorDecline(id, 'Fully booked that week'), 'tailorDecline');
  if (target === 'expired' || target === 'expired-2' || target === 'expired-final') {
    const tries = { expired: 0, 'expired-2': 1, 'expired-final': 2 }[target];
    advanceClock(121);
    for (let i = 0; i < tries; i += 1) { must(T.tryAgain(id), 'tryAgain'); advanceClock(121); }
    return getAppt(id);
  }

  must(T.tailorAccept(id), 'tailorAccept');
  if (target === 'confirmed') return getAppt(id);
  if (target === 'cancelled-early') return must(T.cancelBooking(id), 'cancelBooking');
  if (target === 'cancelled-late') {
    setClock(isoMinute(addMinutes(getAppt(id).slot.start, -8 * 60)));         // inside the 24 h window
    return must(T.cancelBooking(id), 'cancelBooking');
  }
  if (target === 'cant-make-it') return must(T.tailorCantMakeIt(id, 'Family emergency'), 'tailorCantMakeIt');
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
