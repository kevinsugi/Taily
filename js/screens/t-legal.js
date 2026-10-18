/* ============================================================
   t-legal — the tailor's legal pages (S-23, DG-3 option A, pre-MVP B2; D-373): Tailor terms of service, Tailor agreement,
   Privacy policy. Opened from Shop → Account → Help and policies, and from t-phone's Tailor Terms / Privacy links (signed
   out: system.js exempt). COUNSEL (docs/v5/COUNSEL.md #2): placeholder summaries until counsel's text drops in.
   Screen-local UI: state.ui['t-legal'] = { doc }.
   ============================================================ */
import { register } from '../app.js';
import { state } from '../state.js';
import { legalView } from '../account-ui.js';

const ID = 't-legal';

const view = () => legalView(state.ui[ID]?.doc ?? 'tailor-terms', ID);

register(ID, view);
