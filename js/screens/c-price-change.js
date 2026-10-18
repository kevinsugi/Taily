/* ============================================================
   c-price-change — C9 review your final order (M4-spec §C1, K-01).
   After the fitting the tailor sends the final order — always, even
   unchanged. Sarah sees what changed (New item / New / New price /
   Removed text tags, or "No changes"), the total and the unchanged
   deposit, then approves or messages first. No reject path (§2).
   Focal: the "New total" / "Total" figure.
   States are data: added · item-added · item-removed · removed ·
   repriced · messaged · unchanged · revised.
   Which appointment: focusAppt (D-72).
   Study-1 B1 (K-30): the same screen is "Amara edited your order" when the tailor edits the job after the fitting (in progress, edit
   pending): her reason (+ photo), the new due date, what changed, the new total — Approve changes / Message, like the fitting (K-30
   overruled: no decline; if Sarah disagrees she messages and the tailor revises). K-31: the tailor's whole-order note is private now.
   ============================================================ */
import { register, render as go, registered, currentScreen } from '../app.js';
import { state, T, tailorById, priceChangeView, jobEditView, isVerified } from '../state.js';
import {
  chrome, banner, emptyState, deltaLines, noteQuote, changeList, withPhotos, wirePhotoViewer, changeSummary, moneyRows, actionBar, toast, esc, wireGarmentDocs, sectionHead,
  navBackMark, requestStrip, requestHead, pageHead, verifiedCheck, HOME_FEE_CAPTION,
  photoFigure, dueChange, visitBlock, returnedItems,
} from '../components.js';
import { fmtExact } from '../money.js';
import { fmtTime } from '../dates.js';
import { withLatency } from '../sim.js';
import { focusAppt, setFocus, redirectIfMoved } from '../focus.js';

const ID = 'c-price-change';

const ui = () => (state.ui[ID] ??= {});
const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];

function view() {
  const a = focusAppt(ID);
  const chromeHtml = chrome('bookings');
  if (!a || (!a.priceChange && a.edit?.state !== 'pending')) {
    return `${chromeHtml}<main class="body ${ID}" data-s="${ID}--none">
  <div class="${ID}__empty" data-empty="no-change">${emptyState({
    title: 'No final order to review', body: 'After your fitting, the order your tailor sends shows up here.',
    ctaLabel: 'Back to Bookings', ctaAct: 'bookings',
  })}</div>
</main>`;
  }
  if (a.status === 'in-progress' && a.edit?.state === 'pending') return editView(a, chromeHtml);
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  const pv = priceChangeView(a);
  const after = pv.after;
  const messaged = pv.state === 'messaged';
  const busy = !!ui().busy;
  const changed = pv.changed;
  /* K-17 (D-242) option A, "strip-led": ONE flush strip states the state and what Amara did, the header row is Amara (the tailor's check) with the one
     amount at the right and what it was under it (R2: kept under the amount), then her note (the only quote), then the order. Once you messaged her
     the strip says so (R3: one notice above the content). */
  const strip = requestStrip({
    page: true, tone: messaged ? 'warn' : 'action', icon: messaged ? 'chat' : 'check',
    text: messaged ? `You messaged ${first} · approve when you’re ready`
      : pv.revisions > 0 ? `Approve your updated order · ${first} updated it again at ${fmtTime(pv.sentAt)}`
      : `Approve your final order · ${first} ${changed ? 'changed it at the fitting' : 'checked everything, nothing changed'}`,
  });
  const head = pageHead(requestHead({
    page: true, name: t.name, initials: t.initials, check: isVerified(t) ? verifiedCheck({ years: t.years }) : '',
    payoutCents: after.total, label: changed ? 'New total' : 'Total', lines: deltaLines(after.total, pv.before.total),
  }));
  const rows = [
    { label: 'Services', cents: after.services, caption: `${first}’s final prices` },
    after.homeFee > 0 && { label: 'Home visit fee', cents: after.homeFee, caption: HOME_FEE_CAPTION },
    after.rush > 0 && { label: 'Rush fee', cents: after.rush },
    { label: changed ? 'New total' : 'Total', cents: after.total, kind: 'total' },
    { label: 'Deposit', cents: after.deposit, caption: 'Stays the same', status: 'Paid' },
    { label: changed ? 'New balance' : 'Balance', cents: after.balance, status: 'Due when ready' },
    after.refund > 0 && { label: 'Refund to your card', cents: after.refund, caption: 'When your order is ready' },
  ].filter(Boolean);
  return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}${messaged ? '--messaged' : ''}" data-changed="${changed}" data-appt="${esc(a.id)}">
  ${navBackMark()}${strip}${head}
  <section class="sec">${sectionHead(changed ? 'What changed' : 'Your order')}
  ${changed ? `<div class="${ID}__summary">${changeSummary(pv.counts)}</div>` : ''}
  ${changeList({ garments: withPhotos(pv.garments, a.job), docs: a.priceChange.docs ?? null, commentLabel: `${first}’s comment` })}</section>
  <section class="sec">${sectionHead('Price')}
  ${moneyRows(rows)}</section>
  ${ui().error ? `<div class="${ID}__fail" role="alert">${banner({ tone: 'error', title: 'Couldn’t approve the order', text: 'Nothing changed, and nothing was charged. Try again.' })}</div>` : ''}
