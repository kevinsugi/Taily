/* ============================================================
   Taily v5 — router
   render(screenId) + a history stack. Screens self-register via
   register() from js/screens/<id>.js; SCREEN_MODULES lists them (one
   line per screen id, grouped by milestone). The v4 screens live in
   js/screens/v4/ and are never loaded.
   ============================================================ */

import { state } from './state.js';
import { toast, closeOverlay, clearToasts, overlayOpen, wireRadioRows, wireInfo, wireVerified, withNavBack } from './components.js';
import { SCREENS } from './inventory.js';
import { systemBanner, wireSystem } from './system.js';

/* Screens are loaded dynamically — a static import here would run the screen module before this module body (imports hoist),
   hitting the `screens` map in its TDZ. Add a screen = add its id on its milestone's line.
   K-04 / D-212: boot imports only the core and the requested screen, paints, then idle-loads the rest; render() awaits a module that has not
   loaded yet. The Test-flows registry, its fixtures, the menu and the component gallery (flows.js, flow-menu.js) load on demand — a
   ?flow= / ?screen= / ?test=1 / sys- boot, or the first input — so a plain visit never pays for them. */
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
  't-adjust', 'c-price-change', 'c-ready', 'c-complete', 'c-review',
  /* M5 · Messaging, accounts, earnings, system */
  'c-messages', 'c-account', 'c-addresses', 'c-cards', 'c-orders', 't-earnings', 't-payout', 't-messages',
];

/** Every screen id the router can load. A screen not yet imported is "known": render() loads it first. */
const KNOWN = new Set(SCREEN_MODULES);

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
  if (id && KNOWN.has(id)) return id;
  /* D-67: until t-home exists a tailor's home is her shop; never the developer index */
  if (persona === 'tailor' && KNOWN.has('t-shop')) return 't-shop';
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

/** Every screen the router can show: the ones registered so far plus the ones still to load (D-212). */
export function registered() {
  return [...new Set([...screens.keys(), ...KNOWN])].sort();
}

/* ---------- lazy loading (D-212) ---------- */
const loading = new Map();    // id -> Promise of the module import
const settled = new Set();    // ids whose import finished (registered, or failed)
/** Import a screen's module (memoised). Resolves once it has called register(). */
export function loadScreen(id) {
  if (!loading.has(id)) {
    loading.set(id, import(`./screens/${id}.js`).catch((e) => { console.error(`screen "${id}" failed to load`, e); }).finally(() => settled.add(id)));
  }
  return loading.get(id);
}
const loadAllScreens = () => Promise.all(SCREEN_MODULES.map(loadScreen));
/* the component gallery pulls the fixtures: it loads on demand with sys-components, never in the background */
const idleLoad = () => Promise.all(SCREEN_MODULES.filter((m) => m !== 'sys-components').map(loadScreen));
const whenIdle = (fn) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300));

