/* ============================================================
   t-job — T4 upcoming job (M3-spec §C2). Where, when, who — and the
   two things that can go wrong (she can't make it / Sarah doesn't
   show). Focal: the visit card, `fmtWhen(start)` over the full
   address. One filled CTA: Message Sarah. Cancelled jobs read
   plainly with the money outcome first and hide the street (D-88).

   M4 (M4-spec §C2, D-103): from the visit start the same screen walks
   the job — visit → fitting → waiting / messaged → in-progress →
   ready → returning (pickup / dropoff / courier) → completed. Each
   state has ONE next thing in a sticky action bar; "what I take home"
   is always in dollars; the courier is never her money.
   ============================================================ */
import { register, render as go, registered, personaHome, currentScreen } from '../app.js';
import { state, T, now, TERMINAL, justConfirmed, priceChangeView, returnOffer, threadFor, lastSpeakerSince, returnAddress, docsDiffer, docsFor } from '../state.js';
import { focusAppt, redirectIfMoved, statusWord, setFocus } from '../focus.js';
import { myTailor, requestView, jobAddress, payoutOf, inbox, payoutLine, courierWindow } from '../tailor-data.js';
import { CANT_MAKE_IT_REASONS, RETURN_LABEL } from '../data.js';
import { POLICY } from '../money-config.js';
import { fmtExact, noShowPayout } from '../money.js';
import { withLatency } from '../sim.js';
import { toDate, addMinutes, isoMinute, fmtWhen, fmtDay, fmtTime, dayDiff } from '../dates.js';
import {
  chrome, headingRow, statusHero, visitBlock, avatar, cta, listRow, banner, tailorBreakdown, moneyRows, workList,
  emptyState, sheetOverlay, chipGroup, wireChipGroups, toast, esc, wirePhotoViewer,
  actionBar, checkRow, metaRow, reviewRow, noteQuote, changeList, withPhotos, changeSummary, deltaFigure, courierCard, statusPill, wireGarmentDocs,
  sectionHead, textLink, infoButton, moreMenu, openMoreMenu, ICON_CHAT, ICON_DIRECTIONS, ICON_CALENDAR,
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
      note: `<p class="t-body c-700 ${ID}__note">We told ${first} and refunded her ${fmtExact(c.refund)} deposit. Nothing is paid out for this job.</p>${c.note ? `<p class="t-small c-600 ${ID}__note">Your reason: ${esc(c.note)}</p>` : ''}`,
    };
  }
  if (kind === 'no-show') {
    return {
      pill: 'cancelled', label: 'No-show', title: 'Marked as a no-show',
      note: `<p class="t-body c-700 ${ID}__note">${first} has been told, and her ${fmtExact(c.kept)} deposit isn’t refunded. You’re paid ${fmtExact(c.tailorPaid)} in total for your time.</p>`,
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
      pill: 'confirmed', label: 'Confirmed', title: `You accepted ${firstOf()}’s request`,
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
  return `<div class="${ID}__money">${moneyRows([{ label, cents: a.cancel.tailorPaid, kind: 'total', status: payoutLine(p).short }])}</div>`;
}

/* ---------- blocks ---------- */
/** D-173: Directions (home visits only; the street is hers to see once accepted) and Add to calendar (an .ics data link). M7: two quiet links. */
function visitLinks(a, v) {
  if (a.status !== 'confirmed') return '';
  const where = jobAddress(a);
  const stamp = (iso) => iso.replace(/[-:]/g, '').slice(0, 15);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Taily//Prototype//EN', 'BEGIN:VEVENT', `UID:${a.id}@taily.example`,
    `DTSTAMP:${stamp(isoMinute(new Date(now())))}00`, `DTSTART:${stamp(a.slot.start)}00`, `DTEND:${stamp(a.slot.end)}00`,
    `SUMMARY:${v.visitLabel} with ${v.customer.name}`, `LOCATION:${where.replace(/,/g, '\\,')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  /* a link that opens a map / downloads the .ics: textLink() with `href` */
  const link = (label, icon, href, attrs) => textLink(label, { icon, href, attrs });
  const maps = a.job.visitType === 'home'
    ? link('Directions', ICON_DIRECTIONS, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`, 'target="_blank" rel="noopener" data-act="directions"') : '';
  const cal = link('Add to calendar', ICON_CALENDAR, `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`, 'download="taily-visit.ics" data-act="add-to-calendar"');
  return `<div class="${ID}__links">${maps}${cal}</div>`;
}

