/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "03 - Order Status / New Time". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewRequested, wire } from './03-status-requested.js';
import { APPT_PROPOSED } from '../fixtures.js';

register('03-status-new-time', (s) => viewRequested(s, APPT_PROPOSED()), wire);
