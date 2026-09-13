/* ============================================================
   01 - Home — Figma 277:2653.
   Heading + 3x3 garment tile grid + Start Booking CTA + upcoming
   appointment card. Sections stack at gap 16 (measured).
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, garmentTile, cta, apptCard, toast } from '../components.js';
import { GARMENT_TYPES, SEED_UPCOMING, itemsLabel, itemCount, fmtDay, fmtWhen, parseWhen, tailorName as matchedName, tailorFirst } from '../data.js';
import { state, addGarment, isTerminal, canonicalStatus, statusScreen } from '../state.js';
import { openAddressOverlay } from './02.2-address-sheet.js';
import { openReschedulePopup, pointAtTerminal } from './03.1-reschedule-popup.js';
import { openLeaveReview, tailorName } from './06.1-leave-review.js';

const TILE_ORDER = Object.keys(GARMENT_TYPES); // 9 types, Figma order

/* v3: home tile taps build a type -> qty selection before booking. */
function selection() {
  state.ui ??= {};
  state.ui.homeSelection ??= {};
  return state.ui.homeSelection;
}

/** Meta line per status, as the v4 frames word it. */
/* v4 chain names normalise onto the card variants' v3 keys */
const CARD_STATUS = { searching: 'requested', 'ready-for-pickup': 'ready', delivered: 'completed' };
const cardStatus = (a) => CARD_STATUS[String(a?.status ?? '').toLowerCase()] ?? String(a?.status ?? '').toLowerCase();

/* UX-LOOP R1-U-06: each status names ITS date — the need-by while the
   tailor works, readyAt (stamped by markReady) once finished, the
   scheduled window after 05A/05B, the handoff day when delivered. The
   frames' fixtures (confirmed / a Ready card with no window / past
   cards) render exactly as before. */
/* R3-U-07c: live cards share 03's row grammar ("Thu, Sept 10 · 9:30
   AM"); the seeds keep the frames' own strings ("Sunday Jul 12, 7PM"). */
const isSeedWhen = (a) => SEED_UPCOMING.some((s) => s.when === a?.when);
const cardWhen = (a) => (isSeedWhen(a) ? a.when : fmtWhen(a.when, a.when));
/* R3-U-09: a ready date still ahead of today reads as a pickup date,
   not "since" */
const isFuture = (str) => { const p = parseWhen(str); const t = new Date(); t.setHours(23, 59, 59, 999); return !!p && p.date > t; };

export function apptMeta(a) {
  const f = a.fulfilment;
  const method = f?.method === 'delivery' ? 'Delivery' : 'Pickup';
  /* R6 (Kevin): no tailor name before one accepts — a request that
     ended unmatched names "a tailor", never Marco */
  const first = tailorFirst(a, 'a tailor');
  const map = {
    /* Phase R5: the Requested variant writes the prefixed form — R6:
       "Requested: …" while matching (frame variant edited to match).
       UX-LOOP R2-U-03: a proposed time takes the line over. */
    requested: a.proposed ? `New time proposed: ${fmtWhen(a.proposed.when)}` : `Requested: ${cardWhen(a)}`,
    /* Phase R1: confirmed cards show the bare date (was "Appt Date: …") */
    confirmed: cardWhen(a),
    'awaiting-approval': `Est. Ready Date: ${fmtDay(a.needBy)}`,
    tailoring: `Est. Ready Date: ${fmtDay(a.needBy)}`,
    /* UX-010: a Ready order isn't "Completed" (frame updated too).
       R2-U-02: the window label carries its date ("Fri, Jul 17 · 4–6 PM"). */
    ready: f ? `${method}: ${f.window}`
      : (a.readyAt && isFuture(a.readyAt) ? `Ready · pickup from ${fmtDay(a.readyAt)}` : `Ready since: ${a.readyAt ?? a.when}`),
    completed: `${f?.method === 'delivery' ? 'Delivered' : 'Picked up'}: ${a.deliveredAt ?? f?.window ?? a.when}`,
    /* UX-LOOP R2-U-04/05/07: terminal cards say why (no actions).
       R3-T-02c: a proposal that lapsed unanswered is named. */
    expired: a.lapsedProposal ? `Request expired · ${first}’s proposed time went unanswered` : 'Request expired · no tailor accepted',
    declined: `Declined by ${first}`,
    cancelled: a.cancelledBy === 'tailor'
      ? (a.reason === 'no-show' ? 'Missed appointment' : `Cancelled by ${first}`)
      /* R7: the unconfirmed auto-cancel (Taily, 12 hours before the visit) */
      : (a.reason === 'unconfirmed' ? 'Cancelled · visit not confirmed' : cardWhen(a)),
  };
  return map[cardStatus(a)] ?? a.when;
}

