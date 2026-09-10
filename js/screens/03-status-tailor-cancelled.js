/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "03 - Order Status / Tailor Cancelled". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewCancelled, wire } from './03-status-cancelled.js';
import { APPT_TAILOR_CANCELLED } from '../fixtures.js';

register('03-status-tailor-cancelled', (s) => viewCancelled(s, APPT_TAILOR_CANCELLED()), wire);
