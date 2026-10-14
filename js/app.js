/* ============================================================
   Taily v5 — router
   render(screenId) + a history stack. Screens self-register via
   register() from js/screens/<id>.js; SCREEN_MODULES lists them (one
   line per screen id, grouped by milestone). The v4 screens live in
   js/screens/v4/ and are never loaded.
   ============================================================ */

import { state } from './state.js';
import { toast, closeOverlay, clearToasts } from './components.js';
import { ALL_FLOWS, setBootLatency, primaryFlow } from './flows.js';
import { initFlowMenu, runFlow } from './flow-menu.js';

/* Screens are loaded dynamically in boot() — a static import here would run
   the screen module before this module body (imports hoist), hitting the
   `screens` map in its TDZ. Add a screen = add its id on its milestone's line. */
const SCREEN_MODULES = [
  /* M0 · System */
  'sys-index', 'sys-components',
  /* M1 · Customer booking */
  'c-welcome', 'c-phone', 'c-code', 'c-name', 'c-thread',
  'c-job', 'c-where', 'c-tailors', 'c-tailor',
  'c-book', 'c-pay', 'c-request',
  /* M2 · Tailor onboarding + Shop */
  't-phone', 't-code', 'to-profile', 'to-services', 'to-where', 'to-returns', 'to-availability',
  'to-payouts', 'to-done', 't-shop', 't-rush',
  /* M3 · Request loop */
  't-home', 't-request', 't-suggest', 't-job', 't-thread', 'c-bookings', 'c-booking',
  /* M4 · Fitting to completion */
  /* M5 · Messaging, accounts, earnings, system */
];

/* Where Back at the root and the persona flip land; sys-index until those screens are registered. */
const PERSONA_HOME = { customer: 'c-job', tailor: 't-home' };

/* Persona comes from the id: c- customer, t- / to- tailor, sys- keeps the current one. */
export function personaOfScreen(id) {
  if (id.startsWith('c-')) return 'customer';
  if (/^(t|to)-/.test(id)) return 'tailor';
  return null;
}
function syncPersona(id) {
  state.persona = personaOfScreen(id) ?? state.persona ?? 'customer';
  document.documentElement.dataset.persona = state.persona;
  /* the Test flows menu (flow-menu.js) repaints its persona labels */
  document.dispatchEvent(new CustomEvent('taily:persona'));
}

/** The landing screen for a persona (falls back to sys-index while that screen is unregistered). */
export function personaHome(persona = state.persona) {
  const id = PERSONA_HOME[persona];
  if (id && screens.has(id)) return id;
  /* D-67: until t-home exists a tailor's home is her shop; never the developer index */
  if (persona === 'tailor' && screens.has('t-shop')) return 't-shop';
  return 'sys-index';
}

/* Top-nav destinations per persona; an unregistered target says so instead of doing nothing. */
const NAV_ROUTES = {
  customer: { home: 'c-job', bookings: 'c-bookings', messages: 'c-messages', account: 'c-account' },
  tailor: { home: 't-home', shop: 't-shop', earnings: 't-earnings', messages: 't-messages' },
};

/** screenId -> { view: render(state) => HTML, wire?: (rootEl) => void } */
const screens = new Map();

/** Screen ids visited, most recent last. */
const history = [];

const mount = () => document.getElementById('screen');

/* Every render hands wire() a FRESH #screen node (same id, attributes, position). The element used to persist, so a
   screen's `root.addEventListener('click', …)` stacked a listener per render and a same-id go() doubled every handler
   (M1 integration). Replacing the node drops them all; nothing else holds a reference across renders. */
