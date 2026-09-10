/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "04 - Review & Approve / Removed". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewReview, wireReview } from './04-review-approve.js';
import { FINAL_ORDER_REMOVED } from '../fixtures.js';

register('04-review-approve-removed', (s) => viewReview(s, '04-review-approve-removed', FINAL_ORDER_REMOVED()), wireReview);
