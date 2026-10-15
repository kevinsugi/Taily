/* ============================================================
   c-account — C13 Account home. Who Sarah is on Taily and the way into her addresses, cards and
   past orders; sign out lives here, behind a confirm. Focal: the profile card.
   Profile is read-only in the prototype (D-133). Spec: M5-spec.md §C3.
   ============================================================ */
import { register, render as go } from '../app.js';
import { apptsFor } from '../state.js';
import { chrome, headingRow, avatar, listRow, cta, textLink, modalOverlay, esc } from '../components.js';
import * as A from '../account.js';

const ID = 'c-account';

/* the counts the three rows show; the same rule as Past orders (D-135: accepted, then completed or cancelled) */
const everConfirmed = (a) => a.history.some((h) => h.status === 'confirmed');
const pastOrders = () => apptsFor('customer').filter((a) => ['completed', 'cancelled'].includes(a.status) && everConfirmed(a));

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const oneLine = (a) => `${a.street}${a.unit ? `, ${a.unit}` : ''}`;

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

  return `${chrome('account')}
<main class="body ${ID}" data-s="${ID}">
  ${headingRow('<h1 class="t-title">Account</h1>', { back: false })}
  <section class="sec sec--first ${ID}__profile" aria-label="Your profile">
    <div class="${ID}__who">
      ${avatar({ initials: c.initials, size: 'lg' })}
      <div class="${ID}__text">
        <h2 class="t-body w-700 ${ID}__name">${esc(c.first)} ${esc(c.last)}</h2>
        <p class="t-body ${ID}__phone">${esc(c.phone)}</p>
        <p class="t-small c-600 ${ID}__email">${esc(c.email)}</p>
      </div>
    </div>
  </section>
  <nav class="sec ${ID}__list card card--list" aria-label="Your account">
    ${listRow({ title: 'Saved addresses', sub: addrSub, act: 'addresses' })}
    ${listRow({ title: 'Payment methods', sub: cardSub, act: 'cards' })}
    ${listRow({ title: 'Past orders', sub: orderSub, act: 'orders' })}
  </nav>
  <div class="page-actions ${ID}__out"><div class="page-actions__links">${textLink('Sign out', { act: 'sign-out', tone: 'danger' })}</div></div>
  <p class="t-micro c-600 ${ID}__version">Taily prototype · v5</p>
</main>`;
}

const signOutModal = () => `<div class="modal modal--leave" role="alertdialog" aria-modal="true" aria-labelledby="${ID}-so-title" aria-describedby="${ID}-so-body">
  <h2 class="modal__title t-h2" id="${ID}-so-title">Sign out of Taily?</h2>
  <p class="leave-modal__body" id="${ID}-so-body">You’ll need your phone number and a code to sign back in. Your bookings stay as they are.</p>
  <div class="modal__actions">
    ${cta('Sign out', { variant: 'danger', attrs: 'data-act="sign-out-ok"' })}
    ${cta('Stay signed in', { variant: 'secondary', attrs: 'data-act="sign-out-keep"' })}
  </div>
</div>`;

function openSignOut() {
  modalOverlay(signOutModal(), { dataS: 'sign-out' }, (holder, close) => {
    const keep = holder.querySelector('[data-act="sign-out-keep"]');
    keep.addEventListener('click', () => close());
    keep.focus();   // R5-1-C-03: focus lands on the safe choice; a stray Enter never signs her out
    holder.querySelector('[data-act="sign-out-ok"]').addEventListener('click', () => {
      A.signOut();
      close({ instant: true });
      go('c-welcome', { fresh: true });
    });
  });
}

function wire(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || e.target.closest('.screen-sheet--overlay')) return;
    switch (el.dataset.act) {
      case 'addresses': go('c-addresses'); break;
      case 'cards': go('c-cards'); break;
      case 'orders': go('c-orders'); break;
      case 'sign-out': openSignOut(); break;
      default: break;
    }
  });
}

register(ID, view, wire);
