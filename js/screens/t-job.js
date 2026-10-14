/* ============================================================
   t-job — T4 upcoming job (M3-spec §C2). Where, when, who — and the
   two things that can go wrong (she can't make it / Sarah doesn't
   show). Focal: the visit card, `fmtWhen(start)` over the full
   address. One filled CTA: Message Sarah. Cancelled jobs read
   plainly with the money outcome first and hide the street (D-88).
   ============================================================ */
import { register, render as go, registered, personaHome } from '../app.js';
import { state, T, now, justConfirmed } from '../state.js';
import { focusAppt, redirectIfMoved } from '../focus.js';
import { myTailor, requestView, jobAddress, payoutOf, inbox } from '../tailor-data.js';
import { CANT_MAKE_IT_REASONS } from '../data.js';
import { POLICY } from '../money-config.js';
import { fmtExact, noShowPayout } from '../money.js';
import { withLatency } from '../sim.js';
import { toDate, addMinutes, isoMinute, fmtWhen, fmtDay, fmtTime } from '../dates.js';
import {
  chrome, headingRow, statusHero, visitBlock, avatar, cta, listRow, banner, tailorBreakdown, moneyRows, workList,
  emptyState, sheetOverlay, chipGroup, wireChipGroups, toast, esc, wirePhotoViewer,
} from '../components.js';

const ID = 't-job';
const ui = () => (state.ui[ID] ??= {});
const firstOf = () => state.customer.first;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ---------- copy by state ---------- */
const cancelKind = (a) => (a.status === 'cancelled' ? a.cancel?.reason ?? 'customer-early' : null);

/** [pill label, title, note HTML] for the heading block — pill words per §B2. */
function heroCopy(a, v) {
  const first = esc(firstOf());
  const c = a.cancel ?? {};
  const kind = cancelKind(a);
  if (kind === 'tailor-cant-make-it') {
    return {
      pill: 'cancelled', label: 'Cancelled', title: 'Visit cancelled',
      note: `<p class="t-body c-700 ${ID}__note">${first} has been told and refunded her ${fmtExact(c.refund)} deposit. Nothing is paid out for this job.</p>${c.note ? `<p class="t-small c-600 ${ID}__note">Your reason: ${esc(c.note)}</p>` : ''}`,
    };
  }
  if (kind === 'no-show') {
    return {
      pill: 'cancelled', label: 'No-show', title: 'Marked as a no-show',
      note: `<p class="t-body c-700 ${ID}__note">${first} has been told. Her deposit was kept.</p>`,
    };
  }
  if (kind === 'customer-early') {
    return {
      pill: 'cancelled', label: `Cancelled by ${firstOf()}`, title: `${firstOf()} cancelled`,
      note: `<p class="t-body c-700 ${ID}__note">She cancelled more than ${POLICY.CANCEL_WINDOW_H} hours before the visit, so nothing is owed. The time is open again for new requests.</p>`,
    };
  }
  if (kind === 'customer-late') {
    return {
      pill: 'cancelled', label: `Cancelled by ${firstOf()}`, title: `${firstOf()} cancelled`,
      note: `<p class="t-body c-700 ${ID}__note">She cancelled less than ${POLICY.CANCEL_WINDOW_H} hours before the visit, so you keep her ${fmtExact(c.tailorPaid)} deposit.</p>`,
    };
  }
  if (a.status === 'confirmed' && justConfirmed(a)) {
    return {
      pill: 'confirmed', label: 'Accepted', title: `You accepted ${firstOf()}’s request`,
      note: `<p class="t-body c-700 ${ID}__note">${first} has been told and her deposit is paid. Her full address is below.</p>`,
    };
  }
  return { pill: 'confirmed', label: a.status === 'confirmed' ? 'Confirmed' : undefined, title: `Visit with ${esc(v.customer.name)}`, note: '' };
}

/** The money line under a cancelled job's note: kept deposit / no-show pay, with the payout date. */
function cancelMoney(a) {
  const kind = cancelKind(a);
  const p = payoutOf(a);
  if (!p || !['no-show', 'customer-late'].includes(kind)) return '';
  const label = kind === 'no-show' ? 'No-show pay' : 'Kept deposit';
  return `<div class="${ID}__money">${moneyRows([{ label, cents: a.cancel.tailorPaid, kind: 'total', status: `Paid out ${fmtDay(p.date)}` }])}</div>`;
}

/* ---------- blocks ---------- */
function visitCard(a, v) {
  const rows = [
    `${esc(v.visitLabel)} · ${v.minutes} min, until ${v.whenEnd}`,
    `<span class="w-600">${esc(jobAddress(a))}</span>`,
    `Needed by ${v.needBy}`,
  ];
  return visitBlock(rows, { title: fmtWhen(a.slot.start), flush: true });
}

