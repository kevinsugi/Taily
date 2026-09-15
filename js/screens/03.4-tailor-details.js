/* ============================================================
   03.4 - Tailor details — Figma 703:5897 (round 14, Kevin).
   The tailor card on any 03 screen opens Marco's profile as a popup:
   the same "Meet Marco" card 03/Confirmed draws in-page (photo slot,
   name + ✓ Taily-verified, the three verification badges, years ·
   area · distance, bio) at y 194.5 over an ink@45% scrim. Tapping the
   scrim closes it. Nothing opens while the request is still matching
   (no tailor yet). The route renders the frame verbatim for the diff
   harness: 03/Reminder as backdrop, scrim, the card.
   ============================================================ */

import { register, render as go } from '../app.js';
import { modalOverlay, trustCard } from '../components.js';
import { tailorProfile } from '../data.js';
import { apptEntry } from '../state.js';
import { viewReminder } from './03-status-reminder.js';

/** Open the profile popup for the appointment's tailor (default: the
    current appointment). Returns false when no tailor is assigned yet. */
export function openTailorDetails(a = apptEntry()) {
  const profile = tailorProfile(a);
  if (!profile) return false;
  modalOverlay(trustCard(profile, { popup: true }), { dataS: '03.4-tailor-details' }, () => {});
  return true;
}

/** Wire every tailor card in `root` (summary card or in-page profile
    card) to the popup — shared by the 03 family. */
export function wireTailorCard(root, a) {
  root.querySelectorAll('.summary-card, .trust-card').forEach((card) => {
    card.addEventListener('click', () => openTailorDetails(a ?? undefined));
  });
}

function renderScreen(s) {
  const profile = tailorProfile(s.upcoming[0]) ?? tailorProfile();
  return `<div class="screen-sheet" data-s="03.4-tailor-details">
  <div class="sheet-backdrop" aria-hidden="true">${viewReminder(s)}</div>
  <div class="modal-scrim"></div>
  ${trustCard(profile, { popup: true })}
</div>`;
}

register('03.4-tailor-details', renderScreen, (root) => {
  root.querySelector('.modal-scrim')?.addEventListener('click', () => go('03-status-reminder'));
});
