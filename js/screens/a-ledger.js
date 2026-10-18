/* ============================================================
   a-ledger — K-53 (c7): the admin's Ledger, read-only. Every money event across every appointment (state.js ledger(), derived from
   the payments, holds, courier records and payouts): deposit hold / capture / release / refund, the balance hold placed at ready and
   its capture or release, courier holds, window changes charged on their own, the Uber pass-through and Taily's courier fee (and any
   difference Taily absorbed), Taily fee revenue, kept deposits, payouts (pending / paid / held). Filters: day · order · person, as
   radio chip groups; the totals follow the filters. All dollars. Second tab of the admin nav (Inbox · Ledger).
   PROTOTYPE note in the footer: the books live in QuickBooks Online or Xero, fed from Stripe.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, ledger } from '../state.js';
import { chrome, headingRow, sectionHead, moneyRows, chipGroup, wireChipGroups, emptyState, esc } from '../components.js';
import { fmtDay, fmtTime, isoDay } from '../dates.js';

const ID = 'a-ledger';
const ui = () => (state.ui[ID] ??= { day: '', apptId: '', person: '' });
const ALL = '';

/** The status word on a row, by what kind of line it is (and a payout's own state). */
function statusOf(r) {
  if (r.kind === 'payout') return { pending: `Due ${fmtDay(r.date)}`, held: 'Held', paid: 'Sent', failed: 'Sent back' }[r.state] ?? 'Pending';
  return { hold: 'Hold', in: 'Charged', out: 'Refunded', release: 'Released', revenue: 'Taily', cost: 'Taily cost', tailor: 'To tailor', note: '' }[r.flow] ?? '';
}
/** Refunds, released holds and Taily's costs read negative ("−$16.00"); everything else is the plain amount. */
const KIND = { out: 'negative', release: 'negative', cost: 'negative' };

function filters(opts, f) {
  const days = [{ value: ALL, label: 'All days' }, ...opts.days.slice().sort().map((d) => ({ value: d, label: fmtDay(d) }))];
  const orders = [{ value: ALL, label: 'All orders' }, ...opts.orders.map((o) => ({ value: o.id, label: o.label.split(' · ')[0] }))];
  const people = [{ value: ALL, label: 'Everyone' }, ...opts.people.map((p) => ({ value: p.key, label: p.label }))];
  return `<div class="${ID}__filters">
  ${chipGroup({ name: 'day', label: 'Day', options: days, value: f.day })}
  ${chipGroup({ name: 'order', label: 'Order', options: orders, value: f.apptId })}
  ${chipGroup({ name: 'person', label: 'Person', options: people, value: f.person })}
</div>`;
}

function totalsHtml(t) {
  return moneyRows([
    { label: 'On hold now', cents: t.held, caption: 'Deposits and balances authorized, not charged' },
    { label: 'Charged', cents: t.charged, caption: 'Deposits, balances and courier changes' },
    { label: 'Refunded', cents: t.refunded, kind: t.refunded ? 'negative' : 'default' },
    { label: 'Released', cents: t.released, kind: t.released ? 'negative' : 'default', caption: 'Holds let go, never charged' },
    { label: 'Courier, paid to Uber', cents: t.uber },
    { label: 'Kept deposits', cents: t.kept, caption: 'Late cancels and no-shows, to the tailor' },
    { label: 'Payouts paid', cents: t.paid },
    { label: 'Payouts pending', cents: t.pending, caption: 'Paid out on Fridays' },
    ...(t.heldPayouts ? [{ label: 'Payouts held', cents: t.heldPayouts }] : []),
    { label: 'Taily revenue', cents: t.revenue, kind: 'total', caption: 'Taily fees and courier fees, less any difference absorbed' },
  ]);
}

function dayGroups(rows) {
  const byDay = new Map();
  for (const r of rows) {
    const d = isoDay(r.at);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(r);
  }
  return [...byDay.entries()].map(([d, rs]) => `<section class="sec ${ID}__day" aria-labelledby="${ID}-d-${d}">
    ${sectionHead(fmtDay(d), { id: `${ID}-d-${d}`, count: rs.length })}
    ${moneyRows(rs.map((r) => ({
    label: r.label,
    cents: r.cents,
    kind: KIND[r.flow] ?? 'default',
    caption: [fmtTime(r.at), r.ref, `${r.customer} · ${r.tailor}`, r.note].filter(Boolean).join(' · '),
    status: statusOf(r),
  })))}
  </section>`).join('');
}

function view() {
  const f = ui();
  const { rows, totals, options } = ledger({ day: f.day || null, apptId: f.apptId || null, person: f.person || null });
  const none = !options.days.length;
  return `${chrome('ledger', { persona: 'admin' })}
<main class="body ${ID}" data-s="${ID}${none ? '--empty' : ''}">
  ${headingRow('<h1 class="t-title">Ledger</h1>', { back: false })}
  <p class="t-small c-600 ${ID}__who">Taily admin · every money event, newest first</p>
  ${none ? `<div class="${ID}__empty" data-empty="ledger">${emptyState({ title: 'No money yet', body: 'Deposits, holds, charges, refunds and payouts show up here as soon as a request is sent.' })}</div>` : `
  ${filters(options, f)}
  <section class="sec ${ID}__totals" aria-labelledby="${ID}-totals" data-totals>
    ${sectionHead('Totals', { id: `${ID}-totals`, aside: `<span class="t-small c-600">${rows.length} ${rows.length === 1 ? 'event' : 'events'}</span>` })}
    ${totalsHtml(totals)}
  </section>
  ${rows.length ? dayGroups(rows) : `<p class="t-body c-600 ${ID}__nothing" data-empty="filtered">Nothing matches these filters.</p>`}`}
  <p class="t-small c-600 ${ID}__books" data-books>Prototype: the books live in QuickBooks Online or Xero, fed from Stripe. This view reads the same events, so every line here has a Stripe event behind it.</p>
</main>`;
}

function wire(root) {
  wireChipGroups(root);
  root.addEventListener('chip', (e) => {
    const { name, value } = e.detail;
    const f = ui();
    if (name === 'day') f.day = value;
    else if (name === 'order') f.apptId = value;
    else if (name === 'person') f.person = value;
    go(ID, { replace: true });
  });
}

register(ID, view, wire);
