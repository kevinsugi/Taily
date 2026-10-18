/* ============================================================
   to-availability — O5 Availability. M2 spec §C2.
   Her usual week; shop and home-visit hours are split when she does both.
   Focal: the week list of the selected schedule. Two modes (D-56): onboarding (not live yet) and edit (live).
   Drafts live in state.ui['to-availability'] (D-34): `draft` = { shop: { tue: [['10:00', '18:00']] }, home: {…} } — K-53 a4 (S-34, D-424):
   up to two windows a day (a split day: "+ Add more hours"; the second has a ✕); an old one-window draft (['10:00', '18:00']) still reads.
   K-53 a4 (S-34): under the week, for every way she works — TIME OFF (whole-day ranges, both ends included: "Add time off" → a two-wheel
   sheet; customers can't book those days, visits already booked stay, D-426) and MINIMUM NOTICE (Taily's MIN_LEAD_H, then 12 / 24 / 48 h,
   D-425). `timeOff` / `notice` drafts save with the hours (Next / Save changes) through setTailorSection; openSlots reads them.
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state, T, SECTIONS, onboarded, noticeChoices, noticeHours, timeOffList, bookedDuring, DAY_WINDOWS_MAX, now } from '../state.js';
import { POLICY } from '../money-config.js';
import { myTailor, customerName } from '../tailor-data.js';
import {
  onboardingHeader, onboardingSteps, ONBOARDING_STEPS, resumeText, editScopeNote, headingRow, banner, chipGroup, dayHours, actionBar,
  wireToggles, wireChipGroups, sheetOverlay, toast, leaveSheet, sectionHead, listRow, textLink, esc,
} from '../components.js';
import { scheduler, timeColumns, readTime, wireTimeWheel, timeLabel, timeMinutes, dateColumn, dayRows, readScheduler, SCHED_ROW, OPEN_MIN, CLOSE_MIN } from '../scheduler.js';
import { wireWheel } from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';
import { minutesOf, isoDay, addDays, strip, dayDiff, fmtDay } from '../dates.js';
import { itemsLabel, DAY_KEYS, DAY_LABEL, DEFAULT_WEEK, VISIT_MINUTES } from '../data.js';

const ID = 'to-availability';
const SECTION = 'availability';
const STEP = ONBOARDING_STEPS.findIndex((s) => s.id === SECTION);
const PREV = ONBOARDING_STEPS[STEP - 1]?.screen ?? 't-phone';
const NEXT = ONBOARDING_STEPS[STEP + 1]?.screen ?? 'to-done';

const TITLE = '<h1 class="t-title">When can customers book you?</h1>';
const SCHEDS = ['shop', 'home'];
const ui = () => (state.ui[ID] ??= {});
const editing = () => onboarded(myTailor());
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
const DAY_START = OPEN_MIN;   // the time wheel's range (9 AM–9 PM)
const DAY_END = CLOSE_MIN;
const hoursWord = (h) => `${h} hours`;
const OFF_ERR = {
  'off-range': 'The last day off can’t be before the first.',
  'off-past': 'That time off has already ended.',
  'off-far': `Set time off up to ${POLICY.TIME_OFF_AHEAD_D} days ahead.`,
  'off-overlap': 'This overlaps time off you already set.',
  'off-required': 'Pick both days.',
};
const offLabel = (o) => (o.from === o.to ? fmtDay(o.from) : `${fmtDay(o.from)} to ${fmtDay(o.to)}`);
const offDays = (o) => dayDiff(o.from, o.to) + 1;

/* ---------- draft ⇄ model ---------- */
const clone = (o) => JSON.parse(JSON.stringify(o));
/** A day's windows as [[open, close], …] — an old one-window draft (['10:00', '18:00']) reads as one window. */
const wins = (w) => (!w ? [] : typeof w[0] === 'string' ? [[...w]] : w.map((x) => [...x]));
const allWindows = (avail) => Object.fromEntries(Object.entries(avail ?? {}).filter(([, w]) => (w ?? []).length).map(([d, w]) => [d, wins(w)]));
/** The model's week — a new tailor starts with the default hours for each type she offers (D-62). */
function fromTailor(t) {
  const out = { shop: {}, home: {} };
  for (const s of SCHEDS) {
    if (!t[s]?.enabled) continue;
    const saved = allWindows(t.availability?.[s]);
    out[s] = !Object.keys(saved).length && !t.onboarding.availability ? allWindows(clone(DEFAULT_WEEK[s])) : saved;
  }
  return out;
}
const draft = () => {
  const d = (ui().draft ??= fromTailor(myTailor()));
  for (const s of SCHEDS) { d[s] ??= {}; for (const k of Object.keys(d[s])) d[s][k] = wins(d[s][k]); }   // flows may hand an old one-window draft
  return d;
};
const offDraft = () => (ui().timeOff ??= clone(timeOffList(myTailor())));
const noticeDraft = () => (ui().notice ??= noticeHours(myTailor()));
/** A type she does not offer carries no hours. */
const effective = (d) => Object.fromEntries(SCHEDS.map((s) => [s, myTailor()[s]?.enabled ? Object.fromEntries(DAY_KEYS.filter((k) => d[s]?.[k]?.length).map((k) => [k, d[s][k]])) : {}]));
const saved = () => ({ avail: effective(fromTailor(myTailor())), off: timeOffList(myTailor()), notice: noticeHours(myTailor()) });
const dirty = () => {
  const was = saved();
  return JSON.stringify(effective(draft())) !== JSON.stringify(was.avail) || JSON.stringify(offDraft()) !== JSON.stringify(was.off)
    || noticeDraft() !== was.notice || (editing() && !myTailor().onboarding[SECTION]);
};
const toAvail = (d) => Object.fromEntries(SCHEDS.map((s) => [s, Object.fromEntries(Object.entries(effective(d)[s]).map(([k, w]) => [k, w.map((x) => [...x])]))]));
const patch = () => ({ availability: toAvail(draft()), timeOff: clone(offDraft()), notice: noticeDraft() });

