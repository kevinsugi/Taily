/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "TM1 - Message Customer". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { renderScreen, wire } from './10-messages.js';

/* the persona gate flips to 'tailor' for any t-id (app.js), so this is
   the shared messages screen from Marco's side (R2-T-12) */
register('t10-messages', renderScreen, wire);
