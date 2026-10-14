/* ============================================================
   c-bookings — the Bookings tab. Every request and visit in one place,
   sorted by what needs Sarah next: Requests, In progress, Upcoming, Past (D-78, D-116).
   Focal: the first row of the first non-empty section.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, apptsFor, tailorById, statusScreen, now, priceChangeView } from '../state.js';
import { chrome, headingRow, apptRow, emptyState, banner, toast, esc } from '../components.js';
import { fmtColumn } from '../money.js';
import { fmtWhen, fmtCountdown, toDate } from '../dates.js';
import { VISIT_LABEL } from '../data.js';
import { POLICY } from '../money-config.js';
import { setFocus, statusWord, sinceText } from '../focus.js';

const ID = 'c-bookings';

const firstOf = (t) => (t?.name || 'The tailor').split(' ')[0];
const ms = (iso) => toDate(iso).getTime();

/* D-116: work that has started (fitting → returning) is "In progress", not "Upcoming" — the same split as the tailor's Home (D-115) */
const PROGRESS = ['fitting', 'price-change', 'in-progress', 'ready', 'returning'];
const STEP = { fitting: 'Fitting', 'price-change': 'Final order', 'in-progress': 'Tailoring', ready: 'Ready' };
/** An in-progress row's time line: the step and since when ("Out for delivery · since 5:00 PM"), never the past visit time. */
const stepLine = (a) => `${STEP[a.status] ?? statusWord(a, 'customer').label} · ${sinceText(a)}`;
/** The ready / in-progress rows: the pill already names the step, so the sub is only since when (C-19). */
const sinceCap = (a) => { const t = sinceText(a); return t[0].toUpperCase() + t.slice(1); };
const dropped = (a) => a.status === 'cancelled' && ['withdrawn', 'switched'].includes(a.cancel?.reason);
const lastAt = (a) => ms(a.history[a.history.length - 1]?.at ?? a.requestedAt);

function section(a) {
  if (dropped(a)) return null;
  if (['requested', 'suggested'].includes(a.status)) return 'requests';
  if (a.status === 'expired') return a.retries < POLICY.MAX_RETRIES ? 'requests' : 'past';
  if (PROGRESS.includes(a.status)) return 'progress';
  if (a.status === 'confirmed') return 'upcoming';
  return 'past';                                   // cancelled · declined · completed
}

/** Customer pill per the status table (B2, D-87): [status key, label | undefined for the default label]. */
function pillFor(a) {
  switch (a.status) {
    case 'requested': return ['requested', 'Request sent'];
    case 'suggested': return ['suggested', 'New time'];   // short in the list (R3-1-C-05); the detail screen says "New time suggested"
    case 'declined': return ['declined', 'Declined'];
    case 'expired': return ['expired', 'No reply'];
    case 'cancelled': {
      const r = a.cancel?.reason;
      if (r === 'no-show') return ['cancelled', 'No-show'];
      return ['cancelled', 'Cancelled'];   // who cancelled goes in the caption (R3-1-C-05)
    }
    default: {
      /* M4 statuses: the shared word table, short form for the list (D-108) */
      const w = statusWord(a, 'customer', { short: true });
      return [w.pill, w.label];
    }
  }
}

function rowFor(a, kind, fmtAmt) {
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = firstOf(t);
  const [status, pillLabel] = pillFor(a);
  const row = {
    id: a.id,
    name: t.name,
    initials: t.initials,
    when: kind === 'progress' ? (['ready', 'in-progress'].includes(a.status) ? sinceCap(a) : stepLine(a)) : fmtWhen(a.status === 'suggested' && a.suggested ? a.suggested.start : a.slot.start),
    place: VISIT_LABEL.customer[a.job.visitType],
    status,
    pillLabel,
    muted: kind === 'past',
  };
  if (kind === 'requests') {
    if (a.status === 'requested') {
      const left = ms(a.expiresAt) - now();
      row.amountCaption = left > 0 ? `${fmtCountdown(left)} to reply` : 'Reply overdue';
    } else if (a.status === 'suggested') { row.amountCaption = 'Reply needed'; row.captionTone = 'action'; }
    else if (a.status === 'expired') row.amountCaption = `Try again (${a.retries + 1} of ${POLICY.MAX_RETRIES})`;   // R3-1-C-06: what Sarah can do
  } else if (kind === 'upcoming' || kind === 'progress') {
    row.amountText = `Est. ${fmtAmt(a.money.total)}`;
    if (a.status === 'price-change') {
      row.amountText = fmtAmt(priceChangeView(a).after.total);
      row.amountCaption = 'Reply needed'; row.captionTone = 'action';
    } else if (a.status === 'in-progress') { row.amountText = fmtAmt(a.money.total); row.amountCaption = 'Total'; }
    else if (a.status === 'ready') { row.amountText = fmtAmt(a.money.balance); row.amountCaption = 'Pay now'; row.captionTone = 'action'; }
    else if (a.status === 'returning') { row.amountText = fmtAmt(a.money.total); row.amountCaption = 'Paid'; }
  }
  if (kind === 'past' && a.status === 'completed') {
    row.amountText = fmtAmt(a.money.total);
    if (a.review) row.amountCaption = 'Paid';
    else { row.amountCaption = 'Leave a review'; row.captionTone = 'action'; }
  } else if (kind === 'past') {
    /* R3-2-C-06 / R3-1-C-13: say what happened to the deposit, in dollars, and who ended it */
    const dep = a.payments.deposit;
    const word = { refunded: 'Refunded', kept: 'Kept', released: 'Hold released' }[dep.state];   // C-10: the D-135 words (Paid / Refunded / Kept)
    if (word) { row.amountText = fmtAmt(dep.cents); row.amountCaption = word; }
    if (a.status === 'cancelled') {
      const r = a.cancel?.reason;
      if (r === 'tailor-cant-make-it') row.place = `${first} cancelled`;
      else if (r === 'customer-early' || r === 'customer-late') row.place = 'You cancelled';
    }
    row.kept = a.status === 'declined' || (a.status === 'cancelled' && ['tailor-cant-make-it', 'customer-late', 'no-show'].includes(a.cancel?.reason));
  }
  return apptRow(row);
}