function validate() {
  const t = myTailor();
  const { errors } = T.validateSection(SECTION, { shop: t.shop, home: t.home, ...patch() });
  return errors;
}
function persist() { T.setTailorSection(SECTION, patch()); }

const currentSeg = () => {
  const list = enabledScheds();
  return list.includes(ui().seg) ? ui().seg : list[0] ?? 'shop';
};
const errs = () => ui().errors ?? {};
const hasError = (s) => Object.keys(errs()).some((k) => k === s || k.startsWith(`${s}-`) || k.startsWith('overlap-'));

/* ---------- view ---------- */
/** Where two lists of windows overlap: the first overlapping stretch, in minutes, or null. */
function overlapOf(a, b) {
  for (const [o1, c1] of a) for (const [o2, c2] of b) {
    const from = Math.max(minutesOf(o1), minutesOf(o2)); const to = Math.min(minutesOf(c1), minutesOf(c2));
    if (from < to) return [from, to];
  }
  return null;
}
function rowError(s, day) {
  const e = errs();
  if (e[`${s}-${day}`] === 'hours-range') return 'Closing time must be after opening time.';
  if (e[`${s}-${day}`] === 'windows-overlap') return 'Your two times on this day overlap. Move one of them.';
  if (e[`${s}-${day}`] === 'windows-max') return `Up to ${DAY_WINDOWS_MAX} times a day.`;
  if (e[`overlap-${day}`]) {
    const d = draft();
    const hit = overlapOf(d.shop[day] ?? [], d.home[day] ?? []);
    if (!hit) return '';
    return `Overlaps your ${s === 'shop' ? 'home-visit' : 'shop'} hours (${timeLabel(hit[0])} – ${timeLabel(hit[1])}).`;
  }
  return '';
}

function weekHtml(s) {
  const d = draft();
  return DAY_KEYS.map((day) => {
    const w = d[s][day] ?? [];
    return dayHours({ sched: s, day, label: DAY_LABEL[day], windows: w.map(([o, c]) => [label(o), label(c)]), addable: true, error: rowError(s, day) });
  }).join('');
}

