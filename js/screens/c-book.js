/* ============================================================
   c-book — C5a Pick a time (booking step 5 of 5).
   The Scheduler limited to the tailor's open slots before the need-by.
   Focal: the Scheduler. The pick lives in state.ui.booking.slot (D-36).
   ============================================================ */
import { register, render as go, back } from '../app.js';
import { state, tailorById, openSlots, nextOpening } from '../state.js';
import { flowBar, headingRow, emptyState, actionBar, wireWheel } from '../components.js';
import { scheduler, slotColumns, readSlot, SCHED_ROW } from '../scheduler.js';
import { fmt, estimate } from '../money.js';
import { fmtDay, fmtWhen, nb } from '../dates.js';
import { VISIT_LABEL, VISIT_MINUTES, SLOT_HORIZON_DAYS, itemsLabel } from '../data.js';

const ID = 'c-book';

const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];

/** Everything the view and the wire share. */
function read() {
  const t = tailorById(state.ui.booking?.tailorId) ?? state.tailors[0];
  const job = state.job;
  const slots = openSlots(t.id, job.visitType, { until: job.needBy });
  const picked = state.ui.booking?.slot;
  const selected = slots.includes(picked) ? picked : (slots[0] ?? null);
  return { t, job, slots, selected };
}

/** The caps rush note for a slot ('' when no rush applies). */
function rushNote(t, job, slot) {
  if (!slot) return '';
  const q = estimate(t, job, slot);
  if (!(q.rush > 0)) return '';
  const days = q.rushDays ?? 1;
  return `RUSH FEE ${fmt(q.rush)} · VISIT ${days} ${days === 1 ? 'DAY' : 'DAYS'} BEFORE YOUR NEED-BY`;
}

/** The action bar's lead: the estimate for the settled slot (a rush slot raises it). */
const estLead = (t, job, slot) => `<span>Est. <b data-money>${fmt(estimate(t, job, slot).total)}</b> · ${itemsLabel(job.garments.length, 'item')}</span>`;

function view() {
  const { t, job, slots, selected } = read();
  const first = firstOf(t);
  const open = (bar) => `${flowBar({ step: 3 })}<main class="body${bar ? ' body--with-bar' : ''} ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Pick a time</h1>', { back: false })}`;

  if (!slots.length) {
    const next = nextOpening(t.id, job.visitType);
    const body = next
      ? `${first}’s next opening is ${nb(fmtWhen(next))}, too close to your need-by date. The visit has to be at least a day before.`
      : `${first} has no open times in the next ${Math.round(SLOT_HORIZON_DAYS / 7)} weeks.`;
    return `${open(false)}
  <div class="c-book__empty" data-empty="no-slots">${emptyState({
    title: `No open times before ${nb(fmtDay(job.needBy))}`,
    body,
    art: 'Suit Jacket',
    ctaLabel: 'Change need-by date', ctaAct: 'later',
    secondaryLabel: `Message ${first}`, secondaryAct: 'ask',
  })}</div>
</main>`;
  }

  return `${open(true)}
  <p class="t-body w-600 c-book__who">${t.name}</p>
  <p class="t-small c-600 c-book__where">${VISIT_LABEL.customer[job.visitType]} · ${VISIT_MINUTES[job.visitType]}-minute visit</p>
  <div class="c-book__sched">${scheduler({
    title: '', columns: slotColumns(slots, selected), note: rushNote(t, job, selected),
    cta: '', inline: true, compact: true, top: true,   // M7-2-C-07 / A-05: always the 3-row wheel, the settled row on top — no blank card above it
  })}</div>
  <p class="t-small c-600 c-book__free">Nothing is charged yet.</p>
</main>
${actionBar({ lead: estLead(t, job, selected), ctaLabel: 'Next: review and send', ctaAct: 'slot-next' })}`;
}

/* #screen is the same element on every render — drop the previous render's delegate before adding ours */
let offClick = null;

function wire(root) {
  const { t, job, slots } = read();

  /* Back → the profile (steps history when there is one; a cold link lands on c-tailor) */
  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => { if (!back()) go('c-tailor'); });
  }

  /* the wheel: every settle stores the slot and refreshes the rush note */
  const sched = root.querySelector('[data-scheduler]');
  const store = () => {
    const iso = readSlot(root, slots);
    if (!iso) return null;
    state.ui.booking = { ...state.ui.booking, tailorId: t.id, slot: iso };
    const note = sched?.querySelector('[data-sched-note]');
    if (note) {
      const text = rushNote(t, job, iso);
      note.textContent = text;
      note.hidden = !text;
    }
    const amt = root.querySelector('.action-bar__lead b');
    if (amt) amt.textContent = fmt(estimate(t, job, iso).total);
    return iso;
  };
  if (sched) wireWheel(root, store, SCHED_ROW);

  offClick?.();
  const onClick = (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    switch (a.dataset.act) {
      case 'slot-next':
        if (store()) go('c-pay');
        break;
      case 'later':
        state.ui['c-where'] = { openNeedBy: true };
        go('c-where');
        break;
      case 'ask':
        go('c-thread');
        break;
      default:
    }
  };
  root.addEventListener('click', onClick);
  offClick = () => root.removeEventListener('click', onClick);
}

register(ID, view, wire);
