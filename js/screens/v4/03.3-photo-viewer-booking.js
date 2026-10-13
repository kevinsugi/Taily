/* UX-LOOP round 9 (Kevin) — fixture route for the sibling frame
   "03.3 - Photo Viewer / Booking" (654:5774): 03/Confirmed dimmed
   underneath, the viewer in booking mode on the seed's first card (two
   photos, the first active). Live, 03/Confirmed's photo tiles open the
   same panel through openPhotoViewer({ booking: true }). */
import { register, render as go } from '../app.js';
import { panelHtml, wirePanel } from './03.3-photo-viewer.js';
import { viewConfirmed } from './03-status-confirmed.js';

function renderBooking(s) {
  return `<div class="screen-sheet" data-s="03.3-photo-viewer-booking">
  <div class="sheet-backdrop" aria-hidden="true">${viewConfirmed(s)}</div>
  <div class="pv-scrim"></div>
  ${panelHtml({ booking: true, count: 2, active: 0 })}
</div>`;
}

register('03.3-photo-viewer-booking', renderBooking, (root) => wirePanel(root, () => go('03-status-confirmed')));
