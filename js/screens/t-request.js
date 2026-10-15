/* ============================================================
   t-request — T2/T3 The request card (M3-spec §C1). Everything
   Amara needs to decide in ninety seconds, then Accept · Suggest
   time · Decline with one thumb. K-15 "The home card, opened": a
   flush strip under the nav (the K-11 request strip), the t-home
   card's header row (avatar · Sarah C. · payout + "Your payout" ⓘ),
   a hairline, the K-14 tile rows, the work, the breakdown.
   States: requested (◆) · suggested · expired · declined.
   Privacy (D-74): "Sarah C." and "Williamsburg · 11211" until she
   accepts. Which appointment: focusAppt (D-72).
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state, T, now, TERMINAL, suggestLapseAt } from '../state.js';
import { requestView, suggestPrice } from '../tailor-data.js';
import { focusAppt, setFocus, redirectIfMoved } from '../focus.js';
import { fmtExact } from '../money.js';
import { fmtWhen, fmtTime, addMinutes, isoMinute, dayDiff } from '../dates.js';
import { DECLINE_REASONS } from '../data.js';
import { POLICY } from '../money-config.js';
import { withLatency } from '../sim.js';
import {
  chrome, headingRow, navBackMark, requestStrip, requestHead, visitBlock, workList, tailorBreakdown, actionBar, cta, emptyState,
  chipGroup, sheetOverlay, toast, esc, wirePhotoViewer, sectionHead, infoButton,
} from '../components.js';

const ID = 't-request';
const ui = () => (state.ui[ID] ??= {});
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* ---------- blocks ---------- */
/** "Your payout" (R3-1-T-04, D-172): the breakdown sits after the work, as on t-job, so the visit is above the fold. */
const payoutSection = (v, money = v.money) => `<section class="sec" aria-labelledby="${ID}-payout">
  ${sectionHead('Your payout', { id: `${ID}-payout` })}
  ${tailorBreakdown(money)}
</section>`;

function visitSection(a, v, { title, asked = '', addressNote = '', start = a.slot.start, end = v.whenEnd } = {}) {
  const days = dayDiff(start, a.job.needBy);
  /* K-10 (D-235): icon rows — calendar (date + length), map-pin (place), clock (needed by) */
  const rows = [
    { icon: 'calendar', value: esc(title), strong: true, detail: [...(asked ? [asked] : []), `${esc(v.visitLabel)} · ${v.minutes} min, until ${esc(end)}`] },
    { icon: 'map-pin', value: `<span class="${ID}__place">${esc(v.place)}</span>`, detail: addressNote ? esc(addressNote) : '' },
    { icon: 'clock', value: `Needed by <span class="nb">${esc(v.needBy)}</span>`, detail: `${plural(days, 'day', 'days')} after the visit` },
  ];
  return `<section class="sec ${ID}__visit" aria-label="The visit">${visitBlock(rows, { title: '', flush: true })}</section>`;
}

/** `final` = the request is over (declined, expired): no estimate row and nothing left to adjust (M6-P-07). `breakdown` = the payout
    breakdown follows on this screen, so the estimate row would only repeat its Services line. */
function workSection(v, { final = false, breakdown = false } = {}) {
  return `<section class="sec" aria-labelledby="${ID}-work">
  ${sectionHead('The work', { id: `${ID}-work`, aside: final ? '' : infoButton('fitting', { label: 'At the fitting', first: state.customer.first }) })}
  ${workList(v, { final, estimateLabel: breakdown ? null : undefined })}
</section>`;
}

/** K-15: the screen's top — the flush request strip under the nav, an optional note (what happened / what happens next), then the t-home
    card's header row (the name is the h1) over a hairline. `muted` greys the payout (suggested: pending; ended: it did not happen). */
function top(v, { strip, note = '', payout = v.payout, label = 'Your payout', muted = false, info = true } = {}) {
  return `${navBackMark()}${strip}${note ? `<div class="${ID}__note">${note}</div>` : ''}
  <div class="${ID}__head${muted ? ` ${ID}__head--muted` : ''}">${requestHead({ name: v.customer.name, initials: v.customer.initials, payoutCents: payout, label, page: true, info })}</div>`;
}

