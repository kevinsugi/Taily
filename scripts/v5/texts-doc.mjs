/* ============================================================
   docs/v5/TEXTS.md — the text catalogue as a readable table, generated from js/texts.js (pre-MVP A1, D-02 / DG-2 A).
   Each row's words are rendered against a real appointment driven to the moment the text goes out (driveTo + the model's own
   transitions), with the "Taily: " prefix every text carries and a <link> placeholder for its unique taily.app/r/… link.
   Run: node scripts/v5/texts-doc.mjs
   ============================================================ */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXT_EVENTS, textCtx } from '../../js/texts.js';
import { POLICY } from '../../js/money-config.js';
import * as S from '../../js/state.js';
import { driveTo } from '../../js/fixtures/common.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { state } = S;

/* the moment each text goes out (driveTo target + options); everything else uses a booked, paid pickup */
const AT = {
  'request-sent': ['requested'], request: ['requested'], 'request-soon': ['requested'], expired: ['expired'],
  accepted: ['confirmed'], suggested: ['suggested'], declined: ['declined'], 'suggestion-ended': ['suggested'], 'suggestion-accepted': ['confirmed'],
  withdrawn: ['requested'], switched: ['suggested'],
  reminder: ['confirmed', {}, '2026-10-14T15:00'], nudge: ['confirmed', {}, '2026-10-15T11:00'], 'auto-cancel': ['confirmed', {}, '2026-10-15T14:00'], 'auto-cancel-t': ['confirmed', {}, '2026-10-15T14:00'],
  'cant-make-it': ['confirmed'], 'cancelled-early': ['confirmed'], 'cancelled-late': ['confirmed', {}, '2026-10-15T09:00'], rescheduled: ['confirmed'],
  'tailor-move': ['confirmed'], 'move-accepted': ['confirmed'], 'move-kept': ['confirmed'],
  'tailor-on-way': ['confirmed', {}, '2026-10-15T16:20'], 'tailor-here': ['confirmed', {}, '2026-10-15T16:58'], 'customer-on-way': ['confirmed', { visitType: 'shop' }, '2026-10-15T16:20'], 'customer-here': ['confirmed', { visitType: 'shop' }, '2026-10-15T16:58'],
  'start-soon': ['confirmed', {}, '2026-10-15T16:00'], 'fitting-started': ['confirmed', {}, '2026-10-15T17:00'],
  'visit-check': ['confirmed', {}, '2026-10-15T19:00'], 'visit-check-t': ['confirmed', {}, '2026-10-15T19:00'], 'visit-closed': ['confirmed', {}, '2026-10-16T19:00'], 'visit-closed-t': ['confirmed', {}, '2026-10-16T19:00'],
  'no-show-marked': ['no-show'], 'no-show-disputed': ['no-show'], 'tailor-no-show': ['tailor-no-show'], 'no-show-disputed-c': ['tailor-no-show'],
  'final-order': ['price-change'], 'final-order-updated': ['price-change'], 'final-order-24h': ['price-change'], 'final-order-72h': ['price-change'], 'final-order-review': ['price-change'], 'final-order-review-t': ['price-change'], 'final-approved': ['in-progress'],
  'edit-sent': ['edit-pending'], 'edit-24h': ['edit-pending'], 'edit-72h': ['edit-pending'], 'edit-withdrawn': ['edit-pending'], 'edit-approved': ['edit-approved'],
  ready: ['ready'], 'ready-24h': ['ready'], 'ready-72h': ['ready'], 'ready-default': ['ready'], 'ready-default-t': ['ready'],
  'courier-on-way': ['awaiting-handoff', { returnOption: 'courier' }], 'courier-booked': ['awaiting-handoff', { returnOption: 'courier' }], delivered: ['awaiting-handoff', { returnOption: 'courier' }, '2026-10-16T17:12'],
  'delivery-failed': ['awaiting-handoff', { returnOption: 'courier' }], 'delivery-failed-t': ['awaiting-handoff', { returnOption: 'courier' }], 'delivery-missing-t': ['completed', { returnOption: 'courier' }],
  'pickup-today': ['awaiting-handoff', {}, '2026-10-16T15:30'], 'missed-pickup': ['awaiting-handoff', {}, '2026-10-16T18:00'],
  completed: ['completed'], 'job-done-t': ['completed'], 'review-reminder': ['completed'], 'new-review': ['reviewed'],
  'payout-sent': ['completed'], 'payout-failed': ['completed'],
};

