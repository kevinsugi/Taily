/* UX-LOOP round 8 Figma money sync — fixture route for the sibling frame
   "03 - Order Status / Reminder Locked". Renders 03/Reminder with the seed after Sarah's
   Confirm on the 24-hour prompt (`feeLocked`: pill "Confirmed · fee non-refundable", no
   "Before you confirm" callout); the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewReminder, wire } from './03-status-reminder.js';
import { withLists, APPT_FEE_LOCKED } from '../fixtures.js';

register('03-status-reminder-locked', (s) => viewReminder(withLists({ upcoming: [APPT_FEE_LOCKED()] }, s)), wire);
