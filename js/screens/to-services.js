/* ============================================================
   to-services — O2 Services and prices (M2-spec §C1). Focal: the
   service list with the live "Your payout $X · Taily fee −$Y" under each price (the
   M2 signature: what she takes home after the Taily fee). Two
   modes (D-56): onboarding (stepper + Next) and edit (Shop chrome
   + Save changes). Draft = state.ui['to-services'].draft (D-34);
   prices are whole dollars (D-59); ticking / unticking and typing
   update the screen IN PLACE (never a re-render under the keyboard).
   ============================================================ */
import { register, render as go, back } from '../app.js';
import { state, T, SECTIONS, validateSection } from '../state.js';
import { myTailor } from '../tailor-data.js';
import { SERVICES, GARMENT_TYPES, TAILOR_LIMITS } from '../data.js';
import { cents, fmt, fmtExact, payoutFor, tailyFeeFor, fmtColumn } from '../money.js';
import { MONEY } from '../money-config.js';
import {
  onboardingHeader, onboardingSteps, ONBOARDING_STEPS, headingRow, banner, serviceRow, priceRow,
  actionBar, modalOverlay, leaveModal, toast, esc, takeHtml, sectionHead, infoButton,
} from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';

const ID = 'to-services';
const STEP = 'services';
const { PRICE_MAX } = TAILOR_LIMITS;
const IDS = Object.keys(SERVICES);               // catalog order
const ALL_TYPES = Object.keys(GARMENT_TYPES).length;
const PREVIEW_ROWS = 4;
const ui = () => (state.ui[ID] ??= {});

/* ---------- draft: { prices: { [serviceId]: number | null } } — a key = ticked; null = ticked, no price yet ---------- */
const fromTailor = (t) => ({ prices: { ...(t.prices ?? {}) } });
const draftOf = () => (ui().draft ??= fromTailor(myTailor()));
const ticked = (d) => IDS.filter((id) => id in d.prices);
const sig = (d) => JSON.stringify(ticked(d).map((id) => [id, d.prices[id] ?? null]));
const isDirty = () => sig(draftOf()) !== sig(fromTailor(myTailor()));
const okPrice = (p) => Number.isInteger(p) && p > 0;
const goodPrice = (p) => okPrice(p) && p <= PRICE_MAX;
/* M7: names joined by commas, each name kept whole with no-break spaces, so a line only breaks after a comma (R2-2-T-05) */
const caption = (id) => (SERVICES[id].garments.length >= ALL_TYPES ? 'Any garment' : SERVICES[id].garments.map((g) => g.replace(/ /g, '\u00a0')).join(', '));
const takeCents = (p) => (okPrice(p) ? payoutFor({ services: cents(p) }) : null);
const feeCents = (p) => (okPrice(p) ? tailyFeeFor(cents(p)) : null);

/* ---------- copy ---------- */
function errorCopy(code) {
  if (code === 'no-services') return 'Pick at least one service you offer.';
  if (code === 'price-missing') return 'Enter a price.';
  if (code === 'price-invalid') return `Enter a whole-dollar price up to ${fmt(cents(PRICE_MAX))}.`;
  return '';
}
const selectedText = (d) => `${ticked(d).length} selected`;
/* the lead counts exactly what the preview lists (ticked AND validly priced); at 0 there is no lead (D-71) */
const listed = (d) => ticked(d).filter((id) => goodPrice(d.prices[id]));
const leadText = (d) => { const n = listed(d).length; return n ? `${n} ${n === 1 ? 'service' : 'services'} on your profile` : ''; };
const NONE_NOTE = 'Pick at least one service to continue.';
/** One precision for every "Your payout" and "Taily fee" in the list (D-70). */
const takeFmt = (d) => fmtColumn(ticked(d).flatMap((id) => [takeCents(d.prices[id]), feeCents(d.prices[id])]));

/** D-172, M6-T-07: the fee in dollars on a round example, said once under the lead; each row below spells out its own. */
function feeLine() {
  const c = cents(MONEY.FEE_EXAMPLE_SERVICES);
  return `Taily keeps ${fmtExact(tailyFeeFor(c))} of every ${fmtExact(c)} of services. Home-visit and rush fees are yours in full.`;
}

function resumeBanner(t) {
  if (!state.ui.onboarding?.resumed) return '';
  const done = ONBOARDING_STEPS.filter((s) => t.onboarding?.[s.id]);
  const left = ONBOARDING_STEPS.length - done.length;
  const was = done.length === 1 ? `${done[0].label} is done.` : done.length ? `${done.length} steps are done: ${done.map((s) => s.label).join(', ')}.` : '';
  return `<div class="${ID}__resume">${banner({
    tone: 'info', title: 'Pick up where you left off',
    text: `${was} ${left} ${left === 1 ? 'step' : 'steps'} to go before customers can book you.`.trim(), dismissible: true,
  })}</div>`;
}

