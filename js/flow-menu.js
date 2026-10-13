/* ============================================================
   "Test flows" menu — the bottom-right dev control (Kevin, Sep 2026).
   A trigger opens a panel listing every Test-flows entry (the registry
   is js/flows.js) under three tabs: Customer, Tailor, System. Choosing
   an entry resets the demo, runs the entry's setup through the real
   transitions and opens the screen live; the footer flip switches
   persona WITHOUT resetting anything.

   Lives in .stage-caption, OUTSIDE .screen, and stays hidden until the
   first input (html.has-input) — the diff harness never sees it.
   Initialised by app.js after the screen modules (an entry's `click`
   presses screen buttons, so the screens must be registered first).
   ============================================================ */

import { state } from './state.js';
import { ALL_FLOWS, findFlow, prepareFlow, personaForScreen } from './flows.js';

let render = null;
let homeFor = () => 'sys-index';
let lastKey = null;
let tab = null;

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TABS = [['customer', 'Customer'], ['tailor', 'Tailor'], ['system', 'System']];
/** Which tab an entry belongs to: its persona, or System for sys-* screens. */
const tabOf = (f) => (f.screen.startsWith('sys-') ? 'system' : (f.persona ?? personaForScreen(f.screen) ?? 'customer'));
/** The tab to open on: System while a sys-* screen shows, else the persona's. */
const currentTab = () => {
  const id = document.getElementById('screen')?.dataset.screen ?? '';
  return id.startsWith('sys-') ? 'system' : state.persona === 'tailor' ? 'tailor' : 'customer';
};

/** Entries of a tab as groups, in registry order: [{ title, items }]. */
function groupsOf(which) {
  const groups = [];
  for (const f of ALL_FLOWS.filter((e) => tabOf(e) === which)) {
    let g = groups.find((x) => x.title === f.group);
    if (!g) groups.push(g = { title: f.group, items: [] });
    g.items.push(f);
  }
  return groups;
}

function listHtml(which) {
  const groups = groupsOf(which);
  if (!groups.length) return `<p class="flow-menu__empty">Nothing built on this side yet.</p>`;
  return groups.map((g) => `
    <section class="flow-menu__group" aria-label="${esc(g.title)}">
      <h3 class="flow-menu__heading">${esc(g.title)}</h3>
      ${g.items.map((f) => `
      <button type="button" class="flow-menu__item" data-flow="${esc(f.key)}"${f.key === lastKey ? ' aria-current="true"' : ''}>
        <span class="flow-menu__text">
          <span class="flow-menu__title">${esc(f.title)}</span>
          <span class="flow-menu__note">${esc(f.key)}${f.note ? ` · ${esc(f.note)}` : ''}</span>
        </span>
      </button>`).join('')}
    </section>`).join('');
}

function panelHtml() {
  return `<div class="flow-menu" id="flow-menu" role="dialog" aria-label="Test flows" hidden>
  <div class="flow-menu__head">
    <div class="flow-menu__heads">
      <p class="flow-menu__label">Jump to any step</p>
      <p class="flow-menu__sub">Resets the demo, then opens that step live.</p>
    </div>
    <button type="button" class="flow-menu__close" data-flow-close aria-label="Close menu">✕</button>
  </div>
  <div class="flow-menu__tabs" role="tablist">
    ${TABS.map(([id, label]) => `<button type="button" class="flow-menu__tab" role="tab" data-tab="${id}" aria-selected="false">${label}</button>`).join('')}
  </div>
  <div class="flow-menu__list" role="tabpanel" data-flow-list></div>
  <div class="flow-menu__foot">
    <button type="button" class="flow-menu__switch" id="persona-toggle">View as Tailor</button>
    <span class="flow-menu__hint">Keeps the current state</span>
  </div>
</div>`;
}

const isOpen = () => !$('#flow-menu')?.hidden;

