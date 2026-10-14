/* ============================================================
   M0 Test-flows entries — the two system screens.
   Dollar strings are computed with fmt* from js/money.js, never typed.
   ============================================================ */
import { fmt, fmtNeg } from '../money.js';
import { SCENARIOS } from './money-scenarios.js';

/* the seed job's numbers (Sarah x Amara), computed: estimate(TAILORS[0], SEED_JOB, '2026-10-15T17:00') */
const SEED = SCENARIOS.seed;

export const FLOWS_sys_index = [
  { key: 'sys-index', screen: 'sys-index', group: 'M0 · System', title: 'Index',
    note: 'Milestones and every built screen, as deep links',
    expect: { has: ['Taily v6', 'M1'] } },
];

export const FLOWS_sys_components = [
  { key: 'sys-components', screen: 'sys-components', group: 'M0 · System', title: 'Component gallery',
    note: 'Every v5 component in each state',
    expect: { has: [fmt(SEED.payout), fmtNeg(SEED.tailyFee)] } },
];