function view() {
  const mine = apptsFor('customer');
  const groups = { requests: [], progress: [], upcoming: [], past: [] };
  for (const a of mine) { const g = section(a); if (g) groups[g].push(a); }
  groups.requests.sort((x, y) => ms(x.expiresAt) - ms(y.expiresAt));
  groups.progress.sort((x, y) => ms(x.slot.start) - ms(y.slot.start));
  groups.upcoming.sort((x, y) => ms(x.slot.start) - ms(y.slot.start));
  groups.past.sort((x, y) => lastAt(y) - lastAt(x));

  const head = `${chrome('bookings')}<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Bookings</h1>', { back: false })}`;
  if (!groups.requests.length && !groups.progress.length && !groups.upcoming.length && !groups.past.length) {
    return `${head}
  <div class="${ID}__empty" data-empty="bookings">${emptyState({
    title: 'No bookings yet', body: 'When you book a tailor, your requests and visits show up here.', ctaLabel: 'Start a booking', ctaAct: 'home',
  })}</div>
</main>`;
  }

  /* D-98: one precision across the whole screen — upcoming totals and past deposits share a formatter */
  const live = [...groups.progress, ...groups.upcoming];
  const fmtAmt = fmtColumn([
    ...live.map((a) => a.money.total),
    ...live.filter((a) => a.status === 'price-change').map((a) => priceChangeView(a).after.total),
    ...live.filter((a) => a.status === 'ready').map((a) => a.money.balance),
    ...groups.past.map((a) => (a.status === 'completed' ? a.money.total : a.payments.deposit.cents)),
  ]);
  const TITLES = { requests: 'Requests', progress: 'In progress', upcoming: 'Upcoming', past: 'Past' };
  const blocks = Object.entries(groups).filter(([, list]) => list.length).map(([kind, list]) => `<section class="${ID}__section" data-section="${kind}" aria-labelledby="${ID}-${kind}">
    <h2 class="t-h2" id="${ID}-${kind}">${TITLES[kind]}</h2>
    <div class="${ID}__rows">${list.map((a) => rowFor(a, kind, fmtAmt)).join('')}</div>
  </section>`).join('\n  ');
  /* M6-X-11: notifications off while a request waits — the reply is the thing she would miss (the tailor's Home has the same banner, D-85) */
  const waiting = groups.requests.find((a) => a.status === 'requested');
  const push = state.sim.push === 'denied' && waiting
    ? `<div class="${ID}__push">${banner({ tone: 'warning', title: 'Notifications are off', text: `Turn on notifications to hear the moment ${esc(firstOf(tailorById(waiting.tailorId)))} replies.`, actionLabel: 'Open Settings', actionAct: 'push-settings' })}</div>` : '';
  return `${head}
  ${push}
  ${blocks}
</main>`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    if (el.dataset.act === 'open-appt') {
      const a = apptsFor('customer').find((x) => x.id === el.dataset.id);
      if (!a) return;
      setFocus(a.id);
      go(statusScreen(a, 'customer'));
    } else if (el.dataset.act === 'push-settings') {
      state.sim.push = 'granted';                 // prototype stand-in for the OS toggle (D-85)
      go(ID);
      toast('Notifications are on');
    } else if (el.dataset.act === 'home') go('c-job', { fresh: true });
  });
}

register(ID, view, wire);
