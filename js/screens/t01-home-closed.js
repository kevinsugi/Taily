/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "T01 - Home / Closed Rows". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewTailorHome, wire } from './t01-home.js';
import { withLists, APPT_PROPOSED, APPT_TAILOR_CANCELLED, APPT_NO_SHOW, APPT_WITHDRAWN, APPT_EXPIRED } from '../fixtures.js';

/* the proposed-time request card, the Leo Von filler, then the closed rows */
register('t01-home-closed', (s) => viewTailorHome(withLists({ upcoming: [APPT_PROPOSED()], past: [APPT_TAILOR_CANCELLED(), APPT_NO_SHOW(), APPT_WITHDRAWN(), APPT_EXPIRED()] }, s)), wire);
