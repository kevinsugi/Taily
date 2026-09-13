/* Round 10 (Kevin) — fixture route for the sibling frame
   "T05 - Confirm Final Pricing / Resend": the at-visit draft reopened
   from T06's Edit Details, going out to Sarah a second time ("Updated
   after sending", Resend to Sarah for Approval). The base screen's own
   deep link is unchanged. */
import { register } from '../app.js';
import { viewPricing, wire } from './t05-confirm-final-pricing.js';
import { seedAppt, DRAFT_MODIFIED } from '../fixtures.js';

register('t05-resend', (s) => viewPricing(s, { draft: DRAFT_MODIFIED(), booked: seedAppt().garments, resend: true }), wire);
