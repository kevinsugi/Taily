/* ============================================================
   a-case — pre-MVP A2 (K-48.1 / D-01): one case for the admin. The state strip (Reply by … / overdue / waiting on them / closed), the
   order it is about (the visit, and every dollar: deposit, balance, the tailor's payout and whether it is on hold), a safety report's
   facts, the money actions open right now (state.js adminActions: refund or keep the deposit, release or capture the hold, cancel the
   order, pause or release the payout — each a confirm sheet in dollars, then a pure transition), Close with outcome (the decision each
   side will read, texted to them), and the conversation: one side at a time (Sarah / Amara), the reply composer underneath.
   ============================================================ */
import { register, render as go } from '../app.js';
import {
  state, T, caseById, caseView, adminInbox, adminActions, decisionPreview, getAppt, tailorById, caseMessages,
} from '../state.js';
import {
  chrome, headingRow, sectionHead, requestStrip, visitBlock, moneyRows, listRow, cta, chipGroup, wireChipGroups, composer, wireComposer,
  caseThread, confirmSheet, banner, infoCard, infoRow, emptyState, esc, toast, wirePhotoViewer, openAttachSheet,
} from '../components.js';
import { fmtWhen, fmtDay, fmtTime, isoDay } from '../dates.js';
import { fmtExact } from '../money.js';
import { VISIT_LABEL } from '../data.js';
import { statusWord } from '../focus.js';
import { withLatency } from '../sim.js';

const ID = 'a-case';
const ui = () => (state.ui[ID] ??= {});
const firstOf = (n) => String(n || '').split(' ')[0];
const fullCustomer = () => `${state.customer.first} ${state.customer.last ?? ''}`.trim();
const whenShort = (iso) => (isoDay(iso) === isoDay(state.clock.now) ? fmtTime(iso) : `${fmtDay(iso).split(',')[0]} ${fmtTime(iso)}`);
const DEPOSIT_WORD = { authorized: 'On hold', captured: 'Paid', kept: 'Kept by tailor', refunded: 'Refunded', released: 'Released' };
const BALANCE_WORD = { pending: 'Due when ready', due: 'Due', held: 'On hold', captured: 'Charged', released: 'Released', refunded: 'Refunded', 'capture-failed': 'Card failed', failed: 'Card failed', none: 'Nothing due' };
const CANCEL_WORD = {
  'no-show': 'the tailor marked a no-show', 'tailor-no-show': 'the customer reported a tailor no-show', 'customer-early': 'the customer cancelled early',
  'customer-late': 'the customer cancelled late', 'tailor-cant-make-it': 'the tailor cancelled', unconfirmed: 'not confirmed in time', 'no-record': 'the visit wasn’t recorded',
  taily: 'cancelled by Taily', withdrawn: 'withdrawn', switched: 'she picked another tailor',
};
const ERRORS = {
  'decide-first': 'A payout is still on hold. Release it, or refund the deposit, first.',
  'no-hold': 'There’s no hold on this order any more.', 'order-open': 'The order is still open. Cancel it instead.', closed: 'This case is already closed.',
};

/** The case on screen: the one asked for, else the first open one, else the newest. */
const currentCase = () => caseById(ui().caseId) ?? adminInbox().open[0]?.c ?? state.cases[state.cases.length - 1] ?? null;
const sideOf = (c) => (c.sides.includes(ui().side) || (c.apptId && ui().side) ? ui().side : c.opener === 'tailor' ? 'tailor' : c.sides[0] ?? 'customer');
const nameOf = (side, a) => (side === 'tailor' ? firstOf(tailorById(a?.tailorId)?.name ?? state.tailors[0].name) : state.customer.first);

