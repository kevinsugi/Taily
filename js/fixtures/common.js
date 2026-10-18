/* ============================================================
   Taily v5 — driveTo(target): reach any appointment status through
   the real transitions plus clock moves, starting from reset().
   Every milestone's Test-flows setup reuses it. DOM-free.
   ============================================================ */
import {
  state, T, reset, setClock, advanceClock, openSlots, nextOpening, getAppt, handoffCode, handoffSlots,
} from '../state.js';
import { addMinutes, addDays, isoMinute, isoDay } from '../dates.js';
import { TAILORS, CUSTOMER, DEMO_NOW, DECLINE_REASONS, CANT_MAKE_IT_REASONS } from '../data.js';
import { cents } from '../money.js';
import { suggestSlots } from '../tailor-data.js';
import * as A from '../account.js';
import { POLICY } from '../money-config.js';
import { PAYOUT_DAYS, SECOND_SLOT_AFTER, JOB_EDIT } from './money-scenarios.js';

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
  'cancelled-late', 'cant-make-it', 'no-show', 'fitting', 'price-change', 'in-progress', 'ready', 'awaiting-handoff',
  'completed', 'reviewed',
  /* Study-1 WS-A */
  'handed-over', 'problem', 'auto-completed', 'unclaimed', 'review-reminder', 'tailor-no-show', 'cant-make-it-late',
  /* Study-1 WS-B */
  'edit-pending', 'edit-approved',
];

/** Study-1 B1: the reason Amara gives with the fixtures' edit (copy, not money). */
export const EDIT_REASON = 'The sleeve lining is torn and has to be replaced, so the sleeves take longer.';
/** Study-1 B1: the edit the fixtures send on an in-progress job, through the real lines (JOB_EDIT: Shorten sleeves up $15, the due date three
    days later). `kind`: 'full' (price + due date + a photo) · 'price' (price only, no photo) · 'due' (due date only). */
export function jobEdit(appt, kind = 'full') {
  const lines = appt.lines.map((l) => ({ ...l }));
  if (kind !== 'due') for (const l of lines) if (l.serviceId === 'sleeves') l.cents = cents(AMARA.prices.sleeves + JOB_EDIT.sleevesUp);
  const needBy = kind === 'price' ? appt.job.needBy : isoDay(addDays(appt.job.needBy, JOB_EDIT.dueDays));
  const reason = kind === 'due' ? 'The lining fabric I ordered arrives on Monday, so I need a few more days.' : EDIT_REASON;
  return { lines, needBy, reason, photo: kind === 'full' };
}
/** Study-1 B2: the private General notes the fixtures write (copy). */
export const NOTE_TEXT = {
  measure: 'Sleeve 24 1/2 in. finished. Keep the working buttonholes.',
  sketch: 'Sketch of the new lining pattern attached.',
};

/** Study-1 A3: the handoff each way back completes with — pickup: Sarah's code; courier: the courier delivers (K-37: no drop-off).
    Throws on failure. */
export function handOver(id, how = getAppt(id).returnOption) {
  if (how === 'courier') return must(T.courierDelivered(id), 'courierDelivered');
  return must(T.confirmPickup(id, handoffCode(getAppt(id))), 'confirmPickup');
}

/** K-40 (T1): the handoff times the fixtures pick, as wall-clock "HH:MM" — the pickup Fri, Oct 16 · 5:30 PM, the courier window
    Fri, Oct 16 · 5:00–5:30 PM (the courier collects 4:45 PM) — and the times a change moves them to (Sat, Oct 17 · 2:00 PM; Fri 6:00–6:30 PM). */
export const HANDOFF_PICK = { pickup: '17:30', courier: '17:00' };
export const HANDOFF_MOVE = { pickup: '2026-10-17T14:00', courier: '2026-10-16T18:00' };
/** The open handoff slot at `at` ("HH:MM" = the first day that has it, or a full ISO start), else the first open slot. */
export function handoffPick(id, method = getAppt(id).returnOption, at = HANDOFF_PICK[method]) {
  const slots = handoffSlots(getAppt(id), method);
  return slots.find((x) => (at.length > 5 ? x.start === at : x.start.slice(11, 16) === at)) ?? slots[0] ?? null;
}
/** Pick the handoff time through the real transition (Sarah's move on c-ready / c-booking). Throws on failure. */
export function pickHandoff(id, at) {
  return must(T.setHandoffSlot(id, handoffPick(id, undefined, at)), 'setHandoffSlot');
}

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

/** Fitting comments (K-02, copy not money). `masked` carries a phone number the model hides. */
export const FITTING_COMMENTS = {
  g1: 'Hem pinned for flats, with a slight break.',
  g2: 'Pinned both sleeves to just above the wrist. The lining moves with them.',
  n1: 'Jeans hem pinned at the ankle. I’ll keep the original hem.',
  masked: 'Call me at (347) 555-0118 if the pins move.',
};

