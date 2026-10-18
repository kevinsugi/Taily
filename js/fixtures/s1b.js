/* ============================================================
   Study-1 WS-B Test-flows entries — edit the job after the fitting, private notes with photos (B1–B2, K-30 / K-31).
   One `FLOWS_<screen_id>` array per screen (same shape as js/fixtures/m#.js); flows.js concatenates every FLOWS_* export.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract). Setups compose driveTo (real transitions: edit-pending)
   + T.addNote; the t-adjust drafts are screen UI (state.ui), as in m4.js. Money strings come from SCENARIOS (edit) through fmt*().
   K-30 overruled: an edit can't be declined (no "Work done so far", no partial work); Sarah approves or messages. Re-pointed keys live in m4.js (t-job--in-progress, t-adjust--revise, c-price-change).
   ============================================================ */
import { SCENARIOS as B_SC, JOB_EDIT as B_EDIT } from './money-scenarios.js';
import { fmtExact as B_exact } from '../money.js';
import { EDIT_REASON as B_REASON, NOTE_TEXT as B_NOTE, PRICE_NOTES as B_PRICE_NOTES } from './common.js';
import { NOTE_EMPTY as B_EMPTY } from '../components.js';
import { fmtDay as B_day, isoDay as B_iso, addDays as B_addDays } from '../dates.js';
import { TAILORS as B_TAILORS, NOTES_LIMITS as B_LIMITS } from '../data.js';

const DEP = B_exact(B_SC.seed.deposit);
const SEED_DUE = '2026-10-23';
const NEW_DUE = B_iso(B_addDays(SEED_DUE, B_EDIT.dueDays));
const TJ = { screen: 't-job', group: 'S1 · Edit after the fitting' };
const TA = { screen: 't-adjust', group: 'S1 · Edit after the fitting' };
const CP = { screen: 'c-price-change', group: 'S1 · Edit after the fitting' };

/** Two private notes on a job: a measurement, and a photo-only sketch (B2). */
const withNotes = (S, a) => {
  S.T.addNote(a.id, { text: B_NOTE.measure });
  S.T.addNote(a.id, { text: B_NOTE.sketch, photos: 2 });
  return a;
};
/** The t-adjust edit draft (screen UI, as m4's PC_edited): Shorten sleeves up $15 typed in, optionally the reason and photo. */
const editDraft = (S, { filled = true } = {}) => {
  const a = S.driveTo('in-progress');
  S.state.ui['t-adjust'] = {
    apptId: a.id, mode: 'edit', prices: { 'g2:sleeves': String(B_TAILORS[0].prices.sleeves + B_EDIT.sleevesUp) },
    ...(filled ? { needBy: NEW_DUE, reason: B_REASON, photo: true } : {}),
  };
  return a;
};

/* ---------- tailor: notes on the job, the edit waiting on Sarah ---------- */
export const FLOWS_t_job = [
  { ...TJ, key: 't-job--notes', title: 'Job — private General notes', note: 'Study-1 B2 (K-31): only Amara sees them; a text note and a sketch photographed (two thumbnails, they open the viewer)',
    setup: (S) => { withNotes(S, S.driveTo('in-progress')); },
    expect: { has: ['GENERAL NOTES', 'Only you can see these notes.', B_NOTE.measure, B_NOTE.sketch, 'Add a note', 'Edit'], not: [B_EMPTY, 'Share', 'Send to Sarah'], sel: '[data-notes] .private-note__photos[data-count="2"]' } },
  { ...TJ, key: 't-job--note-editor', title: 'Job — writing a note', note: 'Study-1 B2: Add a note opens the editor in place: the text, Add photo, Save note / Cancel',
    setup: (S) => { S.driveTo('in-progress'); },
    click: ['[data-act="note-add"]'],
    expect: { has: ['New note', `0 / ${B_LIMITS.TEXT_MAX}`, 'Add photo', 'Save note', 'Cancel', 'Only you can see these notes.'], not: 'Add a note', sel: '[data-note-editor] #note-text' } },
  { ...TJ, key: 't-job--note-attach', title: 'Job — a photo for a note', note: 'Study-1 B2: Add photo → camera or photo library (the shared attach sheet), for a sketch on paper',
    setup: (S) => { S.driveTo('in-progress'); },
    click: ['[data-act="note-add"]', '[data-act="note-add-photo"]'],
    expect: { has: ['Add a photo', 'Take a photo', 'Choose from library', `Up to ${B_LIMITS.PHOTOS_MAX} photos per note. Only you see them.`], sel: '[data-s="attach"] [data-act="photo-library"]' } },
  { ...TJ, key: 't-job--edit-pending', title: 'Job — changes waiting on Sarah', note: 'Study-1 B1: the new payout if approved, your reason and photo, the new due date; Mark ready waits (default 13)',
    setup: (S) => { S.driveTo('edit-pending'); },
    expect: { has: ['Waiting on Sarah to approve your changes', 'Your payout if approved', B_exact(B_SC.edit.payout), 'Your reason', B_REASON, `New due date ${B_day(NEW_DUE)}`, `was ${B_day(SEED_DUE)}`, 'YOUR CHANGES', 'New price', 'Sarah hasn’t answered your changes yet.', 'Edit order'], not: ['declines', 'Work done so far'], sel: '[data-act="mark-ready"][disabled]' } },
];