function timeOffHtml() {
  const t = myTailor();
  const list = offDraft();
  const rows = list.map((o) => {
    const err = errs()[`off-${o.id}`];
    const booked = bookedDuring(t, o.from, o.to);
    const warn = booked.length ? `You have ${booked.length === 1 ? 'a visit' : `${booked.length} visits`} booked then (${esc(booked.map((a) => `${customerName(a).split(' ')[0]}, ${fmtDay(a.status === 'suggested' ? a.suggested.start : a.slot.start)}`).join('; '))}). ${booked.length === 1 ? 'It stays' : 'They stay'} booked.` : '';
    const sub = [itemsLabel(offDays(o), 'day'), warn].filter(Boolean).join(' · ');
    return `${listRow({
      title: esc(offLabel(o)),
      sub: `${sub}${err ? `<span class="${ID}__off-error t-small w-600 c-error" role="alert">${esc(OFF_ERR[err] ?? '')}</span>` : ''}`,
      right: textLink('Remove', { act: 'remove-off', attrs: `data-id="${esc(o.id)}" aria-label="Remove time off, ${esc(offLabel(o))}"` }),
    })}`;
  }).join('');
  return `<div class="${ID}__head">${sectionHead('Time off', { id: `${ID}-off-h` })}</div>
  <p class="${ID}__note t-small c-600">Customers can’t book these days. Visits you already booked stay booked.</p>
  <section class="card card--list ${ID}__off" aria-labelledby="${ID}-off-h" data-time-off="${list.length}">
    ${rows || `<div class="list-row list-row--static ${ID}__off-empty"><span class="list-row__text"><span class="list-row__sub">No time off set.</span></span></div>`}
  </section>
  <div class="${ID}__off-add">${textLink('+ Add time off', { act: 'add-off' })}</div>`;
}

function noticeHtml() {
  const v = noticeDraft();
  return `<div class="${ID}__head">${sectionHead('Minimum notice', { id: `${ID}-notice-h` })}</div>
  <p class="${ID}__note t-small c-600">How soon before a visit customers can book you. ${POLICY.MIN_LEAD_H} hours is the shortest Taily allows.</p>
  <div class="${ID}__notice">${chipGroup({ name: 'notice', label: 'Customers can book you at least', value: String(v), options: noticeChoices().map((h) => ({ value: String(h), label: hoursWord(h) })), error: errs().notice ? 'Pick one of these.' : '' })}</div>`;
}

