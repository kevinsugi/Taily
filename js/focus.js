/* ============================================================
   Taily v5 — which appointment a detail screen shows (D-72). DOM-free.
   Detail screens (c-request, c-booking, t-request, t-job, t-thread)
   never guess with activeAppt(): whoever navigates there calls
   setFocus(appt.id) first, the screen reads focusAppt(ID), and its
   wire() calls redirectIfMoved(ID, go).
   ============================================================ */
import { state, getAppt, apptsFor, statusScreen } from './state.js';

/** c- customer · t- / to- tailor. sys- screens keep the current persona. */
function personaOf(screenId) {
  if (String(screenId).startsWith('c-')) return 'customer';
  if (/^(t|to)-/.test(String(screenId))) return 'tailor';
  return state.persona;
}

/** Withdrawn / switched requests never became bookings (D-78): they are not a fallback target. */
const dropped = (a) => a.status === 'cancelled' && ['withdrawn', 'switched'].includes(a.cancel?.reason);

/** Name the appointment the next detail screen shows. */
export function setFocus(id) { state.ui.apptId = id; }

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
