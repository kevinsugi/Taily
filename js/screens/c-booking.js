/* ============================================================
   c-booking — C8 booking detail. The appointment, its money, and the
   ways to change it. Focal: the visit time (visitBlock title, .t-h2).
   States: just confirmed · upcoming · cancel sheets (early / late) ·
   reschedule sheet · cancelled (early / late) · Amara can't make it ·
   no-show. Which appointment: focusAppt (D-72).
   ============================================================ */
import { register, render as go, registered } from '../app.js';
import {
  state, T, tailorById, openSlots, justConfirmed, now,
} from '../state.js';
import {
  chrome, headingRow, statusHero, visitBlock, timeline, customerBreakdown, moneyRows, cta, banner, emptyState,
  sheetOverlay, toast, esc, wireWheel, noteQuote,
} from '../components.js';
import { scheduler, slotColumns, readSlot, SCHED_ROW } from '../scheduler.js';
import { fmtExact, cancelTerms } from '../money.js';
import { fmtWhen, fmtTime, addMinutes, toDate } from '../dates.js';
import { VISIT_LABEL, VISIT_MINUTES } from '../data.js';
import { POLICY } from '../money-config.js';
import { withLatency } from '../sim.js';
import { focusAppt, redirectIfMoved } from '../focus.js';

const ID = 'c-booking';

const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const money = (cents) => `<span data-money>${fmtExact(cents)}</span>`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const dropped = (a) => a.status === 'cancelled' && ['withdrawn', 'switched'].includes(a.cancel?.reason);
const confirmedAt = (a) => [...a.history].reverse().find((h) => h.status === 'confirmed')?.at ?? a.requestedAt;

function whereOf(a, t) {
  if (a.job.visitType === 'home') {
    const ad = a.job.address ?? state.customer.address;
    return [ad.street, ad.unit, ad.city].filter(Boolean).join(', ');
  }
  return [t.shopName, t.shop?.street].filter(Boolean).join(', ');
}

function visitRows(a, t) {
  const items = a.job.garments.length;
  const services = a.job.garments.reduce((n, g) => n + g.services.length, 0);
  return [
    esc(`${VISIT_LABEL.customer[a.job.visitType]} · ${VISIT_MINUTES[a.job.visitType]} min`),
    esc(whereOf(a, t)),
    `${plural(items, 'item')} · ${plural(services, 'service')}`,
  ];
}

/** The shared detail header (D-93, supersedes R3-1-C-04's pill-above-Back): Back on its own row, then the pill,
    the title and the notes, all flush at the screen padding. */
function head(a, { pill, pillLabel, title, body = '', variant = 'requested' }) {
  return headingRow(statusHero({ variant, pill, pillLabel, title, body }), { backRow: true });
}

/* ---------- views ---------- */

