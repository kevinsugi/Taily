/* ============================================================
   t-job — T4 upcoming job (M3-spec §C2). Where, when, who — and the
   two things that can go wrong (she can't make it / Sarah doesn't
   show). Focal: the visit card, `fmtWhen(start)` over the full
   address. The person-led block (K-12) carries Message / Directions /
   Add to calendar; no CTA of its own before the visit. Cancelled jobs read
   plainly with the money outcome first and hide the street (D-88).

   M4 (M4-spec §C2, D-103): from the visit start the same screen walks
   the job — visit → fitting → waiting / messaged → in-progress →
   ready → awaiting-handoff (pickup / dropoff / courier) → completed. Each
   state has ONE next thing in a sticky action bar; "what I take home"
   is always in dollars; the courier is never her money.
   ============================================================ */
import { register, render as go, registered, personaHome, currentScreen } from '../app.js';
import { state, T, now, TERMINAL, justConfirmed, priceChangeView, returnOffer, threadFor, lastSpeakerSince, returnAddress, docsDiffer, docsFor, courierWindow, autoCompleteLeft } from '../state.js';
import { focusAppt, redirectIfMoved, statusWord, setFocus } from '../focus.js';
import { myTailor, requestView, jobAddress, payoutOf, inbox, payoutLine } from '../tailor-data.js';
import { CANT_MAKE_IT_REASONS, RETURN_LABEL, HANDOFF_CODE_LEN } from '../data.js';
import { POLICY } from '../money-config.js';
import { fmtExact, noShowPayout, cancelTerms } from '../money.js';
import { withLatency } from '../sim.js';
import { toDate, addMinutes, isoMinute, fmtWhen, fmtDay, fmtTime, fmtTimeRange, dayDiff } from '../dates.js';
import {
  chrome, headingRow, statusHero, personBlock, calendarHref, cta, listRow, tailorBreakdown, moneyRows, workList,
  emptyState, sheetOverlay, chipGroup, wireChipGroups, toast, esc, wirePhotoViewer,
  actionBar, checkRow, noteQuote, changeList, withPhotos, changeSummary, deltaText, statusPill, wireGarmentDocs,
  navBackMark, requestStrip, requestHead, pageHead, personActions, personButtons, visitBlock,
  sectionHead, textLink, infoButton, moreMenu, openMoreMenu, ICON_CHAT, ICON_DIRECTIONS, ICON_CALENDAR,
  linenStage, tagRail, returnedItems, stars,
  banner, codeInput, autoCompleteLine, deliveryPhoto, photoStub, ICON_IMAGE,
} from '../components.js';
import { ICON_CAMERA } from '../icons.js';

const ID = 't-job';
const ui = () => (state.ui[ID] ??= {});
const firstOf = () => state.customer.first;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ---------- copy by state ---------- */
const cancelKind = (a) => (a.status === 'cancelled' ? a.cancel?.reason ?? 'customer-early' : null);

/** [title, note HTML] for the heading block — K-17 R1: the title states the state, no status pill above it. */
function heroCopy(a, v) {
  const first = esc(firstOf());
  const c = a.cancel ?? {};
  const kind = cancelKind(a);
  if (kind === 'tailor-cant-make-it') {
    return {
      title: 'Visit cancelled',
      note: `<p class="t-body c-700 ${ID}__note">We told ${first} and refunded her ${fmtExact(c.refund)} deposit. Nothing is paid out for this job.</p>`,   // K16-2-03: her reason is a row of the Visit block (as on c-booking), not a third head line
    };
  }
  if (kind === 'tailor-no-show') {   // K-29 (Study-1 A5): Sarah reported it; the deposit went back, nothing is paid out
    return {
      title: `${firstOf()} reported you didn’t show up`,
      note: `<p class="t-body c-700 ${ID}__note">Her ${fmtExact(c.refund)} deposit was refunded. Nothing is paid out for this job.</p>`,
    };
  }
  if (kind === 'no-show') {
    return {
      title: 'Marked as a no-show',
      note: `<p class="t-body c-700 ${ID}__note">${first} has been told, and her ${fmtExact(c.kept)} deposit isn’t refunded.</p>`,   // K-17 R5: what you are paid is the money row below, not the subtitle
    };
  }
  if (kind === 'customer-early') {
    return {
      title: `${firstOf()} cancelled`,
      note: `<p class="t-body c-700 ${ID}__note">She cancelled more than ${POLICY.CANCEL_WINDOW_H} hours before the visit, so nothing is owed. The time is open again for new requests.</p>`,
    };
  }
  if (kind === 'customer-late') {
    return {
      title: `${firstOf()} cancelled`,
      note: `<p class="t-body c-700 ${ID}__note">She cancelled less than ${POLICY.CANCEL_WINDOW_H} hours before the visit, so you keep her deposit.</p>`,   // the "Kept deposit" row has the amount
    };
  }
  if (a.status === 'confirmed' && justConfirmed(a)) {
    return {
      title: `You accepted ${firstOf()}’s request`,
      note: `<p class="t-body c-700 ${ID}__note">${first} has been told and her deposit is paid. Her full address is below.</p>`,
    };
  }
  /* K-17 (D-243, R1): the title states the state ("Visit confirmed"), so the Confirmed pill and the repeated "Visit with <name>" (the block's first row is her) are gone */
  const moved = a.history[a.history.length - 1]?.status === 'rescheduled';
  return { title: moved ? 'Visit rescheduled' : 'Visit confirmed', note: '' };
}

/** The money line under a cancelled job's note: kept deposit / no-show pay, with the payout date. */
function cancelMoney(a) {
  const kind = cancelKind(a);
  const p = payoutOf(a);
  if (!p || !['no-show', 'customer-late'].includes(kind)) return '';
  const label = kind === 'no-show' ? 'No-show pay' : 'Kept deposit';
  return `<div class="${ID}__money">${moneyRows([{ label, cents: a.cancel.tailorPaid, kind: 'total', status: payoutLine(p).short }])}</div>`;
}

