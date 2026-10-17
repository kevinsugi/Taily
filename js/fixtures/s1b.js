/* ============================================================
   Study-1 WS-B Test-flows entries — edit the job after the fitting, private notes with photos (B1–B2, K-30 / K-31).
   One `FLOWS_<screen_id>` array per screen (same shape as js/fixtures/m#.js); flows.js concatenates every FLOWS_* export.
   Entry shape: see docs/v5/CONTEXT.md (FLOWS / EXPECT contract). Setups compose driveTo (real transitions: edit-pending,
   edit-declined, partial-completed) + T.addNote; the t-adjust drafts are screen UI (state.ui), as in m4.js. Money strings come
   from SCENARIOS (edit, partial) through fmt*(). Re-pointed keys live in m4.js (t-job--in-progress, t-adjust--revise, c-price-change).
   ============================================================ */
import { SCENARIOS as B_SC, JOB_EDIT as B_EDIT } from './money-scenarios.js';
import { fmtExact as B_exact, cents as B_cents } from '../money.js';
import { EDIT_REASON as B_REASON, NOTE_TEXT as B_NOTE, PRICE_NOTES as B_PRICE_NOTES } from './common.js';
import { NOTE_EMPTY as B_EMPTY } from '../components.js';
import { fmtDay as B_day, isoDay as B_iso, addDays as B_addDays } from '../dates.js';
import { setFocus as B_setFocus } from '../focus.js';
import { TAILORS as B_TAILORS, NOTES_LIMITS as B_LIMITS } from '../data.js';

const WORK = B_exact(B_cents(B_EDIT.workDone));                  // $40.00 — what Sarah pays if she declines
const LEFT = B_exact(B_SC.partial.balance);                       // $24.00 — after the $16.00 deposit
const DEP = B_exact(B_SC.seed.deposit);
const UP_TO = B_exact(B_SC.seed.total);                           // $160.00 — the approved total
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
/** The t-adjust edit draft (screen UI, as m4's PC_edited): Shorten sleeves up $15 typed in, optionally the reason, photo and work done. */
const editDraft = (S, { filled = true } = {}) => {
  const a = S.driveTo('in-progress');
  S.state.ui['t-adjust'] = {
    apptId: a.id, mode: 'edit', prices: { 'g2:sleeves': String(B_TAILORS[0].prices.sleeves + B_EDIT.sleevesUp) },
    ...(filled ? { needBy: NEW_DUE, reason: B_REASON, photo: true, workDone: String(B_EDIT.workDone) } : {}),
  };
  return a;
};

/* ---------- tailor: notes on the job, the edit waiting on Sarah, partial work ---------- */
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
    expect: { has: ['Waiting on Sarah to approve your changes', 'Your payout if approved', B_exact(B_SC.edit.payout), 'Your reason', B_REASON, `New due date ${B_day(NEW_DUE)}`, `was ${B_day(SEED_DUE)}`, 'YOUR CHANGES', 'New price', 'Sarah hasn’t answered your changes yet.', `If Sarah declines, she pays ${WORK} for the work done so far`, 'Edit the job'], sel: '[data-act="mark-ready"][disabled]' } },
  { ...TJ, key: 't-job--ready-partial', title: 'Job — Sarah declined, partial work', note: 'Study-1 B1 (default 12): straight to ready with every way back; the payout on the work done',
    setup: (S) => { S.driveTo('edit-declined'); },
    expect: { has: ['Sarah declined your changes · choosing how to get it back', `She pays ${WORK} for the work done so far`, B_exact(B_SC.partial.payout), `Work done so far: ${WORK} in all`, 'In-store pickup', 'Home drop-off', 'Taily courier'], not: 'Mark ready', sel: '[data-strip="warn"]' } },
  { ...TJ, key: 't-job--completed-partial', title: 'Job — returned, partial work', note: 'Study-1 B1: the completed job says so; the payout is on the work done ($40.00 less the Taily fee on its services part)',
    setup: (S) => { S.driveTo('partial-completed'); },
    expect: { has: ['Returned, partial work', `Sarah declined your changes and paid ${WORK} for the work done so far.`, 'YOUR PAYOUT', B_exact(B_SC.partial.payout), 'Pending'], not: 'Nice work', sel: '[data-partial]' } },
];