/* ---------- R3-U-03: what Home shows ----------
   The live card = the first entry in state.upcoming that is neither
   delivered nor terminal (list order is newest-first, so it is the
   customer's latest open booking; the seed's fiction dates are in the
   past, so a date sort would demote a fresh booking behind Jul 12).
   Above it, ONCE, today's terminal outcome (state.lastCancelled when it
   is `mine` and ended today) so a decline / expiry / tailor cancel is
   seen on the screen the persona flip lands on — dismissed after it
   was opened, or by the next transition (requestTailor resets it).
   Nothing live → the most recent delivered order under "Recent
   Appointment". The frame fixture (seed confirmed at boot) is the live
   card alone, unchanged. */
const today = () => fmtDay(new Date().toDateString());
const isLive = (a) => a && !isTerminal(a) && canonicalStatus(a.status) !== 'delivered';
export function homeCards(s) {
  const cards = [];
  const lc = s.lastCancelled;
  const seen = s.ui?.outcomeSeen;
  if (lc?.mine && isTerminal(lc) && lc.cancelledAt === today() && seen !== lc) {
    const i = s.past.indexOf(lc);
    cards.push({ a: lc, kind: 'outcome', ref: i >= 0 ? { list: 'past', index: i } : null });
  }
  const li = s.upcoming.findIndex(isLive);
  if (li >= 0) cards.push({ a: s.upcoming[li], kind: 'live', ref: { list: 'upcoming', index: li } });
  else {
    const di = s.upcoming.findIndex((a) => canonicalStatus(a?.status) === 'delivered');
    if (di >= 0) cards.push({ a: s.upcoming[di], kind: 'delivered', ref: { list: 'upcoming', index: di } });
  }
  return cards;
}

/** "3 Items Total - Home Visit:" — one rule for 01 and every 09 card
    (R1-U-19 singular, R1-U-22 visit type). UX-LOOP R2-U-08: once the
    tailor's final order is on file (`revisedAt`) the count is derived
    from the garments; the seed keeps its frame copy until revised. */
export const apptItemsTitle = (a, count = a.revisedAt ? itemCount(a) : a.count) => `${itemsLabel(count)} Total - ${a.visit}:`;

/** The card's item lines — the booking's `itemLines` until the final
    order is written, then `${qty} ${type} - ${jobs}` per garment. */
export function apptItemLines(a) {
  if (!a?.revisedAt || !a.garments?.length) return a?.itemLines ?? [];
  return a.garments.map((g) => `${g.qty ?? 1} ${g.type} - ${(g.jobs ?? []).join(', ')}`);
}

/** Where a tapped appointment card goes, by status. Shared with 09.
    UX-001: a Requested card returns to 03 (the matching status view) —
    it's also the only place the request can be cancelled. */
/* Phase R8 (Kevin): the card always opens its RESPECTIVE 03 status
   variant — Requested, Confirmed, Tailoring (also the ready state's
   home), or Summary. The ready card's Schedule Pickup / Delivery CTA
   still leads to 05. R1-U-20: cancelled / declined → 03/Cancelled. */
export function apptTarget(a) {
  /* round 10 (Kevin): one shared map — awaiting-approval opens 04 directly */
  return statusScreen(a);
}

/** Card actions per status (Figma variants). A scheduled Ready card
    offers to change the window instead (R1-U-06). */
export function apptActions(a) {
  const map = {
    /* R2-U-03: a proposed time gets one small CTA → 03/Requested */
    requested: a.proposed ? ['Review Time'] : [],
    confirmed: ['Message', 'Reschedule'],
    tailoring: ['Message'],
    ready: [a.fulfilment ? 'Change Pickup / Delivery' : 'Schedule Pickup / Delivery'],
    completed: ['Leave Review'],
  };
  return map[cardStatus(a)] ?? [];
}

/** Wire the small CTAs of one appointment card. `select()` points
    state.currentAppt at the card's appointment; shared by 01 and 09. */
export function wireCardActions(card, select, { onLeaveReview } = {}) {
  card.querySelectorAll('.cta-small').forEach((b) => {
    const label = b.textContent.trim();
    const on = (fn) => b.addEventListener('click', () => { select(); fn(); });
    if (label === 'Message') on(() => go('10-messages'));
    /* Phase R3 (Kevin): the card's Reschedule opens the R1 popup */
    if (label === 'Reschedule') on(() => openReschedulePopup());
    /* Phase R5 (Kevin): a Ready card's CTA leads to 07 (also to change
       an already-scheduled window) */
    if (label === 'Schedule Pickup / Delivery' || label === 'Change Pickup / Delivery') on(() => go('05-items-ready'));
    /* R2-U-03: review the tailor's proposed time on 03/Requested */
    if (label === 'Review Time') on(() => go('03-status-requested'));
    if (label === 'Leave Review' && onLeaveReview) on(onLeaveReview);
  });
}

