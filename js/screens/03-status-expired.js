/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "03 - Order Status / Expired". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewCancelled, wire } from './03-status-cancelled.js';
import { APPT_EXPIRED } from '../fixtures.js';

register('03-status-expired', (s) => viewCancelled(s, APPT_EXPIRED()), wire);