/** The Test-flows registry + fixtures + menu (flows.js, flow-menu.js), loaded on demand; mounts the menu once. */
let tools = null;
let toolsLoading = null;
let bootLatency = 'normal';
export function loadTools() {
  return (toolsLoading ??= Promise.all([import('./flows.js'), import('./flow-menu.js')]).then(([flows, menu]) => {
    tools = { flows, menu };
    flows.setBootLatency(bootLatency);
    window.Taily.flows = flows.ALL_FLOWS;
    menu.initFlowMenu(render, { home: personaHome });
    return tools;
  }));
}
/** Run a Test-flows entry. Synchronous once the registry has loaded; before that it loads it (and every screen: a flow's setup may press buttons anywhere) and runs after. */
export function runFlow(key, opts) {
  if (tools) return tools.menu.runFlow(key, opts);
  loadTools().then(() => loadAllScreens()).then(() => tools.menu.runFlow(key, opts));
  return true;
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

  /* D-212: a known screen whose module has not loaded yet — load it, then paint (a loaded screen still paints synchronously) */
  if (!entry && KNOWN.has(id) && !settled.has(id)) {
    loadScreen(id).then(() => render(id, opts));
    return true;
  }

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
  const prevScreen = el.dataset.screen;
  /* AU-P1-2a: a same-screen render replaces the node, so remember which control had focus (before an overlay closes and moves it) */
  if (prevScreen === id) rememberFocus(el); else pendingFocus = null;
  closeOverlay({ instant: true });
  el = freshMount();
  syncPersona(id);
  /* a toast never outlives its screen: any change of screen id (or persona) clears it.
     Re-rendering the SAME screen keeps it (an Undo toast survives the re-render that follows). */
  if (prevScreen !== id) clearToasts();
  el.innerHTML = withNavBack(entry.view(state));
  /* M5 system layer (D-138): the offline banner sits under the top bar of every screen */
  const sys = systemBanner(state);
  if (sys) {
    /* M6-A-18: right after the top nav in the reading order (a screen without one gets it first) */
    const nav = el.querySelector('.top-nav, .flow-bar');   // M7: the booking flow bar sits where the nav does
    if (nav) nav.insertAdjacentHTML('afterend', sys); else el.insertAdjacentHTML('afterbegin', sys);
  }
  el.dataset.screen = id;
  entry.wire?.(el);
  /* M6-A-11: radio groups (chips, segmented, option rows) are one tab stop with arrow keys */
  if (el.isConnected && el.dataset.screen === id) wireRadioRows(el);
  /* M7: the ⓘ info sheets (infoButton) and the Verified sheet (verifiedMark) open from any screen; screens never wire them */
  if (el.isConnected && el.dataset.screen === id) { wireInfo(el); wireVerified(el); }
  /* a wire() that forwarded elsewhere (redirectIfMoved) already rendered the destination with its own system layer */
  if (el.isConnected && el.dataset.screen === id) wireSystem(el, id, { go: render });
  wireBackButtons(el);
  if (el.isConnected && el.dataset.screen === id) restoreFocus(el);
  /* R3-2-C-01: a new screen opens at its top (its pill + title are what it says first); a re-render of the
     SAME screen keeps its scroll, so a sheet, a toast or a busy repaint never jumps the page. A wire()
     that forwarded elsewhere (redirectIfMoved) already rendered — and reset — the destination. */
  if (prevScreen !== id && el.isConnected && el.dataset.screen === id) window.scrollTo(0, 0);

  if (opts.fresh) history.length = 0;
  const same = currentScreen() === id;
  if (opts.replace && history.length) history[history.length - 1] = id;
  else if (!same) history.push(id);
  syncHistory(id, opts.replace || opts.fresh || same || history.length < 2);

  /* M6-A-08: the sticky action bar's height (+16) is what the content must clear — scroll-padding and the body's bottom padding read it */
  syncBarHeight(el);
  /* K-07 / K-08: hairline on scroll — the action bar's top edge while content continues below */
  wireScrollEdges(el);
  announce(id);
  /* M6-A-04: a new screen moves focus to its h1 so a screen reader starts at the title; an open overlay keeps the focus it set */
  if (prevScreen !== id && el.isConnected && !overlayOpen() && !el.contains(document.activeElement)) {   // a wire() that focused a field keeps it
    const h1 = el.querySelector('h1');
    if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
  }
  return true;
}

/* ---------- focus across same-screen renders (K-04 / AU-P1-2a) ----------
   Every in-place state change goes through go(ID), which replaces #screen, so the focused control is gone. rememberFocus() keys the focused
   control (id, data-act, data-type, data-value, data-id, data-garment, data-kind, data-key, data-name + minus / plus) and the list it
   sits in; restoreFocus() runs after wire(): the same control, else its list, else the h1. A key that is present but disabled this
   render (a held busy state) waits for the next render, for up to 4 s. A screen change drops it. */