/* ---------- view ---------- */
function view(s) {
  const a = focusAppt(ID);
  const chromeHtml = chrome('home', { persona: 'tailor' });
  if (!a) {
    /* R3-1-T-17: the same fallback anatomy as t-job — a Back heading, then the empty state */
    return `${chromeHtml}<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Request</h1>')}
  <div class="${ID}__empty" data-empty="no-request">${emptyState({
    title: 'No open requests', body: 'New requests show up on Home.', art: 'Suit Pant', ctaLabel: 'Go to Home', ctaAct: 'home',
  })}</div>
</main>`;
  }
  const v = requestView(a);
  const final = TERMINAL.includes(a.status) || a.status === 'expired';   // M6-P-07: the work is over — no estimate row
  const sarah = s.customer.first;
  const hours = POLICY.REQUEST_EXPIRY_H;

  if (a.status === 'suggested') {
    const price = suggestPrice(a, a.suggested.start);            // D-155: the rush never goes up, so the take-home can only drop
    const money = { ...v.money, rush: price.rush, payout: price.payout };
    const note = price.less > 0 ? `${esc(sarah)} pays ${fmtExact(price.less)} less at the new time, because it is not a rush.` : 'Same price for the new time.';
    const lapse = suggestLapseAt(a);
    const strip = requestStrip({ status: 'suggested', lapseAt: lapse, now: now(), when: v.suggested, page: true });
    const lead = `<p class="t-body w-600">Waiting on ${esc(sarah)}</p><p class="t-small c-700">${esc(sarah)} can accept your time until ${esc(fmtWhen(lapse))}, or choose another tailor. ${note}</p>`;
    return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}--suggested">
  ${top(v, { strip, note: lead, payout: price.payout, muted: true })}
  ${visitSection(a, v, {
    title: v.suggested, asked: `${esc(sarah)} asked for ${esc(fmtWhen(a.slot.start))}`, addressNote: `Full address once ${sarah} accepts`,
    start: a.suggested.start, end: fmtTime(isoMinute(addMinutes(a.suggested.start, v.minutes))),   // R3-1-T-01: the end follows the NEW start
  })}
  ${workSection(v, { final, breakdown: true })}
  ${payoutSection(v, money)}
</main>
${actionBar({ ctaLabel: `Message ${esc(sarah)}`, ctaAct: 'message', secondaryLabel: 'Back to Home', secondaryAct: 'home', tertiaryLabel: 'Withdraw suggestion', tertiaryAct: 'withdraw', tertiaryTone: 'danger' })}`;
  }

  if (a.status === 'expired') {
    const ended = a.suggested?.ended;                            // D-154: a suggested time that lapsed or that she withdrew
    const again = a.retries < POLICY.MAX_RETRIES
      ? ` ${esc(sarah)} can send it again — it will show up here as a new request.`
      : ` ${esc(sarah)} can now book another tailor.`;
    const hero = ended === 'withdrawn'
      ? { pill: 'withdrawn', pillLabel: 'Withdrawn', title: 'You withdrew your suggestion', body: `${esc(sarah)} has been told, and her ${fmtExact(a.payments.deposit.cents)} hold is released. ${esc(sarah)} can now book another tailor.` }
      : ended
        ? { pill: 'expired', pillLabel: 'Expired', title: 'Your suggested time passed', body: `${esc(sarah)} didn’t accept in time, so her ${fmtExact(a.payments.deposit.cents)} hold is released. ${esc(sarah)} can now book another tailor.` }
        : { pill: 'expired', pillLabel: 'Expired', title: 'This request expired', body: `You didn’t answer within ${hours} hours, so ${esc(sarah)}’s hold was released.${again}` };
    const strip = requestStrip({ text: hero.title, tone: 'expired', page: true });
    return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}--expired"${ended ? ` data-suggestion-ended="${ended}"` : ''}>
  ${top(v, { strip, note: `<p class="t-body c-700">${hero.body}</p>`, label: 'Would have paid', muted: true, info: false })}
  ${visitSection(a, v, { title: v.when })}
  ${workSection(v, { final })}
</main>
${actionBar({ ctaLabel: 'Back to Home', ctaAct: 'home' })}`;
  }

  if (a.status === 'declined') {
    const strip = requestStrip({ text: 'You declined this request', tone: 'expired', page: true });
    const body = `<p class="t-body c-700">${esc(sarah)} has been told, and her ${fmtExact(a.payments.deposit.cents)} hold is released.</p>${a.declineReason ? `<p class="t-small c-600">Your reason: ${esc(a.declineReason)}</p>` : ''}`;
    return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}--declined">
  ${top(v, { strip, note: body, label: 'Would have paid', muted: true, info: false })}
  ${visitSection(a, v, { title: v.when })}
  ${workSection(v, { final })}
</main>
${actionBar({ ctaLabel: 'Back to Home', ctaAct: 'home' })}`;
  }

  /* requested (◆) */
  const d = ui();
  const strip = requestStrip({ expiresAt: a.expiresAt, now: now(), lead: 'New request · ', page: true });
  const again = v.retries > 0 ? `<p class="t-body c-700">${esc(sarah)} sent this again after it expired.</p>` : '';
  return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}">
  ${top(v, { strip, note: again })}
  ${visitSection(a, v, { title: v.when, addressNote: a.job.visitType === 'home' ? 'Full address after you accept' : '' })}
  ${workSection(v, { final, breakdown: true })}
  ${payoutSection(v)}
</main>
${actionBar({
    ctaLabel: 'Accept', ctaAct: 'accept', busy: d.busy === 'accept', busyLabel: 'Accepting…',
    secondaryLabel: 'Suggest time', secondaryAct: 'suggest', tertiaryLabel: 'Decline', tertiaryAct: 'decline', tertiaryTone: 'danger',
  })}`;
}

/* ---------- decline sheet ---------- */
const REASON_OPTIONS = DECLINE_REASONS.map((r) => ({ value: r, label: r }));

