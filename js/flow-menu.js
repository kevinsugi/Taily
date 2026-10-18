/* ============================================================
   "Test flows" menu — the bottom-right dev control (Kevin, Sep 2026).
   A trigger opens a panel listing every Test-flows entry (the registry
   is js/flows.js) under three tabs: Customer, Tailor, System. Choosing
   an entry resets the demo, runs the entry's setup through the real
   transitions and opens the screen live; the footer flip switches
   persona WITHOUT resetting anything; the Demo actions row (Study-1) moves the
   demo clock or delivers the courier on the live state, also without a reset.

   Lives in .stage-caption, OUTSIDE .screen, and stays hidden until the
   first input (html.has-input) — the diff harness never sees it.
   Initialised by app.js after the screen modules (an entry's `click`
   presses screen buttons, so the screens must be registered first).
   ============================================================ */

import { state, T, getAppt, activeAppt, advanceClock, nowIso, now, reminderAt, reminderEligible, freeUntil, autoCancelAt, textLink } from './state.js';
import { ALL_FLOWS, findFlow, prepareFlow, personaForScreen } from './flows.js';
import { setFocus } from './focus.js';
import { toast } from './components.js';
import { fmtWhen, fmtTime, dayWord } from './dates.js';
import { fmtExact } from './money.js';
import { textBanner } from './system.js';
import { STUDY_TITLE, STUDY_SCRIPT } from './study.js';

let render = null;
let homeFor = () => 'sys-index';
let lastKey = null;
let tab = null;
/* Study tab memory (session only): the section last run / opened (null = none yet) and the key last run from it */
let studySec = null;
let studyKey = null;

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TABS = [['customer', 'Customer'], ['tailor', 'Tailor'], ['system', 'System'], ['study', 'Study']];
/** Which tab an entry belongs to: its persona, or System for sys-* screens. */
const personaTab = (f) => (f.screen.startsWith('sys-') ? 'system' : (f.persona ?? personaForScreen(f.screen) ?? 'customer'));
/** An entry lists under its own tab; a sys-* key (hosted on a customer or tailor screen) ALSO lists under System (M6-X-09). */
const inTab = (f, which) => personaTab(f) === which || (which === 'system' && f.key.startsWith('sys-'));
/** The tab to open on: System while a sys-* screen shows, else the persona's. */
const currentTab = () => {
  const id = document.getElementById('screen')?.dataset.screen ?? '';
  return id.startsWith('sys-') ? 'system' : state.persona === 'tailor' ? 'tailor' : 'customer';
};

/** Group order per tab (M6-X-09): a group's title is its registry `group` without the milestone prefix ("M3 · Tailor" → "Tailor").
    A group not listed here follows the listed ones, in registry order. */
const GROUP_ORDER = {
  customer: ['Sign in', 'Booking', 'Request outcomes', 'Bookings', 'Final order', 'Ready', 'Completed', 'Messages', 'Account', 'System'],
  tailor: ['Sign-up', 'Tailor sign-up', 'Onboarding', 'Shop', 'Tailor', 'Tailor job', 'Job', 'Edit job', 'Earnings', 'Tailor messages', 'System'],
  system: ['System'],
};
const groupName = (g) => String(g ?? '').replace(/^M\d+\s·\s/, '');

/** Entries of a tab as groups, in GROUP_ORDER: [{ title, items }]. */
function groupsOf(which) {
  const groups = [];
  for (const f of ALL_FLOWS.filter((e) => inTab(e, which))) {
    const title = groupName(f.group);
    let g = groups.find((x) => x.title === title);
    if (!g) groups.push(g = { title, items: [] });
    g.items.push(f);
  }
  const order = GROUP_ORDER[which] ?? [];
  const rank = (g) => { const i = order.indexOf(g.title); return i < 0 ? order.length : i; };
  return groups.map((g, i) => ({ g, i })).sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i).map((x) => x.g);
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

/* ---------- Study tab (STUDY_SCRIPT, js/study.js) ---------- */
/** Every study key that is not in the registry. Filled by validateStudy() when the menu mounts. */
const studyMissing = new Set();
const studyKeys = (sec) => [sec.start, ...(sec.jump ?? [])];
function validateStudy() {
  studyMissing.clear();
  for (const sec of STUDY_SCRIPT) for (const k of studyKeys(sec)) if (!findFlow(k)) studyMissing.add(k);
  if (studyMissing.size) console.warn(`study: ${studyMissing.size} key(s) missing from the Test-flows registry: ${[...studyMissing].join(', ')}`);
}

/** A study button for one key: a [data-flow] item (same click path as every other tab), or a "missing: key" note in the error colour. */
function studyBtn(key, cls, sec, inner) {
  if (!findFlow(key)) return `<span class="flow-menu__missing" role="note">missing: ${esc(key)}</span>`;
  const f = findFlow(key);
  return `<button type="button" class="${cls}" data-flow="${esc(key)}" data-study-sec="${sec}" title="${esc(f.title)}"${sec === studySec && key === studyKey && key === lastKey ? ' aria-current="true"' : ''}>${inner}</button>`;
}