let pendingFocus = null;
const FOCUS_ATTRS = ['act', 'type', 'value', 'id', 'garment', 'kind', 'key', 'name', 'index'];
const LIST_SEL = '[role="list"], [role="listbox"], [role="radiogroup"], [role="group"], ul, ol, .thread-list, .photo-tiles';
function rememberFocus(root) {
  const ae = document.activeElement;
  if (!ae || ae === document.body || !root.contains(ae) || ae.closest('.screen-sheet--overlay, .modal-host, .sheet-host')) return;
  const data = {};
  for (const k of FOCUS_ATTRS) if (ae.dataset[k] !== undefined) data[k] = ae.dataset[k];
  const side = ae.matches('[data-minus]') ? 'minus' : ae.matches('[data-plus]') ? 'plus' : null;
  const box = ae.closest(LIST_SEL);
  const boxSel = box && box !== root ? (box.id ? `#${CSS.escape(box.id)}` : box.getAttribute('aria-label') ? `[aria-label="${CSS.escape(box.getAttribute('aria-label'))}"]` : box.classList[0] ? `.${CSS.escape(box.classList[0])}` : null) : null;
  if (!ae.id && !Object.keys(data).length && !side) return;
  pendingFocus = { id: ae.id, data, side, tag: ae.tagName, boxSel, until: performance.now() + 4000 };
}
function findFocus(root, f) {
  if (f.id) { const byId = root.querySelector(`#${CSS.escape(f.id)}`); if (byId) return byId; }
  const attrs = Object.entries(f.data).map(([k, v]) => `[data-${k}="${CSS.escape(v)}"]`).join('');
  if (!attrs) return null;
  const hits = [...root.querySelectorAll(`${f.tag.toLowerCase()}${attrs}`)];
  const want = f.side === 'minus' ? '[data-minus]' : f.side === 'plus' ? '[data-plus]' : ':not([data-minus])';   // a tile that became a − / + pair: land on +
  return hits.find((h) => h.matches(want)) ?? hits[0] ?? null;
}
function restoreFocus(root) {
  const f = pendingFocus;
  if (!f) return;
  if (performance.now() > f.until) { pendingFocus = null; return; }
  if (overlayOpen()) return;
  const ae = document.activeElement;
  if (ae && ae !== document.body && root.contains(ae)) { pendingFocus = null; return; }   // a wire() put focus somewhere on purpose
  const hit = findFocus(root, f);
  if (hit && hit.disabled) {
    const sib = f.side && [...hit.parentElement.children].find((c) => c !== hit && c.matches('button') && !c.disabled);   // a − / + pair: the other half
    if (sib) { pendingFocus = null; sib.focus({ preventScroll: true }); }
    return;                                                                               // else it is held this render: try the next one
  }
  pendingFocus = null;
  if (hit) { hit.focus({ preventScroll: true }); return; }
  const box = (f.boxSel && root.querySelector(f.boxSel)) || null;
  const target = box ?? root.querySelector('h1');
  if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
}

let barObserver = null;
/* K-07 / K-08: #screen[data-more] (content continues below the viewport) drives the action bar's top hairline in components-v5.css
   (the nav has no hairline and is not pinned, K-08). One passive scroll listener per screen, coalesced into one rAF; writes only when a flag flips.
   Under html.is-test the flags are set at paint and never follow resize / content changes, so a full-page screenshot is deterministic. */
let edgeOff = null;
function wireScrollEdges(el) {
  edgeOff?.();
  edgeOff = null;
  if (!el.isConnected) return;
  const doc = document.documentElement;
  const set = (name, on) => { const v = on ? 'true' : 'false'; if (el.dataset[name] !== v) el.dataset[name] = v; };
  const measure = () => {
    set('more', doc.scrollHeight - window.scrollY - window.innerHeight > 1);
  };
  measure();
  let raf = 0;
  const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); }); };
  window.addEventListener('scroll', queue, { passive: true });
  const off = [() => window.removeEventListener('scroll', queue)];
  if (!doc.classList.contains('is-test')) {
    window.addEventListener('resize', queue, { passive: true });
    off.push(() => window.removeEventListener('resize', queue));
    if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(queue); ro.observe(el); off.push(() => ro.disconnect()); }
  }
  /* the first paint can still settle (fonts, the scroll reset above): measure once more next frame */
  queue();
  off.push(() => cancelAnimationFrame(raf));
  edgeOff = () => off.forEach((f) => f());
}

/* K-09 / P1-5 (D-225): the sticky bar yields when it would cover over a quarter of the viewport: #screen[data-bar-tall] makes it static
   (the page's closing block, still last in DOM and focus order; components-v5.css owns the look). Measured at paint, then on bar changes;
   the window / visualViewport resize listeners are skipped under html.is-test (like wireScrollEdges). */
let barOff = null;
function syncBarHeight(el) {
  const root = document.documentElement;
  barObserver?.disconnect();
  barObserver = null;
  barOff?.();
  barOff = null;
  const bar = el.querySelector('.action-bar');
  if (!bar) { root.style.removeProperty('--bar-h'); delete el.dataset.barTall; return; }
  const set = () => {
    const cur = el.querySelector('.action-bar') ?? bar;      // screens swap the bar in place while typing (patch)
    root.style.setProperty('--bar-h', `${cur.offsetHeight + 16}px`);
    const tall = cur.offsetHeight > window.innerHeight * 0.25;
    if (tall) { if (el.dataset.barTall !== 'true') el.dataset.barTall = 'true'; } else if (el.dataset.barTall) delete el.dataset.barTall;
  };
  set();
  if (typeof ResizeObserver !== 'undefined') { barObserver = new ResizeObserver(set); barObserver.observe(bar); }
  if (!root.classList.contains('is-test')) {
    window.addEventListener('resize', set, { passive: true });
    window.visualViewport?.addEventListener('resize', set, { passive: true });
    barOff = () => { window.removeEventListener('resize', set); window.visualViewport?.removeEventListener('resize', set); };
  }
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
  } else if (id && KNOWN.has(id) && id !== currentScreen()) {
    history.push(id);                    // forward
    render(id, { replace: true });
  }
}