function customerRow(v, { message }) {
  return `<div class="${ID}__customer">
    ${avatar({ initials: v.customer.initials, size: 'sm' })}
    <div class="${ID}__customer-text"><span class="t-body w-600">${esc(v.customer.name)}</span><span class="t-small c-600">Customer</span></div>
  </div>${message ? cta(`Message ${esc(firstOf())}`, { attrs: 'data-act="message"' }) : ''}`;
}

const workHtml = (v) => workList(v);

/** Visit-day actions: "I can’t make it" before the start, a wait note until +15 min, then "didn’t show up". */
function dayActions(a) {
  if (a.status !== 'confirmed') return '';
  const startMs = toDate(a.slot.start).getTime();
  const wait = POLICY.NO_SHOW_WAIT_MIN;
  const t = now();
  let body;
  if (t < startMs) {
    body = `<div class="${ID}__danger">${listRow({ title: 'I can’t make it', sub: `Cancel this visit and refund ${esc(firstOf())}`, act: 'cant-make-it' })}</div>`;
  } else if (t < startMs + wait * 60000) {
    const from = fmtTime(isoMinute(addMinutes(a.slot.start, wait)));
    body = `<p class="t-small c-600 ${ID}__wait">If ${esc(firstOf())} isn’t there by ${from}, you can mark a no-show.</p>`;
  } else {
    body = listRow({ title: `${esc(firstOf())} didn’t show up`, sub: `You’re paid ${fmtExact(noShowPayout(a.payments.deposit.cents))} for your time`, act: 'no-show' });
  }
  return `<!-- M4: start fitting -->
  <section class="${ID}__actions" aria-labelledby="${ID}-wrong"><p class="t-small w-600 c-600 ${ID}__group" id="${ID}-wrong">Something wrong?</p>${body}</section>`;
}

/* ---------- view ---------- */
function view() {
  const a = focusAppt(ID);
  if (!a) {
    const waiting = inbox().requests.length;   // R3-2-T-09: point at what is actually waiting
    const body = waiting ? `You have ${plural(waiting, 'request')} to answer on Home.` : 'Accepted requests show up on Home.';
    return `${chrome('home', { persona: 'tailor' })}
<main class="body ${ID}">
  ${headingRow('<h1 class="t-title">Job</h1>')}
  <div class="${ID}__empty" data-empty="no-job">${emptyState({ title: 'No upcoming jobs', body, ctaLabel: 'Go to Home', ctaAct: 'home' })}</div>
</main>`;
  }
  const v = requestView(a);
  const h = heroCopy(a, v);
  const cancelled = a.status === 'cancelled';
  const last = a.history[a.history.length - 1];
  const sameDay = (x, y) => x.slice(0, 10) === y.slice(0, 10);
  const nb = (t) => `<span class="${ID}__nb">${t}</span>`;
  const was = last?.from ? (sameDay(last.from, a.slot.start) ? fmtTime(last.from) : fmtWhen(last.from)) : '';
  const moved = !cancelled && last?.status === 'rescheduled'
    ? `<div class="${ID}__banner">${banner({ tone: 'info', text: `${esc(firstOf())} moved this visit${was ? ` from ${nb(was)}` : ''} to ${nb(fmtWhen(a.slot.start))}.` })}</div>` : '';
  const hero = statusHero({ variant: cancelled ? 'declined' : 'confirmed', pill: h.pill, pillLabel: h.label, title: h.title, body: '', extra: h.note });
  return `${chrome('home', { persona: 'tailor' })}
<main class="body ${ID}" data-appt="${esc(a.id)}">
  ${headingRow(hero, { backRow: true })}
  ${moved}
  <div class="${ID}__visit">${visitCard(a, v)}</div>
  ${cancelled ? cancelMoney(a) : ''}
  <div class="${ID}__who">${customerRow(v, { message: !cancelled })}</div>
  <h2 class="t-h2 ${ID}__h2">The work</h2>
  ${workHtml(v)}
  ${cancelled ? '' : `<h2 class="t-h2 ${ID}__h2">Your payout</h2>
  ${tailorBreakdown(v.money)}
  <p class="t-small c-600 ${ID}__fine">Paid out the Friday after you mark the job completed. The price can change after the fitting.</p>
  ${dayActions(a)}`}
  ${cancelled ? `<div class="${ID}__back">${cta('Back to Home', { variant: 'secondary', attrs: 'data-act="home"' })}</div>` : ''}
</main>`;
}