function studyHtml() {
  const last = STUDY_SCRIPT.length - 1;
  const prevOff = studySec == null || studySec <= 0;
  const nextOff = studySec != null && studySec >= last;
  return `
    <p class="flow-menu__study-title">${esc(STUDY_TITLE)}</p>
    <ol class="flow-menu__secs">
      ${STUDY_SCRIPT.map((sec, i) => `
      <li class="flow-menu__sec"${i === studySec ? ' data-current="true"' : ''} data-sec="${i}">
        <div class="flow-menu__sec-head">
          <span class="flow-menu__sec-num" aria-hidden="true">${i + 1}</span>
          <h3 class="flow-menu__sec-title">${esc(sec.title)}</h3>
        </div>
        ${sec.cue ? `<p class="flow-menu__sec-cue">${esc(sec.cue)}</p>` : ''}
        ${studyBtn(sec.start, 'flow-menu__start', i, `<span>Start</span><span class="flow-menu__start-key">${esc(sec.start)}</span>`)}
        ${(sec.jump ?? []).length ? `
        <p class="flow-menu__jump-label">Jump to</p>
        <div class="flow-menu__jumps">${sec.jump.map((k) => studyBtn(k, 'flow-menu__jump', i, esc(k))).join('')}</div>` : ''}
      </li>`).join('')}
    </ol>
    <div class="flow-menu__study-nav">
      <button type="button" class="flow-menu__step" data-study-step="-1"${prevOff ? ' aria-disabled="true"' : ''}>← Prev section</button>
      <button type="button" class="flow-menu__step" data-study-step="1"${nextOff ? ' aria-disabled="true"' : ''}>Next section →</button>
    </div>`;
}