function paintTab(which) {
  tab = which;
  document.querySelectorAll('.flow-menu__tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === which)));
  const list = $('[data-flow-list]');
  if (list) list.innerHTML = listHtml(which);
}

function paintLabels() {
  const who = state.persona === 'tailor' ? 'Tailor' : 'Customer';
  const trigger = $('#flow-trigger');
  if (trigger) trigger.querySelector('[data-trigger-who]').textContent = who;
  const flip = $('#persona-toggle');
  if (flip) flip.textContent = state.persona === 'tailor' ? 'View as Customer' : 'View as Tailor';
}

function open() {
  const menu = $('#flow-menu');
  if (!menu) return;
  paintTab(currentTab());
  menu.hidden = false;
  $('#flow-trigger').setAttribute('aria-expanded', 'true');
  const current = menu.querySelector('[aria-current="true"]');
  if (current) current.scrollIntoView({ block: 'center' });
  (current ?? menu.querySelector('.flow-menu__tab[aria-selected="true"]'))?.focus({ preventScroll: true });
}

function close({ focusTrigger = false } = {}) {
  const menu = $('#flow-menu');
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  $('#flow-trigger').setAttribute('aria-expanded', 'false');
  if (focusTrigger) $('#flow-trigger')?.focus({ preventScroll: true });
}

/**
 * Run a Test-flows entry: reset + setup, render the screen live with a
 * fresh history, then press the entry's `click` selectors (overlays).
 * Returns true when the key exists.
 */
export function runFlow(key, { keepUrl = false } = {}) {
  if (!render || !findFlow(key)) return false;
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const entry = prepareFlow(key);
  render(entry.screen, { fresh: true });
  window.scrollTo(0, 0);
  for (const sel of entry.click ?? []) {
    const el = document.querySelector(`#screen ${sel}`) ?? document.querySelector(sel);
    if (!el) { console.warn(`flow "${key}": nothing to click for ${sel}`); break; }
    el.click();
  }
  lastKey = key;
  /* ?flow=<key> makes the state bookmarkable / shareable (a cold ?screen= boot keeps its own link) */
  if (!keepUrl) {
    const url = new URL(location.href);
    url.searchParams.delete('screen');
    url.searchParams.set('flow', key);
    history.replaceState(history.state, '', url);
  }
  paintLabels();
  return true;
}

/** Mount the trigger + panel into .stage-caption and wire them. */
export function initFlowMenu(renderFn, { home } = {}) {
  render = renderFn;
  if (home) homeFor = home;
  const host = $('.stage-caption');
  if (!host) return;
  host.innerHTML = `${panelHtml()}
  <button type="button" class="persona-toggle flow-trigger" id="flow-trigger" aria-haspopup="dialog" aria-expanded="false" aria-controls="flow-menu">
    <span class="flow-trigger__label">Test flows</span><span class="flow-trigger__who" data-trigger-who>Customer</span>
  </button>`;

  $('#flow-trigger').addEventListener('click', () => (isOpen() ? close() : open()));
  $('[data-flow-close]').addEventListener('click', () => close({ focusTrigger: true }));
  document.querySelectorAll('.flow-menu__tab').forEach((b) => b.addEventListener('click', () => {
    paintTab(b.dataset.tab);
    $('[data-flow-list]').scrollTop = 0;
  }));
  $('[data-flow-list]').addEventListener('click', (e) => {
    const item = e.target.closest('[data-flow]');
    if (!item) return;
    close();
    runFlow(item.dataset.flow);
  });
  /* flip sides, state untouched: render the other persona's home */
  $('#persona-toggle').addEventListener('click', () => {
    close();
    const next = state.persona === 'tailor' ? 'customer' : 'tailor';
    state.persona = next;                      // sys-index (the fallback home) keeps the persona it is given
    render(homeFor(next), { fresh: true });
  });
  /* arrow keys walk the list; Escape closes; a click outside closes */
  $('#flow-menu').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close({ focusTrigger: true }); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...document.querySelectorAll('.flow-menu__item')];
    const i = items.indexOf(document.activeElement);
    const next = items[Math.min(items.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (next) { e.preventDefault(); next.focus(); }
  });
  document.addEventListener('pointerdown', (e) => {
    if (isOpen() && !e.target.closest('.stage-caption')) close();
  });
  document.addEventListener('taily:persona', paintLabels);
  paintLabels();
}
