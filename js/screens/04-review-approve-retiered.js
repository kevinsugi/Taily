/* UX-LOOP round 8 Figma money sync — fixture route for the sibling frame
   "04 - Review & Approve / Re-tiered". Renders 04/Modified with a final order that re-tiered
   the Concierge fee (5 items → the $50 tier: "Additional Concierge fee — 5 items now, $50
   tier" + the fee-tier note); the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewReview, wireReview } from './04-review-approve.js';
import { FINAL_ORDER_RETIERED } from '../fixtures.js';

register('04-review-approve-retiered', (s) => viewReview(s, '04-review-approve-retiered', FINAL_ORDER_RETIERED()), wireReview);
