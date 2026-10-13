/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "T03A - Decline Request / Suggest Time". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewDecline, wire } from './t03a-decline-request.js';

register('t03a-suggest-time', (s) => viewDecline(s, 'suggest'), wire);