function cancelledView(a, t, first) {
  const reason = a.cancel?.reason;
  const dep = a.payments.deposit.cents;
  const refund = a.cancel?.refund ?? 0;
  const kept = a.cancel?.kept ?? 0;
  const cfg = {
    'customer-early': {
      pill: 'calm', label: 'Cancelled', title: 'Booking cancelled',
      body: `Your ${fmtExact(refund)} deposit is on its way back to your card. It can take a few business days to show.`,
      status: 'Refunded',
    },
    'customer-late': {
      pill: 'cancelled', label: 'Cancelled', title: 'Booking cancelled',
      body: `The ${fmtExact(kept)} deposit was kept because you cancelled less than ${POLICY.CANCEL_WINDOW_H} hours before the visit. Nothing else is charged.`,
      status: 'Kept',
    },
    'tailor-cant-make-it': {
      pill: 'cancelled', label: `Cancelled by ${first}`, title: `${esc(first)} can’t make it`,
      body: `${first} cancelled your ${fmtWhen(a.slot.start)} visit. Your ${fmtExact(refund)} deposit is refunded in full, and your job is saved.`,
      status: 'Refunded',
    },
    'no-show': {
      pill: 'cancelled', label: 'No-show', title: 'Marked as a no-show',
      body: `${first} waited until ${fmtTime(addMinutes(a.slot.start, POLICY.NO_SHOW_WAIT_MIN))} and marked the visit as missed. The ${fmtExact(kept)} deposit is kept. Nothing else is charged.`,
      status: 'Kept',
    },
  }[reason] ?? {
    pill: 'cancelled', label: 'Cancelled', title: 'Booking cancelled', body: '', status: a.payments.deposit.state === 'refunded' ? 'Refunded' : 'Kept',
  };
  const note = reason === 'tailor-cant-make-it' && a.cancel?.note
    ? noteQuote({ label: `${first}’s note`, text: a.cancel.note }) : '';

  let actions;
  if (reason === 'tailor-cant-make-it') {
    actions = `${cta('Find another tailor', { attrs: 'data-act="find-another"' })}
    ${cta(`Message ${esc(first)}`, { variant: 'secondary', attrs: 'data-act="message"' })}`;
  } else if (reason === 'no-show') {
    actions = `<p class="t-small c-600">Think this is a mistake? Message ${esc(first)}.</p>
    ${cta(`Message ${esc(first)}`, { attrs: 'data-act="message"' })}
    ${cta('See other tailors', { variant: 'secondary', attrs: 'data-act="other-tailors"' })}`;
  } else {
    actions = `${cta(`Book ${esc(first)} again`, { attrs: 'data-act="book-again"' })}
    ${cta('See other tailors', { variant: 'secondary', attrs: 'data-act="other-tailors"' })}`;
  }
  return `${chrome('bookings')}<main class="body ${ID} ${ID}--cancelled" data-s="${ID}">
  ${head(a, { pill: cfg.pill, pillLabel: cfg.label, title: cfg.title, body: esc(cfg.body), variant: 'declined' })}
  ${note}
  <div class="${ID}__block">${visitBlock(visitRows(a, t), { title: fmtWhen(a.slot.start), flush: true })}</div>
  <h2 class="t-h2 ${ID}__h2">Price</h2>
  ${moneyRows([{ label: 'Deposit', cents: dep, status: cfg.status }])}
  <div class="${ID}__actions">
    ${actions}
  </div>
</main>`;
}

function liveView(a, t, first) {
  const terms = cancelTerms(a, now());
  const early = terms.window === 'early';
  const deposit = a.payments.deposit.cents;
  const cutoff = fmtWhen(addMinutes(a.slot.start, -POLICY.CANCEL_WINDOW_H * 60));
  const confirmed = a.status === 'confirmed';
  const fresh = confirmed && justConfirmed(a);
  const hero = fresh
    ? head(a, {
      pill: 'confirmed', title: `You’re booked with ${esc(first)}`,
      body: a.confirmedVia === 'suggestion'
        ? `You accepted ${esc(first)}’s new time. Your ${fmtExact(deposit)} deposit is paid.`
        : `${esc(first)} accepted your request. Your ${fmtExact(deposit)} deposit is paid.`,
      variant: 'confirmed',
    })
    : head(a, { pill: confirmed ? 'confirmed' : a.status, title: `Your visit with ${esc(first)}`, variant: 'confirmed' });

  const steps = timeline([
    { state: 'done', title: 'Booked', sub: fmtWhen(confirmedAt(a)) },
    { state: 'current', title: 'Visit and fitting', sub: `${esc(first)} confirms the final price` },
    { state: 'todo', title: 'Tailoring' },
    { state: 'todo', title: 'Ready', sub: `Pay the balance, est. ${money(a.money.balance)}` },
  ]);
  const policy = early
    ? `Free cancellation until ${cutoff}. After that, the ${money(deposit)} deposit is kept.`
    : `Less than ${POLICY.CANCEL_WINDOW_H} hours to go: cancelling now keeps the ${money(deposit)} deposit.`;
  const change = !confirmed ? '' : `${early
    ? cta('Reschedule', { variant: 'secondary', attrs: 'data-act="reschedule"' })
    : `<p class="t-small c-600 ${ID}__late">To change the time now, message ${esc(first)}.</p>`}
    <button type="button" class="${ID}__cancel" data-act="cancel">Cancel booking</button>`;

  return `${chrome('bookings')}<main class="body ${ID}" data-s="${ID}">
  ${hero}
  <div class="${ID}__block">${visitBlock(visitRows(a, t), { title: fmtWhen(a.slot.start), flush: true })}</div>
  <h2 class="t-h2 ${ID}__h2">What happens next</h2>
  ${steps}
  <h2 class="t-h2 ${ID}__h2">Price</h2>
  ${customerBreakdown(a.money, { stage: 'booked', tailorFirst: first, depositState: a.payments.deposit.state })}
  ${confirmed ? `<p class="t-small c-600 ${ID}__policy">${policy}</p>` : ''}
  <div class="${ID}__actions">
    ${cta(`Message ${esc(first)}`, { attrs: 'data-act="message"' })}
    ${change}
  </div>
</main>`;
}

