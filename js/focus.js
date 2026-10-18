/* ============================================================
   Taily v5 — which appointment a detail screen shows (D-72). DOM-free.
   Detail screens (c-request, c-booking, t-request, t-job, t-thread)
   never guess with activeAppt(): whoever navigates there calls
   setFocus(appt.id) first, the screen reads focusAppt(ID), and its
   wire() calls redirectIfMoved(ID, go).
   ============================================================ */
import { state, getAppt, apptsFor, statusScreen, lastSpeakerSince, now } from './state.js';
import { fmtTime, fmtDay, isoDay } from './dates.js';

/** c- customer · t- / to- tailor. sys- screens keep the current persona. */
function personaOf(screenId) {
  if (String(screenId).startsWith('c-')) return 'customer';
  if (/^(t|to)-/.test(String(screenId))) return 'tailor';
  return state.persona;
}

/** Withdrawn / switched requests never became bookings (D-78): they are not a fallback target. */
const dropped = (a) => a.status === 'cancelled' && ['withdrawn', 'switched'].includes(a.cancel?.reason);

/** Name the appointment the next detail screen shows. */
export function setFocus(id, { keepFrom = false } = {}) { state.ui.apptId = id; if (!keepFrom) delete state.ui.from; }
/** Which top-nav tab a booking-detail screen (c-booking, c-complete, c-review) keeps lit: Account when it was opened from Past orders
    (c-orders sets `state.ui.from = 'account'` after `setFocus`, M6-T-20), else Bookings. Any later `setFocus` clears it. */
export const bookingTab = () => (state.ui.from === 'account' ? 'account' : 'bookings');

/** The appointment for `screenId`: the focused one when it belongs to `persona` and lands on this screen,
    else the persona's newest appointment whose statusScreen is this screen, else null. */
export function focusAppt(screenId, persona = personaOf(screenId)) {
  const focused = state.ui.apptId ? getAppt(state.ui.apptId) : null;
  if (focused && apptsFor(persona).includes(focused) && statusScreen(focused, persona) === screenId) return focused;
  return apptsFor(persona).find((a) => statusScreen(a, persona) === screenId && !dropped(a)) ?? null;
}

/** Call in wire(): when the focused appointment has moved on to another screen (accepted while Sarah sat on c-request),
    forward there. Returns true when it did. `has(id)` optionally reports whether a screen is registered. */
export function redirectIfMoved(screenId, go, { has = null } = {}) {
  const a = state.ui.apptId ? getAppt(state.ui.apptId) : null;
  if (!a) return false;
  const persona = personaOf(screenId);
  if (!apptsFor(persona).includes(a)) return false;
  const next = statusScreen(a, persona);
  if (!next || next === screenId || (has && !has(next))) return false;
  go(next, { replace: true });
  return true;
}

/** The status word both sides print (B2, D-87 + D-108): `{ pill, label }` where `pill` is a `statusPill` key. `short` is the list
    row's word. M3 words are unchanged; every M4 status comes from here so the two perspectives can't drift. */
export function statusWord(appt, persona = state.persona, { short = false } = {}) {
  if (!appt) return { pill: 'calm', label: '' };
  const customer = persona !== 'tailor';
  const sarah = state.customer.first;
  const pick = (long, brief) => (short ? brief : long);
  /* R4-2-T-02: one word per list for every "waiting on Sarah" case (price change, replied, ready, suggested) */
  const waiting = { pill: 'waiting', label: pick(`Waiting on ${sarah}`, 'Waiting') };
  switch (appt.status) {
    case 'requested': return customer ? { pill: 'requested', label: 'Request sent' } : { pill: 'new-request', label: 'New request' };
    case 'suggested': return customer ? { pill: 'suggested', label: pick('New time suggested', 'New time') } : waiting;
    case 'declined': return { pill: 'declined', label: 'Declined' };
    case 'expired': return { pill: 'expired', label: 'No reply' };
    case 'cancelled': return { pill: 'cancelled', label: appt.cancel?.reason === 'no-show' ? 'No-show' : 'Cancelled' };
    case 'confirmed': return { pill: 'confirmed', label: 'Confirmed' };
    case 'fitting': return customer ? { pill: 'fitting', label: 'Fitting' } : { pill: 'action', label: 'Fitting' };   // M7-1-T-03: photographing and sending is Amara's move (D-95)
    case 'price-change':
      if (customer) return { pill: 'action', label: pick('Approve order', 'Approve') };
      if (appt.priceChange?.state !== 'messaged') return waiting;
      /* D-112: once Amara has answered, the move is Sarah's again */
      return lastSpeakerSince(appt)?.from === 'tailor' ? waiting : { pill: 'action', label: pick(`Reply to ${sarah}`, 'Reply') };
    case 'in-progress':
      /* Study-1 B1: a post-fitting edit waiting on Sarah is her move */
      if (appt.edit?.state === 'pending') return customer ? { pill: 'action', label: pick('Approve changes', 'Approve') } : waiting;
      return { pill: 'in-progress', label: 'In progress' };
    case 'ready': return customer ? { pill: 'action', label: 'Ready' } : waiting;
    case 'awaiting-handoff': {
      const how = appt.returnOption ?? 'pickup';
      const h = appt.handoff ?? {};
      /* Study-1 A3: a reported problem is Amara's move; a handoff she marked is Sarah's to confirm (or the countdown completes it) */
      if (h.problemAt) return customer ? { pill: 'waiting', label: pick('Problem reported', 'Problem') } : { pill: 'action', label: pick(`${sarah} didn’t get it`, 'Problem') };
      if (h.markedAt) return customer ? { pill: 'action', label: pick('Confirm you got it', 'Picked up') } : { pill: 'awaiting-handoff', label: 'Picked up' };
      /* K-40: the courier is booked for the window Sarah picked (it is not on its way until it collects) */
      if (how === 'courier') return { pill: 'awaiting-handoff', label: pick('Courier booked', 'Courier') };
      return { pill: 'awaiting-handoff', label: pick('Ready for pickup', 'Pickup') };
    }
    case 'completed': return { pill: 'completed', label: 'Completed' };
    default: return { pill: appt.status, label: undefined };
  }
}

/** Since when the job has been at its current step (the latest history entry for its status), as list copy:
    "since 5:00 PM" today, else "since Thu, Oct 15". Both personas' "In progress" rows use it (D-115, D-116). */
export function sinceText(appt) {
  const at = [...appt.history].reverse().find((h) => h.status === appt.status)?.at ?? appt.slot.start;
  return `since ${isoDay(at) === isoDay(now()) ? fmtTime(at) : fmtDay(at)}`;
}

/** The return step word on an awaiting-handoff order (D-106, D-170), one source for the t-home rows and the status words:
    Ready for pickup · Courier booked, on both sides (K-37: no drop-off; K-40: the courier is booked for Sarah's window). */
export function returnStep(appt) {
  return appt?.returnOption === 'courier' ? 'Courier booked' : 'Ready for pickup';
}
