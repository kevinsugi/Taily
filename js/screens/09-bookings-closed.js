/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "09 - Bookings / Closed Cards". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewBookings, wire } from './09-bookings.js';
import { withLists, APPT_PROPOSED, APPT_EXPIRED, APPT_TAILOR_CANCELLED, APPT_NO_SHOW } from '../fixtures.js';

/* one proposed-time request under Current, three closed cards under Past */
register('09-bookings-closed', (s) => viewBookings(withLists({ upcoming: [APPT_PROPOSED()], past: [APPT_EXPIRED(), APPT_TAILOR_CANCELLED(), APPT_NO_SHOW()] }, s)), wire);
