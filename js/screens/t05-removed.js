/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "T05 - Confirm Final Pricing / Removed". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewPricing, wire } from './t05-confirm-final-pricing.js';
import { seedAppt, DRAFT_REMOVED } from '../fixtures.js';

/* the booked g1 + g2 against a draft that dropped g2 (R2-T-08) */
register('t05-removed', (s) => viewPricing(s, { draft: DRAFT_REMOVED(), booked: seedAppt().garments }), wire);