/* M6-A-04: the live region and the tab title carry the screen's name — its h1, else the inventory title, else the id */
function announce(id) {
  const status = document.getElementById('route-status');
  const h1 = document.querySelector('#screen h1')?.textContent.trim();
  const name = h1 || SCREENS.find((s) => s.id === id)?.title || id;
  if (status) status.textContent = name;
  document.title = `${name} · Taily`;
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
  /* M7 (D-186): the booking flow bar (components.js flowBar) replaces the top nav on steps 2-5; its ✕ "Leave booking" goes
     Home (c-job). The draft job lives in state.job, so nothing is lost and nothing is asked — nothing was sent. */
  document.addEventListener('click', (e) => {
    const exit = e.target.closest('[data-act="exit-booking"]');
    if (!exit || exit.disabled) return;
    e.preventDefault();
    render(KNOWN.has('c-job') ? 'c-job' : personaHome('customer'));
  });
  /* M7 (ratingLine): an in-page anchor scrolls to its section; no hash is written, so the router's history is untouched */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-anchor]');
    if (!a) return;
    e.preventDefault();
    const target = document.getElementById(a.dataset.anchor);
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('is-test');
    target?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  });
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-nav]');
    if (!link) return;
    e.preventDefault();
    const target = NAV_ROUTES[state.persona]?.[link.dataset.nav];
    if (target && KNOWN.has(target)) { if (currentScreen() !== target) render(target); }
    else toast('Not built yet');
  });
}

/* The pinned Test-flows control (outside .screen) stays hidden until the first input,
   so a screenshot of #screen never sees it. */
function revealOnFirstInput() {
  /* D-212: the first input also loads the Test-flows menu, so a plain visit pays for it only when someone is about to use it */
  const reveal = () => { document.documentElement.classList.add('has-input'); loadTools(); };
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, reveal, { once: true, passive: true }));
}

/* AU-P1-2c (K-04): a busy button is aria-disabled + aria-busy, NOT `disabled` (so it keeps focus through the repaint). One capturing guard
   keeps every screen's click handler from seeing a press on it. */
function guardBusy() {
  document.addEventListener('click', (e) => {
    const busy = e.target.closest?.('button[aria-busy="true"], [role="button"][aria-busy="true"], a[aria-busy="true"]');
    if (busy) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
}

/**
 * Boot. `?flow=<key>` runs that Test-flows entry; else `?screen=<id>`
 * renders that screen in its PRIMARY state (primaryFlow: its ◆ entry's setup, so it never opens on an empty model);
 * a screen with no entry renders on the seed; else sys-index. `?test=1` makes the demo
 * deterministic (instant latency, no transitions or caret).
 * D-212: a plain visit imports the core + sys-index, paints, then idle-loads the other screens; the flows registry, menu and the
 * other screens load up front only for ?flow= / ?screen= / ?test=1 (their setups press buttons on any screen), and on first input otherwise.
 */
async function boot() {
  const params = new URLSearchParams(location.search);
  const test = !!params.get('test');
  if (test) {
    document.documentElement.classList.add('is-test');
  }
  bootLatency = test ? 'instant' : 'normal';
  state.sim.latency = bootLatency;
  const flow = params.get('flow');
  const screen = params.get('screen');
  const first = screen || 'sys-index';
  const wantsTools = test || !!flow || !!screen;
  if (wantsTools) await Promise.all([loadTools(), loadAllScreens()]);
  else await loadScreen(first);
  wireDragScroll();
  wireTopNav();
  guardBusy();
  revealOnFirstInput();
  window.addEventListener('popstate', onPopState);
  state.persona ??= 'customer';
  document.documentElement.dataset.persona = state.persona;
  if (!wantsTools) whenIdle(() => idleLoad());
  if (tools) {
    if (flow && !screen && tools.menu.runFlow(flow)) return;
    const primary = screen && tools.flows.primaryFlow(screen);
    if (primary && tools.menu.runFlow(primary.key, { keepUrl: true })) return;
  }
  render(first);
}

/* Handy at the console, and the harness's entry point. `ready` resolves when boot() has painted. `flows` fills in when the registry loads. */
let markReady;
const ready = new Promise((resolve) => { markReady = resolve; });
window.Taily = { render, back, register, registered, currentScreen, state, runFlow, flows: [], personaHome, ready, loadTools, loadScreen };

const start = () => boot().finally(markReady);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
