/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "T06 - Appointment Status / Sarah Has Questions". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewStatus, wire } from './t06-appointment-status.js';
import { APPT_QUESTIONS } from '../fixtures.js';

register('t06-questions', (s) => viewStatus(s, APPT_QUESTIONS()), wire);