/** documentFitting(id, { lines = appt.lines, level = 'min' | 'full' }) — through the real transitions, for each distinct garmentId in
    `lines`: min = 1 Before + 1 Pinned; full = 2 + 2 + the comment in FITTING_COMMENTS where one exists. Does NOT reset; throws on failure. */
export function documentFitting(id, { lines = getAppt(id).lines, level = 'min' } = {}) {
  const per = level === 'full' ? 2 : 1;
  for (const gid of [...new Set(lines.map((l) => l.garmentId))]) {
    for (const kind of ['before', 'pinned']) {
      for (let i = 0; i < per; i += 1) must(T.addFittingPhoto(id, gid, kind), `addFittingPhoto ${gid} ${kind}`);
    }
    if (level === 'full' && FITTING_COMMENTS[gid]) must(T.setFittingComment(id, gid, FITTING_COMMENTS[gid]), `setFittingComment ${gid}`);
  }
  return getAppt(id);
}

/** The tailor's note per recipe (copy, not money). K-31 (Study-1 B2): driveTo writes it as a PRIVATE General note at the fitting — it no
    longer travels with the final order. */
export const PRICE_NOTES = {
  added: 'The sleeve lining has to move too, and tapering the legs will sit better with the shorter jacket.',
  removed: 'Once the sleeves are done the jacket sides already fit, so I took that off.',
  repriced: 'The sleeve lining has to move too.',
  item: 'Sarah asked me to hem her jeans too, and the jacket sides already fit.',
  'item-removed': 'The suit pants fit as they are, so I took them off the order.',
  unchanged: '',
};

/** K-21: the five-item order the sliding rail is tested with (k28): [garment type, service ids]. */
export const MANY_ITEMS = [
  ['Suit Jacket', ['sleeves', 'jacket-sides']], ['Suit Pant', ['hem-pants']], ['Formal Dress', ['dress-take-in']],
  ['Shirt / Blouse', ['sleeves']], ['Skirt', ['dress-hem']],
];
/** Replace the seed draft's garments with `items` ([type, service ids]) through the real job transitions. Throws on failure. */
export function setGarments(items) {
  for (const g of [...state.job.garments]) T.removeGarment(g.id);
  for (const [type, services] of items) {
    const r = T.addGarment(type);
    if (!r.ok) throw new Error(`setGarments: addGarment ${type} failed (${r.error})`);
    const sv = T.setServices(r.garment.id, services);
    if (!sv.ok) throw new Error(`setGarments: setServices ${type} failed (${sv.error})`);
  }
}

/** driveTo(target, { docs = 'none' | 'min' | 'full' (default 'none' at the fitting, 'min' after), ask = false, visitType = 'home', rush = false, priceChange = 'added' | 'removed' | 'repriced' | 'item' | 'item-removed' | 'unchanged', returnOption = 'pickup', items = null ([type, service ids] in place of the seed garments, e.g. MANY_ITEMS), edit = 'full' | 'price' | 'due' (Study-1 B1 targets) }) → appt.
    `price-change` carries a change (default 'added'); later targets send the unchanged order and approve it (K-01, D-120)
    unless `priceChange` is passed explicitly. */