export function view01(s) {
  const sel = s.ui?.homeSelection ?? {};
  const cards = homeCards(s);
  const anySelected = Object.values(sel).some((q) => q > 0);

  const tiles = TILE_ORDER.map((t) =>
    garmentTile(t, { qty: sel[t] ?? 0, attrs: `data-tile="${t}"` })).join('');

  const card = cards.map(({ a, kind }) => apptCard({
    status: kind === 'outcome' ? canonicalStatus(a.status) : a.status,
    month: a.month, day: a.day,
    name: matchedName(a),   // R6: "Matching you with a tailor" until one accepts
    meta: apptMeta(a),
    itemsTitle: apptItemsTitle(a),
    /* Phase R1: the 01 frame lists only two item lines under "3 Items
       Total" where 09 lists all three — built verbatim; raised. */
    items: apptItemLines(a).slice(0, 2),
    prepare: a.bring ?? [],
    actions: kind === 'outcome' ? [] : apptActions(a),
  })).join('\n  ');
  const heading = cards.some((c) => c.kind === 'live') || !cards.length ? 'Upcoming Appointments' : 'Recent Appointment';

  return `${chrome('home')}
<div class="body" data-s="01-home">
  <div class="home-heading">
    <h1 class="t-title t-title--tight c-ink">${anySelected ? 'Tap to Add More Items' : 'What Are We Tailoring?'}</h1>
    <p class="t-body c-ink home-address" data-act="address" role="button" tabindex="0"><span class="emoji">📍</span> <span data-addr-text>${s.contact.street}, ${s.userLoc}</span></p>
  </div>
  <div class="tile-grid">${tiles}</div>
  ${cta('Start Booking', { attrs: 'data-act="start-booking"' })}
  <div class="upcoming-header">
    <span class="t-section c-500">${heading}</span>
  </div>
  ${card}
</div>`;
}

export function wire01(root) {
  root.querySelectorAll('[data-tile]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const t = el.dataset.tile;
      const sel = selection();
      // v3: the tile adds one; its "−" removes one (unselects at 0).
      if (e.target.closest('[data-minus]')) {
        sel[t] = Math.max(0, (sel[t] ?? 0) - 1);
        if (sel[t] === 0) delete sel[t];
      } else {
        sel[t] = (sel[t] ?? 0) + 1;
      }
      go('01-home', { replace: true });
    });
  });
  root.querySelector('[data-act="start-booking"]')?.addEventListener('click', () => {
    /* v3 startBooking, but reconciling instead of rebuilding: garments
       customised on 02 (services, qty, photos) survive the
       "+ Additional Garment" round-trip. Tile counts are the truth —
       top up with default-job cards, trim from the last card of a
       type, drop deselected types. */
    const sel = selection();
    /* UX-LOOP R1-U-12: nothing selected books nothing — stay put (no
       disabled CTA variant exists in Figma; the toast says why) */
    if (!Object.values(sel).some((q) => q > 0)) { toast('Pick a garment to start'); return; }
    for (const [type, want] of Object.entries(sel)) {
      if (want <= 0) continue;
      let have = state.garments.filter((g) => g.type === type).reduce((s, g) => s + g.qty, 0);
      if (want > have) addGarment({ type, jobs: ['Hem / Adjust Length'], qty: want - have, photos: 0 });
      for (let i = state.garments.length - 1; i >= 0 && have > want; i--) {
        const g = state.garments[i];
        if (g.type !== type) continue;
        const cut = Math.min(g.qty, have - want);
        g.qty -= cut;
        have -= cut;
        if (!g.qty) state.garments.splice(i, 1);
      }
    }
    state.garments = state.garments.filter((g) => (sel[g.type] ?? 0) > 0);
    go('02-appointment-details');
  });
  /* The cards open their appointment (R3-U-03: today's outcome card,
     then the live one — same refs homeCards() rendered): ready →
     pickup options (07), completed → order summary (04e), requested →
     back to 03, terminal → 03/Cancelled, otherwise the detail (04d).
     Inner buttons keep their actions. */
  const cards = homeCards(state);
  root.querySelectorAll('.appt-card').forEach((card, i) => {
    const c = cards[i];
    if (!c) return;
    const appt = () => (c.ref ? state[c.ref.list][c.ref.index] : c.a);
    const select = () => {
      if (c.kind === 'outcome') { state.ui ??= {}; state.ui.outcomeSeen = c.a; pointAtTerminal(c.a); }
      else state.currentAppt = c.ref;
    };
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const target = apptTarget(appt());
      if (!target) return;
      select();
      go(target);
    });
    wireCardActions(card, select, {
      /* R3-U-04: Leave Review works like 09's (once per appointment) */
      onLeaveReview: () => {
        const a = appt();
        if (a?.review) { toast(`You already reviewed ${tailorName(a).split(' ')[0]}`); return; }
        openLeaveReview();
      },
    });
  });
  root.querySelector('[data-act="address"]')?.addEventListener('click', () => openAddressOverlay());
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (el.dataset.nav === 'bookings') go('09-bookings');
      if (el.dataset.nav === 'home') go('01-home');
    });
  });
}

register('01-home', view01, wire01);