/* ---------- pieces ---------- */
function rowHtml(id, d) {
  const on = id in d.prices;
  const p = d.prices[id];
  return serviceRow({
    id, label: SERVICES[id].label, caption: caption(id), checked: on, price: p == null ? '' : String(p),
    payoutCents: on ? takeCents(p) : null, payoutText: on && takeCents(p) != null ? takeFmt(d)(takeCents(p)) : '', feeText: on && feeCents(p) != null ? takeFmt(d)(feeCents(p)) : '', error: on ? errorCopy((ui().errors ?? {})[`price-${id}`]) : '',
  });
}
function previewBody(d) {
  const rows = ticked(d).filter((id) => goodPrice(d.prices[id]));
  if (!rows.length) return '<p class="t-small c-600">Nothing on your profile yet.</p>';
  const more = rows.length - PREVIEW_ROWS;
  return `<div class="${ID}__prices">${rows.slice(0, PREVIEW_ROWS).map((id) => priceRow({ label: SERVICES[id].label, cents: cents(d.prices[id]) })).join('')}</div>
${more > 0 ? `<p class="t-small c-600 ${ID}__more">+ ${more} more</p>` : ''}`;
}

function view() {
  const t = myTailor();
  const editing = !!t.live;
  const d = draftOf();
  const listErr = errorCopy((ui().errors ?? {}).prices);
  const done = SECTIONS.filter((x) => t.onboarding?.[x]);
  const busy = !!ui().busy;
  const dirty = isDirty();
  const zero = !ticked(d).length;
  const title = '<h1 class="t-title">Services and prices</h1>';
  return `${onboardingHeader({ editing })}
<main class="body body--with-bar ${ID}">
  ${editing ? headingRow(title) : `${onboardingSteps(STEP, done)}${resumeBanner(t)}<div class="heading-block ${ID}__title">${title}</div>`}
  <p class="t-body c-600 ${ID}__lead">Tick what you do and set your usual price.</p>
  <div class="${ID}__fee"><p class="t-small c-600 ${ID}__take-note" data-money>${feeLine()}</p>${infoButton('fee', { label: 'The Taily fee' })}</div>
  <section class="sec" aria-labelledby="${ID}-list-label">
    ${sectionHead('Services', { id: `${ID}-list-label`, aside: `<span class="t-small c-600 tabular" data-selected>${selectedText(d)}</span>` })}
    <p class="field__msg field__msg--error ${ID}__list-error" role="alert" data-list-error${listErr ? '' : ' hidden'}>${esc(listErr)}</p>
    <div class="card card--list ${ID}__card" role="group" aria-labelledby="${ID}-list-label">${IDS.map((id) => rowHtml(id, d)).join('')}</div>
  </section>
  <section class="sec ${ID}__preview" aria-labelledby="${ID}-preview-label">
    ${sectionHead('On your profile', { id: `${ID}-preview-label` })}
    <div class="${ID}__preview-body">${previewBody(d)}</div>
  </section>
</main>
${editing
    ? actionBar({ ctaLabel: 'Save changes', ctaAct: 'save', lead: leadText(d), disabled: !busy && (zero || !dirty), note: busy ? '' : zero ? NONE_NOTE : dirty ? '' : 'No changes yet.', busy, busyLabel: 'Saving…' })
    : actionBar({ ctaLabel: 'Next', ctaAct: 'next', lead: leadText(d), disabled: !busy && zero, note: busy || !zero ? '' : NONE_NOTE, busy, busyLabel: 'Saving…' })}`;
}

