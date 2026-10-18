/* ============================================================
   c-booking — C8 booking detail. The appointment, its money, and the
   ways to change it. Focal: the visit time (the first row of the Visit group, .t-figure).
   States: just confirmed · upcoming · cancel sheets (early / late) ·
   reschedule sheet · cancelled (early / late) · Amara can't make it ·
   no-show · M4: fitting · in progress · awaiting-handoff (pickup / courier, K-37 no drop-off;
   Study-1 A3: code, marked, problem, unclaimed; K-40: the picked time + Change time) · completed (reviewed) · Study-1 A5: tailor
   no-show (link, sheet, result), tailor cancelled late. Which appointment: focusAppt (D-72).
   ============================================================ */
import { register, render as go, registered } from '../app.js';
import {
  state, T, tailorById, isVerified, openSlots, justConfirmed, now, returnAddress, priceChangeView, courierWindow, autoCompleteLeft, statusScreen,
  slotText, handoffChangeable, handoffMissed, reminderState, freeUntil, autoCancelAt, unclaimedAt,
  autoCancelArmed, proposalOf, visitCheckOpen, visitToolsOpen, confirmReceivedOpen, tailyReviewOf, caseOfAppt, caseView,
} from '../state.js';
import {
  chrome, headingRow, statusHero, visitBlock, personBlock, calendarHref, timeline, customerBreakdown, moneyRows, cta, banner, emptyState,
  sectionHead, infoButton, textLink, sheetOverlay, toast, esc, wireWheel, metaRow, courierCard, reviewRow, navBackMark, requestStrip, requestHead, pageHead, verifiedCheck, personActions, hangStage, andList, returnedItems, ICON_DIRECTIONS, changeList, withPhotos, wirePhotoViewer, receiptBlock, wireGarmentDocs, garmentStrip, ICON_CHAT, ICON_CALENDAR, COURIER_LOBBY,
  actionBar, pickupCode, autoCompleteLine, balanceCardLabel, openHandoffTime, chargedWhen, shopPlace,
  ICON_PHONE, openCallSheet, optionRow, helpAction, helpActions, caseStrip, protectionRow, personButtons, confirmAction,
} from '../components.js';
import { VISIT_ICONS } from '../icons.js';
import { scheduler, slotColumns, readSlot, SCHED_ROW, timeLabel, whenNote } from '../scheduler.js';
import { fmtExact, cancelTerms } from '../money.js';
import { fmtWhen, fmtTime, fmtDay, fmtTimeRange, addMinutes, toDate, isoMinute, dayWord, fmtCountdown } from '../dates.js';
import { VISIT_LABEL, VISIT_MINUTES } from '../data.js';
import { POLICY } from '../money-config.js';
import { withLatency } from '../sim.js';
import { focusAppt, redirectIfMoved, statusWord, bookingTab, setFocus } from '../focus.js';

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
  /* Count from the approved lines once they exist (R4-1-C-01): a price change can add or remove services. */
  const lines = a.lines?.length ? a.lines : null;
  const items = lines ? new Set(lines.map((l) => l.garmentId)).size : a.job.garments.length;
  const services = lines ? lines.length : a.job.garments.reduce((n, g) => n + g.services.length, 0);
  const home = a.job.visitType === 'home';
  return [
    { icon: 'calendar', value: esc(fmtWhen(a.slot.start)), strong: true, detail: esc(`${VISIT_LABEL.customer[a.job.visitType]} · ${VISIT_MINUTES[a.job.visitType]} min`) },
    { icon: home ? 'home' : 'shop', value: esc(whereOf(a, t)), detail: home && a.job.address?.notes ? esc(`Access: ${a.job.address.notes}`) : '' },   // S-27 (pre-MVP B2)
    /* M7-2-C-04 (D-202): the booked garments as illustrations; K-10: the count is the value, the tiles sit under it */
    { icon: 'hanger', value: `${plural(items, 'item')} · ${plural(services, 'service')}`, extra: garmentStrip(returnedItems(a)) },   // K-25: each thumb opens what it is in for
    /* S-27 (pre-MVP B2): her note for the tailor, as sent (masked) */
    ...(a.job.note ? [{ icon: 'chat', value: `Your note for ${esc(firstOf(t))}`, detail: esc(`“${a.job.note}”`) }] : []),
  ];
}
/** A group on the page (A3): `<section class="sec">`. */
const sec = (inner, cls = '') => `<section class="sec${cls ? ` ${cls}` : ''}">${inner}</section>`;
/** K-12 (D-237) Option C: the tailor leads the Visit block (avatar, name, a check once verified, no facts line), the visit rows hang under her
    name, then Message + Add to calendar (a confirmed booking only; Directions is Amara's side — the visit is at Sarah's place or Amara's shop). */
function visitSection(a, t, { extra = [] } = {}) {
  const actions = [{ label: 'Message', icon: ICON_CHAT, act: 'message' }];
  const day = visitToolsOpen(a);   // S-32 (pre-MVP A1): the visit day — Call (through Taily, after the MVP) and, for a shop visit, On my way / I'm here
  const first = firstOf(t);
  const vd = a.visitDay ?? {};
  const pings = [];
  if (day) {
    actions.push({ label: 'Call', icon: ICON_PHONE, act: 'call' });
    if (a.job.visitType === 'shop') {
      if (!vd.customer?.hereAt) actions.push(vd.customer?.onWayAt ? { label: 'I’m here', icon: VISIT_ICONS['map-pin'], act: 'im-here' } : { label: 'On my way', icon: VISIT_ICONS.clock, act: 'on-my-way' });
      if (vd.customer?.hereAt) pings.push({ icon: 'check', value: 'You told her you’re here', detail: esc(fmtTime(vd.customer.hereAt)) });
      else if (vd.customer?.onWayAt) pings.push({ icon: 'clock', value: 'You told her you’re on your way', detail: esc(fmtTime(vd.customer.onWayAt)) });
    }
    if (vd.tailor?.hereAt) pings.push({ icon: 'check', value: `${esc(first)} is here`, detail: esc(fmtTime(vd.tailor.hereAt)) });
    else if (vd.tailor?.onWayAt) pings.push({ icon: 'clock', value: `${esc(first)} is on her way`, detail: esc(fmtTime(vd.tailor.onWayAt)) });
  }
  if (!day && a.status === 'confirmed' && now() < toDate(a.slot.start).getTime()) {   // SF-11: nothing to add once the visit has started
    const href = calendarHref({ uid: a.id, start: a.slot.start, end: a.slot.end, stamp: isoMinute(new Date(now())), summary: `${VISIT_LABEL.customer[a.job.visitType]} with ${t.name}`, location: whereOf(a, t) });
    actions.push({ label: 'Add to calendar', icon: ICON_CALENDAR, href, act: 'add-to-calendar', attrs: 'download="taily-visit.ics"' });
  }
  /* DG-1 option B (K-49): Get help is a person button on every state of the booking — on its own row under the others (B's mock), so the
     visit-day row keeps its four tiles at 200% text */
  return sec(`${personBlock({ title: 'Visit', person: { initials: t.initials, name: t.name, verified: isVerified(t), years: t.years }, rows: [...visitRows(a, t), ...pings, ...extra], actions })}${helpRow()}`);
}
/** DG-1 B: the Get help person button, a row of its own under the person block's buttons. */
const helpRow = () => `<div class="person-block__actions help-row">${personButtons([helpAction()])}</div>`;
/** DG-1 B: the order's Taily Help case on the page — "Taily is reviewing · Reply by …", "Taily replied", or the decision in dollars. */
function caseBlock(a) {
  const c = a ? caseOfAppt(a.id, 'customer') : null;
  return c ? `<div class="case-strip-wrap">${caseStrip(caseView(c, 'customer'))}</div>` : '';
}

/** The shared detail header (D-93, supersedes R3-1-C-04's pill-above-Back): Back on its own row, then the pill,
    the title and the notes, all flush at the screen padding. */
function head(a, { pill, pillLabel, title, body = '', variant = 'requested' }) {
  return headingRow(statusHero({ variant, pill, pillLabel, title, body }));
}

/* ---------- views ---------- */

