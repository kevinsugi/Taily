/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "T03B - Job Cancelled / By You". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewJobCancelled, wire } from './t03b-job-cancelled.js';
import { APPT_TAILOR_CANCELLED } from '../fixtures.js';

register('t03b-by-you', (s) => viewJobCancelled(s, APPT_TAILOR_CANCELLED()), wire);