export const FLOWS_t_adjust = [
  { ...TA, key: 't-adjust--notes', title: 'Final order — private General notes', note: 'Study-1 B2 (K-31): the old "Note to Sarah" is now Amara’s private notes, with photos; nothing is sent with the order',
    setup: (S) => {
      const a = S.driveTo('fitting');
      S.T.addNote(a.id, { text: B_PRICE_NOTES.added });
      S.T.addNote(a.id, { text: B_NOTE.sketch, photos: 1 });
      S.state.ui['t-adjust'] = { apptId: a.id, mode: 'new' };
    },
    expect: { has: ['GENERAL NOTES', 'Only you can see these notes.', B_PRICE_NOTES.added, B_NOTE.sketch, 'Add a note'], not: ['Note to Sarah', 'about the whole order'], sel: '[data-notes] .private-note__photos' } },
  { ...TA, key: 't-adjust--edit', title: 'Edit order — after the fitting', note: 'Study-1 B1 (K-30): Sleeves up $15, the due date three days later, the reason, a photo; Send to Sarah (K-30 overruled: no work-done amount)',
    setup: (S) => { editDraft(S); },
    expect: { has: ['AFTER THE FITTING', 'Edit order', 'DUE DATE', `New due date ${B_day(NEW_DUE)}`, 'Reason for the change (Sarah sees this)', 'Remove photo', B_exact(B_SC.edit.total), B_exact(B_SC.edit.payout), `Sarah’s ${DEP} deposit stays the same.`, 'Send to Sarah'], not: ['Before', 'Pinned', 'Send to Sarah for approval', 'GENERAL NOTES', 'Work done so far'], sel: '[data-act="send"]:not([disabled])' } },
  { ...TA, key: 't-adjust--edit-errors', title: 'Edit order — reason missing', note: 'Study-1 B1: Send with no reason — the error next to its field',
    setup: (S) => { editDraft(S, { filled: false }); },
    click: ['[data-act="send"]'],
    expect: { has: ['Tell Sarah why you’re changing it.', 'Add a photo so the customer sees why'], not: 'whole-dollar amount', sel: '#edit-reason[aria-invalid="true"]' } },
  { ...TA, key: 't-adjust--edit-due', title: 'Edit order — the due date', note: 'Study-1 B1: Change the due date → a date list from a few days before to two weeks after the approved one',
    setup: (S) => { editDraft(S, { filled: false }); },
    click: ['[data-act="edit-due"]'],
    expect: { has: ['Due date', 'Current due date', `${B_EDIT.dueDays} days later`, B_day(NEW_DUE)], sel: '[data-s="t-adjust--edit-due"] [aria-checked="true"]' } },
];

/* ---------- customer: "Amara edited your order" (Approve changes / Message — K-30 overruled: no decline) ---------- */
export const FLOWS_c_price_change = [
  { ...CP, key: 'c-price-change--edit', title: 'Amara edited your order', note: 'Study-1 B1 (K-30): her reason and photo, the new due date, what changed, the new total; Approve changes or Message Amara (K-30 overruled: no decline)',
    setup: (S) => { S.driveTo('edit-pending'); },
    expect: { has: ['Amara edited your order', 'Amara’s reason', B_REASON, 'Taken by Amara', `New due date ${B_day(NEW_DUE)}`, 'WHAT CHANGED', 'New price', 'New total', B_exact(B_SC.edit.total), B_exact(B_SC.edit.balance), 'Stays the same', 'Something not right? Message Amara to change it before the work is finished.', 'Approve changes', 'Message Amara'], not: ['Approve and start', 'note on the order', 'Decline', 'decline', 'Work done so far'], sel: '[data-edit="pending"] [data-edit-hint]' } },
  { ...CP, key: 'c-price-change--edit-due', title: 'Amara edited your order — the due date only', note: 'Study-1 B1: a later due date, same items and price: no "What changed", the total as before',
    setup: (S) => { S.driveTo('edit-pending', { edit: 'due' }); },
    expect: { has: ['Amara edited your order', `New due date ${B_day(NEW_DUE)}`, `was ${B_day(SEED_DUE)}`, 'Total', B_exact(B_SC.seed.total), 'Approve changes', 'Message Amara'], not: ['WHAT CHANGED', 'New total', 'Taken by Amara', 'Decline'] } },
];
