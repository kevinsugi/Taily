/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "T02 - Appointment Request / Expired". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewRequest, wire } from './t02-appointment-request.js';

register('t02-expired', (s) => viewRequest(s, 'expired'), wire);
