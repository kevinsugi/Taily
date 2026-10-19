/* ============================================================
   c-change-phone — Personal info → Change phone (DG-3 option A, pre-MVP B2; D-371). Every text and sign-in code goes to
   this number, so a new one is checked first: the new number → Send code → the 6-digit code → back to Personal info
   ("Texts now go to …"). The page and its wiring are shared with the tailor's (js/account-ui.js).
   Screen-local UI: state.ui['c-change-phone'] = { step: 'number' | 'code', phone, code, error, busy, focus }.
   Focal: the number field, then the code.
   ============================================================ */
import { register, render as go } from '../app.js';
import { chrome, toast } from '../components.js';
import { phoneChangeView, wirePhoneChange } from '../account-ui.js';

const ID = 'c-change-phone';

const view = () => phoneChangeView('customer', ID, { nav: chrome('account') });

function wire(root) {
  wirePhoneChange(root, 'customer', ID, {
    go,
    done: (r) => { go('c-profile', { replace: true }); toast(`Phone number updated. Texts now go to ${r.phone}.`, { tone: 'success' }); },
  });
}

register(ID, view, wire);
