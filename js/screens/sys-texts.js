/* ============================================================
   sys-texts — the text catalogue board (pre-MVP A1, DG-2 A + D-02): every event's text as the person would get it, rendered with
   the app's own text banner and the appointment's deterministic link, with who gets it, what fires it and where its link lands.
   js/texts.js is the one source (docs/v5/TEXTS.md is generated from it). Two tabs: to the customer / to the tailor. K-48.4: no quiet hours.
   ============================================================ */
import { register, render as go } from '../app.js';
import { state, now, nowIso, textLink, activeAppt, tailorById } from '../state.js';
import { TEXT_EVENTS, textCtx } from '../texts.js';
import { statusBar, headingRow, esc, chipGroup, wireChipGroups } from '../components.js';
import { textBannerHtml } from '../system.js';

const ID = 'sys-texts';
const ui = () => (state.ui[ID] ??= { who: 'customer' });
const WHO = { customer: 'Sarah, the customer', tailor: 'Amara, the tailor' };

/** The sample appointment the board is written against (the flow drives one), with the extra values a few texts need. */
function context() {
  const a = activeAppt() ?? state.appts.at(-1) ?? null;
  const t = a ? tailorById(a.tailorId) : state.tailors[0];
  const bal = a?.payments?.balance?.cents ?? a?.money?.balance ?? 0;
  return {
    a,
    ctx: textCtx({ a, t, cust: state.customer, now: now(), x: { total: a?.money?.total, charged: bal, cents: a?.money?.payout, bank: t?.payouts?.bank, last4: t?.payouts?.last4, stars: 5, start: a?.slot?.start, at: nowIso() } }),
  };
}

function view() {
  const who = ui().who;
  const { a, ctx } = context();
  const rows = TEXT_EVENTS.filter(([, r]) => r.to === who);
  const items = rows.map(([id, r], i) => `<li class="${ID}__item" data-text-event="${esc(id)}">
    <div class="text-banner-demo ${ID}__demo">${textBannerHtml({ body: r.body(ctx), link: textLink(a?.id ?? who, id), act: 'noop' })}</div>
    <p class="t-small w-600 ${ID}__name"><span class="${ID}__num">${i + 1}.</span> ${esc(id)}${r.owner && r.owner !== 'A1' ? ` <span class="c-600 w-400">· fired by ${esc(r.owner)}</span>` : ''}</p>
    <p class="t-small c-600">When: ${esc(r.trigger)}</p>
    <p class="t-small c-600">Lands on: ${esc(r.land ?? 'the booking’s own screen (statusScreen)')}</p>
  </li>`).join('');
  return `${statusBar()}
<main class="body ${ID}" data-s="${ID}${who === 'tailor' ? '--tailor' : ''}">
  ${headingRow('<h1 class="t-title">Text catalogue</h1>', { back: false })}
  <p class="t-body c-700 ${ID}__lead">Every notification is a text with its own link into the app. Texts go out as soon as the event happens, at any hour. A person whose texts are off sees the same news in the app.</p>
  <div class="${ID}__tabs">${chipGroup({ name: 'texts-who', variant: 'segmented', options: [{ value: 'customer', label: 'To the customer' }, { value: 'tailor', label: 'To the tailor' }], value: who, label: 'Texts sent to' })}</div>
  <p class="t-caps c-600 ${ID}__count">${rows.length} texts to ${esc(WHO[who])}</p>
  <ol class="${ID}__list">${items}</ol>
</main>`;
}

function wire(root) {
  wireChipGroups(root);
  root.addEventListener('chip', (e) => {
    if (e.detail.name !== 'texts-who' || e.detail.value === ui().who) return;
    ui().who = e.detail.value;
    go(ID, { replace: true });
    root.querySelector?.('[data-act="chip"][aria-checked="true"]')?.focus({ preventScroll: true });
  });
}

register(ID, view, wire);