function view() {
  const a = focusAppt(ID);
  if (!a || dropped(a)) {
    return `${chrome('bookings')}<main class="body ${ID}" data-s="${ID}">
  <div class="${ID}__empty" data-empty="no-booking">${emptyState({
    title: 'No booking to show', body: 'Your requests and visits are in Bookings.', ctaLabel: 'Go to Bookings', ctaAct: 'bookings',
  })}</div>
</main>`;
  }
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  return a.status === 'cancelled' ? cancelledView(a, t, first) : liveView(a, t, first);
}

/* ---------- sheets ---------- */

/** A sheet body that is rebuilt as busy while the simulated network wait runs. */
function cancelSheetHtml(a, terms, first, busy = false) {
  const early = terms.window === 'early';
  const deposit = a.payments.deposit.cents;
  const rows = early
    ? [{ label: 'Deposit paid', cents: deposit }, { label: 'Refund to your card', cents: terms.refund, kind: 'total' }]
    : [{ label: 'Deposit paid', cents: deposit }, { label: 'Refund', cents: 0 }, { label: 'Kept', cents: terms.kept, kind: 'total' }];
  const text = early
    ? `You’re cancelling more than ${POLICY.CANCEL_WINDOW_H} hours before the visit, so your ${money(terms.refund)} deposit comes back in full.`
    : `This visit is less than ${POLICY.CANCEL_WINDOW_H} hours away, so the ${money(terms.kept)} deposit is kept. It pays ${esc(first)} for the time set aside. Nothing else is charged.`;
  const label = early ? `Cancel and get ${fmtExact(terms.refund)} back` : `Cancel booking (${fmtExact(terms.kept)} not refunded)`;
  return `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  <p class="t-body c-700">${text}</p>
  ${moneyRows(rows)}
  ${cta(label, { variant: 'danger', busy, busyLabel: 'Cancelling…', attrs: 'data-act="cancel-ok"' })}
  ${cta('Keep booking', { variant: 'secondary', disabled: busy, attrs: 'data-act="cancel-keep"' })}
</div>`;
}

const gone = (holder) => !holder.isConnected || holder.classList.contains('is-closing');

function openCancel(a, first) {
  const terms = cancelTerms(a, now());
  const early = terms.window === 'early';
  sheetOverlay(cancelSheetHtml(a, terms, first), { header: 'Cancel this booking?', dataS: `${ID}--${early ? 'cancel' : 'cancel-late'}`, confirm: false }, (holder, close) => {
    let busy = false;
    const paint = () => { holder.querySelector(`.${ID}-sheet`).outerHTML = cancelSheetHtml(a, terms, first, busy); };
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'cancel-keep') close();
      else if (act === 'cancel-ok') {
        busy = true; paint();
        withLatency(() => {
          if (gone(holder)) return;
          const res = T.cancelBooking(a.id);
          busy = false;
          if (!res.ok) { paint(); toast('Something went wrong. Your booking is unchanged.', { tone: 'error' }); return; }
          close();
          go(ID);
          toast(early ? `Booking cancelled. ${fmtExact(terms.refund)} refunded.` : 'Booking cancelled.');
        });
      }
    });
  });
}