function freshMount() {
  const old = mount();
  if (!old) return null;
  const el = old.cloneNode(false);
  old.replaceWith(el);
  return el;
}

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
/** The screen the user arrived from (null at the root). */
export function previousScreen() {
  return history[history.length - 2] ?? null;
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
 * @param {string} id      screen id (js/inventory.js)
 * @param {object} [opts]
 * @param {boolean} [opts.replace]  replace the top of the history stack
 * @param {boolean} [opts.fresh]    start a new history at this screen
 *                                  (the Test flows menu's jumps)
 */
export function render(id, opts = {}) {
  const entry = screens.get(id);
  let el = mount();
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
  const prevScreen = el.dataset.screen;
  el = freshMount();
  syncPersona(id);
  /* a toast never outlives its screen: any change of screen id (or persona) clears it.
     Re-rendering the SAME screen keeps it (an Undo toast survives the re-render that follows). */
  if (prevScreen !== id) clearToasts();
  el.innerHTML = entry.view(state);
  el.dataset.screen = id;
  entry.wire?.(el);
  wireBackButtons(el);
  /* R3-2-C-01: a new screen opens at its top (its pill + title are what it says first); a re-render of the
     SAME screen keeps its scroll, so a sheet, a toast or a busy repaint never jumps the page. A wire()
     that forwarded elsewhere (redirectIfMoved) already rendered — and reset — the destination. */
  if (prevScreen !== id && el.isConnected && el.dataset.screen === id) window.scrollTo(0, 0);

  if (opts.fresh) history.length = 0;
  const same = currentScreen() === id;
  if (opts.replace && history.length) history[history.length - 1] = id;
  else if (!same) history.push(id);
  syncHistory(id, opts.replace || opts.fresh || same || history.length < 2);

  announce(id);
  return true;
}

/* The Back control beside every heading (components.js backButton) — steps
   the prototype's history; at the root (a cold `?screen=` link) it goes Home
   for the persona showing. Screens that wire their own `[data-act="back"]`
   are left alone. */
function wireBackButtons(root) {
  root.querySelectorAll('.back[data-act="back"]').forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => back() || render(personaHome()));
  });
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

/* Top-nav links (components.js topNav): jump to the persona's destination when it is built. */
function wireTopNav() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-nav]');
    if (!link) return;
    e.preventDefault();
    const target = NAV_ROUTES[state.persona]?.[link.dataset.nav];
    if (target && screens.has(target)) { if (currentScreen() !== target) render(target); }
    else toast('Not built yet');
  });
}

/* The pinned Test-flows control (outside .screen) stays hidden until the first input,
   so a screenshot of #screen never sees it. */
function revealOnFirstInput() {
  const reveal = () => document.documentElement.classList.add('has-input');
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, reveal, { once: true, passive: true }));
}

/**
 * Boot. `?flow=<key>` runs that Test-flows entry; else `?screen=<id>`
 * renders that screen in its PRIMARY state (primaryFlow: its ◆ entry's setup, so it never opens on an empty model);
 * a screen with no entry renders on the seed; else sys-index. `?test=1` makes the demo
 * deterministic (instant latency, no transitions or caret).
 */
async function boot() {
  const params = new URLSearchParams(location.search);
  if (params.get('test')) {
    document.documentElement.classList.add('is-test');
  }
  setBootLatency(params.get('test') ? 'instant' : 'normal');
  await Promise.all(SCREEN_MODULES.map((m) => import(`./screens/${m}.js`)));
  wireDragScroll();
  wireTopNav();
  revealOnFirstInput();
  window.addEventListener('popstate', onPopState);
  state.persona ??= 'customer';
  document.documentElement.dataset.persona = state.persona;
  /* Test flows menu (bottom-right): every state, plus the persona flip. */
  initFlowMenu(render, { home: personaHome });
  const flow = params.get('flow');
  if (flow && !params.get('screen') && runFlow(flow)) return;
  const screen = params.get('screen');
  const primary = screen && primaryFlow(screen);
  if (primary && runFlow(primary.key, { keepUrl: true })) return;
  render(screen || 'sys-index');
}

/* Handy at the console, and the harness's entry point. `ready` resolves when boot() has painted. */
let markReady;
const ready = new Promise((resolve) => { markReady = resolve; });
window.Taily = { render, back, register, registered, currentScreen, state, runFlow, flows: ALL_FLOWS, personaHome, ready };

const start = () => boot().finally(markReady);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