</main>
${actionBar({
    ctaLabel: 'Approve and start', ctaAct: 'approve', busy, busyLabel: 'Approving…',
    lead: `<span>${changed ? 'New balance' : 'Balance'}, due when it’s ready</span><b data-money>${fmtExact(after.balance)}</b>`,
    secondaryLabel: messaged ? 'Open chat' : `Message ${first}`, secondaryAct: 'message',
  })}`;
}

/* ---------- Study-1 B1: "Amara edited your order" ---------- */
function editView(a, chromeHtml) {
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  const ev = jobEditView(a);
  const after = ev.after;
  const busy = !!ui().busy;
  const priced = ev.changed;
  const moved = ev.after.total !== ev.before.total;   // SF-03: a due-date-only edit can move the money (a rush fee drops)
  const strip = requestStrip({ page: true, tone: 'action', icon: 'check', text: `${first} edited your order`, right: ev.sentAt ? `Sent ${fmtTime(ev.sentAt)}` : '' });
  const head = pageHead(requestHead({
    page: true, name: t.name, initials: t.initials, check: isVerified(t) ? verifiedCheck({ years: t.years }) : '',
    payoutCents: after.total, label: priced || moved ? 'New total' : 'Total', lines: priced || moved ? deltaLines(after.total, ev.before.total) : [],
  }));
  const rows = [
    { label: 'Services', cents: after.services, caption: `${first}’s new prices` },
    after.homeFee > 0 && { label: 'Home visit fee', cents: after.homeFee, caption: HOME_FEE_CAPTION },
    after.rush > 0 && { label: 'Rush fee', cents: after.rush },
    ev.before.rush > after.rush && !after.rush && { label: 'Rush fee', caption: 'Removed · later due date', cents: 0 },   // SF-03
    { label: priced || moved ? 'New total' : 'Total', cents: after.total, kind: 'total' },
    { label: 'Deposit', cents: after.deposit, caption: 'Stays the same', status: 'Paid' },
    { label: priced || moved ? 'New balance' : 'Balance', cents: after.balance, status: 'Due when ready' },
    after.refund > 0 && { label: 'Refund to your card', cents: after.refund, caption: 'When your order is ready' },
  ].filter(Boolean);
  const items = returnedItems(a);
  return `${chromeHtml}<main class="body body--with-bar ${ID}" data-s="${ID}--edit" data-edit="pending" data-appt="${esc(a.id)}">
  ${navBackMark()}${strip}${head}
  <div class="${ID}__quote">${noteQuote({ label: `${first}’s reason`, text: ev.reason })}${ev.reasonMasked ? `<p class="t-small c-600 ${ID}__masked">Phone numbers and emails in this reason are hidden.</p>` : ''}</div>
  ${ev.photo ? `<div class="${ID}__photo">${photoFigure({ photo: ev.photo, type: a.job.garments.find((g) => g.id === a.edit?.marks?.[0]?.garmentId)?.type ?? items[0]?.type ?? '', by: first, label: `Photo from ${first}` })}</div>` : ''}
  ${ev.dueChanged ? `<section class="sec">${visitBlock([{ icon: 'clock', value: dueChange({ needBy: ev.needBy, was: ev.needByWas }), strong: true }], { title: '' })}</section>` : ''}
  ${priced ? `<section class="sec">${sectionHead('What changed')}
  <div class="${ID}__summary">${changeSummary(ev.counts)}</div>
  ${changeList({ garments: withPhotos(ev.garments, a.job), docs: a.priceChange?.docs ?? null, commentLabel: `${first}’s comment` })}</section>` : ''}
  <section class="sec">${sectionHead('Price')}
  ${moneyRows(rows)}
  <p class="t-small c-600 ${ID}__hint" data-edit-hint>Something not right? Message ${esc(first)} to change it before the work is finished.</p></section>
  ${ui().error ? `<div class="${ID}__fail" role="alert">${banner({ tone: 'error', title: 'Couldn’t save your answer', text: 'Nothing changed, and nothing was charged. Try again.' })}</div>` : ''}
