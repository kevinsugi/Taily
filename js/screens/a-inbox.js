/* ============================================================
   a-inbox — pre-MVP A2 (K-48.1: Taily support = the CEO): the admin's inbox. Open cases first (the ones Taily owes a reply on lead,
   overdue in the stop tone), then every notification newest first (new Help cases, safety reports and blocks, messages on a case, and
   every A1 review: a final order unanswered 7 days, a handoff problem, K-48.5's unanswered visit, the D-14 disputes …), then closed
   cases. The nav badge and the summary line count the unread notifications. Each row opens a-case.
   K-52 / K-53 a8 (D-421, D-422): his session's own row at the end — Test flows (the panel, only for the signed-in admin) and Sign out
   (→ a-login; the tools hide again).
   ============================================================ */
import { register, render as go, openTestFlows, lockTools, toolsAvailable } from '../app.js';
import { state, T, adminInbox, getAppt, tailorById, caseById } from '../state.js';
import { chrome, headingRow, sectionHead, statusPill, emptyState, esc, textLink } from '../components.js';
import * as A from '../account.js';
import { fmtDay, fmtTime, isoDay } from '../dates.js';

const ID = 'a-inbox';
const firstOf = (n) => String(n || '').split(' ')[0];
const fullCustomer = () => `${state.customer.first} ${state.customer.last ?? ''}`.trim();
const whenShort = (iso) => (isoDay(iso) === isoDay(state.clock.now) ? fmtTime(iso) : `${fmtDay(iso).split(',')[0]} ${fmtTime(iso)}`);

/** Who a case is about: "Sarah Chen · Amara Reyes", or the one person on a general case. */
function partiesOf(c) {
  const a = c.apptId ? getAppt(c.apptId) : null;
  if (a) return `${fullCustomer()} · ${tailorById(a.tailorId)?.name ?? 'Tailor'}`;
  return c.opener === 'tailor' ? state.tailors[0].name : fullCustomer();
}
function caseRow({ c, view: v }) {
  let pill;
  let when;
  if (!v.open) { pill = statusPill('case-closed'); when = `Closed ${whenShort(c.closedAt)}`; }
  else if (v.replyBy) { pill = statusPill(v.overdue ? 'case-overdue' : 'case-reply'); when = `${v.overdue ? 'Was due' : 'Reply by'} ${whenShort(v.replyBy)}`; }
  else {
    const waitingOn = c.sides.length > 1 ? 'them' : firstOf(c.opener === 'tailor' ? state.tailors[0].name : state.customer.first);
    pill = statusPill('case-waiting', `Waiting on ${waitingOn}`); when = '';
  }
  return `<button type="button" class="admin-row${v.unread ? ' admin-row--unread' : ''}" data-act="open-case" data-case="${esc(c.id)}">
  <span class="admin-row__head"><span class="admin-row__title t-body ${v.unread ? 'w-700' : 'w-600'}">${esc(v.title)}</span><span class="admin-row__ref t-small c-600">${esc(c.ref)}</span></span>
  <span class="admin-row__who t-small c-700">${esc(partiesOf(c))}</span>
  <span class="admin-row__foot">${pill}${when ? `<span class="t-small c-600">${esc(when)}</span>` : ''}${v.unread ? `<span class="admin-row__badge t-micro w-700" aria-hidden="true">${v.unread}</span><span class="sr-only">${v.unread} new</span>` : ''}</span>
</button>`;
}
function noteRow(n) {
  return `<button type="button" class="admin-note${n.read ? '' : ' admin-note--unread'}" data-act="open-note" data-id="${esc(n.id)}" data-case="${esc(n.caseId ?? '')}">
  ${n.read ? '' : '<span class="admin-note__dot" aria-hidden="true"></span>'}<span class="admin-note__text t-small ${n.read ? 'c-700' : 'w-600'}">${esc(n.text)}${n.read ? '' : '<span class="sr-only">, unread</span>'}</span><span class="admin-note__time t-small c-600">${esc(whenShort(n.at))}</span>
</button>`;
}

function view() {
  const box = adminInbox();
  const owed = box.open.filter((r) => r.view.replyBy).length;
  const summary = [`${box.open.length} open`, owed ? `${owed} waiting on you` : '', box.unread ? `${box.unread} unread` : ''].filter(Boolean).join(' · ');
  const empty = !box.open.length && !box.notifications.length && !box.closed.length;
  return `${chrome('inbox', { persona: 'admin' })}
<main class="body ${ID}" data-s="${ID}${empty ? '--empty' : ''}">
  ${headingRow('<h1 class="t-title">Inbox</h1>', { back: false })}
  <p class="t-small c-600 ${ID}__who">Taily admin · Kevin</p>
  ${empty ? `<div class="${ID}__empty" data-empty="inbox">${emptyState({ title: 'Nothing waiting', body: 'New Help cases, safety reports and Taily reviews show up here, and you get a text for each one.' })}</div>` : `
  <p class="t-body c-700 ${ID}__summary" data-summary>${esc(summary)}</p>
  ${box.open.length ? `<section class="sec">${sectionHead('Open cases', { count: box.open.length })}<div class="${ID}__list">${box.open.map(caseRow).join('')}</div></section>` : ''}
  ${box.notifications.length ? `<section class="sec">${sectionHead('Notifications', { count: box.unread ? `${box.unread} unread` : '' })}<div class="${ID}__notes card card--list">${box.notifications.map(noteRow).join('')}</div></section>` : ''}
  ${box.closed.length ? `<section class="sec">${sectionHead('Closed')}<div class="${ID}__list">${box.closed.map(caseRow).join('')}</div></section>` : ''}`}
  <div class="page-actions ${ID}__tools" data-admin-tools><div class="page-actions__links">${toolsAvailable() ? textLink('Test flows', { act: 'test-flows' }) : ''}${textLink('Sign out', { act: 'admin-sign-out', tone: 'muted' })}</div></div>
</main>`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.dataset.act === 'test-flows') { openTestFlows(); return; }   // K-53 a8 (D-422)
    if (el.dataset.act === 'admin-sign-out') { A.adminSignOut(); lockTools(); go('a-login', { fresh: true }); return; }   // K-52 (D-421)
    if (el.dataset.act === 'open-note') {
      T.adminMarkRead(el.dataset.id);
      if (el.dataset.case && caseById(el.dataset.case)) { state.ui['a-case'] = { caseId: el.dataset.case }; go('a-case'); } else go(ID, { replace: true });
    } else if (el.dataset.act === 'open-case') { state.ui['a-case'] = { caseId: el.dataset.case }; go('a-case'); }
  });
}

register(ID, view, wire);