function cancelledView(a, t, first) {
  const reason = a.cancel?.reason;
  const dep = a.payments.deposit.cents;
  /* K-17 (D-243): R1 the title says the state, so no status pill; R3 / R5 one sentence under it, and the money only in Price (the Deposit row
     says Refunded / Kept); the tailor's reason is a row of her block, not a quote card above it. */
  const cfg = {
    'customer-early': {
      title: 'Booking cancelled',
      body: 'Your deposit is on its way back to your card. It can take a few business days to show.',
      status: 'Refunded',
    },
    'customer-late': {
      title: 'Booking cancelled',
      body: a.cancel?.afterConfirm   // K-41 (D-296)
        ? `${first} kept your deposit because you cancelled after confirming the visit. Nothing else is charged.`
        : `${first} kept your deposit because you cancelled less than ${POLICY.CANCEL_WINDOW_H} hours before the visit. Nothing else is charged.`,
      status: 'Kept',
    },
    unconfirmed: {   // K-43 (D-300): cancelled by Taily 3 hours before, inside the 24 h window — the late-cancel money
      title: 'Visit cancelled',
      body: `We cancelled your visit because you didn’t confirm by ${fmtTime(a.cancel?.at ?? a.slot.start)}. ${first} keeps your ${fmtExact(dep)} deposit for the time set aside.`,
      status: 'Kept',
    },
    'tailor-cant-make-it': {
      title: `${esc(first)} can’t make it`,
      /* K-29 (Study-1 A5): a tailor cancel inside the window says so; the refund is the same */
      body: a.cancel?.late
        ? `${first} cancelled less than ${POLICY.CANCEL_WINDOW_H} hours before your visit. Your ${fmtExact(dep)} deposit is refunded in full. It can take a few business days to show on your card.`
        : 'Your deposit is refunded in full, and your items and services are saved so you can book someone else. It can take a few business days to show on your card.',   // SF-39
      status: 'Refunded',
    },
    'tailor-no-show': {
      title: `${esc(first)} didn’t show up`,
      body: `Your ${fmtExact(dep)} deposit is refunded in full. It can take a few business days to show on your card.`,
      status: 'Refunded',
    },
    'no-show': {
      title: 'Marked as a no-show',
      body: a.cancel.decided === 'refunded'   // pre-MVP A2: Taily decided the dispute for her
        ? `${first} marked the visit as missed at ${fmtTime(a.cancel.at)}. You told us you were there, and Taily refunded your ${fmtExact(dep)} deposit. It can take a few business days to show.`
        : a.cancel.by === 'system'   // K-51: nobody answered "Did the visit happen?" and she had tapped I'm here — decided by the evidence
        ? `You didn’t tell us if the visit happened, and ${first} tapped I’m here at ${fmtTime(a.visitDay?.tailor?.hereAt ?? a.slot.start)}, so it counts as a no-show. ${first} keeps your deposit.${a.cancel.disputedAt ? '' : ' If you were there, tell us.'}`
        : `${first} marked the visit as missed at ${fmtTime(a.cancel.at)}, ${Math.max(0, Math.round((toDate(a.cancel.at).getTime() - toDate(a.slot.start).getTime()) / 60000))} minutes after the start, and keeps your deposit.${a.cancel.disputedAt ? '' : ' If you were there, tell us.'}`,   // D-14: "That's not right" goes to Taily, not the chat
      status: a.payments.deposit.state === 'refunded' ? 'Refunded' : 'Kept',
    },
    taily: {   // pre-MVP A2 (K-48.1): the admin cancelled the order or released the hold
      title: 'Taily cancelled this order',
      body: [a.cancel?.refund ? `We refunded ${fmtExact(a.cancel.refund)} to your card. It can take a few business days to show.` : '', a.cancel?.released ? `You weren’t charged the ${fmtExact(a.cancel.released)} balance.` : ''].filter(Boolean).join(' ') || 'Nothing more is charged.',
      status: a.payments.deposit.state === 'refunded' ? 'Refunded' : 'Paid',
    },
    'no-record': {   // K-51 (replaces D-11's refund): nothing recorded — closed "Not confirmed", the deposit on hold, the tailor keeps it unless disputed
      title: 'Not confirmed',
      body: a.cancel.decided === 'refunded' ? `Nobody confirmed the visit, so we closed it. You told us it didn’t happen, and Taily refunded your ${fmtExact(dep)} deposit. It can take a few business days to show.`
        : a.cancel.decided === 'kept' ? `Nobody confirmed the visit, so we closed it. Taily looked into it, and ${first} keeps your ${fmtExact(dep)} deposit.`
        : !a.cancel.held ? `Nobody confirmed the visit, and nobody disputed it by ${fmtWhen(a.cancel.holdUntil ?? a.cancel.at)}, so ${first} kept your ${fmtExact(dep)} deposit.`
        : a.cancel.disputedAt ? `Nobody confirmed the visit, so we closed it. Your ${fmtExact(dep)} deposit stays on hold while Taily looks into it.`
        : `Nobody confirmed the visit, so we closed it as not confirmed. Your ${fmtExact(dep)} deposit is on hold. If neither of you disputes it by ${fmtWhen(a.cancel.holdUntil ?? a.cancel.at)}, ${first} keeps it.`,
      status: a.payments.deposit.state === 'refunded' ? 'Refunded' : a.cancel.held ? 'On hold' : 'Kept',
    },
  }[reason] ?? {
    title: 'Booking cancelled', body: '', status: a.payments.deposit.state === 'refunded' ? 'Refunded' : 'Kept',
  };
  const noteRow = reason === 'tailor-cant-make-it' && a.cancel?.note
    ? [{ icon: 'chat', value: esc(a.cancel.note), detail: `${esc(first)}’s note` }] : [];
  /* D-14: the tailor's "I'm here" is the evidence a no-show stands on — shown to Sarah */
  const here = reason === 'no-show' && a.visitDay?.tailor?.hereAt ? [{ icon: 'check', value: `${esc(first)} tapped I’m here`, detail: esc(fmtTime(a.visitDay.tailor.hereAt)) }] : [];
  /* D-14: a disputed no-show is with Taily (the review state itself is track A2's) */
  const review = caseBlock(a) || (a.cancel?.disputedAt
    ? `<div class="${ID}__alert">${banner({ tone: 'info', text: a.cancel.disputedBy === 'customer' ? 'You told us you were there. Taily is looking into it and will message you both.' : `${esc(first)} says she came. Taily is looking into it and will message you both.` })}</div>` : '');

  let actions;
  if (reason === 'tailor-cant-make-it' || reason === 'tailor-no-show') {
    actions = `${cta('Find another tailor', { attrs: 'data-act="find-another"' })}
    <div class="page-actions__links">${textLink(`Message ${esc(first)}`, { act: 'message' })}</div>`;
  } else if (reason === 'no-record' && a.cancel.held && !a.cancel.disputedAt) {   // K-51: the visit didn't happen? dispute the hold
    actions = `${cta('That’s not right', { variant: 'secondary', attrs: 'data-act="dispute-hold"' })}
    <div class="page-actions__links">${textLink(`Book ${esc(first)} again`, { act: 'book-again' })}${textLink('Find another tailor', { act: 'other-tailors' })}</div>`;
  } else if (reason === 'no-show') {
    actions = `${a.cancel.disputedAt ? cta(`Message ${esc(first)}`, { attrs: 'data-act="message"' }) : cta('That’s not right', { variant: 'secondary', attrs: 'data-act="dispute"' })}
    <div class="page-actions__links">${a.cancel.disputedAt ? '' : textLink(`Message ${esc(first)}`, { act: 'message' })}${textLink('Find another tailor', { act: 'other-tailors' })}</div>`;
  } else {
    actions = `${cta(`Book ${esc(first)} again`, { attrs: 'data-act="book-again"' })}
    <div class="page-actions__links">${textLink('Find another tailor', { act: 'other-tailors' })}</div>`;
  }
  return `${chrome(bookingTab())}<main class="body ${ID} ${ID}--cancelled" data-s="${ID}">
  ${head(a, { pill: false, title: cfg.title, body: esc(cfg.body), variant: 'declined' })}
  ${review}
  ${visitSection(a, t, { extra: [...here, ...noteRow] })}
  ${sec(`${sectionHead('Price')}${moneyRows([{ label: 'Deposit', cents: dep, status: cfg.status }])}`)}
  <div class="page-actions">
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
  /* K-41 (R3, D-296): the 24-hour reminder — a state strip leads (no pill), one rule line in dollars under the title; Confirm in the bar */
  const r = confirmed ? reminderState(a) : null;
  /* pre-MVP A1: a move Amara asked for (D-12) and "Did the visit happen?" (D-11) lead the page the same way, before the reminder */
  const rem = (confirmed && proposalOf(a)) ? proposalCopy(a, first, deposit)
    : (confirmed && a.visitCheck) ? visitCheckCopy(a, first, deposit)
      : r ? reminderCopy(a, r, first, deposit) : null;

  const away = a.job.visitType === 'home' ? 'aren’t home' : 'don’t come to the shop';   // SF-10: a shop visit is not "home"
  const started = now() >= toDate(a.slot.start).getTime();   // SF-11
  const steps = timeline([
    { state: 'done', title: 'Booked', sub: fmtWhen(confirmedAt(a)) },
    { state: 'current', title: 'Visit and fitting', sub: `${esc(first)} pins and photographs your garments · you approve the final order` },   // SF-34
    { state: 'todo', title: 'Tailoring' },
    { state: 'todo', title: 'Ready', sub: `Pay the balance, est. ${money(a.money.balance)}` },
    { state: 'todo', title: 'Back with you' },
  ]);
  const reportAt = toDate(a.slot.start).getTime() + POLICY.NO_SHOW_WAIT_MIN * 60000;
  const policy = started
    ? (now() >= reportAt
      ? `Your visit was at ${esc(fmtTime(a.slot.start))}. If ${esc(first)} didn’t come, tap Tailor didn’t show up? to get your ${money(deposit)} back.`   // SF-11
      : `Your visit is at ${esc(fmtTime(a.slot.start))}. If ${esc(first)} hasn’t come by ${esc(fmtTime(reportAt))}, you can tell us here and get your ${money(deposit)} back.`)
    : r === 'confirmed'
    ? `You confirmed on ${esc(fmtDay(a.reminder.confirmedAt))} at ${esc(fmtTime(a.reminder.confirmedAt))}. If you cancel now or ${away}, ${esc(first)} keeps your ${money(deposit)} deposit.`
    : early
    ? `Free cancellation until ${cutoff}. After that, ${esc(first)} keeps the ${money(deposit)} deposit.`
    : `The visit is less than ${POLICY.CANCEL_WINDOW_H} hours away. If you cancel now, ${esc(first)} keeps your ${money(deposit)} deposit.`;
  /* K-29 (Study-1 A5, default 8): from NO_SHOW_WAIT_MIN after the start, while still confirmed, Sarah can report that the tailor didn't come */
  const noShow = confirmed && !a.visitCheck && now() >= toDate(a.slot.start).getTime() + POLICY.NO_SHOW_WAIT_MIN * 60000;   // D-11: once asked, the question carries it
  const links = !confirmed ? '' : `<div class="page-actions__links">${noShow ? textLink('Tailor didn’t show up?', { act: 'tailor-no-show' }) : ''}${early ? textLink('Reschedule', { act: 'reschedule' }) : ''}${started ? '' : textLink('Cancel booking', { act: 'cancel', tone: 'danger' })}</div>`;
  const late = confirmed && !early && !started ? `<p class="t-small c-600 ${ID}__late">To change the time now, message ${esc(first)}.</p>` : '';
  const actions = rem?.bar ? '' : `<div class="page-actions">
    ${late}
    ${links}
  </div>`;

  return `${chrome(bookingTab())}<main class="body${rem?.bar ? ' body--with-bar' : ''} ${ID}" data-s="${ID}">
  ${rem ? `${navBackMark()}${requestStrip({ page: true, ...rem.strip })}${head(a, { pill: false, title: `Your visit with ${esc(first)}`, variant: 'confirmed' }).replace(/^<!--nav-back-->/, '')}<p class="t-small c-600 ${ID}__rule">${rem.rule}</p>` : hero}
  ${caseBlock(a)}
  ${visitSection(a, t)}
  ${sec(`${sectionHead('What happens next')}${steps}`)}
  ${sec(`${sectionHead('Price', { aside: infoButton('deposit') })}${customerBreakdown(a.money, { stage: 'booked', tailorFirst: first, depositState: a.payments.deposit.state })}${confirmed && !a.visitCheck ? `<p class="t-small c-600 ${ID}__policy">${policy}</p>` : ''}`)}
  ${actions}
</main>${rem?.bar ? actionBar(rem.bar) : ''}`;
}

/** K-41 (R3, D-296): the reminder's strip, rule line and bar on c-booking, per reminder state. */
function reminderCopy(a, r, first, deposit) {
  const at = fmtTime(a.slot.start);
  const away = a.job.visitType === 'home' ? 'aren’t home' : 'don’t come to the shop';   // SF-10
  const day = dayWord(a.slot.start, now());
  const until = freeUntil(a);
  if (r === 'asked') {
    return {
      strip: { tone: 'action', icon: 'clock', text: `Confirm by ${fmtTime(until)} ${dayWord(until, now())}`, right: `${fmtCountdown(until - now())} left` },
      rule: `Free to change or cancel until ${esc(fmtWhen(until))}. Once you confirm, ${esc(first)} keeps your ${money(deposit)} deposit if you cancel or ${away}.`,   // K-51: as the reminder text (C7) says it
      bar: { ctaLabel: `Confirm for ${day}`, ctaAct: 'confirm-visit', secondaryLabel: 'Reschedule', secondaryAct: 'reschedule', tertiaryLabel: 'Cancel booking', tertiaryAct: 'cancel', tertiaryTone: 'danger' },
    };
  }
  if (r === 'confirmed') {
    return {
      strip: { tone: 'done', icon: 'check', text: `Confirmed for ${day} · ${at}` },
      rule: `If you cancel now or ${away}, ${esc(first)} keeps your ${money(deposit)} deposit.`,
    };
  }
  const confirmLabel = a.job.visitType === 'home' ? 'Confirm, I’ll be home' : 'Confirm, I’ll be there';
  if (!autoCancelArmed(a)) {
    /* D-02 (pre-MVP A1): the reminder text never reached her (texts off, or undelivered) — nothing cancels the visit: the plain 24 h rule */
    return {
      strip: { tone: 'warn', icon: 'clock', text: 'You haven’t confirmed', right: day === 'today' ? `Visit ${at}` : `Visit ${day} ${at}` },
      rule: `The visit is still on. If you cancel now or ${away}, ${esc(first)} keeps your ${money(deposit)} deposit.`,
      bar: { ctaLabel: confirmLabel, ctaAct: 'confirm-visit', tertiaryLabel: 'Cancel booking', tertiaryAct: 'cancel', tertiaryTone: 'danger' },
    };
  }
  /* missed: the free window closed with no answer — the visit stays booked until REMINDER_AUTOCANCEL_H before it (K-43, D-300); Confirm keeps it */
  const by = fmtTime(autoCancelAt(a));
  return {
    strip: { tone: 'warn', icon: 'clock', text: `Confirm by ${by} or we’ll cancel the visit`, right: day === 'today' ? `Visit ${at}` : `Visit ${day} ${at}` },
    rule: `If you don’t confirm by ${by}, we cancel it and ${esc(first)} keeps your ${money(deposit)} deposit. She keeps it too if you cancel now or ${away}.`,
    bar: { ctaLabel: a.job.visitType === 'home' ? 'Confirm, I’ll be home' : 'Confirm, I’ll be there', ctaAct: 'confirm-visit', tertiaryLabel: 'Cancel booking', tertiaryAct: 'cancel', tertiaryTone: 'danger' },
  };
}

/** D-12 (pre-MVP A1): Amara asked to move the visit — Accept the new time or keep the current one. */
function proposalCopy(a, first, deposit) {
  const p = proposalOf(a);
  return {
    strip: { tone: 'action', icon: 'clock', text: `${first} asked to move your visit`, right: `to ${fmtWhen(p.start)}` },
    rule: `Accept ${esc(fmtWhen(p.start))}, or keep ${esc(fmtWhen(a.slot.start))}. Your ${money(deposit)} deposit and the free-cancel window move with the visit.`,
    bar: { ctaLabel: 'Accept new time', ctaAct: 'proposal-accept', secondaryLabel: 'Keep current time', secondaryAct: 'proposal-keep' },
  };
}
/** D-11 (K-48.5): VISIT_CHECK_H after the start with nothing recorded — "Did your visit happen?"; once she answered yes, a done strip. */
function visitCheckCopy(a, first, deposit) {
  const vc = a.visitCheck;
  if (vc.answer === 'not-happened') {   // she said no after Amara tapped I'm here: Taily reviews it (track A2)
    return { strip: { tone: 'warn', icon: 'chat', text: 'Taily is looking into your visit' }, rule: `You told us ${esc(first)} didn’t come, and she says she was there. We’ll message you both.` };
  }
  if (vc.answer === 'happened') {
    return { strip: { tone: 'done', icon: 'check', text: 'You told us the visit happened', right: fmtTime(vc.answeredAt) }, rule: `${esc(first)} sends you the final order next. We told her.` };
  }
  const closeAt = toDate(vc.askedAt).getTime() + POLICY.VISIT_CHECK_CANCEL_H * 3600000;
  return {
    strip: { tone: 'action', icon: 'clock', text: 'Did your visit happen?', right: `Visit ${dayWord(a.slot.start, now()) === 'today' ? fmtTime(a.slot.start) : fmtWhen(a.slot.start)}` },
    /* K-51: what happens with no answer depends on the evidence — her "I'm here" makes it a no-show; nothing recorded holds the deposit */
    rule: a.visitDay?.tailor?.hereAt
      ? `${esc(first)} tapped I’m here at ${esc(fmtTime(a.visitDay.tailor.hereAt))}. If you don’t answer by ${esc(fmtTime(closeAt))} ${esc(dayWord(closeAt, now()))}, it counts as a no-show and ${esc(first)} keeps your ${money(deposit)} deposit.`
      : `Nothing was recorded for this visit. If nobody answers by ${esc(fmtTime(closeAt))} ${esc(dayWord(closeAt, now()))}, we close it as not confirmed and hold your ${money(deposit)} deposit. ${esc(first)} keeps it unless one of you disputes it within ${POLICY.VISIT_HOLD_DISPUTE_H} hours.`,
    bar: { ctaLabel: 'Yes, it happened', ctaAct: 'visit-yes', tertiaryLabel: `No, ${first} didn’t come`, tertiaryAct: 'visit-no', tertiaryTone: 'danger' },
  };
}

/* ---------- M4: fitting → completed (D-110) ---------- */

const M4_STATES = ['fitting', 'price-change', 'in-progress', 'ready', 'awaiting-handoff', 'completed'];
const bal_state = (a) => a.payments?.balance?.state ?? '';
const ORDER = ['confirmed', ...M4_STATES];
const completedAt = (a) => [...a.history].reverse().find((h) => h.status === 'completed')?.at ?? a.requestedAt;

/** "Fitted Thu, Oct 15 · at my place" (D-169, K-17 R5): the past visit, now on the timeline's done step. */
const fittedText = (a) => { const v = VISIT_LABEL.customer[a.job.visitType]; return `Fitted ${esc(fmtDay(a.slot.start))} · ${esc(v.charAt(0).toLowerCase() + v.slice(1))}`; };

/** "What happens next", every live state after the visit (D-110). */
function m4Timeline(a, first) {
  const at = ORDER.indexOf(a.status);
  const stage = (from, to) => (at >= from && at <= to ? 'current' : at > to ? 'done' : 'todo');
  const fitting = ORDER.indexOf('fitting'), progress = ORDER.indexOf('in-progress'), ready = ORDER.indexOf('ready'), back = ORDER.indexOf('awaiting-handoff');
  const s2 = stage(fitting, ORDER.indexOf('price-change'));
  const s3 = stage(progress, progress);
  const s4 = stage(ready, ready);
  const s5 = a.status === 'completed' ? 'done' : a.status === 'awaiting-handoff' ? 'current' : 'todo';
  const paid = at >= back;
  return timeline([
    { state: 'done', title: 'Booked', sub: fmtWhen(confirmedAt(a)) },
    /* K-17 (D-243, R5): "Fitted Thu, Oct 15 · at my place" lives on the done step, not as a fourth header line */
    { state: s2, title: 'Visit and fitting', sub: s2 === 'done' ? `<span class="${ID}__step-line">${fittedText(a)}</span><span class="${ID}__step-line">Order approved</span>` : s2 === 'current' ? `${esc(first)} goes through the order with you` : '' },
    { state: s3, title: 'Tailoring', sub: s3 === 'current' ? `Due ${esc(fmtDay(a.job.needBy))}` : '' },   // SF-26
    { state: s4, title: 'Ready', sub: paid ? `Paid ${money(a.payments.balance.cents)}` : s4 === 'current' ? 'Pay the balance' : at >= progress ? `Pay the ${money(a.money.balance)} balance` : `Pay the balance, est. ${money(a.money.balance)}` },
    { state: s5, title: 'Back with you' },   // R1: the title says the state, the timeline doesn't echo it
  ]);
}

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DOW_NAME = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
const minsOf = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
/** The next shop hours from now, from the tailor's availability: "Open today 10:00 AM – 6:00 PM" (R4-1-C-07). */
function shopHoursLine(t) {
  const week = t.availability?.shop ?? {};
  const d = toDate(now());
  const nowMin = d.getHours() * 60 + d.getMinutes();
  for (let i = 0; i < 7; i += 1) {
    const key = DOW_KEYS[(d.getDay() + i) % 7];
    const w = (week[key] ?? []).find(([, close]) => i > 0 || minsOf(close) > nowMin);
    if (!w) continue;
    const range = `${timeLabel(minsOf(w[0]))} – ${timeLabel(minsOf(w[1]))}`;
    const day = i === 0 ? 'Open today' : i === 1 ? 'Open tomorrow' : `Next open ${DOW_NAME[key]}`;
    return `${day} ${range}`;
  }
  return '';
}

/** K-40: the shop hours on the day of the picked pickup ("Open Fri 10:00 AM – 6:00 PM"), else the next hours from now. */
function shopHoursOn(t, iso) {
  if (!iso) return shopHoursLine(t);
  const d = toDate(iso);
  const key = DOW_KEYS[d.getDay()];
  const w = (t.availability?.shop?.[key] ?? []).find(([o, c]) => minsOf(o) <= d.getHours() * 60 + d.getMinutes() && d.getHours() * 60 + d.getMinutes() < minsOf(c)) ?? t.availability?.shop?.[key]?.[0];
  return w ? `Open ${DOW_NAME[key]} ${timeLabel(minsOf(w[0]))} – ${timeLabel(minsOf(w[1]))}` : shopHoursLine(t);
}

/** K-18 (D-249), 3-J "Edge-to-edge linen stage": the three return options share one screen skeleton —
    strip (the state) · header row (Amara, what is on hold) · the hanging stage (her garments, Sarah's tag) · the handoff block (Study-1 A3: the
    pickup code, or the auto-complete countdown) · the labelled place block led by the picked time (K-40) with its buttons (Change time) · what's left to do ·
    Your order · Price. "I got it" closes it on every way back (A3): the sticky bar with "I didn't get it" once Amara marked it handed over,
    else a quiet outline button at the end. */
function handoffView(a, t, first) {
  const f = esc(first);
  const shopName = esc(t.shopName);
  const how = a.returnOption ?? 'pickup';
  const h = a.handoff ?? {};
  const trip = h.trip ?? null;   // S-35: the courier's trip
  const failedCapture = bal_state(a) === 'capture-failed';   // D-04
  const marked = !!h.markedAt;
  const problem = !!h.problemAt;
  const slot = h.slot ?? null;
  const when = slotText(slot);
  const missed = handoffMissed(a);
  const canMove = handoffChangeable(a);
  const hours = shopHoursOn(t, how === 'pickup' ? slot?.start : null);
  const w = how === 'courier' ? courierWindow(a) : null;
  const items = returnedItems(a);
  const services = items.reduce((n, g) => n + g.services.length, 0);
  const sarah = `${state.customer.first} ${(state.customer.last ?? '').charAt(0)}.`.replace(/ \.$/, '');
  const message = { label: 'Message', icon: ICON_CHAT, act: 'message' };
  /* K-40: Sarah moves the time with the same Scheduler sheet (until the slot / an hour before the courier collects) */
  const change = canMove ? [{ label: how === 'courier' ? (trip?.state === 'returned' ? 'Pick a new window' : 'Change window') : missed ? 'Pick a new time' : !slot ? 'Pick a time' : 'Change time', icon: ICON_CALENDAR, act: 'change-time' }] : [];
  const movedFrom = h.moved?.from ? `You moved it from ${esc(slotText(h.moved.from))}` : '';
  const bal = a.payments.balance;
  const held = bal.cents ?? 0;
  const charged = bal.state === 'captured';
  const leave = { state: 'todo', title: 'Leave a review' };
  const confirm = { state: 'current', title: 'Confirm you got it', sub: 'Tap Confirm received below' };   // K-48.3

  const trouble = { state: 'current', title: `Sort it out with ${f}`, sub: 'In chat' };

  const cfg = {
    pickup: {
      strip: problem ? { tone: 'warn', icon: 'chat', text: 'Problem reported · sort it out in chat' }
        : marked ? { tone: 'action', icon: 'bag', text: `${first} marked it picked up` }
          : missed ? { tone: 'warn', icon: 'clock', text: `You missed your pickup at ${fmtWhen(slot.start)} · pick a new time` }
            : !slot ? { tone: 'action', icon: 'clock', text: 'We set it to in-store pickup · pick a time' }   // D-03: ready 14 days, defaulted
              : { tone: 'done', icon: 'bag', text: when ? `Pickup ${when} · show your code at the shop` : 'Ready for pickup · show your code at the shop' },
      tag: 'Ready', right: `at ${t.shopName}`,
      place: () => {
        const addr = `${t.shop?.street ?? ''}, ${t.shop?.city ?? 'Brooklyn'}, ${t.shop?.state ?? 'NY'} ${t.shop?.zip ?? ''}`.trim();
        const dir = { label: 'Directions', icon: ICON_DIRECTIONS, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopPlace(t, { full: true }))}`, act: 'directions', attrs: 'target="_blank" rel="noopener"' };
        const time = when && !marked ? [{
          icon: 'calendar', value: esc(when), strong: true,
          detail: missed ? 'You missed this time. Pick a new one, no fee.' : movedFrom || `Your pickup time · ${f} has it ready then`,
        }] : [];
        return `${visitBlock([...time, { icon: 'bag', value: shopName, detail: [esc(addr), ...(hours ? [esc(hours)] : [])] }], { title: 'In-store pickup', flush: true })}${personActions([dir, ...(marked ? [] : change), message])}${helpRow()}`;
      },
      steps: problem ? [trouble, leave] : marked ? [confirm, leave] : [
        { state: 'current', title: 'Pick it up at the shop', sub: missed || !slot ? (missed ? 'Pick a new time' : 'Pick a time') : when ? esc(when) : hours ? esc(hours.replace(/^Open /, '').replace(/^./, (c) => c.toUpperCase())) : '' },
        { state: 'todo', title: `Show ${f} your code` },
        leave,
      ],
    },
    courier: {
      /* S-35: booked → out for delivery (Amara handed it over) → delivered (completes) | returned (pick a new window) */
      strip: trip?.state === 'returned' ? { tone: 'warn', icon: 'truck', text: trip.reason === 'no-courier' ? 'The courier didn’t come · pick a new window' : 'The courier couldn’t deliver it · pick a new window' }
        : trip?.state === 'out' ? { tone: 'action', icon: 'truck', text: `Out for delivery · arrives ${w ? fmtTimeRange(w.from, w.to) : when}` }
          : { tone: 'done', icon: 'truck', text: when ? `Courier booked · arrives ${when}` : 'Courier booked' },
      tag: 'Ready', right: `at ${t.shopName}`,
      place: () => `${visitBlock([
        ...(w && trip?.state !== 'returned' ? [{ icon: 'clock', value: esc(`Arrives ${when}`), strong: true, detail: [movedFrom, trip?.state === 'out' ? `The courier has it · collected from ${f} at ${esc(fmtTime(trip.outAt))}` : `The courier collects from ${f} at ${esc(fmtTime(w.collectAt))}`].filter(Boolean) }] : []),
        {
          icon: 'truck', cls: 'visit-row--courier', value: esc(`${t.shopName} → ${returnAddress()}`),
          detail: [`${esc(a.courier?.miles ?? 0)} mi · Uber via Taily`, 'Paid by you', esc(COURIER_LOBBY)],   // K-43 (D-298)
        },
      ], { title: 'Taily courier', flush: true })}${personActions([...change, message])}${helpRow()}<div class="${ID}__protection">${protectionRow()}</div>`,
      steps: trip?.state === 'returned' ? [{ state: 'current', title: 'Pick a new delivery window', sub: `No extra charge. It’s back with ${f}.` }, leave]
        : trip?.state === 'out' ? [{ state: 'done', title: 'Courier booked' }, { state: 'current', title: 'Out for delivery', sub: when ? `Arrives ${esc(when)}` : '' }, leave]
          : [{ state: 'current', title: 'Courier booked', sub: when ? `Arrives ${esc(when)}` : '' }, leave],
    },
  }[how];

  const strip = requestStrip({ page: true, ...cfg.strip });
  /* K-27: the one amount is the balance on hold (or charged after 7 days), with the card under it; a $0 balance has nothing on hold (D-156).
     K-44 (D-302): customer-side the held balance reads "Payment $X · Charged at pickup" / "… on delivery" (short: the same words), never "On hold";
     D-303: the words come from chargedWhen (components.js), the one map the c-ready caption uses */
  const head = pageHead(requestHead({
    page: true, name: t.name, initials: t.initials, check: isVerified(t) ? verifiedCheck({ years: t.years }) : '',
    ...(held > 0 ? { payoutCents: held, label: charged ? 'Charged' : chargedWhen(how), lines: [balanceCardLabel(a)] } : { payoutCents: a.money.total, label: 'Paid in full' }),
  }));
  const alert = failedCapture
    ? `<div class="${ID}__alert">${banner({ tone: 'error', title: 'Your card needs attention', text: `We couldn’t charge your card for ${money(held)}. Update it to keep your ${how === 'pickup' ? 'pickup' : 'delivery'}.`, actionLabel: 'Update card', actionAct: 'update-card' })}</div>`   // D-04
    : problem
    ? `<div class="${ID}__alert">${banner({ tone: 'warning', text: `You reported a problem. We’ve stopped the automatic completion and told ${f}.` })}</div>`
    : charged && bal.captureReason === 'unclaimed' && !marked   // SF-15: once she marked it picked up, the countdown speaks
      ? `<div class="${ID}__alert">${banner({ tone: 'warning', text: `We charged your ${money(held)} balance after ${POLICY.UNCLAIMED_CAPTURE_D} days. ${f} still keeps it for you until you ${how === 'pickup' ? 'pick it up' : 'get it'}.` })}</div>` : '';
  const stage = hangStage({
    types: items.map((g) => g.type), tag: [sarah, cfg.tag], left: `${plural(items.length, 'item')} · ${plural(services, 'service')}`, right: cfg.right,
    label: `${plural(items.length, 'item')} ready: ${andList(items.map((g) => g.type))}, hung on a rail with a tag: ${sarah}, ${cfg.tag}`,   // K-21: every garment is drawn, so the label names every one
  });
  /* Study-1 A3: the code to show at the shop; once Amara marked it, the countdown */
  const handoff = how === 'pickup' && !marked
    ? pickupCode({ code: h.code ?? '' })
    : marked ? autoCompleteLine(autoCompleteLeft(a)) : '';
  const heldLine = held > 0 ? (charged ? `Ready · ${money(held)} charged` : `Payment ${money(held)} · ${chargedWhen(how)}`) : 'Ready · nothing to pay';
  const steps = timeline([{ state: 'done', title: 'Booked, fitted, tailored', sub: heldLine }, ...cfg.steps]);
  /* SF-14: after paying, the 7-day charge date (not once she marked it picked up — that countdown speaks — or while a problem is open) */
  const captureLine = bal.state === 'held' && held > 0 && !problem && !marked && unclaimedAt(a)
    ? `<p class="t-small c-600 ${ID}__capture">If you haven’t got it by ${esc(fmtWhen(unclaimedAt(a)))}, we’ll charge the ${money(held)} then.</p>` : '';
  const courierCaption = how === 'courier' && a.courier?.state === 'ready' ? { courierCaption: `Uber quote ${fmtExact(a.courier.quote)} + Taily fee ${fmtExact(a.courier.markup)}` } : {};
  const breakdown = customerBreakdown(a.money, { stage: charged ? 'charged' : 'held', tailorFirst: first, depositState: a.payments.deposit.state, confirmed: true, refundState: a.payments.refund?.state ?? '', wayBack: how, ...courierCaption });
  const order = a.lines?.length ? orderSection(a, first) : '';
  /* A3 + D-09 (K-48.3): "Confirm received" shows only once Amara marked it handed over, or the pickup time has started — the sticky bar
     (Confirm received · I didn't get it, the second only once she marked it); before that the pickup code is the only action. While a
     problem is open it is a quiet outline button at the end of the page. A courier order completes on delivery. */
  const open = confirmReceivedOpen(a);
  const asks = open && !problem;
  const bar = asks ? actionBar({ ctaLabel: 'Confirm received', ctaAct: 'got-it', ...(marked ? { tertiaryLabel: 'I didn’t get it', tertiaryAct: 'not-got-it', tertiaryTone: 'danger' } : {}) }) : '';
  const quiet = open && problem ? `<div class="page-actions">${cta('Confirm received', { variant: 'secondary', attrs: 'data-act="got-it"' })}<p class="t-small c-600 ${ID}__got-hint">Have it now? Tap Confirm received to close the order.</p></div>` : '';
  return `${chrome(bookingTab())}<main class="body${asks ? ' body--with-bar' : ''} ${ID} ${ID}--handoff ${ID}--handoff-${how}" data-s="${ID}">
  ${navBackMark()}${strip}${head}
  ${caseBlock(a)}
  ${alert}
  ${stage}
  ${handoff ? sec(`<div class="${ID}__handoff">${handoff}</div>`) : ''}
  ${sec(cfg.place())}
  ${sec(`${sectionHead('What happens next')}${steps}${captureLine}`)}
  ${order}
  ${sec(`${sectionHead('Price', { aside: infoButton('deposit') })}${breakdown}`)}
  ${quiet}
</main>
${bar}`;
}

