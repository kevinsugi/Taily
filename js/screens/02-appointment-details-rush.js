/* ============================================================
   02 - Appointment Details / Rush — Figma 728:3244 (round 15, Kevin).
   02 with a need-by the day after the visit: the $150 "Rush fee" row
   (captioned) after the Concierge fee, in the Total. Sibling fixture
   route only — live, 02 draws the row itself whenever the dates say so.
   ============================================================ */

import { register } from '../app.js';
import { state, setAppt } from '../state.js';
import { view02, wire } from './02-appointment-details.js';

function renderScreen(s) {
  if (!window.__tailyNavigated && !s.appt.when) { setAppt('when', 'Jul 12, 7:00 PM'); setAppt('needBy', 'Jul 13, 3:00 PM'); }
  return view02(state);
}

register('02-appointment-details-rush', renderScreen, wire);
