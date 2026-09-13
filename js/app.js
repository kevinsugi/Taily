/* ============================================================
   Taily v4 — router
   render(screenId) + a history stack. No screens are registered yet;
   Phase 4+ adds them via register() from js/screens/<id>.js.
   ============================================================ */

import { state } from './state.js';
import { toast, closeOverlay } from './components.js';

/* Screens self-register via register(). They are loaded dynamically in
   boot() — a static import here would run the screen module before this
   module body (imports hoist), hitting the `screens` map in its TDZ.
   The list grows as Phase 4 lands each screen. */
const SCREEN_MODULES = [
  '01-home', '01a-home-selected', '02-appointment-details', '02.1-date-time-sheet', '02.2-address-sheet', '09-bookings',
  '02.3-payment-sheet', '02.4-add-card-sheet', '03-status-confirmed', '03-status-tailoring', '03-status-summary',
  '03-status-requested', '03-status-reminder', '10-messages',
  '04-review-approve', '04-review-approve-modified', '05-items-ready', '05a-pickup-window', '05b-delivery-options', '06-journey-complete',
  '03.1-reschedule-popup', '03-status-cancelled', '03.2-appointment-confirmed', '03.3-photo-viewer', '04.1-request-changes',
  '05.1-window-confirmed', '06.1-leave-review',
  /* UX-LOOP round 3 Figma sync: sibling frames for the round-2 live-only states (fixture routes) */
  '03-status-expired', '03-status-declined', '03-status-tailor-cancelled', '03-status-no-show', '03-status-new-time',
  '04-review-approve-removed', '05.1-window-confirmed-dated', '09-bookings-closed',
  /* UX-LOOP round 8 Figma money sync: sibling frames for the round-7 live-only states (fixture routes) */
  '03-status-reminder-locked', '03-status-confirmed-locked', '03-status-unconfirmed', '04-review-approve-retiered',
  /* UX-LOOP round 9: 03/Confirmed's booking photos open the viewer (sibling frame, fixture route) */
  '03.3-photo-viewer-booking',
  /* Tailor flow (Phase T) — Marco's view of the same appointment */
  't01-home', 't02-appointment-request', 't03-request-accepted', 't03a-decline-request', 't03b-job-cancelled',
  't04-appointment-details', 't05-confirm-final-pricing', 't06-appointment-status', 't07-job-ready', 't08-job-complete',
  't01-home-closed', 't02-accepted', 't02-expired', 't03-upcoming-visit', 't03.1-cant-make-it', 't03a-suggest-time', 't03a-other',
  't03b-by-you', 't03b-no-show', 't03b-withdrawn', 't05-removed', 't06-questions', 't07-waiting', 't10-messages',
];

/* Persona gate (Phase T5, throwaway until onboarding sets it): tailor
   screens are t-prefixed; opening one flips the persona, the shared
   messages screen keeps whichever persona opened it (its tailor-side
   fixture route `t10-messages` flips it like any t-screen). */
const isTailorScreen = (id) => /^t\d/.test(id);   // t01…t08, t10-messages (round 3)
function syncPersona(id) {
  if (isTailorScreen(id)) state.persona = 'tailor';
  else if (id !== '10-messages') state.persona = 'user';
  /* the Test flows menu (flow-menu.js) repaints its persona labels */
  document.dispatchEvent(new CustomEvent('taily:persona'));
}

/** screenId -> { view: render(state) => HTML, wire?: (rootEl) => void } */
const screens = new Map();

/** Screen ids visited, most recent last. */
const history = [];

const mount = () => document.getElementById('screen');

/** Register a screen module. Called by js/screens/<id>.js. */
export function register(id, render, wire) {
  if (typeof render !== 'function') {
    throw new TypeError(`register("${id}"): render must be a function`);
  }
  screens.set(id, { view: render, wire });
}

export function registered() {
  return [...screens.keys()].sort();
}

export function currentScreen() {
  return history[history.length - 1] ?? null;
}

/* ---------- Browser history (UX-LOOP R1-U-16) ----------
   Every screen push mirrors into window.history (same URL — the
   `?screen=` deep link is preserved verbatim), so the phone's back
   gesture steps the prototype back instead of leaving it. An open
   overlay is closed first. The first render replaces the landing entry
   so there is never a stray entry before the root screen. */
const H = typeof window !== 'undefined' ? window.history : null;
let ignorePops = 0;
function syncHistory(id, replace) {
  if (!H) return;
  const ours = H.state && H.state.taily;
  if (replace || !ours) H.replaceState({ taily: id }, '', location.href);
  else H.pushState({ taily: id }, '', location.href);
}

/**
 * Paint a screen.
 * @param {string} id      screen id from scripts/screens.json
 * @param {object} [opts]
 * @param {boolean} [opts.replace]  replace the top of the history stack
 * @param {boolean} [opts.fresh]    start a new history at this screen
 *                                  (the Test flows menu's jumps)
 */
