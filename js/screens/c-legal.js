/* ============================================================
   c-legal — the customer's legal pages (S-23 / S-24, DG-3 option A, pre-MVP B2; D-373): Terms of service, Privacy policy,
   Cancellation and refunds, Accessibility. Opened from Account → Help and policies, and from the Terms / Privacy links next
   to the buttons that create the account (c-welcome, c-phone) and pay (c-pay), so it works signed out (system.js exempt).
   COUNSEL (docs/v5/COUNSEL.md): a short summary + "Full text coming soon (counsel review)" until counsel's text drops in.
   Screen-local UI: state.ui['c-legal'] = { doc }. Back returns where she came from.
   ============================================================ */
import { register } from '../app.js';
import { state } from '../state.js';
import { legalView } from '../account-ui.js';

const ID = 'c-legal';

const view = () => legalView(state.ui[ID]?.doc ?? 'terms', ID);

register(ID, view);
