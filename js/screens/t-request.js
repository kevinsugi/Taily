/* ============================================================
   t-request — T2/T3 The request card (M3-spec §C1). Everything
   Amara needs to decide in ninety seconds, then Accept · Suggest
   time · Decline with one thumb. Focal: "You take home" (display).
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
  chrome, headingRow, statusHero, countdown, visitBlock, workList, tailorBreakdown, actionBar, cta, emptyState,
  chipGroup, sheetOverlay, toast, esc, wirePhotoViewer, sectionHead, infoButton,
} from '../components.js';

const ID = 't-request';
const ui = () => (state.ui[ID] ??= {});
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* ---------- blocks ---------- */
function takeHome(v, { muted = false, note = '', cents = v.payout } = {}) {
  return `<section class="${ID}__take${muted ? ` ${ID}__take--muted` : ''}" aria-label="What you take home">
  <div class="${ID}__take-head"><p class="t-caps c-600">${muted ? 'You would have taken home' : 'You take home'}</p>${muted ? '' : infoButton('fee', { label: 'The Taily fee' })}</div>
  <p class="${ID}__amount t-display w-600" data-money>${fmtExact(cents)}</p>
  ${muted ? '' : `<p class="t-body c-700" data-money>after the ${fmtExact(v.tailyFee)} Taily fee</p>`}
  ${note ? `<p class="t-small c-600">${note}</p>` : ''}
</section>`;
}

/** "Your take-home" (R3-1-T-04, D-172): the breakdown sits after the work, as on t-job, so the visit is above the fold. */
const payoutSection = (v, money = v.money) => `<section class="sec" aria-labelledby="${ID}-payout">
  ${sectionHead('Your take-home', { id: `${ID}-payout` })}
  ${tailorBreakdown(money)}
</section>`;

function visitSection(a, v, { title, asked = '', addressNote = '', start = a.slot.start, end = v.whenEnd } = {}) {
  const rows = [`<span class="t-figure">${esc(title)}</span>`];
  if (asked) rows.push(asked);
  const days = dayDiff(start, a.job.needBy);
  rows.push(`${esc(v.visitLabel)} · ${v.minutes} min, until ${esc(end)}`);
  rows.push(`<span class="${ID}__place">${esc(v.place)}</span>${addressNote ? `<span class="${ID}__cap t-small c-600">${esc(addressNote)}</span>` : ''}`);
  rows.push(`Needed by <span class="nb">${esc(v.needBy)}</span> · ${plural(days, 'day', 'days')} after the visit`);
  return `<section class="sec ${ID}__visit">${visitBlock(rows, { title: 'The visit', flush: true })}</section>`;
}

/** `final` = the request is over (declined, expired): no estimate row and nothing left to adjust (M6-P-07). `breakdown` = the payout
    breakdown follows on this screen, so the estimate row would only repeat its Services line. */
function workSection(v, { final = false, breakdown = false } = {}) {
  return `<section class="sec" aria-labelledby="${ID}-work">
  ${sectionHead('The work', { id: `${ID}-work`, aside: final ? '' : infoButton('fitting', { label: 'At the fitting', first: state.customer.first }) })}
  ${workList(v, { final, estimateLabel: breakdown ? null : undefined })}
</section>`;
}

/** The deadline line of an open request (CR-4b): one line, "2h left · answer by 12:00 PM" (warning ink when soon). */
function strip(a) {
  return countdown({ expiresAt: a.expiresAt, now: now(), tail: `answer by ${fmtTime(a.expiresAt)}`, line: true });
}

/** The same strip for a suggested time (D-154): how long Sarah has to accept it. */
function lapseStrip(a) {
  const cd = countdown({ expiresAt: suggestLapseAt(a), now: now(), suffix: `for ${esc(state.customer.first)} to answer` });
  const isSoon = /data-state="soon"/.test(cd);
  return `<div class="${ID}__strip${isSoon ? ` ${ID}__strip--soon` : ''}">${cd}<span class="t-small ${isSoon ? 'w-600' : 'c-700'}">${isSoon ? 'Closing soon · open until' : 'Open until'} ${fmtWhen(suggestLapseAt(a))}</span></div>`;
}

/** The shared detail header (K-04, D-203): status line, then Back + title on one row, then the notes at the padding. */
const detailHead = (html) => headingRow(html);

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
    return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}--suggested">
  ${detailHead(statusHero({
    variant: 'requested', pill: 'waiting', pillLabel: `Waiting on ${esc(sarah)}`, title: esc(v.customer.name),
    body: `You suggested ${esc(v.suggested)}. ${esc(sarah)} can accept it or choose another tailor.`,
  }))}
  <div class="hero ${ID}__hero">${takeHome(v, { note, cents: price.payout })}${lapseStrip(a)}</div>
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
    return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}--expired"${ended ? ` data-suggestion-ended="${ended}"` : ''}>
  ${detailHead(statusHero({ variant: 'declined', ...hero }))}
  <div class="hero ${ID}__hero">${takeHome(v, { muted: true })}</div>
  ${visitSection(a, v, { title: v.when })}
  ${workSection(v, { final })}
</main>
${actionBar({ ctaLabel: 'Back to Home', ctaAct: 'home' })}`;
  }

  if (a.status === 'declined') {
    return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}--declined">
  ${detailHead(statusHero({
    variant: 'declined', pill: 'declined', pillLabel: 'Declined', title: 'You declined this request',
    body: `${esc(sarah)} has been told, and her ${fmtExact(a.payments.deposit.cents)} hold is released.`,
    extra: a.declineReason ? `<p class="t-small c-600">Your reason: ${esc(a.declineReason)}</p>` : '',
  }))}
  <div class="hero ${ID}__hero">${takeHome(v, { muted: true })}</div>
  ${visitSection(a, v, { title: v.when })}
  ${workSection(v, { final })}
</main>
${actionBar({ ctaLabel: 'Back to Home', ctaAct: 'home' })}`;
  }

  /* requested (◆) */
  const d = ui();
  return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}">
  ${detailHead(statusHero({
    variant: 'requested', pill: 'new-request', pillLabel: 'New request', title: esc(v.customer.name),
    body: v.retries > 0 ? `${esc(sarah)} sent this again after it expired.` : '', extra: strip(a),
  }))}
  <div class="hero ${ID}__hero">${takeHome(v)}</div>
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