export function render(id, opts = {}) {
  const entry = screens.get(id);
  const el = mount();
  if (!el) throw new Error('render(): #screen is missing from index.html');

  if (!entry) {
    // Explicit and visible: a missing screen is a scaffold gap, not a blank page.
    el.innerHTML = `<pre class="screen-missing">No screen registered for "${id}".
Registered: ${registered().join(', ') || '(none yet)'}</pre>`;
    el.dataset.screen = id;
    announce(id);
    return false;
  }

  /* UX-LOOP R2-U-01: an overlay that a handler navigated away from
     (03.2 / 05.1 / 03.1 confirms) must not outlive its screen — close
     it NOW so the page unfreezes and the next popstate steps back
     instead of running a stale close. */
  closeOverlay({ instant: true });
  const prevPersona = state.persona;
  syncPersona(id);
  /* R2-U-12: a toast raised by one persona does not survive the flip */
  if (prevPersona !== state.persona) document.querySelectorAll('.toast').forEach((t) => t.remove());
  el.innerHTML = entry.view(state);
  el.dataset.screen = id;
  entry.wire?.(el);
  window.__tailyNavigated = true;   // first render sets it AFTER wire ran

  if (opts.fresh) history.length = 0;
  const same = currentScreen() === id;
  if (opts.replace && history.length) history[history.length - 1] = id;
  else if (!same) history.push(id);
  syncHistory(id, opts.replace || opts.fresh || same || history.length < 2);

  announce(id);
  return true;
}

/** Step back one screen. Returns the id now showing, or null at the root. */
export function back() {
  if (history.length < 2) return null;
  history.pop();
  const to = history[history.length - 1];
  render(to, { replace: true });
  /* keep the browser stack in step: drop the entry we just left (the
     popstate it fires is ours — ignored) */
  if (H && H.state?.taily && H.length > 1) { ignorePops++; H.back(); }
  return to;
}

function onPopState(e) {
  if (ignorePops > 0) { ignorePops--; return; }
  if (closeOverlay()) {
    /* the browser already dropped an entry — put the screen's back so
       the next gesture still steps a screen */
    H.pushState({ taily: currentScreen() }, '', location.href);
    return;
  }
  const id = e?.state?.taily;
  if (history.length >= 2 && (!id || history[history.length - 2] === id)) {
    history.pop();                       // back
    render(history[history.length - 1], { replace: true });
  } else if (id && screens.has(id) && id !== currentScreen()) {
    history.push(id);                    // forward
    render(id, { replace: true });
  }
}

function announce(id) {
  const status = document.getElementById('route-status');
  if (status) status.textContent = `${id} — screen`;
}

/* Mobile-web feel (Phase R5, Kevin): mouse click-drag pans any screen
   vertically, like a thumb would (touch/wheel already scroll natively).
   A >5px drag suppresses the click so buttons don't fire mid-pan.
   Regions with their own drag behaviour opt out. */
function wireDragScroll() {
  let startY = null; let startScroll = 0; let dragged = false;
  document.addEventListener('pointerdown', (e) => {
    dragged = false;
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (e.target.closest('.photo-row, .wheel__col--scroll, input, textarea, .stage-caption')) return;
    startY = e.clientY;
    startScroll = window.scrollY;
  });
  document.addEventListener('pointermove', (e) => {
    if (startY === null) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) > 5) dragged = true;
    if (dragged) window.scrollTo(0, startScroll - dy);
  });
  const end = () => { startY = null; };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  document.addEventListener('click', (e) => {
    if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; }
  }, true);
}

/**
 * Boot. `?screen=<id>` wins so scripts/diff.mjs can open one screen
 * directly; otherwise fall back to the first registered screen.
 */
async function boot() {
  await Promise.all(SCREEN_MODULES.map((m) => import(`./screens/${m}.js`)));
  wireDragScroll();
  window.addEventListener('popstate', onPopState);
  /* UX-004: Profile has no screen — acknowledge instead of ignoring */
  document.addEventListener('click', (e) => {
    const profile = e.target.closest('[data-nav="profile"]');
    if (profile) { e.preventDefault(); toast('Profile is outside this prototype'); }
  });
  state.persona ??= 'user';
  /* Test flows menu (bottom-right): every step of both flows, plus the
     persona flip. Loaded after the screens — its jumps press their buttons. */
  const { initFlowMenu, runFlow } = await import('./flow-menu.js');
  initFlowMenu(render);
  const params = new URLSearchParams(location.search);
  const flow = params.get('flow');
  if (flow && !params.get('screen') && runFlow(flow)) return;
  const wanted = params.get('screen');
  const first = registered()[0];
  const id = wanted || first;
  if (id) render(id);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

// Handy at the console while building screens.
window.Taily = { render, back, register, registered, currentScreen, state };
