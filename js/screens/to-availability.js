/* ============================================================
   to-availability — O5 Availability. M2 spec §C2.
   Her usual week; shop and home-visit hours are split when she does both.
   Focal: the week list of the selected schedule. Two modes (D-56): onboarding (not live yet) and edit (live).
   Drafts live in state.ui['to-availability'].draft (D-34): { shop: { tue: ['10:00', '18:00'] }, home: {…} } — one window per day (D-62).
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state, T, SECTIONS } from '../state.js';
import { myTailor } from '../tailor-data.js';
import {
  onboardingHeader, onboardingSteps, ONBOARDING_STEPS, headingRow, banner, chipGroup, dayHours, actionBar,
  wireToggles, wireChipGroups, sheetOverlay, toast, modalOverlay, leaveModal, sectionHead,
} from '../components.js';
import { scheduler, timeColumns, readTime, wireTimeWheel, timeLabel, timeMinutes } from '../scheduler.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';
import { minutesOf } from '../dates.js';
import { itemsLabel, DAY_KEYS, DAY_LABEL, DEFAULT_WEEK, VISIT_MINUTES } from '../data.js';
import { POLICY } from '../money-config.js';

const ID = 'to-availability';
const SECTION = 'availability';
const STEP = ONBOARDING_STEPS.findIndex((s) => s.id === SECTION);
const LABEL = ONBOARDING_STEPS[STEP].label;
const PREV = ONBOARDING_STEPS[STEP - 1]?.screen ?? 't-phone';
const NEXT = ONBOARDING_STEPS[STEP + 1]?.screen ?? 'to-done';

const TITLE = '<h1 class="t-title">When can customers book you?</h1>';
const SCHEDS = ['shop', 'home'];
const ui = () => (state.ui[ID] ??= {});
const editing = () => !!myTailor().live;
const enabledScheds = () => SCHEDS.filter((s) => myTailor()[s]?.enabled);

/* ---------- copy ---------- */
const NAME = { shop: 'shop', home: 'home-visit' };
const NOTE = {
  shop: `Shop visits are ${VISIT_MINUTES.shop} minutes.`,
  home: `Home visits are ${VISIT_MINUTES.home} minutes.`,
};
const HEAD = { shop: 'Shop hours', home: 'Home-visit hours' };
const hhmm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const label = (t) => timeLabel(minutesOf(t));

/* ---------- draft ⇄ model ---------- */
const firstWindows = (avail) => Object.fromEntries(Object.entries(avail ?? {}).filter(([, w]) => (w ?? []).length).map(([d, w]) => [d, [...w[0]]]));
const clone = (o) => JSON.parse(JSON.stringify(o));
/** The model's week — a new tailor starts with the default hours for each type she offers (D-62). */
function fromTailor(t) {
  const out = { shop: {}, home: {} };
  for (const s of SCHEDS) {
    if (!t[s]?.enabled) continue;
    const saved = firstWindows(t.availability?.[s]);
    out[s] = !Object.keys(saved).length && !t.onboarding.availability ? clone(DEFAULT_WEEK[s]) : saved;
  }
  return out;
}
const draft = () => (ui().draft ??= fromTailor(myTailor()));
/** A type she does not offer carries no hours. */
const effective = (d) => Object.fromEntries(SCHEDS.map((s) => [s, myTailor()[s]?.enabled ? Object.fromEntries(DAY_KEYS.filter((k) => d[s]?.[k]).map((k) => [k, d[s][k]])) : {}]));
const dirty = () => JSON.stringify(effective(draft())) !== JSON.stringify(effective(fromTailor(myTailor())))
  || (editing() && !myTailor().onboarding[SECTION]);
const toAvail = (d) => Object.fromEntries(SCHEDS.map((s) => [s, Object.fromEntries(Object.entries(effective(d)[s]).map(([k, w]) => [k, [[...w]]]))]));

function validate() {
  const t = myTailor();
  const { errors } = T.validateSection(SECTION, { shop: t.shop, home: t.home, availability: toAvail(draft()) });
  return errors;
}
function persist() { T.setTailorSection(SECTION, { availability: toAvail(draft()) }); }

const currentSeg = () => {
  const list = enabledScheds();
  return list.includes(ui().seg) ? ui().seg : list[0] ?? 'shop';
};
const errs = () => ui().errors ?? {};
const hasError = (s) => Object.keys(errs()).some((k) => k === s || k.startsWith(`${s}-`) || k.startsWith('overlap-'));

