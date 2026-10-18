/* ============================================================
   t-change-phone — Shop → Account → Phone number (DG-3 option A, pre-MVP B2; D-371). New requests, job texts and sign-in
   codes go to this number, so a new one is checked by a code first; then back to Shop ("Texts now go to …").
   The page and its wiring are shared with the customer's (js/account-ui.js).
   Screen-local UI: state.ui['t-change-phone'] = { step, phone, code, error, busy, focus }.
   ============================================================ */
import { register, render as go } from '../app.js';
import { chrome, toast } from '../components.js';
import { phoneChangeView, wirePhoneChange } from '../account-ui.js';

const ID = 't-change-phone';

const view = () => phoneChangeView('tailor', ID, { nav: chrome('shop', { persona: 'tailor' }) });

function wire(root) {
  wirePhoneChange(root, 'tailor', ID, {
    go,
    done: (r) => { go('t-shop', { replace: true }); toast(`Phone number updated. Texts now go to ${r.phone}.`, { tone: 'success' }); },
  });
}

register(ID, view, wire);
