/* UX-LOOP round 3 Figma sync — fixture route for the sibling frame
   "05.1 - Window Confirmed / Dated". Renders the base screen with the round-2 live-only state
   pushed in as a fixture; the base screen's own deep link is unchanged. */
import { register } from '../app.js';
import { viewWindowConfirmed, wireModal } from './05.1-window-confirmed.js';

/* R2-U-02: the stored window label carries its date */
register('05.1-window-confirmed-dated', (s) => viewWindowConfirmed(s, { when: 'Fri, Jul 17 · 4–6 PM' }), wireModal);