/** Run the neighbouring section's start key (Prev / Next). Returns true when it ran. */
function stepStudy(dir) {
  const to = studySec == null ? (dir > 0 ? 0 : -1) : studySec + dir;
  const sec = STUDY_SCRIPT[to];
  if (!sec || !findFlow(sec.start)) return false;
  studySec = to;
  studyKey = sec.start;
  close();
  return runFlow(sec.start);
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
  <div class="flow-menu__demo" role="group" aria-labelledby="flow-demo-label">
    <span class="flow-menu__demo-label" id="flow-demo-label">Demo actions</span>
    <div class="flow-menu__demo-btns">
      ${DEMO.map(([id, label]) => `<button type="button" class="flow-menu__demo-btn" data-demo="${id}">${label}</button>`).join('')}
    </div>
  </div>
  <div class="flow-menu__foot">
    <button type="button" class="flow-menu__switch" id="persona-toggle">View as Tailor</button>
    <span class="flow-menu__hint">Keeps the current state</span>
  </div>
</div>`;
}

const isOpen = () => !$('#flow-menu')?.hidden;

/* ---------- Demo actions (Study-1 §3): act on the live state, no reset ---------- */
const DEMO = [['courier', 'Courier delivers'], ['reminder', 'To the reminder'], ['h1', '+1 hour'], ['h48', '+48 hours'], ['d7', '+7 days']];   // K-41: the clock to the 24-hour reminder
const DEMO_MIN = { h1: 60, h48: 48 * 60, d7: 7 * 24 * 60 };
/** The appointment the demo acts on: the one on screen (focused), else the customer's active one, else the newest. */
const demoAppt = () => (state.ui.apptId ? getAppt(state.ui.apptId) : null) ?? activeAppt() ?? state.appts[state.appts.length - 1] ?? null;
/** Run a Demo action, then re-render the current screen; its wire() forwards (redirectIfMoved) when the appointment moved on. */
function runDemo(kind) {
  const a = demoAppt();
  let msg;
  const before = a?.reminder ? { ...a.reminder, status: a.status } : null;
  if (kind === 'courier') {
    const r = a ? T.courierDelivered(a.id) : { ok: false };
    msg = r.ok ? 'The courier delivered it.' : 'No courier delivery to complete.';
  } else if (kind === 'reminder') {
    /* K-41: straight to the moment the 24-hour reminder goes out (26 h before the visit) */
    if (a && reminderEligible(a) && !a.reminder?.sentAt && now() < reminderAt(a)) {
      advanceClock(Math.ceil((reminderAt(a) - now()) / 60000));
      msg = `Clock moved to ${fmtWhen(nowIso())}. The visit reminder went out.`;
    } else msg = 'No visit reminder to send.';
  } else {
    advanceClock(DEMO_MIN[kind]);
    msg = `Clock moved to ${fmtWhen(nowIso())}.`;
  }
  if (a) setFocus(a.id, { keepFrom: true });   // so the screen showing it follows it (c-booking → c-complete)
  close();
  const id = document.getElementById('screen')?.dataset.screen;
  if (id) render(id, { replace: true });
  toast(msg);
  if (a && state.persona === 'customer') remindText(a, before);
}

/** K-41 (R3) + K-43 (D-301): the reminder, its one nudge, or the auto-cancel happened during a Demo action → the customer's text message
    (an SMS with its unique link; tapping it routes in, as the push did). The reminder opens Home (Confirm is one tap there); the nudge and
    the cancel open the booking. */
function remindText(a, before) {
  const r = a.reminder;
  if (!r) return;
  const t = state.tailors.find((x) => x.id === a.tailorId);
  const first = (t?.name || 'Your tailor').split(' ')[0];
  const day = dayWord(a.slot.start, now());
  const at = fmtTime(a.slot.start);
  const dep = fmtExact(a.payments.deposit.cents);
  const place = a.job.visitType === 'home' ? 'at your place' : `at ${t?.shopName ?? 'the shop'}`;
  const text = (event, body, screen) => textBanner({ body, link: textLink(a.id, event), onOpen: () => { setFocus(a.id); render(screen); } });
  if (a.status === 'cancelled' && a.cancel?.reason === 'unconfirmed' && before?.status === 'confirmed') {
    text('auto-cancel', `We cancelled your ${at} visit with ${first} because you didn’t confirm by ${fmtTime(a.cancel.at)}. ${first} keeps your ${dep} deposit.`, 'c-booking');
  } else if (r.sentAt && !before?.sentAt && !r.confirmedAt && now() < freeUntil(a)) {
    text('reminder', `Still on for ${day}? ${first} · ${fmtWhen(a.slot.start)} ${place}. Free to change until ${fmtTime(freeUntil(a))} ${dayWord(freeUntil(a), now())}. Confirm or change:`, 'c-job');
  } else if (r.nudgedAt && !before?.nudgedAt && !r.confirmedAt && a.status === 'confirmed') {
    const by = autoCancelAt(a);
    text('nudge', `You haven’t confirmed your ${at} visit with ${first} ${day}. Confirm by ${fmtTime(by)} or we’ll cancel it, and ${first} keeps your ${dep} deposit.`, 'c-booking');
  }
}

function paintTab(which) {
  tab = which;
  document.querySelectorAll('.flow-menu__tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === which)));
  const list = $('[data-flow-list]');
  if (list) list.innerHTML = which === 'study' ? studyHtml() : listHtml(which);
}

function paintLabels() {
  const who = state.persona === 'tailor' ? 'Tailor' : 'Customer';
  const trigger = $('#flow-trigger');
  if (trigger) trigger.querySelector('[data-trigger-who]').textContent = who;
  const flip = $('#persona-toggle');
  if (flip) flip.textContent = state.persona === 'tailor' ? 'View as Customer' : 'View as Tailor';
}

/** Open the panel. The Study tab sticks once chosen (a session on a phone returns to it); the others follow the screen. */
function open() {
  const menu = $('#flow-menu');
  if (!menu) return;
  paintTab(tab === 'study' ? 'study' : currentTab());
  menu.hidden = false;
  $('#flow-trigger').setAttribute('aria-expanded', 'true');
  const sec = tab === 'study' ? menu.querySelector('.flow-menu__sec[data-current]') : null;
  const current = menu.querySelector('[aria-current="true"]') ?? sec?.querySelector('.flow-menu__start');
  if (sec) sec.scrollIntoView({ block: 'start' });
  else if (current) current.scrollIntoView({ block: 'center' });
  (current ?? menu.querySelector('.flow-menu__tab[aria-selected="true"]'))?.focus({ preventScroll: true });
}

/** Open the panel on the Study tab with section `n` (1-based) highlighted; nothing runs. ?study=1[&s=n] (app.js). */
export function openStudy(n = 1) {
  const i = Math.min(STUDY_SCRIPT.length, Math.max(1, Number.parseInt(n, 10) || 1)) - 1;
  studySec = i;
  studyKey = null;
  tab = 'study';
  if (isOpen()) close();
  open();
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
  validateStudy();
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
  document.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', () => runDemo(b.dataset.demo)));
  $('[data-flow-list]').addEventListener('click', (e) => {
    const step = e.target.closest('[data-study-step]');
    if (step) { if (step.getAttribute('aria-disabled') !== 'true') stepStudy(Number(step.dataset.studyStep)); return; }
    const item = e.target.closest('[data-flow]');
    if (!item) return;
    if (item.dataset.studySec != null) { studySec = Number(item.dataset.studySec); studyKey = item.dataset.flow; }
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
    const items = [...document.querySelectorAll('.flow-menu__item, .flow-menu__start, .flow-menu__jump, .flow-menu__step')];
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
