/* ============================================================
   c-request — C6 Request sent (M1 state; M3 adds the outcomes).
   Focal: the countdown. Reassure: the request is out, the money is only
   held, here is the clock and what happens next. Withdraw is built now
   so the 2-hour wait has an exit (D-41).
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, T, activeAppt, tailorById, now } from '../state.js';
import {
  chrome, statusHero, countdown, visitBlock, timeline, customerBreakdown, cta, emptyState, sheetOverlay, toast, esc,
} from '../components.js';
import { fmtExact, cancelTerms } from '../money.js';
import { fmtWhen, fmtTime } from '../dates.js';
import { VISIT_LABEL } from '../data.js';
import { POLICY } from '../money-config.js';

const ID = 'c-request';

const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const money = (cents) => `<span data-money>${fmtExact(cents)}</span>`;

/** The Status Hero without the Back control (the booking flow is finished): the notes block sits under the title. */
function heroRow(html) {
  const m = /<!--notes-->([\s\S]*?)<!--\/notes-->/.exec(html);
  const notes = m ? m[1] : '';
  const head = m ? html.replace(m[0], '') : html;
  return `<div class="heading-row c-request__head"><div class="heading-row__body">${head}</div></div>${notes}`;
}

function visitRows(a, t) {
  const home = a.job.visitType === 'home';
  const ad = a.job.address ?? state.customer.address;
  const where = home
    ? [ad.street, ad.unit, ad.city].filter(Boolean).join(', ')
    : [t.shopName, t.shop?.street].filter(Boolean).join(', ');
  const items = a.job.garments.length;
  const services = a.job.garments.reduce((n, g) => n + g.services.length, 0);
  return [
    `${fmtWhen(a.slot.start)} · ${VISIT_LABEL.customer[a.job.visitType]}`,
    esc(where),
    `${items} ${items === 1 ? 'item' : 'items'} · ${services} ${services === 1 ? 'service' : 'services'}`,
  ];
}

/* Outcomes belong to M3; until then a non-"requested" appointment gets a plain heading so the page never lies. */
const OTHER = {
  suggested: { pill: 'suggested', title: (f) => `${f} suggested a new time` },
  declined: { pill: 'declined', title: (f) => `${f} can’t take this one` },
  expired: { pill: 'expired', title: () => 'No reply in time' },
};

function view() {
  const a = activeAppt();
  const head = chrome('bookings');
  if (!a || !(a.status === 'requested' || OTHER[a.status])) {
    return `${head}<main class="body ${ID}" data-s="${ID}">
  <div class="c-request__empty" data-empty="no-request">${emptyState({
    title: 'No open requests', body: 'When you send a request, you can follow it here.', ctaLabel: 'Start a booking', ctaAct: 'home',
  })}</div>
</main>`;
  }
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  const open = a.status === 'requested';
  const hours = POLICY.REQUEST_EXPIRY_H;
  const late = open && cancelTerms(a, now()).window === 'late';

  const hero = open
    ? statusHero({
      variant: 'requested', pill: 'requested', pillLabel: 'Request sent', title: `Waiting for ${esc(first)}`,
      body: `${esc(first)} has ${hours} hours to reply. We’ll text you the moment there’s a reply.`,
    })
    : statusHero({ variant: a.status === 'declined' ? 'declined' : 'requested', pill: OTHER[a.status].pill, title: OTHER[a.status].title(esc(first)) });

  return `${head}<main class="body ${ID}" data-s="${ID}">
  ${heroRow(hero)}
  ${open ? `<div class="c-request__clock">
    ${countdown({ expiresAt: a.expiresAt, now: now() })}
    <span class="t-small c-600">Reply by ${fmtTime(a.expiresAt)}</span>
  </div>` : ''}
  <div class="c-request__block">${visitBlock(visitRows(a, t), { title: 'Your visit', flush: true })}</div>
  ${open ? `<h2 class="t-h2 c-request__h2">What happens next</h2>
  ${timeline([
    { state: 'done', title: 'Request sent', sub: fmtWhen(a.requestedAt) },
    { state: 'current', title: `${esc(first)} replies`, sub: `Within ${hours} hours, by ${fmtTime(a.expiresAt)}` },
    { state: 'todo', title: 'You’re booked', sub: `The ${money(a.payments.deposit.cents)} deposit is charged when ${esc(first)} accepts` },
  ])}
  <p class="t-small c-600 c-request__note">If ${esc(first)} declines or doesn’t reply, the hold is released and your job stays saved.${late ? ` This visit is less than ${POLICY.CANCEL_WINDOW_H} hours away. If you cancel after ${esc(first)} accepts, the ${money(a.payments.deposit.cents)} deposit is kept.` : ''}</p>` : ''}
  <h2 class="t-h2 c-request__h2">Price</h2>
  ${customerBreakdown(a.money, { stage: 'booked', tailorFirst: first, depositState: a.payments.deposit.state })}
  <div class="c-request__actions">
    ${cta(`Message ${esc(first)}`, { attrs: 'data-act="message"' })}
    ${a.status === 'requested' || a.status === 'suggested' ? cta('Withdraw request', { variant: 'secondary', attrs: 'data-act="withdraw"' }) : ''}
  </div>
</main>`;
}

function openWithdraw(a) {
  const deposit = a.payments.deposit.cents;
  sheetOverlay(`<div class="c-request-sheet">
  <p class="t-body">The ${money(deposit)} hold is released right away. Your job stays saved so you can pick another time or tailor.</p>
  ${cta('Withdraw request', { attrs: 'data-act="withdraw-ok"' })}
  ${cta('Keep request', { variant: 'secondary', attrs: 'data-act="withdraw-keep"' })}
</div>`, { header: 'Withdraw this request?', dataS: 'c-request--withdraw', confirm: false }, (holder, close) => {
    holder.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'withdraw-keep') close();
      else if (act === 'withdraw-ok') {
        const res = T.withdrawRequest(a.id);
        close();
        if (!res.ok) { toast('Something went wrong. Your request is still open.', { tone: 'error' }); return; }
        go('c-tailors', { fresh: true });
        toast(`Request withdrawn. ${fmtExact(deposit)} hold released.`);
      }
    });
  });
}

/* #screen is the same element on every render — drop the previous render's delegate before adding ours */
let offClick = null;

function wire(root) {
  offClick?.();
  const onClick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act || e.target.closest('.screen-sheet--overlay')) return;
    if (act === 'message') go('c-thread');
    else if (act === 'withdraw') { const a = activeAppt(); if (a) openWithdraw(a); }
    else if (act === 'home') go('c-job', { fresh: true });
  };
  root.addEventListener('click', onClick);
  offClick = () => root.removeEventListener('click', onClick);
}

register(ID, view, wire);