function openReschedule(a, first) {
  const slots = openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).filter((s) => s !== a.slot.start);
  if (!slots.length) {
    sheetOverlay(`<div class="${ID}-sheet">
  <p class="t-body c-700">${esc(first)} has no other open times before ${esc(fmtWhen(a.job.needBy).split(' · ')[0])}. Message ${esc(first)} to find a time that works.</p>
  ${cta(`Message ${esc(first)}`, { attrs: 'data-act="resched-message"' })}
  ${cta('Keep current time', { variant: 'secondary', attrs: 'data-act="resched-keep"' })}
</div>`, { header: 'Pick a new time', dataS: `${ID}--reschedule-none`, confirm: false }, (holder, close) => {
      holder.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'resched-keep') close();
        else if (act === 'resched-message') { close(); go('c-thread'); }
      });
    });
    return;
  }
  let picked = slots[0];
  const sheetHtml = (busy = false, error = '') => `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  ${error ? banner({ tone: 'error', text: error }) : ''}
  <p class="t-small c-600 ${ID}-sheet__now" data-now>Now: <span class="nb">${fmtWhen(a.slot.start)}</span></p>
  <div class="${ID}-sheet__wheel">${scheduler({ columns: slotColumns(slots, picked), compact: true, cta: '', inline: true, note: `New time: ${fmtWhen(picked)}` })}</div>
  <p class="t-small c-600">Same price. ${esc(first)} is told right away.</p>
  ${cta('Move my visit', { busy, busyLabel: 'Moving…', attrs: 'data-act="move-ok"' })}
  ${cta('Keep current time', { variant: 'secondary', disabled: busy, attrs: 'data-act="resched-keep"' })}
</div>`;
  sheetOverlay(sheetHtml(), { header: 'Pick a new time', dataS: `${ID}--reschedule`, confirm: false }, (holder, close) => {
    let busy = false;
    const onWheel = () => {
      const iso = readSlot(holder, slots);
      if (!iso) return;
      picked = iso;
      const note = holder.querySelector('[data-sched-note]');
      if (note) { note.textContent = `New time: ${fmtWhen(iso)}`; note.hidden = false; }
    };
    const paint = (error = '') => {
      holder.querySelector(`.${ID}-sheet`).outerHTML = sheetHtml(busy, error);
      wireWheel(holder, onWheel, SCHED_ROW);
    };
    wireWheel(holder, onWheel, SCHED_ROW);
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'resched-keep') close();
      else if (act === 'move-ok') {
        onWheel();
        busy = true; paint();
        withLatency(() => {
          if (gone(holder)) return;
          const res = T.rescheduleBooking(a.id, picked);
          busy = false;
          if (!res.ok) {
            paint(res.error === 'too-late'
              ? `This visit is now less than ${POLICY.CANCEL_WINDOW_H} hours away, so it can’t be moved. Message ${first} to change it.`
              : 'That time was just taken. Pick another one.');
            return;
          }
          close();
          go(ID);
          toast(`Moved to ${fmtWhen(picked)}. ${first} has been told.`);
        });
      }
    });
  });
}

/* ---------- wiring ---------- */

function wire(root) {
  if (redirectIfMoved(ID, go, { has: (id) => registered().includes(id) })) return;
  const a = focusAppt(ID);

  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => go('c-bookings'));
  }

  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act || e.target.closest('.screen-sheet--overlay')) return;
    const t = a ? tailorById(a.tailorId) ?? state.tailors[0] : null;
    switch (act) {
      case 'message': go('c-thread'); break;
      case 'cancel': if (a) openCancel(a, firstOf(t)); break;
      case 'reschedule': if (a) openReschedule(a, firstOf(t)); break;
      case 'book-again': state.ui.booking = { tailorId: a.tailorId }; go('c-book'); break;
      case 'other-tailors': go('c-tailors'); break;
      case 'find-another': go('c-tailors', { fresh: true }); break;
      case 'bookings': go('c-bookings', { fresh: true }); break;
      default:
    }
  });
}

register(ID, view, wire);