function visitCard(a, v) {
  /* K-10 (D-235): icon rows — calendar (date + length), map-pin (place), clock (needed by) */
  const rows = [
    { icon: 'calendar', value: esc(fmtWhen(a.slot.start)), strong: true, detail: `${esc(v.visitLabel)} · ${v.minutes} min, until ${v.whenEnd}` },
    { icon: 'map-pin', value: esc(jobAddress(a)) },
    { icon: 'clock', value: `Needed by ${v.needBy}` },
  ];
  return `${visitBlock(rows, { title: 'Visit', flush: true })}${visitLinks(a, v)}`;
}

/** D-169: from the fitting on, the visit time is behind her. The block leads with the due date and how long she has;
    the fitting itself is one small line under it. Warning ink within a day. */
function dueCard(a, v) {
  const days = dayDiff(now(), a.job.needBy);
  const when = days < 0 ? `${plural(-days, 'day')} ago` : days === 0 ? 'today' : `in ${plural(days, 'day')}`;
  const fig = `<span class="${ID}__due${days <= 1 ? ` ${ID}__due--soon` : ''}">Needed by ${fmtDay(a.job.needBy)} · ${when}</span>`;
  return visitBlock([{ icon: 'clock', value: fig, strong: true, detail: `Fitting was ${fmtDay(a.slot.start)}` }], { title: 'Timing', flush: true });
}

