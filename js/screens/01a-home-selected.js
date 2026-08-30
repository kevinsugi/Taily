/* ============================================================
   01a - Home_Selected — Figma 532:940.
   01-Home mid-selection: selected tiles carry the ink border, qty
   badge and minus button; "Tap to select more items" appears between
   the grid and the CTA. Same view + wiring as 01-home — this module
   only registers the frame's preset selection (Suit Jacket ×1,
   Shirt / Blouse ×1) so the diff harness can render it directly.
   ============================================================ */

import { register } from '../app.js';
import { state } from '../state.js';
import { view01, wire01 } from './01-home.js';

function renderScreen(s) {
  state.ui ??= {};
  state.ui.homeSelection = { 'Suit Jacket': 1, 'Shirt / Blouse': 1 };
  return view01(s);
}

register('01a-home-selected', renderScreen, wire01);
