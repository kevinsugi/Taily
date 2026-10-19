/* ============================================================
   sys-components — the component gallery as a screen: every v5
   component in each state (js/gallery.js). The visual baseline for
   the component layer.
   ============================================================ */
import { register } from '../app.js';
import { chrome } from '../components.js';
import { state } from '../state.js';
/* D-212: the gallery (and the fixtures it pulls) loads only when this screen does; it is left out of the idle preload */
const { galleryHtml, wireGallery } = await import('../gallery.js');

const ID = 'sys-components';

/* K-53 a6: the gallery is two Test-flows states — `sys-components` (everything up to K-22) and `sys-components--since-k22` (what was built
   since) — so neither full-page baseline outgrows the screenshot; components.html shows both in one page */
function view() {
  const part = state.ui[ID]?.part ?? 'core';
  return `${chrome('home')}<main class="body gal" data-s="${ID}${part === 'since-k22' ? '--since-k22' : ''}">${galleryHtml({ part })}</main>`;
}

function wire(root) {
  wireGallery(root);
}

register(ID, view, wire);