/* ---------- blocks ---------- */
/** K-12 (D-237): the person-led block's equal buttons. Message always; Directions (home visits only; the street is hers to see once accepted)
    and Add to calendar (an .ics data link) while the job is confirmed. */
function visitActions(a, v) {
  const message = { label: 'Message', icon: ICON_CHAT, act: 'message' };
  if (a.status !== 'confirmed') return [message];
  const where = jobAddress(a);
  const maps = a.job.visitType === 'home'
    ? [{ label: 'Directions', icon: ICON_DIRECTIONS, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`, act: 'directions', attrs: 'target="_blank" rel="noopener"' }] : [];
  const href = calendarHref({ uid: a.id, start: a.slot.start, end: a.slot.end, stamp: isoMinute(new Date(now())), summary: `${v.visitLabel} with ${v.customer.name}`, location: where });
  const cal = { label: 'Add to calendar', icon: ICON_CALENDAR, href, act: 'add-to-calendar', attrs: 'download="taily-visit.ics"' };
  return [message, ...maps, cal];
}

/** K-12 (D-237) Option C: ONE person-led block per state — Sarah (avatar, name, no check (K-15: only tailors are verified), no facts line) with the state's
    rows hanging under her name and the buttons under them. */
const personOf = (v) => ({ initials: v.customer.initials, name: v.customer.name });
const personCard = (a, v, title, rows) => personBlock({ title, person: personOf(v), rows, actions: visitActions(a, v) });

function visitCard(a, v, { was = '', extra = [] } = {}) {
  /* K-10 (D-235): icon rows — calendar (date + length), map-pin (place), clock (needed by). K-17 R3: a moved visit says so on its own row (no banner above it). */
  const rows = [
    { icon: 'calendar', value: esc(fmtWhen(a.slot.start)), strong: true, detail: [...(was ? [`Moved from ${esc(was)}`] : []), `${esc(v.visitLabel)} · ${v.minutes} min, until ${v.whenEnd}`] },
    { icon: 'map-pin', value: esc(jobAddress(a)) },
    { icon: 'clock', value: `Needed by ${v.needBy}` },
    ...extra,
  ];
  return personCard(a, v, 'Visit', rows);
}

/** D-169 + K-17 (D-242): from the fitting on, the due date is ONE tile row under the header (no "Timing" label, no person block): "Needed by Fri, Oct 23"
    with a detail line. Warning ink within a day. */
function dueRows(a, detail) {
  const days = dayDiff(now(), a.job.needBy);
  const fig = `<span class="${ID}__due${days <= 1 ? ` ${ID}__due--soon` : ''}">Needed by ${fmtDay(a.job.needBy)}</span>`;
  return { icon: 'clock', value: fig, strong: true, detail };
}
/** "8 days left" / "Due today" / "2 days late" — the strip's right-hand fact on the in-work states. */
function daysLeft(a) {
  const d = dayDiff(now(), a.job.needBy);
  return d < 0 ? `${plural(-d, 'day')} late` : d === 0 ? 'Due today' : `${plural(d, 'day')} left`;
}

/** K-02: "The work" always carries the garment icons; from the fitting on it carries the photos and Your comment (read-only). */
const workHtml = (v, opts) => workList(v, { docs: true, commentLabel: 'Your comment', ...opts });
/** The work is over (declined, cancelled, completed, expired): the list drops its estimate row (M6-P-07). */
const workOver = (a) => TERMINAL.includes(a.status) || a.status === 'expired';

/** A grouped section: head + content on the rhythm (`first` = directly under the hero notes). */
const sec = (inner, { first = false, id = '' } = {}) => `<section class="sec${first ? ' sec--first' : ''}"${id ? ` aria-labelledby="${id}"` : ''}>${inner}</section>`;
const workSec = (a, v) => sec(`${sectionHead('The work', { id: `${ID}-work` })}${workHtml(v, { final: workOver(a), estimateLabel: null })}`, { id: `${ID}-work` });   // the payout breakdown follows: no estimate row (M6-P-07)
const payoutSec = (a, v, fineHtml = '') => sec(`${sectionHead('Your payout', { id: `${ID}-take`, aside: infoButton('payouts', { label: 'When you get paid' }) })}${tailorBreakdown(v.money)}${fineHtml}`, { id: `${ID}-take` });

/** ••• menu (D-195): "I can’t make it" before the visit starts, "Mark as no-show" once it has (its row says when). Null once neither applies. */
function moreItems(a) {
  if (a.status !== 'confirmed') return null;
  const startMs = toDate(a.slot.start).getTime();
  const wait = POLICY.NO_SHOW_WAIT_MIN;
  const t = now();
  const from = fmtTime(isoMinute(addMinutes(a.slot.start, wait)));
  const items = [];
  if (t < startMs) items.push({ label: 'Cancel appointment', sub: `${firstOf()} gets her ${fmtExact(a.payments.deposit.cents)} deposit back`, act: 'cant-make-it', tone: 'danger' });   // K-29 (Study-1 A5)
  items.push({ label: 'Mark as no-show', sub: t < startMs + wait * 60000 ? `Available from ${from} if ${firstOf()} isn’t there` : `You’re paid ${fmtExact(noShowPayout(a.payments.deposit.cents))} for your time`, act: 'no-show', tone: 'danger' });
  return items;
}
/** The heading (status · Back + title) with the ••• at the title row's right end (shown only while an action is available). */
function backHead(hero, a) {
  return headingRow(hero, { trailing: moreItems(a) ? moreMenu() : '' });
}

/* ============================================================
   M4 — the job after the visit starts (M4-spec §C2)
   ============================================================ */
const RETURN_ICON = { pickup: 'bag', dropoff: 'home', courier: 'truck' };
/** "2:00–2:30 PM" (D-160): the pickup window — the same string c-booking's courier route block prints (K16-2-02). */
function courierWhen(a) {
  const w = courierWindow(a);
  return w ? fmtTimeRange(w.from, w.to) : '';
}
const shopLine = (t) => `${t.shop.street}, ${t.shop.city}, ${t.shop.state} ${t.shop.zip}`;
/** One return-address line on both sides (R4-2-C-06): street + unit, the same string c-ready and c-booking print. */
const homeStreet = returnAddress;
/** A return block (R4-2-T-09): the place name (w-600) beside its icon, the address regular under it on the same left edge. */
const placeRows = (name, icon, address) => [{ icon, value: esc(name), detail: esc(address) }];

/** The M4 state of a job (null = the M3 layout: before the visit starts, or cancelled). */
function stateKey(a) {
  if (a.status === 'cancelled') return null;
  if (a.status === 'confirmed') return now() >= toDate(a.slot.start).getTime() ? 'visit' : null;
  if (a.status === 'price-change') return a.priceChange?.state === 'messaged' ? 'messaged' : 'waiting';
  if (a.status === 'awaiting-handoff') return { dropoff: 'handoff-dropoff', courier: 'handoff-courier' }[a.returnOption] ?? 'handoff-pickup';
  return a.status; // fitting · in-progress · ready · completed
}

/** The action bar (and, for the two states that keep the old head, the hero copy) for each M4 state.
    K-17 (D-242): every other state is strip-led — its words are in `stripFor`, its header is `requestHead`. */
function copyFor(key, a, t, v, pv) {
  const first = esc(firstOf());
  const word = statusWord(a, 'tailor');
  const note = (html) => `<p class="t-body c-700 ${ID}__note">${html}</p>`;
  const base = { pill: word.pill, label: word.label };
  const busy = ui().busy;
  const h = a.handoff ?? {};
  /* Study-1 A3: pickup → Picked up (Sarah's code); drop-off → Delivered (a photo); once marked, nothing until Sarah answers or the countdown
     ends; a reported problem → talk to Sarah (and, for a drop-off, mark it delivered again with a new photo). The courier needs no tap. */
  const problemBar = (extra = {}) => ({ ctaLabel: `Message ${first}`, ctaAct: 'message', ...extra });
  switch (key) {
    case 'visit': return { ...base, title: 'Time for the fitting',
      note: note(`It’s time for the fitting. Start it when you’re with ${first}.`),
      bar: { ctaLabel: 'Start fitting', ctaAct: 'start-fitting', busy: busy === 'start', busyLabel: 'Starting…' } };
    case 'fitting': return { bar: { ctaLabel: 'Edit the job', ctaAct: 'edit-order' } };
    case 'waiting': return { bar: { ctaLabel: `Message ${first}`, ctaAct: 'message', secondaryLabel: 'Edit the order', secondaryAct: 'revise' } };
    case 'messaged': {
      /* D-112: Amara already answered → the move is Sarah's (the waiting layout) until she speaks again */
      const last = lastSpeakerSince(a, pv.sentAt);
      if (last?.from === 'tailor') return { bar: { ctaLabel: `Message ${first}`, ctaAct: 'message', secondaryLabel: 'Edit the order', secondaryAct: 'revise' } };
      return { bar: { ctaLabel: `Reply to ${first}`, ctaAct: 'message', secondaryLabel: 'Edit the order', secondaryAct: 'revise' } };
    }
    case 'in-progress': return { bar: { ctaLabel: 'Mark ready', ctaAct: 'mark-ready' } };
    case 'ready': return { bar: null };   // K-12 (D-237): Message lives in the header; nothing else is hers to do until Sarah chooses
    case 'handoff-pickup': return { bar: h.problemAt ? problemBar() : h.markedAt ? null : { ctaLabel: 'Picked up', ctaAct: 'picked-up' } };
    case 'handoff-dropoff': return { bar: h.problemAt ? problemBar({ secondaryLabel: 'Mark delivered again', secondaryAct: 'delivered' }) : h.markedAt ? null : { ctaLabel: 'Delivered', ctaAct: 'delivered' } };
    case 'handoff-courier': return { bar: null };   // default 6: the courier's delivery completes it
    default: return { ...base, bar: null };   // completed — K-20: the linen stage carries the title and the record line
  }
}

/** K-17 (D-242): the one strip that states each in-work state — tone (warn = waiting on Sarah · action = her move · done · calm), glyph, the line, an optional fact at the far end. */
function stripFor(key, a, v, pv) {
  const first = firstOf();
  const approved = !!a.priceChange?.changed && a.priceChange?.state === 'approved';
  switch (key) {
    case 'fitting': return { tone: 'action', icon: 'camera', text: 'Fitting now', right: fmtWhen(a.slot.start) };
    case 'waiting': return { tone: 'warn', icon: 'clock', text: `Waiting on ${first} to approve`, right: pv.sentAt ? `Sent ${fmtTime(pv.sentAt)}` : '' };
    case 'messaged': {
      const last = lastSpeakerSince(a, pv.sentAt);
      return last?.from === 'tailor'
        ? { tone: 'warn', icon: 'clock', text: `Waiting on ${first} to approve`, right: `You replied ${fmtTime(last.at)}` }
        : { tone: 'action', icon: 'chat', text: `${first} wants to talk about the order` };
    }
    case 'in-progress': return approved
      ? { tone: 'done', icon: 'check', text: `${first} approved · work in progress`, right: daysLeft(a) }
      : { tone: 'calm', icon: 'clock', text: 'In progress', right: daysLeft(a) };
    case 'ready': return { tone: 'warn', icon: 'clock', text: `Ready · ${first} is choosing how to get it back` };
    case 'handoff-pickup':
    case 'handoff-dropoff': {
      const h = a.handoff ?? {};
      const pickup = key === 'handoff-pickup';
      if (h.problemAt) return { tone: 'action', icon: 'chat', text: `${first} says she didn’t get it. Sort it out in chat.` };
      if (h.markedAt) return pickup ? { tone: 'done', icon: 'bag', text: 'Marked as picked up' } : { tone: 'done', icon: 'home', text: `Delivered · photo sent to ${first}` };
      if (!pickup) return { tone: 'action', icon: 'home', text: 'Home drop-off · agree on a time in chat' };
      const b = a.payments.balance;
      return { tone: 'done', icon: 'bag', text: b.state === 'held' && b.cents > 0 ? `In-store pickup · ${first}’s ${fmtExact(b.cents)} is on hold` : `In-store pickup · waiting for ${first}` };
    }
    default: { // courier
      const when = courierWhen(a);
      return { tone: 'done', icon: 'truck', text: `Courier booked${when ? ` · arrives ${when}` : ''} · completes on delivery` };
    }
  }
}
const STRIPPED = ['fitting', 'waiting', 'messaged', 'in-progress', 'ready', 'handoff-pickup', 'handoff-dropoff', 'handoff-courier'];

/** What changed + the payout if approved (waiting / messaged), under the header. K-17 R3: at most ONE quote, the latest — Sarah's message, or
    Amara's reply once she has answered it, else the note that went with the order. */
function priceBlocks(a, pv, key) {
  const first = esc(firstOf());
  const last = key === 'messaged' ? lastSpeakerSince(a, pv.sentAt) : null;   // M6-T-21: once Amara answered, the quote is her reply
  const latest = key === 'messaged' ? threadFor(a.tailorId).messages.filter((m) => m.from === 'customer' && (!pv.sentAt || m.at >= pv.sentAt)).pop() : null;
  const quote = last?.from === 'tailor' && last.text ? noteQuote({ label: 'Your reply', text: last.text })
    : latest?.text ? noteQuote({ label: `${firstOf()}’s latest message`, text: latest.text })
    : pv.note ? noteQuote({ label: 'Your note', text: pv.note }) : '';
  /* K-02 (D-183): a photo or comment changed after sending never reaches Sarah until the updated order is sent */
  const sentIds = [...new Set((a.priceChange?.lines ?? []).map((l) => l.garmentId))];
  const unsent = docsDiffer(a, sentIds) && ['pending', 'messaged'].includes(a.priceChange?.state)
    ? `<p class="t-small c-600 ${ID}__unsent" data-unsent>You changed photos or comments since you sent the order. Open the order and send it again so ${first} sees them.</p>` : '';
  return `${quote ? `<div class="${ID}__quote">${quote}</div>` : ''}
  ${sec(`${sectionHead('The order you sent', { id: `${ID}-sent` })}
  <div class="${ID}__summary">${changeSummary(pv.counts)}</div>
  ${unsent}
  ${changeList({ garments: withPhotos(pv.garments, a.job), docs: a.priceChange?.docs ?? null, commentLabel: 'Your comment', photoOwner: `${firstOf()}’s` })}`, { first: !quote, id: `${ID}-sent` })}
  ${sec(`${sectionHead('Your payout if approved', { id: `${ID}-take` })}
  ${tailorBreakdown(pv.after)}`, { id: `${ID}-take` })}`;
}

/** Study-1 A2–A3 under the header of a handoff: the drop-off photo she sent, the countdown once she marked it, and the unclaimed capture. */
function handoffNotes(a) {
  const h = a.handoff ?? {};
  const b = a.payments.balance;
  const items = returnedItems(a);
  const parts = [
    h.photo && a.returnOption === 'dropoff' ? deliveryPhoto({ photo: h.photo, type: items[0]?.type ?? '', by: 'you' }) : '',
    autoCompleteLine(autoCompleteLeft(a), { who: firstOf() }),
    b.state === 'captured' && b.captureReason === 'unclaimed'
      ? `<p class="t-body c-700 ${ID}__note" data-unclaimed>${esc(firstOf())}’s ${fmtExact(b.cents)} was charged after ${POLICY.UNCLAIMED_CAPTURE_D} days. You’re paid when she ${a.returnOption === 'pickup' ? 'picks it up' : 'gets it'}.</p>` : '',
  ].filter(Boolean);
  return parts.length ? sec(`<div class="${ID}__handoff">${parts.join('')}</div>`, { first: true }) : '';
}

/* ---------- K-20 (A2b) the completed job: the linen stage, then the payout flat, then the breakdown and The work ---------- */
const RETURN_DONE = { pickup: 'Picked up at your shop', dropoff: 'Dropped off at ', courier: 'Delivered by Taily courier' };
const doneAt = (a) => a.history.filter((h) => h.status === 'completed').pop()?.at ?? a.history[a.history.length - 1]?.at;
/** "Picked up at your shop · Thu, Oct 15" — how it went back and when: the stage's one line under the title. */
function returnedLine(a) {
  const how = a.returnOption ?? 'pickup';
  return `${how === 'dropoff' ? `${RETURN_DONE.dropoff}${firstOf()}’s` : RETURN_DONE[how]} · ${fmtDay(doneAt(a))}`;
}
/** Sarah's rating as ONE flat row (K-20 A2b): stars · "Sarah C. · Fri, Oct 16", then her line in quotes. Only once she has rated. */
function reviewLine(r) {
  const who = `${state.customer.first} ${(state.customer.last ?? '').charAt(0)}.`;
  return `<div class="${ID}__rev" role="group" aria-label="${esc(`${firstOf()}’s review`)}">
    <div class="${ID}__rev-row">${stars({ value: r.stars })}<p class="t-small ${ID}__rev-by">${esc(`${who} · ${fmtDay(r.date)}`)}</p></div>
    ${r.text ? `<p class="t-body w-500 ${ID}__rev-quote">“${esc(r.text)}”</p>` : ''}
  </div>`;
}
/** The payout of a completed job (D-172, K-20): "Your payout", the one sans figure, the transfer's state + date + bank with the ⓘ at the end of the
    line it explains; failed = the bank sent it back, with "Update bank details" directly under the error. Then Sarah's rating row (once she rated,
    never on a failed payout), then the breakdown without its total (the figure is the total, M6-P-33). */
function payoutBlock(a, t, extra = '') {
  const p = payoutOf(a);
  const w = p ? payoutLine(p, t.payouts) : null;
  const failed = p?.state === 'failed';
  const pill = p ? { pending: ['waiting', 'Pending'], paid: ['completed', 'Paid'], failed: ['declined', 'Didn’t go through'] }[p.state] : ['waiting', 'Pending'];
  const info = infoButton('payouts', { label: 'When you get paid' });
  const bank = `${p?.bank ?? t.payouts?.bank ?? 'Your bank'} •••• ${p?.last4 ?? t.payouts?.last4 ?? ''}`;
  /* M7-1-T-07: the pill already says Paid, so the line is the date and the bank */
  const line = w ? (p?.state === 'paid' ? w.text.replace(/^Paid\s+/, '') : w.text) : 'Arrives the Friday after the handoff';
  const stateRow = failed
    ? `<div class="${ID}__payout-state">${statusPill(...pill)}${info}</div>
  <p class="t-small ${ID}__err ${ID}__payout-err">${esc(`${bank} sent it back. It sends again once you update your bank details.`)}</p>
  <div class="${ID}__payout-fix">${cta('Update bank details', { attrs: 'data-act="fix-bank"' })}</div>`
    : `<div class="${ID}__payout-state">${statusPill(...pill)}<p class="t-small c-700">${esc(line)}</p>${info}</div>`;
  return `<section class="sec ${ID}__payout${failed ? '' : ` ${ID}__payout--live`}" aria-label="Your payout">
  <p class="t-caps c-600">Your payout</p>
  <p class="t-money ${ID}__payout-amt" data-money>${fmtExact(a.money.payout)}</p>
  ${stateRow}
  ${!failed && a.review ? reviewLine(a.review) : ''}
  <div class="${ID}__payout-rows">${tailorBreakdown(a.money, { total: false })}</div>
  ${extra}
</section>`;
}
/** The completed body: Sarah's 1-E linen stage with the garment tags (no woven label), then the payout block, then The work. Failed = calm. */
function completedBody(a, v, t, extra) {
  const failed = payoutOf(a)?.state === 'failed';
  const me = (t.name || 'there').split(' ')[0];
  const stage = linenStage({
    eyebrow: failed ? `${firstOf()}’s order` : a.handoff?.completedBy === 'auto' ? `Completed automatically · ${firstOf()}’s order` : `Job completed · ${firstOf()}’s order`,
    title: failed ? 'Job completed' : `Nice work, ${me}.`,
    line: returnedLine(a), rail: tagRail(returnedItems(a)), label: 'Job completed', calm: failed,
  });
  return `${navBackMark()}${stage}
  ${payoutBlock(a, t, extra)}
  ${workSec(a, v)}`;
}

function m4View(a, v, key) {
  const t = myTailor();
  const first = esc(firstOf());
  const pv = a.priceChange ? priceChangeView(a) : null;
  /* K-01 (D-120): only an approved order that CHANGED something claims the price moved; as booked reads plainly */
  const approved = !!a.priceChange?.changed && a.priceChange?.state === 'approved';
  const c = copyFor(key, a, t, v, pv);
  const stripped = STRIPPED.includes(key);
  const updated = approved ? `<p class="t-small c-600 ${ID}__fine">Price updated after the fitting.</p>` : '';
  const work = workSec(a, v);
  /* R4-2-T-04: every live state says when the money arrives; "can change" only until the price is settled */
  const fine = `<p class="t-small c-600 ${ID}__fine">Your payout arrives the Friday after ${esc(firstOf())} gets her order.${approved ? ' Price updated after the fitting.' : ''}</p>`;   // Study-1 A3: the handoff, not a tap of yours, completes the job
  const payout = payoutSec(a, v, fine);
  const block = (inner) => sec(inner, { first: true });
  const message = [{ label: 'Message', icon: ICON_CHAT, act: 'message', attrs: `aria-label="${esc(`Message ${firstOf()}`)}"` }];
  /* K-17 (D-242) option A, "strip-led": ONE flush strip states the state (no status line + title pair), then the header row — Sarah, and the one amount
     at the right with what it was under it (R2: kept under the amount) or her Message button — then one quote, then the content. */
  const strip = stripped ? requestStrip({ ...stripFor(key, a, v, pv), page: true }) : '';
  const person = { name: v.customer.name, initials: v.customer.initials, page: true };
  const head = (opts) => `${navBackMark()}${strip}${pageHead(requestHead({ ...person, ...opts }), { foot: opts.foot ?? [] })}`;
  const hero = stripped || key === 'completed' ? '' : statusHero({ variant: 'confirmed', pill: false, title: c.title, body: '', extra: c.note });
  let body;
  switch (key) {
    case 'visit': body = `${backHead(hero, a)}${block(visitCard(a, v))}${work}${payout}`; break;
    case 'fitting':
      body = `${head({ payoutCents: a.money.payout })}
  ${visitBlock([
    dueRows(a, `${plural(dayDiff(a.slot.start, a.job.needBy), 'day')} after the fitting`),
    { icon: 'camera', value: 'Take a before and a pinned photo of each item', detail: `Then send ${firstOf()} the final order` },
  ], { title: '' })}${personActions(message)}${work}${payout}`; break;
    case 'waiting':
    case 'messaged':
      body = `${head({ payoutCents: pv.after.payout, label: 'Your payout if approved', lines: [deltaText(pv.after.payout, pv.before.payout)],
        foot: [pv.changed ? `${firstOf()} sees a new total of ${fmtExact(pv.after.total)} (was ${fmtExact(pv.before.total)}).` : `${firstOf()} sees the total as booked, ${fmtExact(pv.before.total)}.`] })}
  ${priceBlocks(a, pv, key)}${fine}`; break;
    case 'in-progress':
      body = `${head({ payoutCents: a.money.payout })}
  ${visitBlock([dueRows(a, `Fitted ${fmtDay(a.slot.start)}`)], { title: '' })}${personActions(message)}${work}${payout}`; break;
    case 'ready':
      body = `${head({ trail: personButtons(message) })}
  ${sec(visitBlock(returnOffer(a).map((k) => ({ icon: RETURN_ICON[k], value: RETURN_LABEL[k] })), { title: 'Return options you offered' }))}
  <p class="t-small c-600 ${ID}__fine">${first} pays the ${fmtExact(a.money.balance)} balance, plus the courier if she picks it.</p>${work}${payout}`; break;
    case 'handoff-pickup':
      body = `${head({ trail: personButtons(message) })}${handoffNotes(a)}${sec(visitBlock(placeRows(t.shopName, 'bag', shopLine(t)), { title: 'In-store pickup' }))}${work}${payout}`; break;
    case 'handoff-dropoff':
      body = `${head({ trail: personButtons(message) })}${handoffNotes(a)}${sec(visitBlock(placeRows(`${firstOf()}’s home`, 'home', homeStreet()), { title: 'Home drop-off' }))}${work}${payout}`; break;
    case 'handoff-courier':
      body = `${head({ trail: personButtons(message) })}${handoffNotes(a)}${sec(visitBlock([{ icon: 'truck', value: esc(`${t.shopName} → ${homeStreet()}`), detail: `Paid by ${firstOf()} · nothing comes out of your payout` }], { title: 'Taily courier' }))}${work}${payout}`; break;
    default: body = completedBody(a, v, t, updated);   // completed (K-20)
  }
  return `${chrome('home', { persona: 'tailor' })}
<main class="body${c.bar ? ' body--with-bar' : ''} ${ID}" data-appt="${esc(a.id)}" data-s="${ID}--${key}">
  ${body}
</main>${c.bar ? actionBar(c.bar) : ''}`;
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
  <div class="${ID}__empty" data-empty="no-job">${emptyState({ title: 'No upcoming jobs', body, art: 'Suit Pant', ctaLabel: 'Go to Home', ctaAct: 'home' })}</div>
</main>`;
  }
  const v = requestView(a);
  const key = stateKey(a);
  if (key) return m4View(a, v, key);
  const h = heroCopy(a, v);
  const cancelled = a.status === 'cancelled';
  const last = a.history[a.history.length - 1];
  const sameDay = (x, y) => x.slice(0, 10) === y.slice(0, 10);
  const was = !cancelled && last?.status === 'rescheduled' && last?.from ? (sameDay(last.from, a.slot.start) ? fmtTime(last.from) : `${fmtDay(last.from)}, ${fmtTime(last.from)}`) : '';
  /* K16-2-03 (D-245): the reason she gave is a row of the Visit block with the chat tile, the same shape c-booking--cant-make-it shows Sarah */
  const reasonRow = cancelKind(a) === 'tailor-cant-make-it' && a.cancel?.note ? [{ icon: 'chat', value: esc(a.cancel.note), detail: 'Your reason' }] : [];
  const hero = statusHero({ variant: cancelled ? 'declined' : 'confirmed', pill: false, title: h.title, body: '', extra: h.note });
  return `${chrome('home', { persona: 'tailor' })}
<main class="body ${ID}" data-appt="${esc(a.id)}">
  ${backHead(hero, a)}
  ${sec(visitCard(a, v, { was, extra: reasonRow }), { first: true })}
  ${cancelled ? cancelMoney(a) : ''}
  ${workSec(a, v)}
  ${cancelled ? '' : payoutSec(a, v, `<p class="t-small c-600 ${ID}__fine">Your payout arrives the Friday after ${esc(firstOf())} gets her order.</p>`)}
  ${cancelled ? `<div class="page-actions">${textLink('Back to Home', { act: 'home' })}</div>` : ''}
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
  /* K-29 (Study-1 A5): inside CANCEL_WINDOW_H the sheet warns that Sarah is refunded and may not find someone else in time */
  const late = cancelTerms(a, now()).window === 'late';
  const warn = late ? banner({ tone: 'warning', text: `The visit is less than ${POLICY.CANCEL_WINDOW_H} hours away. ${esc(firstOf())} will be refunded her ${fmtExact(deposit)} deposit in full, and she may not find another tailor in time.` }) : '';
  sheetOverlay(`<div class="${ID}-sheet">
  ${warn}
  <p class="t-body c-700">${late ? `${esc(firstOf())} is told right away.` : `${esc(firstOf())} is told right away and gets her ${fmtExact(deposit)} deposit back in full.`} Her order stays saved so she can rebook.</p>
  ${chipGroup({ name: 'reason', label: `Reason (optional, shown to ${firstOf()})`, options: CANT_MAKE_IT_REASONS.map((r) => ({ value: r, label: r })), value: null })}
  <div class="${ID}-sheet__actions">
    ${cta('Cancel appointment', { variant: 'danger', busyLabel: 'Cancelling…', attrs: 'data-act="cant-ok"' })}
    ${cta('Keep the visit', { variant: 'secondary', attrs: 'data-act="cant-keep"' })}
  </div>
</div>`, { header: 'Cancel this appointment?', dataS: `${ID}--${late ? 'cancel-late' : 'cancel'}`, confirm: false }, (holder, close) => {
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
          if (r.ok) toast(`Appointment cancelled. ${firstOf()} has been refunded.`, { tone: 'success' });
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
  <p class="t-body c-700">It’s ${fmtTime(isoMinute(new Date(now())))}, ${plural(minutes, 'minute')} past the start. You’re paid ${fmtExact(noShowPayout(deposit))} in total for your time. ${esc(firstOf())}’s ${fmtExact(deposit)} deposit isn’t refunded.</p>
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


/* ---------- M4 actions ---------- */
/** Run a simulated-network action: the bar goes busy (verb, locked, aria-busy), then `work` applies it. */
function run(kind, work) {
  if (ui().busy) return;
  ui().busy = kind;
  go(ID);
  withLatency(() => {
    ui().busy = null;
    if (currentScreen() !== ID) return;
    work();
  });
}
const failToast = () => toast('Couldn’t save this. Try again.', { tone: 'error' });

function sheetReadyBody(a, keys, picked, { busy = false, error = false } = {}) {
  const t = myTailor();
  const first = esc(firstOf());
  const line = (k) => (k === 'pickup' ? `At ${t.shopName}, ${t.shop.street}` : k === 'dropoff' ? `You bring it to ${homeStreet()}` : `${firstOf()} pays the courier. It’s not taken from your payout.`);
  return `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  <p class="t-body c-700 ${ID}-sheet__intro">${first} is told right away, picks how to get it back from the options you tick, then pays the ${fmtExact(a.money.balance)} balance.</p>
  <fieldset class="${ID}-sheet__ways" data-ways>
    <legend class="t-small w-600 c-600">Return options for this order</legend>
    ${keys.map((k) => checkRow({ id: `ret-${k}`, label: RETURN_LABEL[k], caption: line(k), checked: picked[k] !== false, disabled: busy })).join('')}
    ${error ? `<p class="field__msg field__msg--error" role="alert" data-err>Tick at least one way to get it back.</p>` : ''}
  </fieldset>
  <div class="${ID}-sheet__actions">
    ${cta('Mark ready', { busy, busyLabel: 'Marking ready…', attrs: 'data-act="ready-ok"' })}
  </div>
</div>`;
}

function openMarkReady(a) {
  const t = myTailor();
  const keys = Object.keys(RETURN_LABEL).filter((k) => t.returns?.[k] === true);
  const picked = Object.fromEntries(keys.map((k) => [k, true]));
  sheetOverlay(sheetReadyBody(a, keys, picked), { header: 'Mark the order ready?', dataS: `${ID}--mark-ready`, confirm: false }, (holder, close) => {
    let busy = false;
    const paint = (error = false) => { holder.querySelector(`.${ID}-sheet`).outerHTML = sheetReadyBody(a, keys, picked, { busy, error }); };
    holder.addEventListener('change', (e) => {
      const m = /^ret-(.+)$/.exec(e.target.id ?? '');
      if (!m || busy) return;
      picked[m[1]] = e.target.checked;
      holder.querySelector('[data-err]')?.remove();
    });
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy) return;
      if (act === 'ready-ok') {
        const returns = keys.filter((k) => picked[k]);
        if (!returns.length) { paint(true); return; }
        busy = true; paint();
        withLatency(() => {
          const r = T.markReady(a.id, { returns });
          busy = false;
          close({ instant: true });
          if (currentScreen() !== ID) return;
          go(ID);
          if (r.ok) toast(`${firstOf()} has been told it’s ready.`, { tone: 'success' });
          else failToast();
        });
      }
    });
  });
}

/* ---------- Study-1 A3: Picked up (Sarah's code) · Delivered (a photo) ---------- */
function pickedUpBody({ code = '', error = '', busy = false } = {}) {
  return `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  ${codeInput({ id: 'handoff-code', length: HANDOFF_CODE_LEN, value: code, error, label: `${HANDOFF_CODE_LEN}-digit code`, helper: `${firstOf()} sees it on her booking.` })}
  <div class="${ID}-sheet__actions">
    ${cta('Confirm pickup', { busy, busyLabel: 'Confirming…', attrs: 'data-act="pickup-ok"' })}
    ${textLink('Customer doesn’t have the code?', { act: 'no-code', disabled: busy })}
  </div>
</div>`;
}
function openPickedUp(a) {
  const draft = { code: ui().code ?? '', error: '' };   // ui().code = the digits typed so far (kept if the sheet closes)
  sheetOverlay(pickedUpBody(draft), { header: `Enter ${esc(firstOf())}’s pickup code`, dataS: `${ID}--picked-up`, confirm: false }, (holder, close) => {
    let busy = false;
    const paint = () => {
      holder.querySelector(`.${ID}-sheet`).outerHTML = pickedUpBody({ ...draft, busy });
      holder.dataset.locked = String(busy);
      if (!busy) holder.querySelector('#handoff-code')?.focus();
    };
    holder.addEventListener('input', (e) => {
      if (e.target.id !== 'handoff-code') return;
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, HANDOFF_CODE_LEN);
      draft.code = e.target.value; ui().code = draft.code;
    });
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (busy || !act) return;
      if (act === 'no-code') {
        /* default 4: no code → mark it picked up; Sarah confirms, or it completes after HANDOFF_AUTO_H */
        busy = true; paint();
        withLatency(() => {
          const r = T.markHandedOver(a.id);
          busy = false; holder.dataset.locked = 'false';
          close({ instant: true });
          delete ui().code;
          go(ID);
          if (r.ok) toast(`Marked as picked up. ${firstOf()} can confirm, or it completes in ${POLICY.HANDOFF_AUTO_H}h.`);
          else failToast();
        });
      } else if (act === 'pickup-ok') {
        draft.code = holder.querySelector('#handoff-code')?.value ?? draft.code;
        const r0 = /^\d+$/.test(draft.code) && draft.code.length === HANDOFF_CODE_LEN;
        if (!r0) { draft.error = `Enter the ${HANDOFF_CODE_LEN}-digit code.`; paint(); return; }
        busy = true; draft.error = ''; paint();
        withLatency(() => {
          const r = T.confirmPickup(a.id, draft.code);
          busy = false; holder.dataset.locked = 'false';
          if (!r.ok) {
            draft.error = r.error === 'code-wrong' ? `That code doesn’t match. Ask ${firstOf()} to check her booking.` : `Enter the ${HANDOFF_CODE_LEN}-digit code.`;
            paint();
            return;
          }
          close({ instant: true });
          delete ui().code;
          go(ID);
          toast(`Done. ${firstOf()} has her order.`, { tone: 'success' });
        });
      }
    });
  });
}

function deliveredBody(a, { photo = false, tried = false, busy = false } = {}) {
  const type = returnedItems(a)[0]?.type ?? '';
  const err = tried && !photo;
  const slot = photo
    ? `<div class="${ID}-sheet__photo">${photoStub({ type, tone: a.handoff?.marks ?? 0, size: 'tile', alt: 'Drop-off photo' })}${textLink('Remove photo', { act: 'remove-delivery-photo', tone: 'danger', disabled: busy })}</div>`
    : `<div class="${ID}-sheet__rows attach-sheet__rows" role="group" aria-label="Add a photo"${err ? ' aria-describedby="delivered-err"' : ''}>
    ${listRow({ title: 'Take a photo', act: 'photo-camera', lead: ICON_CAMERA, chevron: false })}
    ${listRow({ title: 'Choose from library', act: 'photo-library', lead: ICON_IMAGE, chevron: false })}
  </div>
  ${err ? `<p class="field__msg field__msg--error" id="delivered-err" role="alert" data-err>Add a photo to mark it delivered.</p>` : ''}`;
  return `<div class="${ID}-sheet"${busy ? ' aria-busy="true"' : ''}>
  <p class="t-body c-700">Add a photo of the drop-off. ${esc(firstOf())} sees it.</p>
  ${slot}
  <div class="${ID}-sheet__actions">
    ${cta('Mark delivered', { busy, busyLabel: 'Saving…', attrs: 'data-act="delivered-ok"' })}
  </div>
</div>`;
}
function openDelivered(a) {
  const d = { photo: false, tried: false, busy: false };
  sheetOverlay(deliveredBody(a, d), { header: 'Mark as delivered', dataS: `${ID}--delivered`, confirm: false }, (holder, close) => {
    const paint = () => { holder.querySelector(`.${ID}-sheet`).outerHTML = deliveredBody(a, d); holder.dataset.locked = String(d.busy); };
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (d.busy || !act) return;
      if (act === 'photo-camera' || act === 'photo-library') { d.photo = true; paint(); }
      else if (act === 'remove-delivery-photo') { d.photo = false; paint(); }
      else if (act === 'delivered-ok') {
        if (!d.photo) { d.tried = true; paint(); holder.querySelector('[data-act="photo-camera"]')?.focus(); return; }
        d.busy = true; paint();
        withLatency(() => {
          const r = T.markHandedOver(a.id, { photo: true });
          d.busy = false; holder.dataset.locked = 'false';
          close({ instant: true });
          go(ID);
          if (r.ok) toast(`Marked delivered. ${firstOf()} has the photo.`, { tone: 'success' });
          else failToast();
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
  /* K-02: read-only Before | Pinned tabs and the viewer, from the same record the text above shows */
  wireGarmentDocs(root, {
    by: 'Taken by you',
    lookup: (gid) => {
      const g = a && requestView(a).garments.find((x) => x.id === gid);
      const docs = a ? docsFor(a, 'tailor')[gid] : null;
      const type = g?.type ?? a?.priceChange?.lines?.find((l) => l.garmentId === gid)?.garmentType ?? '';
      return docs ? { type, docs } : null;
    },
  });
  root.addEventListener('click', (e) => {
    if (e.target.closest('.screen-sheet--overlay')) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'message') go('t-thread');
    else if (act === 'home') go(personaHome('tailor'));
    else if (act === 'open-payout' && a) { setFocus(a.id); go('t-payout'); }
    else if (act === 'fix-bank') { state.ui['to-payouts'] = { from: 'earnings' }; go('to-payouts'); }   // K-20: the failed payout's fix, as t-payout
    else if (act === 'start-fitting' && a) {
      /* K-01 (B2): Start fitting lands straight on the editor */
      run('start', () => {
        const r = T.startFitting(a.id);
        if (!r.ok) { go(ID); failToast(); return; }
        state.ui['t-adjust'] = { apptId: a.id, mode: 'new' };
        go('t-adjust');
        toast('Fitting started', { tone: 'success' });
      });
    } else if ((act === 'edit-order' || act === 'revise') && a) {
      state.ui['t-adjust'] = { apptId: a.id, mode: act === 'edit-order' ? 'new' : 'revise' };
      go('t-adjust');
    } else if (act === 'mark-ready' && a) openMarkReady(a);
    else if (act === 'picked-up' && a) openPickedUp(a);
    else if (act === 'delivered' && a) openDelivered(a);
    else if (act === 'more' && a) openMoreMenu(moreItems(a) ?? [], { title: 'More' });
    else if (act === 'cant-make-it' && a) openCantMakeIt(a);
    else if (act === 'no-show' && a) {
      /* the menu lists it from the start; the sheet itself opens once the wait is over */
      const from = isoMinute(addMinutes(a.slot.start, POLICY.NO_SHOW_WAIT_MIN));
      if (now() < toDate(from).getTime()) toast(`You can mark a no-show from ${fmtTime(from)}.`);
      else openNoShow(a);
    }
  });
}

register(ID, view, wire);