export const FLOWS_t_adjust = [
  { ...TA, key: 't-adjust--notes', title: 'Edit the job — private General notes', note: 'Study-1 B2 (K-31): the old "Note to Sarah" is now Amara’s private notes, with photos; nothing is sent with the order',
    setup: (S) => {
      const a = S.driveTo('fitting');
      S.T.addNote(a.id, { text: B_PRICE_NOTES.added });
      S.T.addNote(a.id, { text: B_NOTE.sketch, photos: 1 });
      S.state.ui['t-adjust'] = { apptId: a.id, mode: 'new' };
    },
    expect: { has: ['GENERAL NOTES', 'Only you can see these notes.', B_PRICE_NOTES.added, B_NOTE.sketch, 'Add a note'], not: ['Note to Sarah', 'about the whole order'], sel: '[data-notes] .private-note__photos' } },
  { ...TA, key: 't-adjust--edit', title: 'Edit the job — after the fitting', note: 'Study-1 B1 (K-30): Sleeves up $15, the due date three days later, the reason, a photo, $40 of work done; Send to Sarah',
    setup: (S) => { editDraft(S); },
    expect: { has: ['AFTER THE FITTING', 'Edit the job', 'DUE DATE', `New due date ${B_day(NEW_DUE)}`, 'Reason for the change (Sarah sees this)', 'Remove photo', 'Work done so far', `What Sarah pays if she says no. Up to ${UP_TO}.`, B_exact(B_SC.edit.total), B_exact(B_SC.edit.payout), `Sarah’s ${DEP} deposit stays the same.`, 'Send to Sarah'], not: ['Before', 'Pinned', 'Send to Sarah for approval', 'GENERAL NOTES'], sel: '[data-act="send"]:not([disabled])' } },
  { ...TA, key: 't-adjust--edit-errors', title: 'Edit the job — reason and work done missing', note: 'Study-1 B1: Send with no reason and no amount — each error next to its field',
    setup: (S) => { editDraft(S, { filled: false }); },
    click: ['[data-act="send"]'],
    expect: { has: ['Tell Sarah why you’re changing it.', `Enter a whole-dollar amount up to ${UP_TO}.`, 'Add a photo so the customer sees why'], sel: '#edit-reason[aria-invalid="true"]' } },
  { ...TA, key: 't-adjust--edit-due', title: 'Edit the job — the due date', note: 'Study-1 B1: Change the due date → a date list from a few days before to two weeks after the approved one',
    setup: (S) => { editDraft(S, { filled: false }); },
    click: ['[data-act="edit-due"]'],
    expect: { has: ['Due date', 'Current due date', `${B_EDIT.dueDays} days later`, B_day(NEW_DUE)], sel: '[data-s="t-adjust--edit-due"] [aria-checked="true"]' } },
];