/** "Your order" (K-2-01, D-127): the approved order as plain rows, the same garment / service strings as Amara's "The work".
    Every row is 'same' once approved; a garment added at the fitting keeps a small "New item" tag. */
function orderSection(a, first = 'Amara') {
  const added = new Set(a.job.garments.filter((g) => g.added).map((g) => g.id));
  const garments = withPhotos(priceChangeView(a, a.lines).garments, a.job).map((g) => (added.has(g.id) ? { ...g, newItem: true } : g));
  return sec(`${sectionHead('Your order')}<div class="${ID}__order">${changeList({ garments, docs: a.priceChange?.docs ?? null, commentLabel: `${first}’s comment` })}</div>`);
}

function m4View(a, t, first) {
  if (a.status === 'awaiting-handoff') return handoffView(a, t, first);
  const word = statusWord(a, 'customer');
  const f = esc(first);
  /* K-17 (D-243, R1): the title states the state, so there is no status pill above it; R5: one subtitle line, no "Fitted …" line (it is on the timeline) */
  const cfg = {
    fitting: { title: `Fitting with ${f}`, body: `${f} is going through the order with you.` },
    'price-change': { title: 'Review your final order', body: 'Approve the final order before any work starts.' },
    'in-progress': { title: `${f} is working on it`, body: 'You approved the order. You’ll pay the balance when it’s ready.' },
    ready: { title: `${f} finished your order`, body: `Pay the ${fmtExact(a.money.balance)} balance to choose how to get it back.` },
    completed: a.handoff?.completedBy === 'abandoned'   // D-03: not collected 30 days after the charge
      ? { title: 'Order closed', body: `We closed it ${POLICY.ABANDONED_CLOSE_D} days after the charge because it wasn’t collected. Message ${f} if you still want it.` }
      : bal_state(a) === 'capture-failed'               // D-04: the charge at the handoff failed
        ? { title: 'Your card needs attention', body: `You have your order, but we couldn’t charge ${fmtExact(a.payments.balance.cents)}. Update your card to finish.` }
        : { title: `All done with ${f}`, body: `Completed ${fmtDay(completedAt(a))}. Fitted ${fmtDay(a.slot.start)} · ${VISIT_LABEL.customer[a.job.visitType].toLowerCase()}.` },
  }[a.status];
  const hero = head(a, { pill: false, title: cfg.title, body: cfg.body, variant: a.status === 'completed' ? 'confirmed' : 'tailoring' });

  const early = a.status === 'fitting' || a.status === 'price-change' || a.status === 'in-progress' || a.status === 'ready';
  const stage = a.status === 'completed' ? 'paid' : 'booked';
  const confirmed = a.status !== 'fitting' && a.status !== 'price-change';

  const updated = a.status === 'in-progress' && a.priceChange?.changed && a.priceChange?.state === 'approved';   // P-30: the services row says so
  const breakdown = a.status === 'completed' ? receiptBlock(a, first)
    : customerBreakdown(a.money, { stage, tailorFirst: first, depositState: a.payments.deposit.state, confirmed, ...(updated ? { servicesCaption: `${first}’s final prices · updated at the fitting` } : {}) });

  let middle = '';
  /* D-169 + K-17 R5: from the visit on, the past visit time is demoted — the timeline's done step says "Fitted …" (completed: the subtitle) */
  const postFit = ['in-progress', 'ready', 'awaiting-handoff', 'completed'].includes(a.status);
  if (early && !postFit) middle = visitSection(a, t);
  if (a.status === 'completed' && (a.review || (t.reviews ?? []).some((x) => x.id === `r-${a.id}`))) {   // pre-MVP A1: a closed / unpaid order may have none
    const r = (t.reviews ?? []).find((x) => x.id === `r-${a.id}`);
    const mine = r ? reviewRow({ name: r.name, initials: r.initials, stars: r.stars, date: r.date, text: r.text, photos: r.photos, photoType: r.photoType ?? a.job.garments[0]?.type ?? '' })
      : a.review ? reviewRow({ name: `${state.customer.first} ${state.customer.last[0]}.`, initials: state.customer.initials, stars: a.review.stars, date: a.review.date, text: a.review.text, photos: a.review.photos, photoType: a.job.garments[0]?.type ?? '' }) : '';
    middle = sec(`${sectionHead('Your review')}<div class="${ID}__review">${mine}</div>`, 'sec--first');
  }
  const steps = a.status === 'completed' ? '' : sec(`${sectionHead('What happens next')}${m4Timeline(a, first)}`);
  /* D-218: a completed booking's Receipt carries the order (with its photo stacks), so "Your order" is not shown twice */
  const order = ['in-progress', 'ready', 'awaiting-handoff'].includes(a.status) && a.lines?.length ? orderSection(a, first) : '';
  const actions = a.status === 'completed' && bal_state(a) === 'capture-failed'
    ? `${cta('Update card', { attrs: 'data-act="update-card"' })}
    <div class="page-actions__links">${textLink(`Message ${f}`, { act: 'message' })}</div>`
    : a.status === 'completed'
    ? `${cta(`Book ${f} again`, { attrs: 'data-act="book-again"' })}
    <div class="page-actions__links">${textLink(`Message ${f}`, { act: 'message' })}</div>`
    : early && !postFit ? '' : cta(`Message ${f}`, { attrs: 'data-act="message"' });   // K-12 (D-237): the person block above already carries Message

  return `${chrome(bookingTab())}<main class="body ${ID} ${ID}--${a.status}" data-s="${ID}">
  ${hero}
  ${caseBlock(a)}
  ${middle}
  ${postFit || a.status === 'completed' ? helpActions() : ''}
  ${steps}
  ${order}
  ${sec(`${sectionHead(a.status === 'completed' ? 'Receipt' : 'Price', { aside: a.status === 'completed' ? '' : infoButton('deposit') })}${breakdown}`)}
  ${actions ? `<div class="page-actions">
    ${actions}
  </div>` : ''}
</main>`;
}

