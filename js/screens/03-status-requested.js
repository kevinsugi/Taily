/* ============================================================
   03 - Finding Your Tailor — Figma 281:1237.
   Map (ref raster) + Requested hero + request meta card +
   View All Appointments CTA + accent cancel line. Gap 8.
   State: the searching appointment (post-request).
   Phase R3 (Kevin): the request card reads the ACTUAL order — address/
   visit, requested time and items/estimate/fee come from state, so
   it matches whatever was booked. The frame's requested-time fixture
   ('Thu, Jul 9 · 9:30 AM') is stale — text-parity ALLOWs it; the
   address and estimate lines match the frame since UX-LOOP R1
   (Home Visit fiction, $200 / $20 seeded order). Cancel request opens
   the R1 popup. R7 (Kevin): the visitation fee is a HOLD until a
   tailor accepts (02.3's copy) — "$25 visitation fee held" here, the
   cancel line reads "nothing has been charged" (Figma sync pending).
   UX-LOOP R2-U-03 (round 3: frame "03 - Order Status / New Time" +
   route 03-status-new-time): when the tailor
   proposed another time (`a.proposed`) the hero becomes the
   `new-times` variant — "Marco proposed a new time" + Accept New Time
   (→ 03/Confirmed) / Keep Looking (proposal cleared, still searching)
   above the cancel line; the 01/09 card says "New time proposed: …".
   R2-U-04: an expired request re-routes to 03/Cancelled.
   DEMO affordances (never on the harness deep link): tapping the hero
   pill = "Marco proposes the next day, 11 AM"; tapping the "2 hours"
   line = time passes → the request expires.
   UX-LOOP round 6 (Kevin): no tailor name before a tailor accepts —
   the request card leads with the ✂ avatar + "Matching you with a
   tailor" (requestCard), the proposal hero reads "A tailor proposed a
   new time … They can do …", and the "2 hours" line is in the frame
   (rendered on the deep link too; the expiry tap stays live-only).
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, statusHero, infoCard, metaRow, cta } from '../components.js';
import { money, itemsLabel, itemCount, fmtWhen, fmtDay, shiftDay, parseWhen, proposalDays, proposalHours, tailorName, tailorInitials } from '../data.js';
import {
  state, tailorAccepts, bookingLines, isTerminal,
  proposeTime, acceptProposedTime, declineProposedTime, expireAppointment,
} from '../state.js';
import { ensureGarments } from './02-appointment-details.js';
import { openReschedulePopup, pointAtTerminal } from './03.1-reschedule-popup.js';
import { currentAppt } from './03-status-confirmed.js';

const live = () => !!window.__tailyNavigated;

/** DEMO: the day after the requested time, 11:00 AM, in the 02.1 pill
    grammar ("Sept 10, 11:00 AM") so it parses everywhere. R3-U-02:
    capped at the last day the tailor could propose (proposalDays —
    the need-by day); when that is the requested day itself the demo
    proposes a later slot the same day. R4-U-03: on the need-by day the
    hour respects the same cap Marco's wheel has (proposalHours) — the
    latest slot before the need-by time when 11 AM is past it. Returns
    null when there is nothing left to propose (proposalDays = []). */
function nextDayEleven(a) {
  const days = proposalDays(a);
  if (!days.length) return null;
  const last = days[days.length - 1];                       // "Fri 11 Sept"
  const next = shiftDay(a?.when, 1) ?? shiftDay(new Date().toDateString(), 1);   // "Thu, Sept 10"
  const cap = fmtDay(last.replace(/^(\w+) (\d+) (\w+)$/, '$1, $3 $2'));
  const day = (parseWhen(cap) && parseWhen(next) && parseWhen(cap).date < parseWhen(next).date) ? cap : next;
  const md = day.replace(/^\w+, /, '');
  const row = day.replace(/^(\w+), (\w+) (\d+)$/, '$1 $3 $2');   // wheel-row grammar for proposalHours
  const hours = proposalHours(a, row);
  const slot = (h) => `${md}, ${h.replace(' ', ':00 ')}`;         // '11 AM' → 'Sept 11, 11:00 AM'
  const pref = hours.includes('11 AM') ? '11 AM' : hours[hours.length - 1];
  if (!pref) return null;
  if (fmtWhen(slot(pref)) !== fmtWhen(a?.when)) return slot(pref);
  const alt = hours.includes('2 PM') ? '2 PM' : hours.find((h) => h !== pref);
  return alt ? slot(alt) : null;
}

/** The 01/09 card badge follows the (new) appointment day. */
function stampBadge(a) {
  const p = parseWhen(a?.when);
  if (!p) return;
  a.month = p.mon.slice(0, 3).toUpperCase();
  a.day = String(p.day);
}

/** Exported: `03-status-new-time` (round 3 frame "03 - Order Status /
    New Time") renders the proposed-time state with a `forced` appointment. */
