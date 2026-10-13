/* ============================================================
   Taily v5 — simulated network wait (D-35). DOM-free: timers only.
   Every action that "talks to the server" runs through withLatency
   so the loading / busy states are real and reachable:
     state.sim.latency = 'instant' → now, synchronously (?test=1)
                         'normal'  → after LATENCY_MS
                         'hold'    → never (the Test-flows loading states)
   The screen sets its busy flag BEFORE calling.
   ============================================================ */
import { state } from './state.js';

export const LATENCY_MS = 700;

/** Run `done` after the simulated network delay. Returns cancel(). */
export function withLatency(done) {
  const mode = state.sim.latency;
  if (mode === 'instant') { done(); return () => {}; }
  if (mode === 'hold') return () => {};
  const id = setTimeout(done, LATENCY_MS);
  return () => clearTimeout(id);
}