/* ---------- view ---------- */
function rowError(s, day) {
  const e = errs();
  if (e[`${s}-${day}`]) return 'Closing time must be after opening time.';
  if (e[`overlap-${day}`]) {
    const d = draft();
    const [so, sc] = d.shop[day] ?? []; const [ho, hc] = d.home[day] ?? [];
    if (!so || !ho) return '';
    const from = Math.max(minutesOf(so), minutesOf(ho)); const to = Math.min(minutesOf(sc), minutesOf(hc));
    return `Overlaps your ${s === 'shop' ? 'home-visit' : 'shop'} hours (${timeLabel(from)} – ${timeLabel(to)}).`;
  }
  return '';
}

function weekHtml(s) {
  const d = draft();
  return DAY_KEYS.map((day) => {
    const w = d[s][day];
    return dayHours({ sched: s, day, label: DAY_LABEL[day], open: w ? label(w[0]) : null, close: w ? label(w[1]) : null, error: rowError(s, day) });
  }).join('');
}

function resumeBanner() {
  if (editing() || !state.ui.onboarding?.resumed) return '';
  const t = myTailor();
  const done = ONBOARDING_STEPS.filter((s) => t.onboarding[s.id]).map((s) => s.label);
  const left = ONBOARDING_STEPS.length - done.length;
  const names = done.map((l, i) => (i ? l[0].toLowerCase() + l.slice(1) : l));
  const list = names.length < 2 ? names[0] ?? 'Nothing' : names.length === 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
  return banner({
    tone: 'info', title: 'Pick up where you left off', dismissible: true,
    text: `${list} ${names.length < 2 ? 'is' : 'are'} done. ${left} ${left === 1 ? 'step' : 'steps'} to go before customers can book you.`,
  });
}

function barHtml() {
  const busy = !!ui().busy;
  if (editing()) {
    const d = dirty();
    return actionBar({ ctaLabel: 'Save changes', ctaAct: 'save', disabled: !d, note: d ? '' : 'No changes yet.', busy, busyLabel: 'Saving…' });
  }
  return actionBar({ ctaLabel: 'Next', ctaAct: 'next', busy, busyLabel: 'Saving…' });
}

function body(list, seg) {
  if (!list.length) {
    return banner({ tone: 'warning', title: 'Choose where you work first', text: 'Hours follow the visit types you offer.', actionLabel: 'Go to Where you work', actionAct: 'goto-where' });
  }
  const d = draft();
  const segmented = list.length === 2 ? chipGroup({
    name: 'sched', variant: 'segmented', value: seg,
    options: [
      { value: 'shop', label: 'Shop', caption: hasError('shop') ? 'Check hours' : itemsLabel(Object.keys(d.shop).length, 'day') },
      { value: 'home', label: 'Home visits', caption: hasError('home') ? 'Check hours' : itemsLabel(Object.keys(d.home).length, 'day') },
    ],
  }) : '';
  const e = errs()[seg];
  /* M6-P-04: the label sits outside the card, the visit-length note under it, then the card; the "add a day" error is directly under the
     card and described-by the first day switch (the field that needs the fix) */
  let week = weekHtml(seg);
  if (e) week = week.replace('role="switch"', 'role="switch" aria-describedby="avail-msg"');
  return `${segmented}
  <div class="to-availability__head">${sectionHead(HEAD[seg])}</div>
  <p class="to-availability__note t-small c-600">${NOTE[seg]}</p>
  <section class="card to-availability__card" aria-label="${HEAD[seg]}">
    ${week}
  </section>
  ${e ? `<p class="field__msg field__msg--error to-availability__error" id="avail-msg" role="alert">Add at least one day of ${NAME[seg]} hours.</p>` : ''}`;
}

function view() {
  const t = myTailor();
  const mode = editing();
  const list = enabledScheds();
  const seg = currentSeg();
  const done = SECTIONS.filter((s) => t.onboarding[s]);
  return `${onboardingHeader({ editing: mode })}<main class="body body--with-bar ${ID} ${ID}--${mode ? 'edit' : 'onboarding'}">
  ${mode ? '' : onboardingSteps(SECTION, done)}
  ${resumeBanner()}
  ${mode ? headingRow(TITLE, { backRow: true }) : `<div class="${ID}__title">${TITLE}</div>`}
  <p class="to-availability__lead t-body c-600">Set your usual week. You have ${POLICY.REQUEST_EXPIRY_H} hours to reply to each request.</p>
  <div class="to-availability__body">${body(list, seg)}</div>
</main>${barHtml()}`;
}

/* ---------- helpers ---------- */
function rerender(focusSel) {
  const y = window.scrollY;
  go(ID);
  window.scrollTo(0, y);
  if (focusSel) document.querySelector(`#screen ${focusSel}`)?.focus({ preventScroll: true });
}
const clearDay = (s, day) => {
  const e = ui().errors;
  if (!e) return;
  delete e[`${s}-${day}`]; delete e[`overlap-${day}`]; delete e[s];
};

