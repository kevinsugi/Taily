/* UX-LOOP round 8 Figma money sync — fixture route for the sibling frame
   "03 - Order Status / Confirmed Locked". Renders 03/Confirmed with the seed after Sarah's
   Confirm on the 24-hour prompt (`feeLocked`: pill "Confirmed · fee non-refundable");
   the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewConfirmed, wire } from './03-status-confirmed.js';
import { withLists, APPT_FEE_LOCKED } from '../fixtures.js';

/* round 14: the Confirmed Locked frame still draws the summary-card layout (raised) */
register('03-status-confirmed-locked', (s) => viewConfirmed(withLists({ upcoming: [APPT_FEE_LOCKED()] }, s), { layout: 'card' }), wire);
