/* ============================================================
   c-account — C13 Account. DG-3 option A (K-49, pre-MVP B2; D-370): one list in three groups — You (Personal info,
   Texts), Bookings and payment (addresses, cards, past orders), Help and policies (Help → c-help, the four legal pages → c-policy, D-380) —
   then Sign out (muted) and Delete account (danger). Every row says its current value, so the list is also the status.
   Sign out and Delete account confirm in the one confirm sheet (P-32); Delete is blocked with the reason while a booking,
   a balance or a Taily case is open. Focal: the profile line.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, apptsFor, textsOn } from '../state.js';
import { chrome, headingRow, avatar, listRow, textLink, sectionHead, esc } from '../components.js';
import { openSignOut, openDeleteAccount, seeBlocker } from '../account-ui.js';
import { LEGAL_FOR, policyTitle } from '../policies.js';

const ID = 'c-account';

/* the count Past orders shows; the same rule as c-orders (D-135: accepted, then completed or cancelled) */
const everConfirmed = (a) => a.history.some((h) => h.status === 'confirmed');
const pastOrders = () => apptsFor('customer').filter((a) => ['completed', 'cancelled'].includes(a.status) && everConfirmed(a) && !['withdrawn', 'switched'].includes(a.cancel?.reason));

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const oneLine = (a) => `${a.street}${a.unit ? `, ${a.unit}` : ''}`;

const group = (key, title, rows) => `<section class="sec ${ID}__group" aria-labelledby="${ID}-${key}">
    ${sectionHead(title, { id: `${ID}-${key}` })}
    <div class="card card--list ${ID}__list">${rows.join('')}</div>
  </section>`;

function view(s) {
  const c = s.customer;
  const addrs = c.addresses ?? [];
  const home = addrs.find((a) => a.default) ?? addrs[0] ?? null;
  const cards = c.cards ?? [];
  const card = cards.find((x) => x.default) ?? cards[0] ?? null;
  const orders = pastOrders().length;

  const addrSub = home ? `${esc(oneLine(home))} · Default` : 'None saved';
  const cardSub = card ? `${esc(card.brand)} •••• ${esc(card.last4)} · Default` : (c.applePay !== false ? 'Apple Pay' : 'None saved');
  const orderSub = orders ? plural(orders, 'order') : 'None yet';
  const infoSub = c.email ? `Name, phone, ${esc(c.email)}` : 'Name, phone, email for receipts';

  return `${chrome('account')}
<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Account</h1>', { back: false })}
  <section class="sec sec--first ${ID}__profile" aria-label="Your profile">
    <div class="${ID}__who">
      ${avatar({ initials: c.initials, size: 'lg' })}
      <div class="${ID}__text">
        <h2 class="t-body w-700 ${ID}__name">${esc(c.first)} ${esc(c.last)}</h2>
        <p class="t-body ${ID}__phone">${esc(c.phone)}</p>
      </div>
    </div>
  </section>
  ${group('you', 'You', [
    listRow({ title: 'Personal info', sub: infoSub, act: 'info' }),
    listRow({ title: 'Texts', sub: textsOn('customer') ? 'Booking updates on' : 'Booking updates off', act: 'texts' }),
  ])}
  ${group('bookings', 'Bookings and payment', [
    listRow({ title: 'Saved addresses', sub: addrSub, act: 'addresses' }),
    listRow({ title: 'Payment methods', sub: cardSub, act: 'cards' }),
    listRow({ title: 'Past orders', sub: orderSub, act: 'orders' }),
  ])}
  ${group('help', 'Help and policies', [
    listRow({ title: 'Help', sub: 'Message Taily about an order or your account', act: 'help' }),
    ...LEGAL_FOR.customer.map((key) => listRow({ title: esc(policyTitle(key)), act: 'policy', attrs: `data-policy="${key}"` })),
  ])}
  <div class="page-actions ${ID}__out"><div class="page-actions__links">${textLink('Sign out', { act: 'sign-out', tone: 'muted' })}${textLink('Delete account', { act: 'delete', tone: 'danger' })}</div></div>
  <p class="t-micro c-600 ${ID}__version">Taily prototype · v5</p>
</main>`;
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    switch (el.dataset.act) {
      case 'info': delete state.ui['c-profile']; go('c-profile'); break;
      case 'texts': go('c-texts'); break;   // pre-MVP A1 (D-02)
      case 'addresses': go('c-addresses'); break;
      case 'cards': go('c-cards'); break;
      case 'orders': go('c-orders'); break;
      case 'help': go('c-help'); break;   // track A2's Help home (DG-1 B)
      case 'policy': state.ui.policy = el.dataset.policy; go('c-policy'); break;   // the legal pages (D-380)
      case 'sign-out': openSignOut('customer', { go }); break;
      case 'delete': openDeleteAccount('customer', { go, onSee: (b) => seeBlocker('customer', b, go) }); break;
      default: break;
    }
  });
}

register(ID, view, wire);
