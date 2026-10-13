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

   Entries live in js/fixtures/m0.js … m6.js (one `FLOWS_<screen_id>`
   array per screen); ALL_FLOWS concatenates every FLOWS_* export.
   `S = { state, T, driveTo, setClock, advanceClock, sim, job, tailor, appt }`.
   Keys are URL-safe: `?flow=<key>` boots straight into a state.
   ============================================================ */

import { state, reset, T, setClock, advanceClock, activeAppt } from './state.js';
import { driveTo } from './fixtures/common.js';
import { SCREENS } from './inventory.js';
import * as M0 from './fixtures/m0.js';
import * as M1 from './fixtures/m1.js';
import * as M2 from './fixtures/m2.js';
import * as M3 from './fixtures/m3.js';
import * as M4 from './fixtures/m4.js';
import * as M5 from './fixtures/m5.js';
import * as M6 from './fixtures/m6.js';

/** Every `FLOWS_*` array of every milestone, in inventory order (module namespaces list their exports alphabetically,
    so the screen's position in js/inventory.js is the sort key; a stable sort keeps each screen's own entry order). */
const ORDER = new Map(SCREENS.map((s, i) => [s.id, i]));
export const ALL_FLOWS = [M0, M1, M2, M3, M4, M5, M6]
  .flatMap((mod) => Object.keys(mod).filter((k) => k.startsWith('FLOWS_')).flatMap((k) => mod[k]))
  .sort((a, b) => (ORDER.get(a.screen) ?? 1e6) - (ORDER.get(b.screen) ?? 1e6));

export const findFlow = (key) => ALL_FLOWS.find((f) => f.key === key) ?? null;

/** The persona a screen id belongs to; `sys-` screens keep the current one. */
export const personaForScreen = (id) => (id.startsWith('c-') ? 'customer' : /^(t|to)-/.test(id) ? 'tailor' : null);

/** Back to the app's boot state: the seed, no screen-local UI flags, customer persona. */
export function resetDemo() {
  reset();
  state.ui = {};
}

/** The toolkit every setup composes. Getters, so a `driveTo` inside a setup (which resets) is seen by later reads. */
export function toolkit() {
  return {
    state, T, driveTo, setClock, advanceClock,
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