export function viewRequested(s, forced = null) {
  /* direct load (diff harness): seed 02's garments so the estimate has
     something to price */
  ensureGarments();
  const t = bookingLines(null);
  const n = s.garments.reduce((sum, g) => sum + g.qty, 0);
  const a = forced ?? (live() ? currentAppt(s) : null);
  const proposed = a?.proposed?.when ?? null;
  /* R3-U-02: the proposal is bounded by the need-by (proposeTime) —
     the hero says so, so the trade-off is visible.
     R6 (Kevin): no tailor name before matching — the proposing tailor
     stays anonymous ("A tailor proposed a new time … They can do …"). */
  const needBy = a?.needBy ? ` Your need-by stays ${fmtDay(a.needBy)}.` : '';
  const hero = proposed
    ? statusHero({ variant: 'new-times', title: 'A tailor proposed a new time', body: `Your ${fmtWhen(a.when)} slot isn’t free. They can do ${fmtWhen(proposed)}.${needBy}` })
    : statusHero({ variant: 'requested', title: 'Finding your tailor…', body: 'We’re matching your job with a Taily-certified tailor near you. We’ll notify you the moment one accepts.' });
  /* R3-U-01: the request card reads the APPOINTMENT once one exists —
     a second unsent booking on the form no longer rewrites it. The
     harness deep link (no navigation yet) keeps the form fixture. */
  const req = live() && a?.totals ? a : null;
  const rows = req
    ? [
      metaRow('◉', `${req.place} — ${req.visit}`),
      metaRow('▤', fmtWhen(req.when, req.when)),
      /* R7: the held visitation fee (the tier for the booked count) —
         round 10 (Kevin): its own row under the items / estimate */
      metaRow('✂', `${itemsLabel(itemCount(req), 'item')} · ${money(req.totals.alterations)}.00+ est.`),
      metaRow('🏠', `${money(req.totals.visitFee)} visitation fee`),
    ]
    : [
      metaRow('◉', `${s.contact.street}, ${s.contact.unit} — ${s.appt.where}`),
      metaRow('▤', s.appt.when ?? fmtWhen(s.upcoming[0]?.when, 'Select Time')),
      metaRow('✂', `${itemsLabel(n, 'item')} · ${money(t.alterations)}.00+ est.`),
      metaRow('🏠', `${money(t.visitFee)} visitation fee`),
    ];
  /* the acceptance window (the tailor side's timer twin) — R6: in the
     frame too (under the hero); tapping it live is the "time passes" demo */
  const window2h = !proposed
    ? `<p class="t-body c-500" data-act="expire" role="button" tabindex="0">Tailors have up to 2 hours to accept your request.</p>`
    : '';
  const actions = proposed
    ? `${cta('Accept New Time', { attrs: 'data-act="accept-time"' })}
  ${cta('Keep Looking', { variant: 'secondary', attrs: 'data-act="keep-looking"' })}`
    : '';   // round 10 (Kevin): no View All Appointments on the 03 family
  return `${chrome('home')}
<div class="body" data-s="03-status-requested">
  ${hero}
  ${window2h}
  <!-- Placeholder per Kevin: this becomes a live Google Map centred on
       the user's location. The frame's raster is deliberately not used.
       Phase R8: the frame now leads with the Status Hero, map second. -->
  <div class="map-card map-card--placeholder" data-act="map">
    <span class="map-card__pin">◉</span>
    <span class="t-small c-500">Map preview — connects to Google Maps</span>
  </div>
  ${infoCard(rows.join(''))}
  ${actions}
  <button type="button" class="cancel-line" data-act="cancel">Cancel request — nothing has been charged</button>
</div>`;
}

export function wire(root) {
  const a = live() ? currentAppt(state) : null;
  /* R2-U-04: status-driven — a request that already ended (expired
     while the customer was away, declined) shows its 03/Cancelled */
  if (a && isTerminal(a)) {
    setTimeout(() => { pointAtTerminal(a); go('03-status-cancelled', { replace: true }); }, 0);
    return;
  }
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  /* Phase R3 (Kevin): cancel request runs through the R1 popup —
     cancel-worded (UX-003) */
  root.querySelector('[data-act="cancel"]')?.addEventListener('click', () => openReschedulePopup('cancel'));
  /* demo affordance: tapping the map simulates the tailor accepting.
     R3-U-05: a status screen REPLACES the one it supersedes (03 is one
     family) — back never lands on a stale "Finding your tailor…" */
  root.querySelector('[data-act="map"]')?.addEventListener('click', () => { tailorAccepts(a ?? undefined); go('03-status-confirmed', { replace: true }); });
  /* R2-U-03: the proposal's answers */
  root.querySelector('[data-act="accept-time"]')?.addEventListener('click', () => {
    if (!a?.proposed) return;
    acceptProposedTime(a.proposed.when, a);
    stampBadge(a);
    go('03-status-confirmed', { replace: true });
  });
  root.querySelector('[data-act="keep-looking"]')?.addEventListener('click', () => {
    declineProposedTime(a);
    go('03-status-requested', { replace: true });
  });
  if (a) {
    // DEMO: the hero pill = "Marco proposes the next day, 11 AM"
    root.querySelector('.status-hero .pill')?.addEventListener('click', () => {
      if (a.proposed) return;
      /* R4-U-03: nothing before the need-by is left to propose — the
         same case T03A's "no later slot to offer" line covers */
      if (!proposeTime(a, nextDayEleven(a))) return;
      go('03-status-requested', { replace: true });
    });
    // DEMO: the "2 hours" line = time passes → the request expires
    root.querySelector('[data-act="expire"]')?.addEventListener('click', () => {
      expireAppointment(a);
      pointAtTerminal(a);
      go('03-status-cancelled', { replace: true });
    });
  }
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

register('03-status-requested', viewRequested, wire);
