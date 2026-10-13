/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "T03.1 - Can't Make It". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged.
   R3-T-05: the frame draws "I need to cancel" selected, its consequence
   line and the `Cancel Job` confirm. */
import { register } from '../app.js';
import { cantMakeItHtml } from '../tailor-components.js';
import { current } from '../tailor-data.js';
import { viewAccepted } from './t03-request-accepted.js';

/* Route registration keeps the frame-verbatim render for the diff
   harness: T03's pre-visit view as backdrop, scrim, the reasons modal
   (live, openCantMakeIt() mounts the same markup through modalOverlay). */
function renderScreen(s) {
  return `<div class="screen-sheet" data-s="t03.1-cant-make-it">
  <div class="sheet-backdrop" aria-hidden="true">${viewAccepted(s, 'upcoming')}</div>
  <div class="modal-scrim"></div>
  ${cantMakeItHtml(current(s), { selected: 'cant-make-it' })}
</div>`;
}

register('t03.1-cant-make-it', renderScreen, () => {});
