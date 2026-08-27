/* ============================================================
   Taily v4 — router
   render(screenId) + a history stack. No screens are registered yet;
   Phase 4+ adds them via register() from js/screens/<id>.js.
   ============================================================ */

import { state } from './state.js';

/** screenId -> render(state) => HTML string */
const screens = new Map();

/** Screen ids visited, most recent last. */
const history = [];

const mount = () => document.getElementById('screen');

/** Register a screen module. Called by js/screens/<id>.js. */
export function register(id, render) {
  if (typeof render !== 'function') {
    throw new TypeError(`register("${id}"): render must be a function`);
  }
  screens.set(id, render);
}

export function registered() {
  return [...screens.keys()].sort();
}

export function currentScreen() {
  return history[history.length - 1] ?? null;
}

/**
 * Paint a screen.
 * @param {string} id      screen id from scripts/screens.json
 * @param {object} [opts]
 * @param {boolean} [opts.replace]  replace the top of the history stack
 */
export function render(id, opts = {}) {
  const view = screens.get(id);
  const el = mount();
  if (!el) throw new Error('render(): #screen is missing from index.html');

  if (!view) {
    // Explicit and visible: a missing screen is a scaffold gap, not a blank page.
    el.innerHTML = `<pre class="screen-missing">No screen registered for "${id}".
Registered: ${registered().join(', ') || '(none yet)'}</pre>`;
    el.dataset.screen = id;
    announce(id);
    return false;
  }

  el.innerHTML = view(state);
  el.dataset.screen = id;

  if (opts.replace && history.length) history[history.length - 1] = id;
  else if (currentScreen() !== id) history.push(id);

  announce(id);
  return true;
}

/** Step back one screen. Returns the id now showing, or null at the root. */
export function back() {
  if (history.length < 2) return null;
  history.pop();
  const to = history[history.length - 1];
  render(to, { replace: true });
  return to;
}

function announce(id) {
  const status = document.getElementById('route-status');
  if (status) status.textContent = `${id} — screen`;
}

/**
 * Boot. `?screen=<id>` wins so scripts/diff.mjs can open one screen
 * directly; otherwise fall back to the first registered screen.
 */
function boot() {
  const wanted = new URLSearchParams(location.search).get('screen');
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
