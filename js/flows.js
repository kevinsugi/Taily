/* ============================================================
   Flow jumps — the "Test flows" registry (Kevin, Sep 2026).

   Every entry is ONE state of ONE screen:
     { key, screen, persona?, group, title, note?, setup?(S),
       click?: [selector], expect: { has?, not?, sel? }, visual? }
   Choosing an entry (the menu, `?flow=<key>`, or the harness):
     1. `resetDemo()` — the seed state, no screen-local UI flags,
     2. `setup(S)` — composes REAL transitions (never hand-written
        fixture fields) to reach the state,
     3. the screen is rendered live, and
     4. for overlays, the entry's `click` selectors are pressed so the
        sheet opens through the screen's own wiring.
   Because the state is genuine you can keep clicking forward, or flip
   persona with "View as …" — both sides stay in step.

   Entries live in js/fixtures/m0.js … m6.js + s1a … s1f.js + s2a.js … s2d.js + s3m.js + s3l.js (one `FLOWS_<screen_id>`
   array per screen); ALL_FLOWS concatenates every FLOWS_* export.
   `S = { state, T, driveTo, setClock, advanceClock, sim, job, tailor, appt }`.
   Keys are URL-safe: `?flow=<key>` boots straight into a state.
   ============================================================ */

import { state, reset, T, setClock, advanceClock, activeAppt } from './state.js';
import { driveTo, documentFitting } from './fixtures/common.js';
import { SCREENS } from './inventory.js';
import * as M0 from './fixtures/m0.js';
import * as M1 from './fixtures/m1.js';
import * as M2 from './fixtures/m2.js';
import * as M3 from './fixtures/m3.js';
import * as M4 from './fixtures/m4.js';
import * as M5 from './fixtures/m5.js';
import * as M6 from './fixtures/m6.js';
import * as S1A from './fixtures/s1a.js';   // Study-1 workstreams (STUDY-1-spec.md §4)
import * as S1B from './fixtures/s1b.js';
import * as S1C from './fixtures/s1c.js';
import * as S1D from './fixtures/s1d.js';   // K-40 (T1) handoff time + K-37 no drop-off
import * as S1E from './fixtures/s1e.js';   // K-41 (R3) the 24-hour reminder
import * as S1F from './fixtures/s1f.js';   // design-director review small fixes (D-304)
import * as S2A from './fixtures/s2a.js';   // pre-MVP A1 (K-48): texts, timers, card window, visit day, courier
import * as S2B from './fixtures/s2b.js';   // pre-MVP fix pass B1: supply side (K-48, D-350…D-361)
import * as S2C from './fixtures/s2c.js';   // pre-MVP A2: Taily Help, the admin, disputes, report / block, garment protection (K-48.1, DG-1 B)
import * as S2D from './fixtures/s2d.js';   // pre-MVP fix pass B2: Account v2, deposit button V3, sign-in + phone, receipts, reviews, notes (K-48 / K-49, D-370…D-379)
import * as S3M from './fixtures/s3m.js';   // pre-MVP K-53 track M: hold at Ready, courier re-quote, the fee page, no-show = deposit, the admin Ledger, the free window's end
import * as S3L from './fixtures/s3l.js';   // MVP readiness, track L (K-52 / K-53): log in, the admin's sign-in, availability, legal drafts, checks order (D-420…)
import { adminTestSession } from './account.js';

/** Every `FLOWS_*` array of every milestone, in inventory order (module namespaces list their exports alphabetically,
    so the screen's position in js/inventory.js is the sort key; a stable sort keeps each screen's own entry order). */
const ORDER = new Map(SCREENS.map((s, i) => [s.id, i]));
export const ALL_FLOWS = [M0, M1, M2, M3, M4, M5, M6, S1A, S1B, S1C, S1D, S1E, S1F, S2A, S2B, S2C, S2D, S3M, S3L]
  .flatMap((mod) => Object.keys(mod).filter((k) => k.startsWith('FLOWS_')).flatMap((k) => mod[k]))
  .sort((a, b) => (ORDER.get(a.screen) ?? 1e6) - (ORDER.get(b.screen) ?? 1e6));

export const findFlow = (key) => ALL_FLOWS.find((f) => f.key === key) ?? null;

/** A screen's PRIMARY state (the ◆ entry): the flow keyed exactly by the screen id, else the screen's first entry.
    A cold `?screen=<id>` boots into it (app.js) so no screen ever opens on an empty model. */
export const primaryFlow = (screenId) => ALL_FLOWS.find((f) => f.key === screenId) ?? ALL_FLOWS.find((f) => f.screen === screenId) ?? null;

/** The persona a screen id belongs to; `sys-` screens keep the current one. */
export const personaForScreen = (id) => (id.startsWith('c-') ? 'customer' : /^(t|to)-/.test(id) ? 'tailor' : id.startsWith('a-') ? 'admin' : null);

/** The latency the app booted with (instant under ?test=1, else normal). resetDemo restores it, so a flow that
    set `sim.latency = 'hold'` for a loading / busy state never leaks into the next one (D-35). */
let bootLatency = state.sim.latency ?? 'normal';   // app.js sets state.sim.latency before it loads this module (D-212)
export function setBootLatency(v) {
  bootLatency = v;
  state.sim.latency = v;
}

/** K-53 a8 (D-422): the Test-flows tools are the admin's — while they are on (app.js: he signed in, or a test boot) every flow runs inside
    his signed-in session, so an a-* entry opens without a-login (K-52's "a Test-flows shortcut still allowed"). */
let adminTools = false;
export function setAdminTools(on) { adminTools = !!on; }

/** Back to the app's boot state: the seed, no screen-local UI flags, the boot latency, customer persona (+ the admin's session, above). */
export function resetDemo() {
  reset();
  state.ui = {};
  state.sim.latency = bootLatency;
  if (adminTools) adminTestSession();
}

/** The toolkit every setup composes. Getters, so a `driveTo` inside a setup (which resets) is seen by later reads. */
export function toolkit() {
  return {
    state, T, driveTo, documentFitting, setClock, advanceClock,
    get sim() { return state.sim; },
    get job() { return state.job; },
    get tailor() { return state.tailors[0]; },
    get appt() { return activeAppt() ?? state.appts[state.appts.length - 1] ?? null; },
  };
}

/** reset → setup(S) → persona from the screen id. Returns the entry, or null for an unknown key. */
export function prepareFlow(key) {
  const entry = findFlow(key);
  if (!entry) return null;
  resetDemo();
  entry.setup?.(toolkit());
  state.persona = entry.persona ?? personaForScreen(entry.screen) ?? state.persona;
  return entry;
}
