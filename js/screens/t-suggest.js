/* ============================================================
   t-suggest — T3 Suggest another time (M3-spec §C1). Offer Sarah
   one of Amara's own open times instead. Focal: the Scheduler
   wheel. Only her open slots before the need-by date, none
   overlapping the asked-for visit (D-77).
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state, T, getAppt } from '../state.js';
import { suggestSlots, suggestPrice } from '../tailor-data.js';
import { focusAppt, setFocus } from '../focus.js';
import { fmtExact } from '../money.js';
import { fmtWhen, fmtDay, fmtTime } from '../dates.js';
import { withLatency } from '../sim.js';
import { scheduler, slotColumns, readSlot, SCHED_ROW, whenNote } from '../scheduler.js';
import {
  chrome, headingRow, banner, emptyState, actionBar, wireWheel, toast, esc,
} from '../components.js';

const ID = 't-suggest';
const ui = () => (state.ui[ID] ??= {});

/** The request this screen is about: it is still a request (status `requested`). */
const request = () => { const a = focusAppt('t-request'); return a && a.status === 'requested' ? a : null; };
/** The price block under the wheel for one slot (D-155): her live take-home, "Sarah pays $X less" when the rush drops, and the rush-window
    tag when the slot sits inside her rush window (the rush fee is not charged on this request). */
function priceLines(a, iso) {
  const sarah = state.customer.first;
  const p = suggestPrice(a, iso);
  const less = p.less > 0 ? ` · ${esc(sarah)} pays ${fmtExact(p.less)} less` : '';
  const turn = p.tier > 0
    ? `${p.days <= 0 ? 'The same day as' : `${p.days} ${p.days === 1 ? 'day' : 'days'} before`} ${sarah}’s need-by date. ${p.rush > 0 ? `The ${fmtExact(p.rush)} rush fee stays as booked.` : 'No rush fee is added to this request.'}`
    : '';
  return `<p class="t-small c-600 ${ID}__same" data-money>Your payout ${fmtExact(p.payout)}${less}.</p>${turn ? `<p class="t-small w-600 c-700 ${ID}__turn">${esc(turn)}</p>` : ''}`;
}
/** The picked slot, kept only while it is still one of her open times. */
const pickedOf = (slots) => (slots.includes(ui().slot) ? ui().slot : slots[0] ?? null);

function view() {
  const a = request();
  const chromeHtml = chrome('home', { persona: 'tailor' });
  if (!a) {
    return `${chromeHtml}<main class="body ${ID}" data-s="${ID}">
  <div class="${ID}__empty" data-empty="no-request">${emptyState({
    title: 'No open requests', body: 'New requests show up on Home.', art: 'Suit Pant', ctaLabel: 'Back to Home', ctaAct: 'home',
  })}</div>
</main>`;
  }
  const sarah = state.customer.first;
  const heading = headingRow(`<h1 class="t-title">Suggest another time</h1>`);
  const slots = suggestSlots(a);
  if (!slots.length) {
    return `${chromeHtml}<main class="body ${ID}" data-s="${ID}--none">
  ${heading}
  <div class="${ID}__empty" data-empty="no-slots">${emptyState({
    title: `No open times before ${fmtDay(a.job.needBy)}`,
    body: 'Add hours to your week, or decline this request.',
    art: 'Suit Jacket', ctaLabel: 'Edit availability', ctaAct: 'hours', secondaryLabel: 'Back to the request', secondaryAct: 'back-request',
  })}</div>
</main>`;
  }
  const picked = pickedOf(slots);
  const d = ui();
  return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}">
  ${heading}
  <p class="t-body c-700 ${ID}__lead">${esc(sarah)} asked for <span class="nb">${esc(fmtWhen(a.slot.start))}</span>. Pick one of your open times before her need-by date, <span class="nb">${esc(fmtDay(a.job.needBy))}</span>.</p>
  ${d.error === 'slot-unavailable' ? `<div class="${ID}__error">${banner({ tone: 'error', title: 'That time was just taken. Pick another.' })}</div>` : ''}
  <div class="${ID}__sched"${d.busy ? ' inert aria-busy="true"' : ''}>${scheduler({
    columns: slotColumns(slots, picked), inline: true, compact: true, cta: '', note: whenNote(`${sarah} sees`, picked),
  })}</div>
  <div class="${ID}__price" data-sched-price aria-live="polite">${priceLines(a, picked)}</div>
  <p class="t-small c-600 ${ID}__by">Send it by ${fmtTime(a.expiresAt)}, or the request expires.</p>
</main>
${actionBar({ ctaLabel: 'Send suggestion', ctaAct: 'send-suggestion', busy: !!d.busy, busyLabel: 'Sending…' })}`;
}

function wire(root) {
  if (T.tick().length) { go('t-request', { replace: true }); return; }   // expired while she browsed
  const a = request();
  if (!a) {
    /* it moved on (answered elsewhere): the request screen shows where it stands */
    if (focusAppt('t-request')) { go('t-request', { replace: true }); return; }
  }
  const slots = a ? suggestSlots(a) : [];

  /* the wheel: every settle stores the slot and updates the "Sarah sees" note in place */
  const sched = root.querySelector('[data-scheduler]');
  const store = () => {
    const iso = readSlot(root, slots);
    if (!iso) return null;
    ui().slot = iso;
    ui().error = null;
    const note = sched?.querySelector('[data-sched-note]');
    if (note) { note.innerHTML = whenNote(`${state.customer.first} sees`, iso); note.hidden = false; }
    const price = root.querySelector('[data-sched-price]');
    if (price && a) price.innerHTML = priceLines(a, iso);
    return iso;
  };
  if (sched) wireWheel(root, store, SCHED_ROW);

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const act = el.dataset.act;
    if (act === 'home') go('t-home', { fresh: true });
    else if (act === 'hours') { delete state.ui['to-availability']; go('to-availability'); }
    else if (act === 'back-request') { if (a) setFocus(a.id); go('t-request', { replace: true }); }
    else if (act === 'send-suggestion' && a) send(a, slots, store);
  });
}

function send(a, slots, store) {
  if (ui().busy) return;
  const picked = store() ?? pickedOf(slots);
  ui().busy = true;
  ui().error = null;
  go(ID);
  withLatency(() => {
    ui().busy = false;
    if (currentScreen() !== ID) return;
    const r = T.tailorSuggest(a.id, picked);
    if (r.ok) {
      state.ui[ID] = {};
      setFocus(a.id);
      go('t-request', { fresh: true });
      toast(`Suggestion sent to ${state.customer.first}`);
    } else if (r.error === 'slot-unavailable') {
      ui().error = 'slot-unavailable';
      ui().slot = null;
      go(ID);
    } else if (r.error === 'expired') {
      T.tick();
      go('t-request', { replace: true });
      toast('This request expired.', { tone: 'error' });
    } else if (getAppt(a.id)?.status === 'cancelled' && ['withdrawn', 'switched'].includes(getAppt(a.id).cancel?.reason)) {
      /* SF-17: Sarah withdrew (or chose another tailor) while Amara picked a time */
      state.ui[ID] = {};
      go('t-home', { fresh: true });
      toast(`${state.customer.first} ${getAppt(a.id).cancel.reason === 'switched' ? 'chose another tailor' : 'withdrew this request'}.`);
    } else {
      go('t-request', { replace: true });
      toast('Couldn’t send your suggestion. Try again.', { tone: 'error' });
    }
  });
}

register(ID, view, wire);