function orderSection(a) {
  if (!a) return `<section class="sec">${sectionHead('Order')}<p class="t-body c-700">No order attached. A general question.</p></section>`;
  const t = tailorById(a.tailorId);
  const w = statusWord(a, 'customer', { short: true });
  const d = a.payments.deposit;
  const b = a.payments.balance ?? { cents: 0, state: 'none' };
  const ps = state.payouts.filter((p) => p.apptId === a.id);
  const payRows = ps.length
    ? ps.map((p) => ({ label: `${firstOf(t?.name)}’s ${p.kind === 'job' ? 'payout' : p.kind === 'no-show' ? 'no-show pay' : 'kept deposit'}`, cents: p.cents, status: p.state === 'paid' ? 'Paid' : p.held ? 'On hold' : `Pending · ${fmtDay(p.date)}` }))
    : [{ label: `${firstOf(t?.name)}’s payout`, cents: 0, status: 'Nothing queued' }];
  return `<section class="sec">${sectionHead('Order')}
  ${visitBlock([
    { icon: 'calendar', value: esc(fmtWhen(a.slot.start)), strong: true, detail: esc(`${VISIT_LABEL.customer[a.job.visitType]} · ${a.id}`) },
    { icon: 'hanger', value: esc(`${fullCustomer()} with ${t?.name ?? 'the tailor'}`), detail: esc(a.cancel ? `Cancelled · ${CANCEL_WORD[a.cancel.reason] ?? a.cancel.reason}` : `Now: ${w.label}`) },
  ], { title: '', flush: true })}
  ${moneyRows([
    { label: 'Deposit', cents: d.cents, status: DEPOSIT_WORD[d.state] ?? d.state },
    { label: 'Balance', cents: b.cents ?? 0, status: BALANCE_WORD[b.state] ?? b.state },
    ...payRows,
  ])}</section>`;
}
function safetySection(c) {
  if (c.kind !== 'safety') return '';
  const about = c.safety?.about === 'tailor' ? tailorById(c.safety.tailorId)?.name ?? 'the tailor' : fullCustomer();
  return `<section class="sec">${sectionHead('Safety')}${infoCard([
    infoRow('From', esc(c.opener === 'tailor' ? state.tailors[0].name : fullCustomer())),
    infoRow('About', esc(about)),
    ...(c.safety?.block ? [infoRow('Blocked', 'Yes · neither can book the other')] : []),
  ].join(''))}</section>`;
}
function stripOf(c, v) {
  const a = v.appt;
  if (!v.open) return requestStrip({ tone: 'done', icon: 'check', text: 'Closed', right: whenShort(c.closedAt), page: true });
  if (v.replyBy) return requestStrip({ tone: 'warn', icon: 'chat', text: v.overdue ? 'Overdue' : 'Your reply', right: `${v.overdue ? 'Was due' : 'By'} ${whenShort(v.replyBy)}`, page: true });
  return requestStrip({ tone: 'calm', icon: 'chat', text: `Waiting on ${c.sides.length > 1 ? 'them' : nameOf(c.sides[0], a)}`, page: true });
}

function view() {
  const c = currentCase();
  if (!c) {
    return `${chrome('inbox', { persona: 'admin' })}
<main class="body ${ID}" data-s="${ID}--none">
  ${headingRow('<h1 class="t-title">Case</h1>')}
  <div class="${ID}__empty">${emptyState({ title: 'No case open', body: 'Cases show up in your inbox.', ctaLabel: 'Back to Inbox', ctaAct: 'inbox' })}</div>
</main>`;
  }
  const u = ui();
  const v = caseView(c, 'admin');
  const a = v.appt;
  const side = sideOf(c);
  const both = !!a || c.sides.length > 1;
  const acts = adminActions(c);
  const actions = v.open ? `<section class="sec">${sectionHead('Actions')}
  ${acts.length ? `<div class="card card--list ${ID}__acts">${acts.map((x) => listRow({
    title: x.tone === 'danger' ? `<span class="more-item--danger">${esc(x.label)}</span>` : esc(x.label), sub: esc(x.sub), act: 'admin-act', attrs: `data-kind="${esc(x.kind)}"`,
    right: x.cents ? `<span data-money>${fmtExact(x.cents)}</span>` : '',
  })).join('')}</div>` : `<p class="t-small c-600">${a ? 'No money to move on this order right now.' : 'No order attached, so there’s no money to move.'}</p>`}
  <div class="${ID}__close">${cta('Close with outcome', { attrs: 'data-act="close-case"' })}</div></section>` : '';
  const decided = !v.open ? `<section class="sec">${sectionHead('Outcome')}${infoCard(c.sides.map((s) => infoRow(nameOf(s, a), `<span data-money>${esc(c.outcome?.lines?.[s] ?? '')}</span>`)).join(''))}</section>` : '';
  const switcher = both ? `<div class="${ID}__side">${chipGroup({ name: 'case-side', variant: 'segmented', label: 'Conversation with', value: side,
    options: ['customer', 'tailor'].map((s) => ({ value: s, label: `${nameOf(s, a)}${caseMessages(c, s).length ? '' : ' · new'}` })) })}</div>` : '';
  const thread = caseMessages(c, side).length ? caseThread(c, side, { reader: 'taily', now: state.clock.now, sending: u.sending ?? null })
    : `<p class="t-small c-600 ${ID}__nothing">Nothing with ${esc(nameOf(side, a))} yet. Your reply starts it.</p>`;
  const foot = v.open
    ? composer({ value: u.draft ?? '', placeholder: `Reply to ${nameOf(side, a)}`, photos: u.photos ?? 0, disabled: !!u.sending })
    : `<div class="read-only">${banner({ tone: 'info', text: `Closed ${whenShort(c.closedAt)}. Both were told the outcome.` })}${cta('Back to Inbox', { variant: 'secondary', attrs: 'data-act="inbox"' })}</div>`;
  return `${chrome('inbox', { persona: 'admin' })}
<main class="body ${ID}" data-s="${ID}" data-case="${esc(c.id)}">
  ${stripOf(c, v)}
  ${headingRow(`<h1 class="t-title">${esc(v.title)}</h1><!--notes--><p class="t-small c-600 ${ID}__ref">${esc(c.ref)} · opened ${esc(whenShort(c.openedAt))} · ${esc(c.kind === 'review' ? 'Taily review' : c.kind === 'safety' ? 'Safety' : 'Help')}</p><!--/notes-->`, { back: true })}
  ${orderSection(a)}
  ${safetySection(c)}
  ${actions}
  ${decided}
  <section class="sec ${ID}__conv">${sectionHead('Conversation')}${switcher}<div class="${ID}__thread">${thread}</div></section>
</main>
<div class="${ID}__foot">${foot}</div>`;
}