</main>
${actionBar({
    ctaLabel: 'Approve changes', ctaAct: 'approve-edit', busy, busyLabel: 'Approving…',
    lead: `<span>${priced || moved ? 'New balance' : 'Balance'}, due when it’s ready</span><b data-money>${fmtExact(after.balance)}</b>`,
    secondaryLabel: `Message ${first}`, secondaryAct: 'message',
  })}`;
}

function approveEdit(a) {
  if (ui().busy) return;
  ui().busy = true;
  ui().error = false;
  go(ID);
  withLatency(() => {
    ui().busy = false;
    if (currentScreen() !== ID) return;
    const r = T.approveJobEdit(a.id);
    const first = firstOf(tailorById(a.tailorId));
    if (r.ok) {
      setFocus(a.id);
      go('c-booking', { fresh: true });
      toast(`Changes approved. ${first} carries on with the work.`, { tone: 'success' });
    } else {
      ui().error = true;
      go(ID);
      toast('Couldn’t approve the changes', { tone: 'error' });
    }
  });
}

function approve(a) {
  if (ui().busy) return;
  ui().busy = true;
  ui().error = false;
  go(ID);
  withLatency(() => {
    ui().busy = false;
    if (currentScreen() !== ID) return;
    const r = T.approvePriceChange(a.id);
    const first = firstOf(tailorById(a.tailorId));
    if (r.ok) {
      setFocus(a.id);
      go('c-booking', { fresh: true });
      toast(`Order approved. ${first} can start the work.`, { tone: 'success' });
    } else {
      ui().error = true;                                            // D-140 / A-14: the banner above the bar carries it, the toast only echoes
      go(ID);
      toast('Couldn’t approve the order', { tone: 'error' });
    }
  });
}

function wire(root) {
  if (redirectIfMoved(ID, go, { has: (id) => registered().includes(id) })) return;
  const a = focusAppt(ID);
  wirePhotoViewer(root);   // the customer-photo stack of an item the tailor did not document (K-04)

  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => go('c-bookings'));
  }

  /* K-02: the tailor's Before | Pinned photos from the SENT snapshot only (D-175) */
  const first = firstOf(a ? tailorById(a.tailorId) : null);
  wireGarmentDocs(root, {
    by: `Taken by ${first}`,
    lookup: (gid) => {
      const docs = a?.priceChange?.docs?.[gid];
      const type = (a?.edit?.state === 'pending' ? jobEditView(a) : priceChangeView(a)).garments.find((g) => g.id === gid)?.type ?? '';
      return docs ? { type, docs } : null;
    },
  });

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || e.target.closest('.screen-sheet--overlay')) return;
    const act = el.dataset.act;
    if (act === 'bookings') go('c-bookings', { fresh: true });
    else if (!a) return;
    else if (act === 'approve') approve(a);
    else if (act === 'approve-edit') approveEdit(a);
    else if (act === 'message') go('c-thread');   // opening the chat changes nothing; Sarah's first message marks it (R4-2-C-02)
  });
}

register(ID, view, wire);