function resumeBanner() {
  if (editing() || !state.ui.onboarding?.resumed) return '';
  const t = myTailor();
  return banner({ tone: 'info', title: 'Pick up where you left off', dismissible: true, text: resumeText(t) });   // SF-43
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
  const days = (s) => Object.keys(d[s]).filter((k) => d[s][k].length).length;
  const segmented = list.length === 2 ? chipGroup({
    name: 'sched', variant: 'segmented', value: seg,
    options: [
      { value: 'shop', label: 'Shop', caption: hasError('shop') ? 'Check hours' : itemsLabel(days('shop'), 'day') },
      { value: 'home', label: 'Home visits', caption: hasError('home') ? 'Check hours' : itemsLabel(days('home'), 'day') },
    ],
  }) : '';
  const e = errs()[seg];
  /* M6-P-04: the label sits outside the card, the visit-length note under it, then the card; the "add a day" error is directly under the
     card and described-by the first day switch (the field that needs the fix) */
  let week = weekHtml(seg);
  if (e) week = week.replace('role="switch"', 'role="switch" aria-describedby="avail-msg"');
  return `${segmented}
  <div class="to-availability__head">${sectionHead(HEAD[seg])}</div>
  <p class="to-availability__note t-small c-600">${NOTE[seg]} Need a break in the day? Add more hours.</p>
  <section class="card to-availability__card" aria-label="${HEAD[seg]}">
    ${week}
  </section>
  ${e ? `<p class="field__msg field__msg--error to-availability__error" id="avail-msg" role="alert">Add at least one day of ${NAME[seg]} hours.</p>` : ''}
  ${timeOffHtml()}
  ${noticeHtml()}`;
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
  ${mode ? headingRow(TITLE) : `<div class="heading-block ${ID}__title">${TITLE}</div>`}
  <p class="to-availability__lead t-body c-600">${mode ? 'Set your usual week, time off and how much notice you need.' : 'We filled in a typical week. Change any day that doesn’t match yours. Customers can book every open slot.'}</p>${mode ? editScopeNote() : ''}
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
function defaultWindows(s, day) {
  const d = draft()[s];
  for (let i = DAY_KEYS.indexOf(day) - 1; i >= 0; i -= 1) if (d[DAY_KEYS[i]]?.length) return d[DAY_KEYS[i]].map((w) => [...w]);
  return wins(Object.values(DEFAULT_WEEK[s])[0]);
}
/** K-53 a4 (D-424): a second window an hour after the first closes (two hours long, by 9 PM); else one that ends an hour before it opens. */
function secondWindow([o, c]) {
  const close = minutesOf(c); const open = minutesOf(o);
  if (close + 60 + 60 <= DAY_END) return [hhmm(close + 60), hhmm(Math.min(close + 180, DAY_END))];
  if (open - 60 - 60 >= DAY_START) return [hhmm(Math.max(open - 180, DAY_START)), hhmm(open - 60)];
  return null;
}

function openTime(btn) {
  const { sched, day, edge } = btn.dataset;
  const i = Number(btn.dataset.win ?? 0);
  const w = draft()[sched][day]?.[i];
  if (!w) return;
  const cur = label(edge === 'open' ? w[0] : w[1]);
  const which = draft()[sched][day].length > 1 ? (i ? ' (second)' : ' (first)') : '';
  const html = scheduler({ title: `${DAY_LABEL[day]}${which} · ${edge === 'open' ? 'opens' : 'closes'}`, columns: timeColumns(cur), cta: 'Done', ctaAct: 'time-done', inline: true });
  sheetOverlay(html, { header: HEAD[sched], dataS: `${ID}-time`, confirm: false }, (holder, close) => {
    wireTimeWheel(holder);
    holder.querySelector('[data-act="time-done"]').addEventListener('click', () => {
      const picked = hhmm(timeMinutes(readTime(holder)));
      draft()[sched][day][i] = edge === 'open' ? [picked, w[1]] : [w[0], picked];
      clearDay(sched, day);
      close();
      rerender(`[data-act="time"][data-sched="${sched}"][data-day="${day}"][data-edge="${edge}"][data-win="${i}"]`);
    });
  });
}

/* ---------- time off (K-53 a4, D-426) ---------- */
const OFF_DAYS = POLICY.TIME_OFF_AHEAD_D + 1;
function openTimeOff() {
  const start = strip(new Date(now()));
  const rows = dayRows(start, OFF_DAYS);
  const columns = [dateColumn(rows, 0, 150, 'First day off'), dateColumn(rows, 0, 150, 'Last day off')];
  const html = `<p class="t-small c-600">Pick your first and last day off. Both days are included.</p>
<div class="${ID}__off-labels" aria-hidden="true"><span class="t-caps c-600">First day off</span><span class="t-caps c-600">Last day off</span></div>
${scheduler({ title: '', columns, cta: 'Add time off', ctaAct: 'off-done', inline: true })}
<p class="field__msg field__msg--error ${ID}__off-sheet-error" data-off-error role="alert" hidden></p>`;
  sheetOverlay(html, { header: 'Time off', dataS: `${ID}-off`, confirm: false }, (holder, close) => {
    wireWheel(holder, null, SCHED_ROW);
    holder.querySelector('[data-act="off-done"]').addEventListener('click', () => {
      const [a, b] = readScheduler(holder, columns);
      const n = Math.max(0, ...offDraft().map((o) => Number(String(o.id).replace(/\D/g, '')) || 0)) + 1;
      const entry = { id: `t${n}`, from: isoDay(addDays(start, a.index)), to: isoDay(addDays(start, b.index)) };
      const t = myTailor();
      const { errors } = T.validateSection(SECTION, { shop: t.shop, home: t.home, availability: toAvail(draft()), timeOff: [...offDraft(), entry], notice: noticeDraft() });
      const err = errors[`off-${entry.id}`];
      if (err) {
        const p = holder.querySelector('[data-off-error]');
        p.textContent = OFF_ERR[err] ?? '';
        p.hidden = false;
        return;
      }
      offDraft().push(entry);
      offDraft().sort((x, y) => (x.from < y.from ? -1 : 1));
      close();
      rerender('[data-act="add-off"]');
      toast(`Time off added: ${offLabel(entry)}`, { tone: 'success' });
    });
  });
}

/* ---------- leave / finish later ---------- */
function openLeave() {
  leaveSheet({}, { dataS: `${ID}-leave` }, (holder, close) => {
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
    const offKey = keys.find((k) => k.startsWith('off-'));
    rerender(firstRow ? `[data-act="time"][data-sched="${seg}"][data-day="${firstRow}"]`
      : offKey ? `[data-act="remove-off"][data-id="${offKey.slice(4)}"]` : errors.notice ? '[data-chip-group="notice"] [data-act="chip"]' : '.to-availability__card .toggle');
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
      toast('Saved. New requests use this now.', { tone: 'success' });
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
    if (e.detail.name === 'notice') {
      ui().notice = Number(e.detail.value);
      if (ui().errors) delete ui().errors.notice;
      rerender(`[data-chip-group="notice"] [data-value="${e.detail.value}"]`);
      return;
    }
    if (e.detail.name !== 'sched') return;
    ui().seg = e.detail.value;
    rerender(`[data-chip-group="sched"] [data-value="${e.detail.value}"]`);
  });

  main.addEventListener('toggle', (e) => {
    const m = /^day-(shop|home)-([a-z]{3})$/.exec(e.detail.id);
    if (!m) return;
    const [, s, day] = m;
    const d = draft();
    if (e.detail.checked) d[s][day] = defaultWindows(s, day); else delete d[s][day];
    clearDay(s, day);
    rerender(`#${e.detail.id}`);
  });

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    switch (a.dataset.act) {
      case 'time': openTime(a); break;
      case 'add-window': {
        const { sched, day } = a.dataset;
        const list = draft()[sched][day];
        const next = list?.length === 1 ? secondWindow(list[0]) : null;
        if (!next) { toast(`No room for more hours on ${DAY_LABEL[day]}. Change the first hours first.`); break; }
        list.push(next);
        clearDay(sched, day);
        rerender(`[data-act="time"][data-sched="${sched}"][data-day="${day}"][data-win="1"][data-edge="open"]`);
        break;
      }
      case 'remove-window': {
        const { sched, day } = a.dataset;
        draft()[sched][day]?.splice(Number(a.dataset.win), 1);
        clearDay(sched, day);
        rerender(`[data-act="time"][data-sched="${sched}"][data-day="${day}"][data-win="0"][data-edge="open"]`);
        break;
      }
      case 'add-off': openTimeOff(); break;
      case 'remove-off': {
        const i = offDraft().findIndex((o) => o.id === a.dataset.id);
        if (i < 0) break;
        const [gone] = offDraft().splice(i, 1);
        if (ui().errors) delete ui().errors[`off-${gone.id}`];
        rerender('[data-act="add-off"]');
        toast(`Time off removed: ${offLabel(gone)}`, { action: 'Undo', onAction: () => { offDraft().splice(i, 0, gone); rerender(`[data-act="remove-off"][data-id="${gone.id}"]`); } });
        break;
      }
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

/* S-22 (D-360): the top nav asks before dropping unsaved edits */
register(ID, view, wire, { canLeave: () => !editing() || !dirty() || !!ui().busy, discard: () => { state.ui[ID] = {}; } });
