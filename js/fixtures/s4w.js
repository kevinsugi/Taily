/* ============================================================
   Pre-MVP findings sweep (docs/v5/PRE-MVP-COVERAGE.md) — Test-flows entries for the review items still open after K-53:
   B-02 versioned approvals (D-440). Same shape as js/fixtures/m#.js; flows.js concatenates every FLOWS_* export. Setups compose
   driveTo + the real transitions + sim knobs (`sim.race` = the tailor's phone re-sent the order a moment before Approve arrived);
   money strings come from SCENARIOS through fmtExact, never typed.
   ============================================================ */
import { SCENARIOS as W_SC } from './money-scenarios.js';
import { fmtExact as W_exact } from '../money.js';

const G = 'Pre-MVP sweep · findings left open';
const at = (screen) => ({ screen, group: G });

/* ---------- c-price-change: Approve answers the revision on her screen (B-02) ---------- */
export const FLOWS_c_price_change = [
  { ...at('c-price-change'), key: 'c-price-change--revised', title: 'Final order — Amara updated it while Sarah was looking',
    note: 'B-02 (D-440): Approve names the revision on her screen; Amara re-sent the order a moment before, so nothing is applied — the screen shows the new order and the total she had seen',
    setup: (S) => { S.driveTo('price-change'); S.sim.race = 'revised'; },
    click: ['[data-act="approve"]'],
    expect: { has: ['Amara updated the order while you were looking', `(was ${W_exact(W_SC.priceAdded.total)}). Check it before you approve.`, 'Approve your updated order', 'Approve and start'], not: ['Couldn’t approve the order'], sel: '[data-revised] .banner--warning' } },
  { ...at('c-price-change'), key: 'c-price-change--edit-revised', title: 'Edited order — Amara updated her changes while Sarah was looking',
    note: 'B-02 (D-440): the same guard on Approve changes (an edit after the fitting)',
    setup: (S) => { S.driveTo('edit-pending'); S.sim.race = 'revised'; },
    click: ['[data-act="approve-edit"]'],
    expect: { has: ['Amara updated the order while you were looking', `(was ${W_exact(W_SC.edit.total)}). Check it before you approve.`, 'Approve changes'], not: ['Couldn’t save your answer'], sel: '[data-edit="pending"] [data-revised]' } },
];

/* ---------- t-earnings: the jobs she is working on (B-07's "On the way") ---------- */
export const FLOWS_t_earnings = [
  { ...at('t-earnings'), key: 't-earnings--on-the-way', title: 'Earnings — a job on the way, nothing paid yet',
    note: 'B-07 (D-441): a booked job is not in a payout until it is complete, so Earnings lists it under On the way with what she takes home so far (after the Taily fee); it opens the job',
    setup: (S) => { S.driveTo('in-progress'); },
    expect: { has: ['No earnings yet', 'ON THE WAY', `1 job · ${W_exact(W_SC.seed.payout)} after the Taily fee, so far. Each is paid the Friday after it’s complete.`, 'Sarah Chen'], sel: '.t-earnings__flight [data-act="open-job"]' } },
];

/* ---------- sys-components: the gallery's second state — everything built since K-22 (K-53 a6) ---------- */
export const FLOWS_sys_components = [
  { ...at('sys-components'), key: 'sys-components--since-k22', title: 'Component gallery — since K-22 (K-53 a6)',
    note: 'K-53 a6: strip-led pages, notices, handoff pieces and stages, private notes, Taily Help, policy pages, admin tools + ledger rows, availability controls, address fields, the live overlays (tap to open), the model-bound list',
    setup: (S) => { S.state.ui['sys-components'] = { part: 'since-k22' }; },
    expect: { has: ['Taily is reviewing', 'Show this code when you pick up.', 'Draft — counsel review required', 'Customers can book you at least', 'Test flows', 'Confirm sheet'], not: ['Toast tones'], sel: '[data-s="sys-components--since-k22"] [data-gal-open="confirm"]' } },
];