/* ---------- sheets ---------- */
/** Lock a sheet while its action runs: busy danger button, outline button + chips disabled, aria-busy. */
function lockSheet(holder, okSel, busyLabel, keepSel) {
  holder.setAttribute('aria-busy', 'true');
  const ok = holder.querySelector(okSel);
  ok.outerHTML = cta(ok.textContent.trim(), { variant: 'danger', busy: true, busyLabel, attrs: ok.getAttribute('data-act') ? `data-act="${ok.getAttribute('data-act')}"` : '' });
  holder.querySelector(keepSel)?.setAttribute('disabled', '');
  holder.querySelectorAll('[data-act="chip"]').forEach((c) => c.setAttribute('disabled', ''));
}

function openCantMakeIt(a) {
  const deposit = a.payments.deposit.cents;
  ui().reason = null;
  sheetOverlay(`<div class="${ID}-sheet">
  <p class="t-body c-700">${esc(firstOf())} is told right away and gets her ${fmtExact(deposit)} deposit back in full. Her job stays saved so she can rebook.</p>
  ${chipGroup({ name: 'reason', label: `Reason (optional, shown to ${firstOf()})`, options: CANT_MAKE_IT_REASONS.map((r) => ({ value: r, label: r })), value: null })}
  <div class="${ID}-sheet__actions">
    ${cta('Cancel the visit', { variant: 'danger', busyLabel: 'Cancelling…', attrs: 'data-act="cant-ok"' })}
    ${cta('Keep the visit', { variant: 'secondary', attrs: 'data-act="cant-keep"' })}
  </div>
</div>`, { header: 'Can’t make it?', dataS: `${ID}--cant-make-it`, confirm: false }, (holder, close) => {
    wireChipGroups(holder);
    holder.addEventListener('chip', (e) => {
      /* tap the chosen reason again to clear it */
      if (ui().reason === e.detail.value) {
        ui().reason = null;
        holder.querySelectorAll('[data-act="chip"]').forEach((c) => { c.classList.remove('chip--selected'); c.setAttribute('aria-checked', 'false'); });
      } else ui().reason = e.detail.value;
    });
    let busy = false;
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'cant-keep') close();
      else if (act === 'cant-ok') {
        busy = true;
        const reason = ui().reason ?? '';
        lockSheet(holder, '[data-act="cant-ok"]', 'Cancelling…', '[data-act="cant-keep"]');
        withLatency(() => {
          const r = T.tailorCantMakeIt(a.id, reason);
          ui().reason = null;
          close({ instant: true });
          go(ID);
          if (r.ok) toast(`Visit cancelled. ${firstOf()} has been refunded.`, { tone: 'success' });
          else toast('Couldn’t cancel this visit. Try again.', { tone: 'error' });
        });
      }
    });
  });
}

function openNoShow(a) {
  const deposit = a.payments.deposit.cents;
  const minutes = Math.max(0, Math.round((now() - toDate(a.slot.start).getTime()) / 60000));
  sheetOverlay(`<div class="${ID}-sheet">
  <p class="t-body c-700">It’s ${fmtTime(isoMinute(new Date(now())))} — ${plural(minutes, 'minute')} past the start. ${esc(firstOf())}’s ${fmtExact(deposit)} deposit is kept and you’re paid ${fmtExact(noShowPayout(deposit))} for your time.</p>
  <div class="${ID}-sheet__actions">
    ${cta('Mark as no-show', { variant: 'danger', busyLabel: 'Saving…', attrs: 'data-act="no-show-ok"' })}
    ${cta('Keep waiting', { variant: 'secondary', attrs: 'data-act="no-show-keep"' })}
  </div>
</div>`, { header: `Mark ${esc(firstOf())} as a no-show?`, dataS: `${ID}--no-show`, confirm: false }, (holder, close) => {
    let busy = false;
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'no-show-keep') close();
      else if (act === 'no-show-ok') {
        busy = true;
        lockSheet(holder, '[data-act="no-show-ok"]', 'Saving…', '[data-act="no-show-keep"]');
        withLatency(() => {
          const r = T.markNoShow(a.id);
          close({ instant: true });
          go(ID);
          if (r.ok) toast('Marked as a no-show', { tone: 'success' });
          else if (r.error === 'too-early') toast(`You can mark a no-show from ${fmtTime(isoMinute(addMinutes(a.slot.start, POLICY.NO_SHOW_WAIT_MIN)))}.`, { tone: 'error' });
          else toast('Couldn’t save this. Try again.', { tone: 'error' });
        });
      }
    });
  });
}

/* ---------- wire ---------- */
function wire(root) {
  if (redirectIfMoved(ID, go, { has: (id) => registered().includes(id) })) return;
  const a = focusAppt(ID);
  wirePhotoViewer(root);
  root.addEventListener('click', (e) => {
    if (e.target.closest('.screen-sheet--overlay')) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'message') go('t-thread');
    else if (act === 'home') go(personaHome('tailor'));
    else if (act === 'cant-make-it' && a) openCantMakeIt(a);
    else if (act === 'no-show' && a) openNoShow(a);
  });
}

register(ID, view, wire);