export function driveTo(target, opts = {}) {
  const { ask = false, visitType = 'home', rush = false, priceChange = 'added', returnOption = 'pickup', items = null } = opts;
  const docs = opts.docs ?? (target === 'fitting' ? 'none' : 'min');         // K-02: the fitting starts undocumented (the t-adjust state)
  if (!TARGETS.includes(target)) throw new Error(`driveTo: unknown target "${target}"`);
  reset();
  if (ask) askAmara();                                          // M5: a question and an answer before the booking
  if (items) setGarments(items);                                // K-21: a bigger order through the real job transitions
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
  if (target === 'cant-make-it-late') {
    setClock(isoMinute(addMinutes(getAppt(id).slot.start, -8 * 60)));         // inside the 24 h window (K-29)
    return must(T.tailorCantMakeIt(id, CANT_MAKE_IT_REASONS[0]), 'tailorCantMakeIt');
  }
  if (target === 'tailor-no-show') {
    setClock(isoMinute(addMinutes(getAppt(id).slot.start, 20)));
    return must(T.reportTailorNoShow(id), 'reportTailorNoShow');
  }
  if (target === 'no-show') {
    setClock(isoMinute(addMinutes(getAppt(id).slot.start, 20)));
    return must(T.markNoShow(id), 'markNoShow');
  }

  setClock(getAppt(id).slot.start);
  must(T.startFitting(id), 'startFitting');
  if (target === 'fitting') return docs === 'none' ? getAppt(id) : documentFitting(id, { level: docs });
  if (docs === 'none') throw new Error('driveTo: docs "none" past the fitting would fail the send (photos-missing)');
  const recipe = target === 'price-change' || 'priceChange' in opts ? priceChange : 'unchanged';
  documentFitting(id, { lines: changedLines(getAppt(id), recipe), level: docs });
  if (PRICE_NOTES[recipe]) must(T.addNote(id, { text: PRICE_NOTES[recipe] }), 'addNote');
  must(T.sendPriceChange(id, changedLines(getAppt(id), recipe)), 'sendPriceChange');
  if (target === 'price-change') return getAppt(id);
  must(T.approvePriceChange(id), 'approvePriceChange');
  if (target === 'in-progress') return getAppt(id);
  if (['edit-pending', 'edit-approved'].includes(target)) {
    /* Study-1 B1: the next morning Amara edits the job (opts.edit = 'full' | 'price' | 'due'); Sarah approves (K-30 overruled: no decline) */
    advanceClock(17 * 60);
    must(T.sendJobEdit(id, jobEdit(getAppt(id), opts.edit ?? 'full')), 'sendJobEdit');
    if (target === 'edit-pending') return getAppt(id);
    return must(T.approveJobEdit(id), 'approveJobEdit');
  }
  must(T.markReady(id), 'markReady');
  if (target === 'ready') return getAppt(id);
  must(T.chooseReturn(id, returnOption), 'chooseReturn');
  pickHandoff(id);                                                          // K-40: the time comes before the hold
  must(T.holdBalance(id, 'visa-4242'), 'holdBalance');
  if (target === 'awaiting-handoff') return getAppt(id);
  if (target === 'unclaimed') { advanceClock(POLICY.UNCLAIMED_CAPTURE_D * 24 * 60); return getAppt(id); }   // the hold is captured, the job stays open
  if (['handed-over', 'problem', 'auto-completed'].includes(target)) {
    must(T.markHandedOver(id), 'markHandedOver');                            // pickup: marked without the code
    if (target === 'handed-over') return getAppt(id);
    if (target === 'problem') return must(T.reportNotReceived(id), 'reportNotReceived');
    advanceClock(POLICY.HANDOFF_AUTO_H * 60);                                 // the countdown runs out: completed automatically
    return getAppt(id);
  }
  handOver(id, returnOption);
  if (target === 'completed') return getAppt(id);
  if (target === 'review-reminder') { advanceClock(POLICY.REVIEW_REMINDER_D * 24 * 60); return getAppt(id); }
  return must(T.leaveReview(id, { stars: 5, text: 'Perfect fit, and she was on time.', photos: 0 }), 'leaveReview');
}

/** D-158: sending a request spent the draft (an empty job). A fixture that wants another request for the same job puts it back from the
    last request. A draft that still has garments is left alone. */
export function draftAgain() {
  if ((state.job.garments ?? []).length) return;
  const prev = state.appts.filter((x) => x.customerId === state.customer.id).pop();
  if (prev) state.job = { ...structuredClone(prev.job), declinedBy: state.job.declinedBy ?? [], hiddenTailors: state.job.hiddenTailors ?? [] };
}

/** addRequest({ accept = false, after = null }) → appt. A second request for the CURRENT draft job (D-86; the draft is put back from the last request when sending emptied it, D-158): the first open slot
    >= `after` (ISO) through the real requestBooking (and tailorAccept when `accept`). Does NOT reset; throws on failure. */
export function addRequest({ accept = false, after = null } = {}) {
  const tailorId = state.tailors[0].id;
  draftAgain();
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
    profile: () => T.setTailorSection('profile', pick(seed, ['name', 'shopName', 'initials', 'cardLine', 'bio', 'years', 'photo', 'workPhotos'])),
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
    approve → ready → return → hold → handOver (Study-1 A3) → completed. Throws on failure. */
export function completeJob(id, { returnOption = 'pickup' } = {}) {
  setClock(getAppt(id).slot.start);
  must(T.startFitting(id), 'startFitting');
  documentFitting(id);
  must(T.sendPriceChange(id, getAppt(id).lines.map((l) => ({ ...l }))), 'sendPriceChange');
  must(T.approvePriceChange(id), 'approvePriceChange');
  must(T.markReady(id), 'markReady');
  must(T.chooseReturn(id, returnOption), 'chooseReturn');
  pickHandoff(id);
  must(T.holdBalance(id, 'visa-4242'), 'holdBalance');
  return handOver(id, returnOption);
}

/** earningsTo(kind) — kind: 'pending' | 'paid' | 'failed' | 'kept' (M5 A7).
    pending: one completed job, its payout scheduled for PAYOUT_DAYS.first · paid: that Friday's run paid it, then a second (shop) job is
    completed on Sat, Oct 17 (next payout PAYOUT_DAYS.second) · failed: the Friday run returned it · kept: a late cancellation's kept deposit. */
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
  draftAgain();
  T.setJob({ visitType: 'shop' });
  const second = addRequest({ accept: true, after: SECOND_SLOT_AFTER });
  return completeJob(second.id);
}