/** The customer, flat: a circle avatar and the name (CP-T24: no "Customer" label). */
function customerRow(v) {
  return `<div class="${ID}__customer">
    ${avatar({ initials: v.customer.initials, size: 'sm' })}
    <div class="${ID}__customer-text"><span class="t-body w-600">${esc(v.customer.name)}</span></div>
  </div>`;
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
  if (t < startMs) items.push({ label: 'I can’t make it', sub: `Cancel this visit and refund ${firstOf()}`, act: 'cant-make-it', tone: 'danger' });
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
/** "2:00–2:30 PM" (D-160): the pickup window, one meridiem when both ends share it. */
function courierWhen(a) {
  const w = courierWindow(a);
  if (!w) return '';
  const [from, to] = [fmtTime(w.from), fmtTime(w.to)];
  const mer = (x) => x.slice(-2);
  return mer(from) === mer(to) ? `${from.slice(0, -3)}–${to}` : `${from}–${to}`;
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
  if (a.status === 'returning') return { dropoff: 'returning-dropoff', courier: 'courier' }[a.returnOption] ?? 'returning-pickup';
  return a.status; // fitting · in-progress · ready · completed
}

/** Hero copy + the action bar for each M4 state. */
function copyFor(key, a, t, v, pv) {
  const first = esc(firstOf());
  const word = statusWord(a, 'tailor');
  const note = (html) => `<p class="t-body c-700 ${ID}__note">${html}</p>`;
  const base = { pill: word.pill, label: word.label };
  const msg = { secondaryLabel: `Message ${first}`, secondaryAct: 'message' };
  const busy = ui().busy;
  const done = { ctaLabel: 'Mark completed', ctaAct: 'complete', busy: busy === 'complete', busyLabel: 'Completing…', ...msg };
  switch (key) {
    case 'visit': return { ...base, title: `Visit with ${esc(v.customer.name)}`,
      note: note(`It’s time for the fitting. Start it when you’re with ${first}.`),
      bar: { ctaLabel: 'Start fitting', ctaAct: 'start-fitting', busy: busy === 'start', busyLabel: 'Starting…', ...msg } };
    case 'fitting': return { ...base, title: `Fitting with ${esc(v.customer.name)}`,
      note: note(`Take a before and a pinned photo of each item, then send ${first} the final order.`),
      bar: { lead: `Your payout <b data-money>${fmtExact(a.money.payout)}</b>`, ctaLabel: 'Edit the job', ctaAct: 'edit-order', ...msg } };
    case 'waiting': return { ...base, title: `Waiting for ${first} to approve`,
      note: note(`You sent the final order at ${fmtTime(pv.sentAt)}. Start the work once ${first} approves.`),
      bar: { ctaLabel: `Message ${first}`, ctaAct: 'message', secondaryLabel: 'Edit the order', secondaryAct: 'revise' } };
    case 'messaged': {
      /* D-112: Amara already answered → the move is Sarah's (the waiting layout) until she speaks again */
      const last = lastSpeakerSince(a, pv.sentAt);
      if (last?.from === 'tailor') {
        return { ...base, title: `Waiting for ${first} to approve`,
          note: note(`You replied at ${fmtTime(last.at)}. ${first} can approve now, or you can edit the order.`),
          bar: { ctaLabel: `Message ${first}`, ctaAct: 'message', secondaryLabel: 'Edit the order', secondaryAct: 'revise' } };
      }
      return { ...base, title: `${first} wants to talk about the order`,
      note: note(`${first} messaged you instead of approving. Reply in chat, or edit the order.`),
      bar: { ctaLabel: `Reply to ${first}`, ctaAct: 'message', secondaryLabel: 'Edit the order', secondaryAct: 'revise' } };
    }
    case 'in-progress': return { ...base, title: 'Work in progress',
      note: note('Mark it ready when the work is done.'),
      bar: { ctaLabel: 'Mark ready', ctaAct: 'mark-ready', ...msg } };
    case 'ready': return { ...base, title: `Ready. Waiting for ${first}`,
      note: note(`${first} is choosing how to get it back, then pays the balance (${fmtExact(a.money.balance)}, plus the courier if she picks it). You’ll see the choice here.`),
      bar: { ctaLabel: `Message ${first}`, ctaAct: 'message' } };
    case 'returning-pickup': return { ...base, title: `${first} will pick it up`,
      note: note(`${first} paid the balance and will collect it at your shop. Mark the job completed when it’s handed over.`), bar: done };
    case 'returning-dropoff': return { ...base, title: `Drop it off at ${first}’s`,
      note: note(`${first} paid the balance. Agree on a time in chat, then mark the job completed when it’s delivered.`), bar: done };
    /* R4-2-T-07: the same "today" the customer reads ("Delivered by Uber today") */
    case 'courier': return { ...base, title: 'A courier picks it up today',
      note: note(`${first} paid and booked a Taily courier. Tap Handed to courier when it leaves your shop.`),
      bar: { ...done, ctaLabel: 'Handed to courier', busyLabel: 'Saving…' } };
    default: { // completed — R4-2-T-05: the record names whose job it was
      const at = a.history.filter((h) => h.status === 'completed').pop()?.at ?? a.history[a.history.length - 1]?.at;
      return { ...base, title: 'Job completed', note: note(`${first}’s order, completed ${fmtDay(at)}.`), bar: null };
    }
  }
}

/** What changed + the payout if approved (waiting / messaged). */
function priceBlocks(a, pv, key) {
  const first = esc(firstOf());
  let theirs = '';
  if (key === 'messaged') {
    const latest = threadFor(a.tailorId).messages.filter((m) => m.from === 'customer' && (!pv.sentAt || m.at >= pv.sentAt)).pop();
    if (latest?.text) theirs = noteQuote({ label: `${firstOf()}’s latest message`, text: latest.text });
  }
  /* M6-T-21: once Amara has answered Sarah's message, the quote is her reply, not the note she sent with the order */
  const last = key === 'messaged' ? lastSpeakerSince(a, pv.sentAt) : null;
  const mine = last?.from === 'tailor' && last.text ? noteQuote({ label: 'Your reply', text: last.text })
    : pv.note ? noteQuote({ label: 'Your note', text: pv.note }) : '';
  /* K-02 (D-183): a photo or comment changed after sending never reaches Sarah until the updated order is sent */
  const sentIds = [...new Set((a.priceChange?.lines ?? []).map((l) => l.garmentId))];
  const unsent = docsDiffer(a, sentIds) && ['pending', 'messaged'].includes(a.priceChange?.state)
    ? `<p class="t-small c-600 ${ID}__unsent" data-unsent>You changed photos or comments since you sent the order. Open the order and send it again so ${first} sees them.</p>` : '';
  const total = pv.changed
    ? `${first} sees a new total of ${fmtExact(pv.after.total)} (was ${fmtExact(pv.before.total)}).`
    : `${first} sees the total as booked, ${fmtExact(pv.before.total)}.`;
  return `<div class="${ID}__delta">${deltaFigure({ label: 'Your payout', cents: pv.after.payout, was: pv.before.payout })}
    <p class="t-small c-600 ${ID}__newtotal" data-money>${total}</p></div>
  ${theirs ? `<div class="${ID}__quote">${theirs}</div>` : ''}${mine ? `<div class="${ID}__quote">${mine}</div>` : ''}
  ${sec(`${sectionHead('The order you sent', { id: `${ID}-sent` })}
  <div class="${ID}__summary">${changeSummary(pv.counts)}</div>
  ${unsent}
  ${changeList({ garments: withPhotos(pv.garments, a.job), docs: a.priceChange?.docs ?? null, commentLabel: 'Your comment', photoOwner: `${firstOf()}’s` })}`, { first: true, id: `${ID}-sent` })}
  ${sec(`${sectionHead('Your payout if approved', { id: `${ID}-take` })}
  ${tailorBreakdown(pv.after)}`, { id: `${ID}-take` })}`;
}

/** The payout card of a completed job: the one display figure ("Your payout", D-172), the transfer's state and date, then the
    breakdown without its total (the figure above is the total, M6-P-33) and how it went back, inside the same card. */
const RETURN_DONE = { pickup: 'Picked up at your shop', dropoff: 'Dropped off at ', courier: 'Delivered by Taily courier' };
function payoutCard(a, t, extra = '') {
  const p = payoutOf(a);
  const w = p ? payoutLine(p, t.payouts) : null;
  const pill = p ? { pending: ['waiting', 'Pending'], paid: ['completed', 'Paid'], failed: ['declined', 'Didn’t go through'] }[p.state] : ['waiting', 'Pending'];
  /* M7-1-T-07: the pill already says Paid, so the line is the date and the bank */
  const line = w ? (p?.state === 'paid' ? w.text.replace(/^Paid\s+/, '') : w.text) : 'Arrives the Friday after you mark it completed';
  const link = p?.state === 'failed' ? `<div class="${ID}__payout-link">${textLink('See the payout', { act: 'open-payout' })}</div>` : '';
  const how = a.returnOption ?? 'pickup';
  const at = a.history.filter((h) => h.status === 'completed').pop()?.at ?? a.history[a.history.length - 1]?.at;
  const returned = `${how === 'dropoff' ? `${RETURN_DONE.dropoff}${firstOf()}’s` : RETURN_DONE[how]} · ${fmtDay(at)}`;
  return `<section class="sec sec--first ${ID}__payout" aria-label="Your payout">
  <div class="${ID}__payout-head"><p class="t-caps c-600">YOUR PAYOUT</p>${infoButton('payouts', { label: 'When you get paid' })}</div>
  <p class="t-display ${ID}__payout-amt" data-money>${fmtExact(a.money.payout)}</p>
  <div class="${ID}__payout-state">${statusPill(...pill)}<p class="t-small ${w?.tone === 'error' ? `${ID}__err` : 'c-700'}">${esc(line)}</p></div>${link}
  <div class="${ID}__payout-rows">${tailorBreakdown(a.money, { total: false })}</div>
  <div class="${ID}__returned">${metaRow('', esc(returned), { icon: { pickup: 'bag', dropoff: 'home', courier: 'truck' }[how] })}</div>${extra}
</section>`;
}

function m4View(a, v, key) {
  const t = myTailor();
  const first = esc(firstOf());
  const pv = a.priceChange ? priceChangeView(a) : null;
  /* K-01 (D-120): only an approved order that CHANGED something claims the price moved; as booked reads plainly */
  const approved = !!a.priceChange?.changed && a.priceChange?.state === 'approved';
  const c = copyFor(key, a, t, v, pv);
  const hero = statusHero({ variant: key === 'completed' ? 'ready' : 'confirmed', pill: c.pill, pillLabel: c.label, title: c.title, body: '', extra: c.note });
  const updated = approved ? `<p class="t-small c-600 ${ID}__fine">Price updated after the fitting.</p>` : '';
  const who = sec(customerRow(v));
  const work = workSec(a, v);
  /* R4-2-T-04: every live state says when the money arrives; "can change" only until the price is settled */
  const fine = `<p class="t-small c-600 ${ID}__fine">Your payout arrives the Friday after you mark the job completed.${approved ? ' Price updated after the fitting.' : ''}</p>`;
  const payout = payoutSec(a, v, fine);
  const banners = key === 'in-progress' && approved
    ? `<div class="${ID}__banner">${banner({ tone: 'success', text: `${first} approved your changes. Your payout is ${fmtExact(a.money.payout)}.` })}</div>` : '';
  const block = (inner) => sec(inner, { first: true });
  let body;
  switch (key) {
    case 'visit': body = `${block(visitCard(a, v))}${who}${work}${payout}`; break;
    case 'fitting': body = `${block(dueCard(a, v))}${who}${work}${payout}`; break;
    case 'waiting':
    case 'messaged': body = `${priceBlocks(a, pv, key)}${fine}`; break;
    case 'in-progress': body = `${banners}${block(dueCard(a, v))}${who}${work}${payout}`; break;
    case 'ready':
      body = `${block(visitBlock(returnOffer(a).map((k) => ({ icon: RETURN_ICON[k], value: RETURN_LABEL[k] })), { title: 'Return options you offered', flush: true }))}${who}${work}${payout}`; break;
    case 'returning-pickup':
      body = `${block(visitBlock(placeRows(t.shopName, 'bag', shopLine(t)), { title: 'In-store pickup', flush: true }))}${who}${work}${payout}`; break;
    case 'returning-dropoff':
      body = `${block(visitBlock(placeRows(`${firstOf()}’s home`, 'home', homeStreet()), { title: 'Home drop-off', flush: true }))}${who}${work}${payout}`; break;
    case 'courier':
      body = `${block(courierCard({ variant: 'tailor', window: courierWhen(a), from: t.shopName, to: homeStreet(), note: `Paid by ${firstOf()} · nothing comes out of your payout` }))}${who}${work}${payout}`; break;
    default: { // completed
      const r = a.review;
      const reviewer = `${state.customer.first} ${state.customer.last.charAt(0)}.`;
      body = `${payoutCard(a, t, updated)}
  ${workSec(a, v)}
  ${r
    ? sec(`${sectionHead(`${first}’s review`, { id: `${ID}-review` })}${reviewRow({ name: reviewer, initials: state.customer.initials, stars: r.stars, date: r.date, text: r.text, photos: r.photos, photoType: r.photoType ?? a.job.garments[0]?.type ?? '' })}`, { id: `${ID}-review` })
    : `<p class="t-small c-600 ${ID}__review">${first} can leave a review now.</p>`}
  <div class="page-actions">${textLink('Back to Home', { act: 'home' })}</div>`;
    }
  }
  return `${chrome('home', { persona: 'tailor' })}
<main class="body${c.bar ? ' body--with-bar' : ''} ${ID}" data-appt="${esc(a.id)}" data-s="${ID}--${key}">
  ${backHead(hero, a)}
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
  const nb = (t) => `<span class="${ID}__nb">${t}</span>`;
  const was = last?.from ? (sameDay(last.from, a.slot.start) ? fmtTime(last.from) : `${fmtDay(last.from)}, ${fmtTime(last.from)}`) : '';
  const moved = !cancelled && last?.status === 'rescheduled'
    ? `<div class="${ID}__banner">${banner({ tone: 'info', text: `${esc(firstOf())} moved this visit to ${nb(fmtWhen(a.slot.start))}${was ? ` (was ${nb(was)})` : ''}.` })}</div>` : '';
  const hero = statusHero({ variant: cancelled ? 'declined' : 'confirmed', pill: h.pill, pillLabel: h.label, title: h.title, body: '', extra: h.note });
  return `${chrome('home', { persona: 'tailor' })}
<main class="body ${ID}" data-appt="${esc(a.id)}">
  ${backHead(hero, a)}
  ${moved}
  ${sec(visitCard(a, v), { first: true })}
  ${cancelled ? cancelMoney(a) : ''}
  ${sec(customerRow(v))}
  ${workSec(a, v)}
  ${cancelled ? '' : payoutSec(a, v, `<p class="t-small c-600 ${ID}__fine">Your payout arrives the Friday after you mark the job completed.</p>`)}
  <div class="page-actions">${cancelled ? textLink('Back to Home', { act: 'home' }) : cta(`Message ${esc(firstOf())}`, { attrs: 'data-act="message"' })}</div>
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
  <p class="t-body c-700">${esc(firstOf())} is told right away and gets her ${fmtExact(deposit)} deposit back in full. Her order stays saved so she can rebook.</p>
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
    else if (act === 'complete' && a) {
      run('complete', () => {
        const r = T.markCompleted(a.id);
        go(ID);
        const p = payoutOf(a);
        if (r.ok) toast(`Job completed. ${fmtExact(a.money.payout)} is paid out ${p ? fmtDay(p.date) : 'on Friday'}.`, { tone: 'success' });
        else failToast();
      });
    }
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