/* ---------- customer: "Amara edited your order", the decline, partial work ---------- */
export const FLOWS_c_price_change = [
  { ...CP, key: 'c-price-change--edit', title: 'Amara edited your order', note: 'Study-1 B1 (K-30): her reason and photo, the new due date, what changed, the new total, and what you pay if you decline',
    setup: (S) => { S.driveTo('edit-pending'); },
    expect: { has: ['Amara edited your order', 'Amara’s reason', B_REASON, 'Taken by Amara', `New due date ${B_day(NEW_DUE)}`, 'WHAT CHANGED', 'New price', 'New total', B_exact(B_SC.edit.total), B_exact(B_SC.edit.balance), 'Stays the same', `If you decline, you pay ${WORK} for the work done so far and get your items back.`, 'Approve changes', 'Decline and get my items back', 'Message Amara'], not: ['Approve and start', 'note on the order'], sel: '[data-edit="pending"] [data-if-declined]' } },
  { ...CP, key: 'c-price-change--edit-due', title: 'Amara edited your order — the due date only', note: 'Study-1 B1: a later due date, same items and price: no "What changed", the total as before',
    setup: (S) => { S.driveTo('edit-pending', { edit: 'due' }); },
    expect: { has: ['Amara edited your order', `New due date ${B_day(NEW_DUE)}`, `was ${B_day(SEED_DUE)}`, 'Total', B_exact(B_SC.seed.total), `If you decline, you pay ${WORK}`], not: ['WHAT CHANGED', 'New total', 'Taken by Amara'] } },
  { ...CP, key: 'c-price-change--decline', title: 'Decline the changes?', note: 'Study-1 B1 (default 12): what you pay, what the deposit covers, then the way back',
    setup: (S) => { S.driveTo('edit-pending'); },
    click: ['[data-act="decline-edit"]'],
    expect: { has: ['Decline the changes?', `You’ll pay ${WORK} for the work done so far. Your ${DEP} deposit counts toward it, so ${LEFT} is left. Then choose how to get your items back.`, 'Decline and get my items back', 'Keep reviewing'], sel: '[data-s="c-price-change--decline"] [data-act="decline-ok"]' } },
];

export const FLOWS_c_ready = [
  { key: 'c-ready--partial', screen: 'c-ready', group: 'S1 · Edit after the fitting', title: 'Ready — partial work', note: 'Study-1 B1: you declined the changes; pay the work done so far (less the deposit), choose how to get your items back',
    setup: (S) => { S.driveTo('edit-declined'); },
    expect: { has: ['PARTIAL WORK', 'Your items are ready to come back', `You declined Amara’s changes, so you pay ${WORK} for the work done so far.`, 'Work done so far', LEFT, `Hold ${LEFT}`], not: ['YOUR ORDER', 'Your order is ready'], sel: '[data-hold]' } },
];

export const FLOWS_c_complete = [
  { key: 'c-complete--partial', screen: 'c-complete', group: 'S1 · Edit after the fitting', title: 'Returned, partial work', note: 'Study-1 B1: clearly labelled; charged the partial balance on hold; still rate and rebook',
    setup: (S) => { S.driveTo('partial-completed'); },
    click: ['[data-act="receipt"]'],
    expect: { has: ['RETURNED, PARTIAL WORK', 'Your items are back with you.', `You declined Amara’s changes and paid ${WORK} for the work done so far.`, `Charged ${LEFT}`, 'Work done so far', 'Leave a review'], not: ['tailored to fit', 'ORDER COMPLETE'], sel: '[data-partial]' } },
];

export const FLOWS_c_booking = [
  { key: 'c-booking--completed-partial', screen: 'c-booking', group: 'S1 · Edit after the fitting', title: 'Booking — returned, partial work (reviewed)', note: 'Study-1 B1: the reviewed partial order on its booking page: the title says so, the receipt is the work done',
    setup: (S) => { const a = S.driveTo('partial-completed'); S.T.leaveReview(a.id, { stars: 4, text: 'Honest about the lining, and quick to give it back.' }); },
    expect: { has: ['Returned, partial work', `You declined Amara’s changes and paid ${WORK} for the work done so far.`, 'Work done so far', B_exact(B_SC.partial.total), 'Book Amara again'], not: 'All done with' } },
];

export const FLOWS_t_home = [
  { key: 't-home--completed-partial', screen: 't-home', group: 'S1 · Edit after the fitting', title: 'Home — a completed job, partial work', note: 'Study-1 B1 (default 10): the Completed list row says Partial work, with the payout on the work done',
    setup: (S) => { S.driveTo('partial-completed'); B_setFocus(null); },
    expect: { has: ['COMPLETED', 'Partial work', B_exact(B_SC.partial.payout), 'Payout pending'], sel: '[aria-labelledby="t-home-completed"] .appt-row' } },
];