function wire(root) {
  const c = currentCase();
  if (!c) { root.addEventListener('click', (e) => { if (e.target.closest('[data-act="inbox"]')) go('a-inbox'); }); return; }
  const u = ui();
  u.caseId = c.id;
  T.markCaseRead(c.id, 'admin');
  wireChipGroups(root);
  wirePhotoViewer(root);
  root.addEventListener('chip', (e) => { if (e.detail.name === 'case-side') { u.side = e.detail.value; u.draft = ''; go(ID, { replace: true }); } });
  const foot = root.querySelector(`.${ID}__foot`);
  const input = foot?.querySelector('.composer__input');
  if (input) {
    wireComposer(foot, (text) => {
      const side = sideOf(c);
      const photos = u.photos ?? 0;
      u.draft = ''; u.photos = 0; u.sending = { text, photos };
      go(ID, { replace: true });
      withLatency(() => {
        u.sending = null;
        const r = T.adminReply(c.id, side, { text, photos });
        go(ID, { replace: true });
        if (!r.ok) toast('Reply not sent', { tone: 'error' }); else toast(`Sent to ${nameOf(side, getAppt(c.apptId))} and texted`, { tone: 'success' });
      });
    });
    input.addEventListener('input', () => { u.draft = input.value; });
  }
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    const act = el.dataset.act;
    if (act === 'inbox') go('a-inbox');
    else if (act === 'attach-photo') openAttachSheet({ count: u.photos ?? 0, peer: nameOf(sideOf(c), getAppt(c.apptId)) }, () => { u.photos = (u.photos ?? 0) + 1; go(ID, { replace: true }); });
    else if (act === 'remove-attachment') { u.photos = Math.max(0, (u.photos ?? 0) - 1); go(ID, { replace: true }); }
    else if (act === 'admin-act') {
      const x = adminActions(c).find((k) => k.kind === el.dataset.kind);
      if (!x) return;
      confirmSheet({ header: x.label, body: esc(x.confirm), ok: x.label, danger: x.tone === 'danger', dataS: `${ID}--act`, busyLabel: 'Saving…' }, () => {
        const r = T.adminAct(c.id, x.kind);
        if (!r.ok) return ERRORS[r.error] ?? 'Couldn’t do that. Try again.';
        go(ID, { replace: true });
        toast('Done. Close the case to tell them both.', { tone: 'success' });
        return null;
      });
    } else if (act === 'close-case') {
      const a = getAppt(c.apptId);
      const lines = decisionPreview(c.id);
      const body = Object.entries(lines).map(([s, l]) => `<span class="${ID}__preview"><span class="t-small w-600">${esc(nameOf(s, a))} reads:</span> ${esc(l)}</span>`).join('');
      confirmSheet({ header: 'Close with outcome', body, ok: 'Close and tell them', dataS: `${ID}--close`, busyLabel: 'Closing…' }, () => {
        const r = T.adminCloseCase(c.id);
        if (!r.ok) return ERRORS[r.error] ?? 'Couldn’t close it. Try again.';
        go(ID, { replace: true });
        toast('Closed. They each got a text.', { tone: 'success' });
        return null;
      });
    }
  });
}

register(ID, view, wire);
