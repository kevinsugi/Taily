/* UX-LOOP round 6 Figma sync — fixture route for the sibling frame
   "T03A - Decline Request / Other". Renders the base screen with the
   Other row selected and its "Tell us more (optional)" textarea shown;
   the base screen's own deep link is unchanged. The route selects Other
   on the job so the wired rows agree with what is drawn. */
import { register } from '../app.js';
import { current, tailorOf } from '../tailor-data.js';
import { viewDecline, wire, OTHER } from './t03a-decline-request.js';

register('t03a-other', (s) => { tailorOf(current(s)).declineReason = OTHER; return viewDecline(s, 'other'); }, wire);
