/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "T03 - Upcoming Visit". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewAccepted, wire } from './t03-request-accepted.js';

register('t03-upcoming-visit', (s) => viewAccepted(s, 'upcoming'), wire);
