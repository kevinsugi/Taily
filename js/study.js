/* ============================================================
   Tailor usability study — the script behind the Test flows "Study" tab (Kevin, Oct 15 2026).
   ONE ordered array. Reorder, add or remove a section here and the tab follows; js/flow-menu.js has no
   study-specific content. Every key is an existing FLOWS entry (js/flows.js): a button runs it with
   runFlow(key) — the same reset + setup + live screen as choosing it in the Tailor tab.

   Section: { title, cue?, start, jump: [key, …] }
     start — the big button: where the participant begins this task
     jump  — recovery states inside the section (the moderator's way back if a step goes sideways)
     cue   — optional moderator note shown under the title
   ============================================================ */

export const STUDY_TITLE = 'Tailor study — Oct 15';

export const STUDY_SCRIPT = [
  { title: 'Onboarding',
    start: 'to-profile',
    jump: ['to-services', 'to-where', 'to-returns', 'to-availability', 'to-payouts', 'to-done', 't-shop'] },
  { title: 'New job request',
    start: 't-home',
    jump: ['t-request', 't-suggest', 't-job--accepted'] },
  { title: 'Fitting, photos & notes',
    start: 't-job--visit',
    jump: ['t-adjust', 't-adjust--photos-required', 't-adjust--item-added', 't-job--waiting'] },
  { title: 'Messaging the client',
    cue: 'Participant taps Message',
    start: 't-job--in-progress',
    jump: ['t-thread', 't-messages'] },
  { title: 'Job ready',
    cue: 'Participant taps Mark ready',
    start: 't-job--in-progress',
    jump: ['t-job--mark-ready', 't-job--ready', 't-job--completed', 't-payout'] },
];
