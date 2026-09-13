/* Round 10 (Kevin) — fixture route for the sibling frame
   "T06 - Appointment Status / Awaiting Approval": Marco's status while
   Sarah reviews the sent order — Mark Ready / Edit Details / Back to
   Appointments. The base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewStatus, wire } from './t06-appointment-status.js';
import { APPT_AWAITING } from '../fixtures.js';

register('t06-awaiting', (s) => viewStatus(s, APPT_AWAITING()), wire);
