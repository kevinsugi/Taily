/* ============================================================
   sys-components — the component gallery as a screen: every v5
   component in each state (js/gallery.js). The visual baseline for
   the component layer.
   ============================================================ */
import { register } from '../app.js';
import { chrome } from '../components.js';
import { galleryHtml, wireGallery } from '../gallery.js';

const ID = 'sys-components';

function view() {
  return `${chrome('home')}<main class="body gal" data-s="${ID}">${galleryHtml()}</main>`;
}

function wire(root) {
  wireGallery(root);
}

register(ID, view, wire);