/* ---------- wiring ---------- */
function wire(root) {
  const t = myTailor();
  const editing = !!t.live;
  const main = root.querySelector('main');
  const bar = root.querySelector('.action-bar');
  const isTest = document.documentElement.classList.contains('is-test');
  const d = draftOf();
  const card = root.querySelector(`.${ID}__card`);

  if (ui().focus) { root.querySelector(ui().focus)?.focus(); ui().focus = null; }
  if (ui().busy) root.querySelectorAll('input').forEach((el) => { el.disabled = true; });

  /* ----- live, in place ----- */
  const paintBar = () => {
    const zero = !ticked(d).length;
    const btn = bar.querySelector('[data-act="save"], [data-act="next"]');
    const lead = leadText(d);
    let leadEl = bar.querySelector('.action-bar__lead');
    if (lead) {
      if (!leadEl) { leadEl = document.createElement('p'); leadEl.className = 'action-bar__lead t-small c-600'; bar.prepend(leadEl); }
      leadEl.textContent = lead;
    } else leadEl?.remove();
    const off = zero || (editing && !isDirty());
    const reason = zero ? NONE_NOTE : off ? 'No changes yet.' : '';
    btn.disabled = off; btn.setAttribute('aria-disabled', String(off));
    btn.classList.toggle('cta--disabled', off);
    let note = bar.querySelector('.action-bar__note');
    if (!reason) { note?.remove(); btn.removeAttribute('aria-describedby'); return; }
    if (!note) {
      note = document.createElement('p');
      note.className = 'action-bar__note t-small c-600'; note.id = `action-bar-note-${btn.dataset.act}`;
      bar.appendChild(note);
    }
    note.textContent = reason; btn.setAttribute('aria-describedby', note.id);
  };
  /* every "Your payout" and fee in the list shares one precision, so a change on one row repaints them all (D-70) */
  const paintTakes = () => {
    const f = takeFmt(d);
    ticked(d).forEach((id) => {
      const take = card.querySelector(`[data-service="${id}"] [data-take]`);
      if (!take) return;
      const c = takeCents(d.prices[id]);
      take.hidden = c == null;
      take.innerHTML = c == null ? '' : takeHtml(f(c), f(feeCents(d.prices[id])));
    });
  };
  const paintSummary = () => {
    root.querySelector('[data-selected]').textContent = selectedText(d);
    root.querySelector(`.${ID}__preview-body`).innerHTML = previewBody(d);
    paintTakes();
    paintBar();
  };
  const clearListError = () => {
    if (!ui().errors?.prices) return;
    delete ui().errors.prices;
    const p = root.querySelector('[data-list-error]');
    p.hidden = true; p.textContent = '';
  };
  const clearPriceError = (id, input) => {
    const key = `price-${id}`;
    if (!ui().errors?.[key]) return;
    delete ui().errors[key];
    input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby');
    const wrap = input.closest('.service-row-wrap');
    wrap.classList.remove('service-row-wrap--error');
    wrap.querySelector('.service-row__box')?.classList.remove('service-row__box--error');
    wrap.querySelector('.field__msg')?.remove();
  };

  main.addEventListener('change', (e) => {
    const box = e.target.closest('[data-act="svc"]');
    if (!box || ui().busy) return;
    const id = box.dataset.id;
    if (box.checked) d.prices[id] = null; else { delete d.prices[id]; delete (ui().errors ?? {})[`price-${id}`]; }
    clearListError();
    const wrap = card.querySelector(`[data-service="${id}"]`);
    wrap.outerHTML = rowHtml(id, d);
    paintSummary();
    const input = card.querySelector(`#price-${id}`);
    if (input && !isTest) input.focus();
    else if (!input) card.querySelector(`#svc-${id}`)?.focus();
  });
  main.addEventListener('input', (e) => {
    const input = e.target.closest('input[id^="price-"]');
    if (!input) return;
    const id = input.id.slice('price-'.length);
    const raw = input.value.replace(/[^\d.]/g, '');
    if (raw !== input.value) input.value = raw;
    const n = raw === '' ? null : Number(raw);
    d.prices[id] = Number.isNaN(n) ? null : n;
    clearPriceError(id, input);
    paintSummary();
  });

  /* ----- actions ----- */
  const leave = () => { state.ui[ID] = {}; back() || go('t-shop'); };
  const askLeave = () => modalOverlay(leaveModal(), { dataS: `${ID}-leave` }, (holder, close) => {
    holder.querySelector('[data-act="keep-editing"]').addEventListener('click', () => close());
    holder.querySelector('[data-act="discard"]').addEventListener('click', () => { close(); leave(); });
  });
  root.querySelectorAll('.back[data-act="back"]').forEach((btn) => {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      if (ui().busy) return;
      if (editing) return isDirty() ? askLeave() : leave();
      back() || go('to-profile');
    });
  });

  const cleaned = (only) => Object.fromEntries(ticked(d).filter((id) => !only || goodPrice(d.prices[id])).map((id) => [id, d.prices[id]]));
  function submit() {
    if (ui().busy) return;
    const v = validateSection(STEP, { prices: cleaned(false) });
    if (!v.ok) {
      ui().errors = v.errors;
      const first = ticked(d).find((id) => v.errors[`price-${id}`]);
      ui().focus = first ? `#price-${first}` : '.to-services__card input';
      go(ID);
      return;
    }
    ui().errors = {};
    ui().busy = true;
    go(ID);
    withLatency(() => {
      ui().busy = false;
      T.setTailorSection(STEP, { prices: cleaned(false) });
      if (state.ui.onboarding) state.ui.onboarding.resumed = false;
      if (editing) { state.ui[ID] = {}; back() || go('t-shop'); toast('Saved. Customers see the change now.', { tone: 'success' }); return; }
      go(ONBOARDING_STEPS[ONBOARDING_STEPS.findIndex((s) => s.id === STEP) + 1].screen);
    });
  }
  function finishLater() {
    if (ui().busy) return;
    T.setTailorSection(STEP, { prices: cleaned(true) });   // as typed; a row with no usable price is simply not saved (D-57)
    state.ui['t-phone'] = { saved: true, phone: myTailor().phone };
    A.signOut('tailor');
    go('t-phone', { fresh: true });
  }

  root.querySelectorAll('.ob-bar [data-act="finish-later"]').forEach((b) => b.addEventListener('click', finishLater));
  bar.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    if (a.dataset.act === 'next' || a.dataset.act === 'save') submit();
  });
  main.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act="dismiss"]');
    if (!a) return;
    if (state.ui.onboarding) state.ui.onboarding.resumed = false;
    a.closest(`.${ID}__resume`)?.remove();
  });
  main.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input[id^="price-"]')) { e.preventDefault(); if (!editing || isDirty()) submit(); }
  });
}

register(ID, view, wire);
