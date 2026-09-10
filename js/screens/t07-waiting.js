/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "T07 - Job Ready / Waiting". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewReady, wire } from './t07-job-ready.js';
import { APPT_READY_WAITING } from '../fixtures.js';

register('t07-waiting', (s) => viewReady(s, APPT_READY_WAITING()), wire);