function ctxFor(id) {
  const [target, opts = {}, clock] = AT[id] ?? ['awaiting-handoff'];
  S.reset();
  const a = driveTo(target, opts);
  if (clock) S.setClock(clock);
  const t = S.tailorById(a.tailorId);
  const pv = a.priceChange ? S.priceChangeView(a) : null;
  const ev = a.edit ? S.jobEditView(a) : null;
  const slot = a.handoff?.slot ?? S.handoffSlots(a, a.returnOption ?? 'pickup')[0] ?? null;
  const moveTo = S.moveSlots(a).find((x) => x.startsWith('2026-10-17')) ?? null;
  return textCtx({
    a, t, cust: state.customer, now: S.now(),
    x: {
      total: pv?.after.total ?? ev?.after.total ?? a.money.total, was: pv?.before.total, charged: a.payments.balance.cents || a.money.balance,
      payout: ev?.after.payout ?? a.money.payout, cents: a.money.payout, bank: t.payouts?.bank, last4: t.payouts?.last4, stars: 5,
      start: id === 'suggested' ? a.suggested?.start : moveTo ?? a.slot.start, slot, at: S.nowIso(), to: 'lobby', date: 'Mar 1, 2027',
    },
  });
}

const esc = (s) => String(s).replace(/\|/g, '\\|');
const LAND = (r) => r.land ?? 'the appointment’s own screen (statusScreen)';
const rows = (who) => TEXT_EVENTS.filter(([, r]) => r.to === who).map(([id, r], i) => `| ${i + 1} | \`${id}\` | ${esc(`Taily: ${r.body(ctxFor(id))} <link>`)} | ${esc(r.trigger)} | ${esc(LAND(r))} | ${r.owner ?? 'A1'} |`).join('\n');
const head = '| # | Event | Text (exactly as sent) | When it goes out | Link lands on | Fired by |\n|---|---|---|---|---|---|';
const nC = TEXT_EVENTS.filter(([, r]) => r.to === 'customer').length;
const nT = TEXT_EVENTS.filter(([, r]) => r.to === 'tailor').length;

const md = `# Taily text catalogue (pre-MVP A1 · D-02 / DG-2 A · K-43 D-301 · K-48.4)

Generated from \`js/texts.js\` by \`node scripts/v5/texts-doc.mjs\` — do not edit by hand. ${nC + nT} texts: ${nC} to the customer, ${nT} to the tailor.

**Rules.** When the text service is connected, every notification is a text message (SMS) with its own unique link into the web app
(\`taily.app/r/XXXXXX\`, shown here as \`<link>\`), for both people, no exceptions. Every text starts with "Taily: ". **No quiet hours**
(K-48.4): a text goes out the moment its event happens, at any hour. Each event fires through one function, \`state.js notify(appt, event)\`,
which records it in \`state.outbox\`: sent when the person's texts are on, otherwise held back as \`off\` — the app shows the same news (the
in-app fallback). Booking texts are the customer's own opt-in (an unticked box at sign-up, Account → Texts); a STOP reply turns texts off,
START (or the switch) back on with a confirmation text. Sign-in codes always go. The K-43 auto-cancel happens only after a **delivered**
reminder to an opted-in number; otherwise the plain ${POLICY.CANCEL_WINDOW_H}-hour rule applies.

**Timings (POLICY, js/money-config.js).** Tailor start reminder ${POLICY.START_REMIND_MIN} minutes before the visit; at the start time ONE text,
"Your fitting has started. Please take all notes here:" (it replaces a second start reminder, so she never gets two at once). Chat: a text for
the first unread message, then at most one per conversation every ${POLICY.CHAT_TEXT_GAP_MIN} minutes while messages stay unread. Waiting
states: reminders at ${POLICY.WAIT_REMIND_1_H} h and ${POLICY.WAIT_REMIND_2_H} h; a final order unanswered ${POLICY.FINAL_ORDER_REVIEW_D} days goes to Taily review;
a ready order with no way back for ${POLICY.READY_DEFAULT_D} days defaults to in-store pickup; the unclaimed charge on day ${POLICY.UNCLAIMED_CAPTURE_D};
an uncollected order closes ${POLICY.ABANDONED_CLOSE_D} days after the charge. "Did the visit happen?" ${POLICY.VISIT_CHECK_H} h after the start, the admin at
+${POLICY.VISIT_CHECK_ADMIN_H} h, cancelled with a refund at +${POLICY.VISIT_CHECK_CANCEL_H} h. Pickup today ${POLICY.PICKUP_REMIND_H} h before the pickup time.

Rows marked A2 / B1 are fired by those tracks (support, verification) through the same \`notify()\`.

## To the customer (${nC})

${head}
${rows('customer')}

## To the tailor (${nT})

${head}
${rows('tailor')}
`;
writeFileSync(resolve(ROOT, 'docs/v5/TEXTS.md'), md);
console.log(`docs/v5/TEXTS.md: ${nC + nT} texts (${nC} customer, ${nT} tailor)`);