function view() {
  const a = focusAppt(ID);
  if (!a || dropped(a)) {
    return `${chrome(bookingTab())}<main class="body ${ID}" data-s="${ID}">
  <div class="${ID}__empty" data-empty="no-booking">${emptyState({
    title: 'No booking to show', body: 'Your requests and visits are in Bookings.', ctaLabel: 'Go to Bookings', ctaAct: 'bookings', art: 'Formal Dress',
  })}</div>
</main>`;
  }
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  if (a.status === 'cancelled') return cancelledView(a, t, first);
  return M4_STATES.includes(a.status) ? m4View(a, t, first) : liveView(a, t, first);
}

/* ---------- sheets ---------- */

/** A sheet body that is rebuilt as busy while the simulated network wait runs. */
function cancelSheetHtml(a, terms, first, busy = false, error = '') {
  const early = terms.window === 'early';
  const deposit = a.payments.deposit.cents;
  const rows = early
    ? [{ label: 'Deposit paid', cents: deposit }, { label: 'Refund to your card', cents: terms.refund, kind: 'total' }]
    : [{ label: 'Deposit paid', cents: deposit }, { label: 'Refund', cents: 0 }, { label: `Kept by ${first}`, cents: terms.kept, kind: 'total' }];
  const text = early
    ? `You’re cancelling more than ${POLICY.CANCEL_WINDOW_H} hours before the visit, so your ${money(terms.refund)} deposit comes back in full.`
    : terms.confirmed   // K-41 (D-296): confirming at the reminder closed the free window early
    ? `You confirmed this visit, so ${esc(first)} keeps your ${money(terms.kept)} deposit for the time set aside. Nothing else is charged.`
    : `The visit is less than ${POLICY.CANCEL_WINDOW_H} hours away. If you cancel now, ${esc(first)} keeps your ${money(terms.kept)} deposit for the time set aside. Nothing else is charged.`;
  const label = early ? `Cancel and get ${fmtExact(terms.refund)} back` : `Cancel and lose the ${fmtExact(terms.kept)} deposit`;
  return `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  <p class="t-body c-700">${text}</p>
  ${moneyRows(rows)}
  ${error ? banner({ tone: 'error', text: error }) : ''}
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
    const paint = (error = '') => { holder.querySelector(`.${ID}-sheet`).outerHTML = cancelSheetHtml(a, terms, first, busy, error); };
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
          if (!res.ok) { paint('Something went wrong. Your booking is unchanged. Try again.'); toast('Couldn’t cancel your booking', { tone: 'error' }); return; }   // D-140: the banner carries it, the toast only echoes
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
  <p class="t-small c-600 ${ID}-sheet__now" data-now>Booked for <span class="nb">${fmtWhen(a.slot.start)}</span></p>
  <div class="${ID}-sheet__wheel">${scheduler({ columns: slotColumns(slots, picked), compact: true, cta: '', inline: true, note: whenNote('New time', picked) })}</div>
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
      if (note) { note.innerHTML = whenNote('New time', iso); note.hidden = false; }
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

/* ---------- K-40 (T1): move the handoff time — the shared Scheduler sheet (components.js openHandoffTime) ---------- */
function openChangeTime(a, first) {
  const courier = a.returnOption === 'courier';
  openHandoffTime(a, {
    mode: 'change', first,
    dataS: courier ? `${ID}--change-window` : `${ID}--change-time`,
    onDone: (appt) => { go(ID); toast(`Moved to ${slotText(appt.handoff.slot)}. ${first} has been told.`); },
    onMessage: () => go('c-thread'),
  });
}

/* ---------- Study-1 A3 / A5 sheets ---------- */
/** "Confirm received" (A3, K-48.3 — was "I got it"): any way back, once confirmReceivedOpen (D-09); completes the order right away and charges
    what is on hold. Offline (S-12): the error stays in the sheet, nothing is charged. */
function openGotIt(a, first) {
  const held = a.payments.balance.state === 'held' ? a.payments.balance.cents : 0;
  const html = (busy = false, error = '') => `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  <p class="t-body c-700">${held > 0 ? `We’ll charge your ${money(held)} balance and close the order.` : 'We’ll close the order.'}</p>
  ${error ? banner({ tone: 'error', text: error }) : ''}
  ${cta('Yes, I have it', { busy, busyLabel: 'Closing…', attrs: 'data-act="got-ok"' })}
  ${cta('Not yet', { variant: 'secondary', disabled: busy, attrs: 'data-act="got-keep"' })}
</div>`;
  sheetOverlay(html(), { header: 'Confirm you received it?', dataS: `${ID}--got-it`, confirm: false }, (holder, close) => {
    let busy = false;
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'got-keep') close();
      else if (act === 'got-ok') {
        busy = true; holder.querySelector(`.${ID}-sheet`).outerHTML = html(true);
        withLatency(() => {
          if (gone(holder)) return;
          const res = T.confirmReceived(a.id);
          busy = false;
          if (!res.ok && res.error === 'offline') { holder.querySelector(`.${ID}-sheet`).outerHTML = html(false, 'You’re offline. Nothing was charged. Try again when you’re back.'); return; }
          close({ instant: true });
          if (!res.ok) { go(ID); toast('Couldn’t save this. Try again.', { tone: 'error' }); return; }
          setFocus(a.id);
          go(statusScreen(res.appt, 'customer'), { replace: true });
          toast(`Order complete. ${first} has been told.`, { tone: 'success' });
        });
      }
    });
  });
}

/** "I didn't get it" (A3, default 5): stops the automatic completion and tells the tailor; nothing is charged meanwhile. */
function openNotReceived(a, first) {
  const html = (busy = false) => `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  <p class="t-body c-700">We’ll stop the automatic completion and tell ${esc(first)}. ${a.payments.balance.state === 'held' ? 'Nothing is charged while you sort it out in chat.' : `You’ve already been charged ${money(a.payments.balance.cents)}. We’ll keep the order open while you sort it out in chat.`}</p>
  ${cta('Report a problem', { variant: 'danger', busy, busyLabel: 'Reporting…', attrs: 'data-act="nr-ok"' })}
  ${cta('Keep waiting', { variant: 'secondary', disabled: busy, attrs: 'data-act="nr-keep"' })}
</div>`;
  sheetOverlay(html(), { header: 'Didn’t get it?', dataS: `${ID}--not-received`, confirm: false }, (holder, close) => {
    let busy = false;
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'nr-keep') close();
      else if (act === 'nr-ok') {
        busy = true; holder.querySelector(`.${ID}-sheet`).outerHTML = html(true);
        withLatency(() => {
          if (gone(holder)) return;
          const res = T.reportNotReceived(a.id);
          busy = false;
          close({ instant: true });
          go(ID);
          if (res.ok) toast(`Problem reported. ${first} has been told.`);
          else toast('Couldn’t save this. Try again.', { tone: 'error' });
        });
      }
    });
  });
}

/** D-04 (pre-MVP A1): the charge failed — pay with a card (the one that failed, or another / a new one in Payment methods). */
function openUpdateCard(a, first) {
  const amt = a.payments.balance.cents;
  const cards = state.customer.cards ?? [];
  let cardId = cards.find((c) => c.id !== a.balanceCardId)?.id ?? cards[0]?.id ?? null;
  const rows = () => cards.map((c) => optionRow({ name: 'pay-card', value: c.id, title: esc(`${c.brand} •••• ${c.last4}`), sub: c.id === a.balanceCardId ? 'Declined' : c.default ? 'Default' : '', checked: c.id === cardId, act: 'card' })).join('');
  const html = (busy = false, error = '') => `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  <p class="t-body c-700">We couldn’t charge your card for ${money(amt)}. Pick a card to pay with.</p>
  <div role="radiogroup" aria-label="Pay with">${rows()}</div>
  <div class="page-actions__links">${textLink('Add a card', { act: 'add-card' })}</div>
  ${error ? banner({ tone: 'error', text: error }) : ''}
  ${cta(`Pay ${fmtExact(amt)}`, { busy, busyLabel: 'Paying…', attrs: 'data-act="uc-ok"' })}
  ${cta('Not now', { variant: 'secondary', disabled: busy, attrs: 'data-act="uc-keep"' })}
</div>`;
  sheetOverlay(html(), { header: 'Update your card', dataS: `${ID}--update-card`, confirm: false }, (holder, close) => {
    let busy = false;
    const paint = (error = '') => { holder.querySelector(`.${ID}-sheet`).outerHTML = html(busy, error); };
    holder.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (busy || !el) return;
      const act = el.dataset.act;
      if (act === 'uc-keep') close();
      else if (act === 'add-card') { close({ instant: true }); go('c-cards'); }
      else if (act === 'card') { cardId = el.dataset.value; paint(); }
      else if (act === 'uc-ok') {
        busy = true; paint();
        withLatency(() => {
          if (gone(holder)) return;
          const res = T.retryCapture(a.id, cardId);
          busy = false;
          if (!res.ok) { paint(res.error === 'offline' ? 'You’re offline. Nothing was charged. Try again when you’re back.' : 'Your card was declined. Nothing was charged. Try another card.'); return; }
          close({ instant: true });
          setFocus(a.id);
          go(statusScreen(res.appt, 'customer'), { replace: true });
          toast(`Paid ${fmtExact(amt)}. ${first} has been told.`, { tone: 'success' });
        });
      }
    });
  });
}

/** D-14 (pre-MVP A1): "That's not right" on a no-show Amara marked — Taily looks into it (the review UI is track A2's). */
function openDispute(a, first) {
  const html = (busy = false) => `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  <p class="t-body c-700">Tell Taily you were there. We look into it with ${esc(first)} and message you both. ${esc(first)}’s no-show pay waits until then.</p>
  ${cta('Tell Taily', { busy, busyLabel: 'Sending…', attrs: 'data-act="dp-ok"' })}
  ${cta('Cancel', { variant: 'secondary', disabled: busy, attrs: 'data-act="dp-keep"' })}
</div>`;
  sheetOverlay(html(), { header: 'Were you there?', dataS: `${ID}--dispute`, confirm: false }, (holder, close) => {
    let busy = false;
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'dp-keep') close();
      else if (act === 'dp-ok') {
        busy = true; holder.querySelector(`.${ID}-sheet`).outerHTML = html(true);
        withLatency(() => {
          if (gone(holder)) return;
          const res = T.disputeNoShow(a.id, 'customer');
          close({ instant: true });
          go(ID);
          if (res.ok) toast('Sent. Taily is looking into it.', { tone: 'success' });
          else toast('Couldn’t send this. Try again.', { tone: 'error' });
        });
      }
    });
  });
}

/** "Tailor didn't show up?" (A5): cancels the visit and refunds the deposit in full; the order stays saved. */
function openTailorNoShow(a, first, { check = false } = {}) {   // check: D-11's "No, she didn't come" (answerVisitCheck)
  const deposit = a.payments.deposit.cents;
  const html = (busy = false, error = '') => `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  <p class="t-body c-700">We’ll cancel the visit and refund your ${money(deposit)} deposit in full. Your order stays saved so you can rebook.</p>
  ${error ? banner({ tone: 'error', text: error }) : ''}
  ${cta('Report a no-show', { variant: 'danger', busy, busyLabel: 'Reporting…', attrs: 'data-act="tns-ok"' })}
  ${cta('Keep waiting', { variant: 'secondary', disabled: busy, attrs: 'data-act="tns-keep"' })}
</div>`;
  sheetOverlay(html(), { header: `${esc(first)} didn’t show up?`, dataS: `${ID}--no-show-report`, confirm: false }, (holder, close) => {
    let busy = false;
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'tns-keep') close();
      else if (act === 'tns-ok') {
        busy = true; holder.querySelector(`.${ID}-sheet`).outerHTML = html(true);
        withLatency(() => {
          if (gone(holder)) return;
          const res = check ? T.answerVisitCheck(a.id, 'not-happened') : T.reportTailorNoShow(a.id);
          if (res.ok && res.appt.status === 'confirmed') { close({ instant: true }); go(ID); toast('Sent. Taily is looking into it.'); return; }   // she said I'm here: review
          busy = false;
          if (!res.ok) { holder.querySelector(`.${ID}-sheet`).outerHTML = html(false, `${esc(first)} already updated this visit. Close this and check it.`); return; }
          close({ instant: true });
          go(ID);
          toast(`Visit cancelled. ${fmtExact(deposit)} refunded.`, { tone: 'success' });
        });
      }
    });
  });
}

/* ---------- wiring ---------- */

function wire(root) {
  if (redirectIfMoved(ID, go, { has: (id) => registered().includes(id) })) return;
  const a = focusAppt(ID);
  wirePhotoViewer(root);   // the customer-photo stack of an item with no fitting photos (K-04)

  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => go(state.ui.from === 'account' ? 'c-orders' : 'c-bookings'));
  }

  /* K-02: the tailor's Before | Pinned photos on "Your order" (read-only, the sent snapshot) */
  if (a) {
    const by = firstOf(tailorById(a.tailorId) ?? state.tailors[0]);
    wireGarmentDocs(root, {
      by: `Taken by ${by}`,
      lookup: (gid) => {
        const docs = a.priceChange?.docs?.[gid];
        const type = priceChangeView(a, a.lines).garments.find((g) => g.id === gid)?.type ?? '';
        return docs ? { type, docs } : null;
      },
    });
  }
  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act || e.target.closest('.screen-sheet--overlay')) return;
    const t = a ? tailorById(a.tailorId) ?? state.tailors[0] : null;
    switch (act) {
      case 'message': go('c-thread'); break;
      /* DG-1 option B (pre-MVP A2): Get help opens the Taily Help thread with this order attached; the case strip opens its case */
      case 'get-help': if (a) { setFocus(a.id); state.ui.help = { apptId: a.id, caseId: null }; go('c-case'); } break;
      case 'open-case': if (a) { state.ui.help = { apptId: a.id, caseId: e.target.closest('[data-case]')?.dataset.case ?? null }; go('c-case'); } break;
      case 'garment-protection': state.ui.policy = 'garment'; go('c-policy'); break;   // D-21
      case 'cancel': if (a) openCancel(a, firstOf(t)); break;
      case 'confirm-visit': {   // K-41 (R3): the reminder's Confirm
        if (!a) break;
        const res = T.confirmVisit(a.id);
        go(ID);
        if (res.ok) toast(`You’re confirmed. See you ${dayWord(a.slot.start, now())} at ${fmtTime(a.slot.start)}.`, { tone: 'success' });
        break;
      }
      case 'reschedule': if (a) openReschedule(a, firstOf(t)); break;
      case 'change-time': if (a) openChangeTime(a, firstOf(t)); break;
      case 'book-again':
        if (a.status === 'completed') { T.bookAgain(a.id); state.ui.booking = { tailorId: a.tailorId, again: true }; go('c-job', { fresh: true }); }   // Study-1 A4 (default 9)
        else { state.ui.booking = { tailorId: a.tailorId }; go('c-book'); }
        break;
      case 'got-it': if (a) openGotIt(a, firstOf(t)); break;
      case 'not-got-it': if (a) openNotReceived(a, firstOf(t)); break;
      case 'tailor-no-show': if (a) openTailorNoShow(a, firstOf(t)); break;
      /* pre-MVP A1 */
      case 'call': openCallSheet({ first: firstOf(t), onMessage: () => go('c-thread') }); break;   // S-32
      case 'on-my-way': case 'im-here': {
        if (!a) break;
        const res = T.visitPing(a.id, 'customer', act === 'im-here' ? 'here' : 'on-my-way');
        go(ID);
        if (res.ok) toast(act === 'im-here' ? `${firstOf(t)} knows you’re here.` : `${firstOf(t)} knows you’re on your way.`, { tone: 'success' });
        break;
      }
      case 'proposal-accept': case 'proposal-keep': {   // D-12
        if (!a) break;
        const res = T.answerProposal(a.id, act === 'proposal-accept');
        go(ID);
        if (res.ok) toast(act === 'proposal-accept' ? `Moved to ${fmtWhen(res.appt.slot.start)}. ${firstOf(t)} has been told.` : `You kept ${fmtWhen(res.appt.slot.start)}. ${firstOf(t)} has been told.`, { tone: 'success' });
        else toast('That time was just taken. Your visit stays as it is.', { tone: 'error' });
        break;
      }
      case 'visit-yes': {   // D-11
        if (!a) break;
        const res = T.answerVisitCheck(a.id, 'happened');
        go(ID);
        if (res.ok) toast(`Thanks. ${firstOf(t)} sends you the final order next.`, { tone: 'success' });
        break;
      }
      case 'visit-no': if (a) openTailorNoShow(a, firstOf(t), { check: true }); break;
      case 'dispute': if (a) openDispute(a, firstOf(t)); break;      // D-14
      case 'dispute-hold': if (a) {   // K-51: a visit closed "Not confirmed" — the deposit stays on hold, Taily decides
        confirmAction({ header: 'The visit didn’t happen?', dataS: `${ID}--dispute-hold`, ok: 'Tell Taily', busyLabel: 'Sending…',
          body: `Tell Taily, and your ${fmtExact(a.payments.deposit.cents)} deposit stays on hold until we decide. We look into it with ${esc(firstOf(t))} and message you both.` },
        () => { const r = T.disputeUnconfirmed(a.id, 'customer'); if (!r.ok) return r.error === 'offline' ? 'You’re offline. Nothing was sent.' : 'Couldn’t send this. Try again.'; go(ID); toast('Sent. Taily is looking into it.', { tone: 'success' }); return null; });
      } break;
      case 'update-card': if (a) openUpdateCard(a, firstOf(t)); break;   // D-04
      case 'other-tailors': go('c-tailors'); break;
      case 'find-another': go('c-tailors', { fresh: true }); break;
      case 'bookings': go('c-bookings', { fresh: true }); break;
      case 'full-receipt': if (a) { setFocus(a.id, { keepFrom: true }); go('c-receipt'); } break;   // S-25 (pre-MVP B2)
      default:
    }
  });
}

register(ID, view, wire);
