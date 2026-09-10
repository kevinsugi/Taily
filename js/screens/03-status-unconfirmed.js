/* UX-LOOP round 8 Figma money sync — fixture route for the sibling frame
   "03 - Order Status / Unconfirmed". Renders 03/Cancelled with the round-7 live-only state
   pushed in as a fixture (Taily auto-cancelled the unconfirmed visit 12 hours before it —
   reason 'unconfirmed', fee row "Refunded"); the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewCancelled, wire } from './03-status-cancelled.js';
import { APPT_UNCONFIRMED } from '../fixtures.js';

register('03-status-unconfirmed', (s) => viewCancelled(s, APPT_UNCONFIRMED()), wire);