/** The window a day gets when switched on: the nearest open day above it, else the type's first default hours. */
function defaultWindow(s, day) {
  const d = draft()[s];
  for (let i = DAY_KEYS.indexOf(day) - 1; i >= 0; i -= 1) if (d[DAY_KEYS[i]]) return [...d[DAY_KEYS[i]]];
  return [...Object.values(DEFAULT_WEEK[s])[0]];
}

function openTime(btn) {
  const { sched, day, edge } = btn.dataset;
  const w = draft()[sched][day];
  if (!w) return;
  const cur = label(edge === 'open' ? w[0] : w[1]);
  const html = scheduler({ title: `${DAY_LABEL[day]} · ${edge === 'open' ? 'opens' : 'closes'}`, columns: timeColumns(cur), cta: 'Done', ctaAct: 'time-done', inline: true });
  sheetOverlay(html, { header: HEAD[sched], dataS: `${ID}-time`, confirm: false }, (holder, close) => {
    wireTimeWheel(holder);
    holder.querySelector('[data-act="time-done"]').addEventListener('click', () => {
      const picked = hhmm(timeMinutes(readTime(holder)));
      draft()[sched][day] = edge === 'open' ? [picked, w[1]] : [w[0], picked];
      clearDay(sched, day);
      close();
      rerender(`[data-act="time"][data-sched="${sched}"][data-day="${day}"][data-edge="${edge}"]`);
    });
  });
}

/* ---------- leave / finish later ---------- */
function openLeave() {
  modalOverlay(leaveModal(), { dataS: `${ID}-leave` }, (holder, close) => {
    holder.querySelector('[data-act="keep-editing"]')?.addEventListener('click', () => close());
    holder.querySelector('[data-act="discard"]')?.addEventListener('click', () => {
      close();
      state.ui[ID] = {};
      back() || go('t-shop');
    });
  });
}
function finishLater() {
  if (ui().busy) return;
  persist();
  state.ui[ID] = {};
  state.ui['t-phone'] = { saved: true, phone: myTailor().phone };
  A.signOut('tailor');
  go('t-phone', { fresh: true });
}

/* ---------- Next / Save ---------- */
function submit() {
  if (ui().busy) return;
  if (!enabledScheds().length) { rerender('[data-act="goto-where"]'); return; }
  const errors = validate();
  const keys = Object.keys(errors);
  if (keys.length) {
    ui().errors = errors;
    ui().seg = enabledScheds().find((s) => hasError(s)) ?? currentSeg();
    const seg = ui().seg;
    const firstRow = DAY_KEYS.find((day) => rowError(seg, day));
    rerender(firstRow ? `[data-act="time"][data-sched="${seg}"][data-day="${firstRow}"]` : '.to-availability__card .toggle');
    return;
  }
  ui().errors = {};
  ui().busy = true;
  rerender();
  withLatency(() => {
    ui().busy = false;
    if (currentScreen() !== ID) return;
    const wasEditing = editing();
    persist();
    state.ui[ID] = {};
    if (state.ui.onboarding) state.ui.onboarding.resumed = false;
    if (wasEditing) {
      back() || go('t-shop');
      toast(`${LABEL} saved`, { tone: 'success' });
    } else {
      go(NEXT);
    }
  });
}

/* ---------- wiring ---------- */
function wire(root) {
  const main = root.querySelector('main');
  wireToggles(main);
  wireChipGroups(main);

  root.querySelectorAll('.back[data-act="back"]').forEach((btn) => {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      if (ui().busy) return;
      if (!editing()) { go(PREV); return; }
      if (dirty()) openLeave(); else { state.ui[ID] = {}; back() || go('t-shop'); }
    });
  });

  main.addEventListener('chip', (e) => {
    if (e.detail.name !== 'sched') return;
    ui().seg = e.detail.value;
    rerender(`[data-chip-group="sched"] [data-value="${e.detail.value}"]`);
  });

  main.addEventListener('toggle', (e) => {
    const m = /^day-(shop|home)-([a-z]{3})$/.exec(e.detail.id);
    if (!m) return;
    const [, s, day] = m;
    const d = draft();
    if (e.detail.checked) d[s][day] = defaultWindow(s, day); else delete d[s][day];
    clearDay(s, day);
    rerender(`#${e.detail.id}`);
  });

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    switch (a.dataset.act) {
      case 'time': openTime(a); break;
      case 'goto-where': go('to-where'); break;
      case 'dismiss':
        if (state.ui.onboarding) state.ui.onboarding.resumed = false;
        rerender();
        break;
      case 'next': case 'save': submit(); break;
      case 'finish-later': finishLater(); break;
      default:
    }
  });
}

register(ID, view, wire);
