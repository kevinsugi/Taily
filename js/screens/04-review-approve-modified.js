/* ============================================================
   06B - Review & Approve Final Order - Modified — Figma 551:6263.
   06A with the order modified at the appointment: card 1 gains an
   added service, card 3 is a whole added garment, and every touched
   price renders semantic/info. Fee rows (R7): $360 Alterations / $25
   Concierge fee — paid / $385 Total / $360 Due at handoff. Gap 16,
   heading at the bare 128 offset.
   The harness deep link draws SEED_FINAL_ORDER (the frame's fiction:
   +$80 Sleeve on card 1, +$80 jacket → 200 + 80 + 80 = 360); a live
   visit draws the appointment's reviewed order with its own added
   marks (UX-LOOP R1-U-02).
   ============================================================ */

import { register } from '../app.js';
import { SEED_FINAL_ORDER } from '../data.js';
import { viewReview, wireReview } from './04-review-approve.js';

register('04-review-approve-modified', (s) => viewReview(s, '04-review-approve-modified', SEED_FINAL_ORDER), wireReview);