function sheetBody(a, busy) {
  const sarah = state.customer.first;
  return `<p class="t-body c-700">${esc(sarah)} is told right away and her hold is released. She sees your reason.</p>
  ${chipGroup({ name: 'reason', label: 'Reason (optional)', options: REASON_OPTIONS.map((o) => ({ ...o, disabled: busy })), value: ui().reason ?? null })}
  <div class="${ID}-sheet__actions">
    ${cta('Decline request', { variant: 'danger', busy, busyLabel: 'Declining…', attrs: 'data-act="decline-ok"' })}
    ${cta('Keep request', { variant: 'secondary', disabled: busy, attrs: 'data-act="decline-keep"' })}
  </div>`;
}

function openDecline(a) {
  ui().reason = null;
  ui().declining = false;
  sheetOverlay(`<div class="${ID}-sheet">${sheetBody(a, false)}</div>`,
    { header: 'Decline this request?', dataS: `${ID}--decline`, confirm: false }, (holder, close) => {
      const box = holder.querySelector(`.${ID}-sheet`);
      holder.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act]');
        if (!el || ui().declining) return;
        if (el.dataset.act === 'chip') {                // single choice; tap again to clear (D-76)
          e.stopImmediatePropagation();
          const value = el.dataset.value;
          ui().reason = ui().reason === value ? null : value;
          box.querySelectorAll('[data-act="chip"]').forEach((c) => {
            const on = c.dataset.value === ui().reason;
            c.classList.toggle('chip--selected', on);
            c.setAttribute('aria-checked', String(on));
          });
        } else if (el.dataset.act === 'decline-keep') close();
        else if (el.dataset.act === 'decline-ok') {
          ui().declining = true;
          box.innerHTML = sheetBody(a, true);
          box.setAttribute('aria-busy', 'true');
          withLatency(() => {
            ui().declining = false;
            const r = T.tailorDecline(a.id, ui().reason ?? '');
            close();
            if (currentScreen() !== ID) return;
            go(ID);
            if (r.ok) toast('Request declined');
            else toast('That request has already changed.', { tone: 'error' });
          });
        }
      });
    });
}

/* ---------- withdraw sheet (D-79: danger + Keep …) ---------- */
function openWithdraw(a) {
  const sarah = state.customer.first;
  const body = (busy) => `<p class="t-body c-700 ${ID}-sheet__intro">${esc(sarah)} is told right away and her ${fmtExact(a.payments.deposit.cents)} hold is released. She can’t accept this time anymore, and can book another tailor.</p>
  <div class="${ID}-sheet__actions">
    ${cta('Withdraw suggestion', { variant: 'danger', busy, busyLabel: 'Withdrawing…', attrs: 'data-act="withdraw-ok"' })}
    ${cta('Keep suggestion', { variant: 'secondary', disabled: busy, attrs: 'data-act="withdraw-keep"' })}
  </div>`;
  sheetOverlay(`<div class="${ID}-sheet">${body(false)}</div>`, { header: 'Withdraw your suggestion?', dataS: `${ID}--withdraw`, confirm: false }, (holder, close) => {
    const box = holder.querySelector(`.${ID}-sheet`);
    let busy = false;
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'withdraw-keep') close();
      else if (act === 'withdraw-ok') {
        busy = true;
        box.innerHTML = body(true);
        box.setAttribute('aria-busy', 'true');
        withLatency(() => {
          const r = T.withdrawSuggestion(a.id);
          close({ instant: true });
          if (currentScreen() !== ID) return;
          go(ID);
          if (r.ok) toast(`Suggestion withdrawn. ${sarah} has been told.`);
          else toast('That request has already changed.', { tone: 'error' });
        });
      }
    });
  });
}

/* ---------- wire ---------- */
function wire(root) {
  if (T.tick().length) { go(ID); return; }              // her reply window passed while she was away
  if (redirectIfMoved(ID, go)) return;
  const a = focusAppt(ID);
  wirePhotoViewer(root);

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || e.target.closest('.screen-sheet--overlay') || el.disabled) return;
    const act = el.dataset.act;
    if (act === 'home') go('t-home', { fresh: true });
    else if (!a) return;
    else if (act === 'accept') accept(a);
    else if (act === 'suggest') { setFocus(a.id); go('t-suggest'); }
    else if (act === 'decline') openDecline(a);
    else if (act === 'withdraw') openWithdraw(a);
    else if (act === 'message') { setFocus(a.id); go('t-thread'); }
  });
}

function accept(a) {
  if (ui().busy) return;
  ui().busy = 'accept';
  go(ID);
  withLatency(() => {
    ui().busy = null;
    if (currentScreen() !== ID) return;                  // she stepped away while it was sending
    const r = T.tailorAccept(a.id);
    if (r.ok) {
      setFocus(a.id);
      go('t-job', { fresh: true });
      toast(`Accepted. ${state.customer.first} has been told.`);
    } else if (r.error === 'expired') {
      T.tick();
      go(ID);
      toast('This request expired before you accepted.', { tone: 'error' });
    } else {
      go(ID);
      toast('Couldn’t accept the request. Try again.', { tone: 'error' });
    }
  });
}

register(ID, view, wire);
