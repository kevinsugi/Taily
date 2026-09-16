/* ============================================================
   06A - Review & Approve Final Order — Figma 308:3171.
   SemiBold heading + 3-line sub, garments card with PostAppt
   cards (Before/Pinned photo rows) + fee rows, three-CTA bar.
   Gap 16.
   UX-LOOP R1-U-02: on live navigation the screen renders the
   appointment's reviewed order (a.garments / a.totals — written by the
   tailor's T05 Send or the user-side demo); the harness deep link
   keeps the frame's $200 fixture. Approve only stamps approvedAt.
   UX-LOOP round 7 (Kevin): rows Alterations / Visitation fee — paid /
   [Additional visitation fee — when the final item count re-tiered
   it, charged at handoff] / Total / Due at handoff (alterations + the
   added fee). R7-U-02: the added row says why — "Additional visitation
   fee — 5 items now, $50 tier" — with a fee-note under the rows ("Your
   order grew to 5 items, so the visitation fee is now $50. The extra
   $25 is charged with your alterations at handoff."). Figma sync
   pending (Default / Modified / Removed frames still draw Subtotal /
   -$20 Deposit / Due).
   ============================================================ */

import { register, render as go } from '../app.js';
import { chrome, cta, orderCards, orderRows, feeTierNote, apptRows, visitBlock, headingRow } from '../components.js';
import { money, fmtDay, SEED_UPCOMING } from '../data.js';
import { apptEntry, approveOrder, finalOrder, orderModified, isPostAppointment, isTerminal, canonicalStatus, statusScreen } from '../state.js';
import { openRequestChanges } from './04.1-request-changes.js';
import { wirePhotoViewer } from './03.3-photo-viewer.js';
import { currentAppt } from './03-status-confirmed.js';

/** Shared by 06A / 06B. `fixture` is the frame's order for the harness
    deep link; a live visit draws the appointment's own. */
export function viewReview(s, screenId, fixture) {
  const a = currentAppt(s);
  const live = window.__tailyNavigated && isPostAppointment(a);
  const o = live ? finalOrder(a) : fixture;
  const info = orderModified(o);
  const t = o.totals;
  const first = (a.name ?? 'Marco Tailor').split(' ')[0];
  /* R2-T-08: booked garments the tailor dropped at the visit, listed
     under the cards the way T05 shows them to Marco (frame: 04 -
     Review & Approve / Removed, round 3) */
  const removed = o.removed ?? [];   // the round-3 "Removed" frame's fixture carries its own
  return `${chrome('home')}
<div class="body" data-s="${screenId}">
  ${headingRow(`<div class="heading">
    <h1 class="t-title w-600 c-ink">Approve your final order.</h1>
    <p class="t-body w-500 c-500">Please review the final details and pricing before tailoring starts.${(o.garments ?? []).some((g) => g.added || g.addedJobs?.length) ? '<br><br>New items and services added during your appointment are shown in green below.' : ''}</p>
    ${live && a.resentAt ? `<p class="t-small w-500 c-success" data-resent>${first} updated the order on ${fmtDay(a.resentAt)}. Changes are highlighted below.</p>` : ''}
  </div>`)}
  <div class="garments-card">
    ${visitBlock(apptRows(a))}
    ${orderCards(o, { variant: 'PostAppt', marks: true })}
    ${removed.map((r) => `<div class="removed-row t-small c-500"><span>Removed at the visit — ${r.type} · ${(r.jobs ?? []).join(', ')}</span><s>${money(r.amount)}</s></div>`).join('\n    ')}
    ${orderRows(t, { feeDesc: 'Visitation fee — paid', due: 'Due at handoff', info, tier: true })}
    ${feeTierNote(t)}
  </div>
  <div class="cta-bar">
    ${cta('Approve Final Order', { attrs: 'data-act="approve"' })}
    ${cta('Request Changes', { variant: 'secondary', attrs: 'data-act="changes"' })}
  </div>
</div>`;
}

export function wireReview(root) {
  /* R5-U-01: 04 only makes sense while the order awaits approval. A stale
     04 reached through history (after approving) redirects to the status
     view; a terminal entry to 03/Cancelled. Deep links keep the fixture. */
  const cur = apptEntry();
  if (window.__tailyNavigated && cur && canonicalStatus(cur.status) !== 'awaiting-approval') {
    setTimeout(() => go(statusScreen(cur), { replace: true }), 0);
    return;
  }
  wirePhotoViewer(root);
  /* Phase R4 (Kevin): approving lands back on 04D with the order in
     'tailoring' (the home/bookings cards reflect it). */
  root.querySelector('[data-act="approve"]')?.addEventListener('click', () => { approveOrder(apptEntry()); go('03-status-tailoring', { replace: true }); });
  root.querySelector('[data-act="changes"]')?.addEventListener('click', () => openRequestChanges());
  root.querySelector('[data-act="bookings"]')?.addEventListener('click', () => go('09-bookings'));
  root.querySelectorAll('.top-nav [data-nav]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    go(el.dataset.nav === 'bookings' ? '09-bookings' : '01-home');
  }));
}

/* The frame's fixture: the booked $200 order, unchanged at the visit. */
const FIXTURE = { garments: SEED_UPCOMING[0].garments, totals: SEED_UPCOMING[0].totals };

register('04-review-approve', (s) => viewReview(s, '04-review-approve', FIXTURE), wireReview);
