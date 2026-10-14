/* ============================================================
   c-tailor — C4 Tailor profile (M1 spec §C3)
   Decide on this tailor: who she is, what THIS job costs with her, when, how it comes back.
   Focal: the action bar — "Est. $160 · 2 items" + Pick a time.
   ============================================================ */
import { register, render as go, back, currentScreen, previousScreen } from '../app.js';
import { state, T, tailorById, estimateNext, eligible, nextOpening } from '../state.js';
import {
  chrome, bookingSteps, headingRow, avatar, trustBadges, ratingSummary, reviewRow, photoTile, infoCard, priceRow, metaRow,
  cta, actionBar, banner, toast, returnsRows, readOnlyBanner, esc,
} from '../components.js';
import { cents, fmtColumn } from '../money.js';
import { SERVICES, ZIP_INFO, itemsLabel } from '../data.js';
import { fmtWhen, fmtDay, nb } from '../dates.js';

const ID = 'c-tailor';
const PRICES_SHOWN = 4;
const REVIEWS_SHOWN = 3;
const WORK_PHOTOS_MAX = 4;

/* screen-local UI: state.ui['c-tailor'] = { allPrices } (D-34) */
const ui = () => (state.ui[ID] ??= {});

/** The tailor this profile shows: the booking draft's pick, else the first tailor (D-36). */
const chosen = () => tailorById(state.ui.booking?.tailorId ?? state.tailors[0].id) ?? state.tailors[0];

/** Why the Pick a time button is off. */
function reasonNote(el, job) {
  return {
    declined: 'Not available for this job',
    hidden: 'Not available for this job',
    'nothing-open': `Nothing open before ${nb(fmtDay(job.needBy))}`,
    zip: job.visitType === 'home' ? `Doesn’t visit ${job.zip}` : `No shop within 5 miles of ${job.zip}`,
    'shop-off': 'Doesn’t take shop visits',
  }[el.reason] ?? 'Not available for this job';
}

const section = (title, inner, cls = '') => `<section class="c-tailor__sec${cls ? ` ${cls}` : ''}"><h2 class="t-h2">${title}</h2>${inner}</section>`;

function hero(t, next, job, declined = false) {
  const area = t.shop?.hood || ZIP_INFO[t.shop?.zip]?.hood || '';
  const sub = [t.shopName, area, t.years ? `${t.years} years` : ''].filter(Boolean).join(' · ');
  const nextLine = next ? `Next opening ${nb(fmtWhen(next))}` : `Nothing open before ${nb(fmtDay(job.needBy))}`;
  return `<div class="c-tailor__hero">
    ${avatar({ initials: t.initials, photo: t.photo, size: 'lg' })}
    <div class="c-tailor__who">
      <div class="c-tailor__name-row"><h1 class="t-title">${esc(t.name)}</h1>${t.verified ? '<span class="c-tailor__check" aria-label="Verified">✓</span>' : ''}</div>
      <p class="t-body c-600 c-tailor__sub">${esc(sub)}</p>
      ${t.rating?.count > 0 ? ratingSummary(t.rating) : '<p class="t-small c-600 c-tailor__new">New on Taily</p>'}
      ${t.verified ? trustBadges(t.badges ?? []) : ''}
      ${declined ? '' : `<p class="t-small w-600 c-700 c-tailor__next">${nextLine}</p>`}
    </div>
  </div>`;
}

function about(t) {
  const n = Math.min(t.workPhotos ?? 0, WORK_PHOTOS_MAX);
  const tiles = Array.from({ length: n }, (_, i) => `<span class="c-tailor__work" role="img" aria-label="Work photo ${i + 1} of ${n}">${photoTile('photo')}</span>`).join('');
  return section('About', `${t.bio ? `<p class="t-body c-700">${esc(t.bio)}</p>` : ''}${n ? `<div class="c-tailor__photos">${tiles}</div>` : ''}`);
}

/** D-98: one precision per screen — set once per render from every amount the profile prints (prices, fees, rush, estimate). */
let F = fmtColumn([]);
const allAmounts = (t, q) => [
  ...q.lines.map((l) => l.cents), q.homeFee, q.rush, q.total, cents(t.home?.fee ?? 0),
  ...Object.values(t.prices ?? {}).filter((v) => typeof v === 'number').map(cents),
  ...(t.rush ?? []).map((r) => cents(r.fee)),
];

function estimateCard(q, job) {
  const rows = q.lines.map((l) => priceRow({ label: `${l.garmentType} · ${l.label}`, cents: l.cents, format: F }));
  if (job.visitType === 'home' && q.homeFee > 0) rows.push(priceRow({ label: 'Home-visit fee', cents: q.homeFee, format: F }));
  if (q.rush > 0) rows.push(priceRow({ label: 'Rush fee', cents: q.rush, note: `Need-by ${q.rushDays} day${q.rushDays === 1 ? '' : 's'} after the visit`, format: F }));
  const total = `<div class="c-tailor__total w-600">${priceRow({ label: 'Estimated total', cents: q.total, format: F })}</div>`;
  return section('Your estimate', `${infoCard(rows.join('') + total)}
    <p class="t-small c-600 c-tailor__caption">Confirmed at the fitting. If ${esc(q.tailorFirst)} changes a price, you approve it before work starts.</p>`);
}

/** Each tier is a nowrap span, so the line breaks between tiers, never inside one (R1-2-C-08, R1-1-C-19). */
const TIER_OPEN = '<span class="c-tailor__tier">';
function rushText(t) {
  const ladder = [...(t.rush ?? [])].sort((a, b) => a.days - b.days);
  if (!ladder.length) return 'No rush fees.';
  const parts = ladder.map((r, i) => `${TIER_OPEN}${i === 0 ? `ready within ${r.days} day${r.days === 1 ? '' : 's'} of the visit` : `${r.days} day${r.days === 1 ? '' : 's'}`} +${F(cents(r.fee))}</span>`);
  parts.push(`${TIER_OPEN}${ladder[ladder.length - 1].days + 1}+ days no rush fee</span>`);
  return parts.join(' · ');
}

function prices(t) {
  const offered = Object.keys(SERVICES).filter((id) => typeof t.prices?.[id] === 'number');
  const all = ui().allPrices === true;
  const shown = all ? offered : offered.slice(0, PRICES_SHOWN);
  const rows = shown.map((id) => priceRow({ label: SERVICES[id].label, cents: cents(t.prices[id]), format: F })).join('');
  const toggle = offered.length > PRICES_SHOWN
    ? `<button type="button" class="c-tailor__link t-body w-600" data-act="all-prices" aria-expanded="${all}">${all ? 'Show fewer prices' : `See all ${offered.length} prices`}</button>` : '';
  return section('Prices', `<div class="c-tailor__prices">${rows}</div>${toggle}
    <div class="c-tailor__rush"><p class="t-small w-600 c-700">Rush fees</p><p class="t-small c-600" data-money>${rushText(t)}</p></div>`);
}

function where(t, job) {
  const blocks = [];
  if (t.shop?.enabled) {
    const miles = ZIP_INFO[job.zip]?.miles;
    blocks.push(`<div class="c-tailor__place">${metaRow('', esc(`${t.shopName}, ${t.shop.street}, ${t.shop.city}, ${t.shop.state} ${t.shop.zip}`), { icon: 'shop' })}${miles != null ? `<p class="t-small c-600">${miles.toFixed(1)} mi from you</p>` : ''}</div>`);
  }
  if (t.home?.enabled) {
    blocks.push(`<div class="c-tailor__place">${metaRow('', esc(`Comes to you in ${t.home.zips.join(', ')}`), { icon: 'home' })}<p class="t-small c-600" data-money>${F(cents(t.home.fee))} home-visit fee</p></div>`);
  }
  return blocks.length ? section('Where', blocks.join('')) : '';
}

function gettingItBack(t) {
  const rows = returnsRows(t.returns);   // shared with to-returns' preview (R2-2-T-04)
  return rows ? section('Getting it back', rows) : '';
}

function reviews(t) {
  const count = t.rating?.count ?? 0;
  if (!count && !(t.reviews ?? []).length) {
    return section('Reviews', '<p class="t-body c-600">No reviews yet. Every Taily tailor is ID verified and background checked.</p>');
  }
  const list = (t.reviews ?? []).slice(0, REVIEWS_SHOWN)
    .map((r) => reviewRow({ name: r.name, initials: r.initials, stars: r.stars, date: r.date, text: r.text, photos: r.photos })).join('');
  return section('Reviews', `${ratingSummary(t.rating)}<div class="c-tailor__reviews">${list}</div>
    <button type="button" class="c-tailor__link t-body w-600" data-act="all-reviews">See all ${count} reviews</button>`);
}

/** The tailor looking at her own profile from to-done (D-71): no booking stepper, no action bar, nothing to start. */
/* view() runs before the router pushes this screen: then the screen we came from is currentScreen(); on a re-render it is previousScreen() */
const cameFrom = () => (currentScreen() === ID ? previousScreen() : currentScreen());
const isPreview = () => !!ui().preview && cameFrom() === 'to-done';

function view(s) {
  const job = s.job;
  const preview = isPreview();
  const t = chosen();
  const q = { ...estimateNext(t, job), tailorFirst: (t.name || 'The tailor').split(' ')[0] };
  F = fmtColumn(allAmounts(t, q));
  const el = eligible(t, job);
  const next = nextOpening(t.id, job.visitType, { until: job.needBy });
  const declined = el.reason === 'declined';
  const first = q.tailorFirst;
  const lead = `<span>Est. <b data-money>${F(q.total)}</b> · ${itemsLabel(job.garments.length, 'item')}</span>`;
  return `${chrome('home')}<main class="body ${preview ? '' : 'body--with-bar '}${ID}">
  ${preview ? '' : bookingSteps(3)}
  ${headingRow('')}
  ${preview ? `<div class="c-tailor__preview">${readOnlyBanner({ text: 'You’re viewing your own profile', ctaLabel: 'Back to Taily for tailors', ctaAct: 'exit-preview' })}</div>` : ''}
  ${hero(t, declined ? null : next, job, declined)}
  ${declined ? `<div class="c-tailor__banner">${banner({ tone: 'warning', title: `${esc(first)} can’t take this job`, text: `Your job details are saved. You can book ${esc(first)} for a different job.` })}</div>` : ''}
  ${declined || preview ? '' : `<div class="c-tailor__ask">${cta('Ask a question', { variant: 'secondary', attrs: 'data-act="ask"' })}</div>`}
  ${about(t)}
  ${estimateCard(q, job)}
  ${prices(t)}
  ${where(t, job)}
  ${gettingItBack(t)}
  ${reviews(t)}
</main>
${preview ? ''
  : declined
    ? actionBar({ ctaLabel: 'Start a different job', ctaAct: 'new-job', note: `${esc(first)} can’t take this job` })
    : actionBar({ lead, ctaLabel: 'Pick a time', ctaAct: 'pick-time', disabled: !el.ok, note: el.ok ? '' : reasonNote(el, job) })}`;
}

let ac = null;

function wire(root) {
  ac?.abort(); ac = new AbortController();
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    switch (el.dataset.act) {
      case 'ask': go('c-thread'); break;
      case 'exit-preview': ui().preview = false; back() || go('to-done'); break;
      case 'pick-time': go('c-book'); break;
      case 'all-prices': {
        const y = window.scrollY;
        ui().allPrices = !ui().allPrices;
        go(ID);
        window.scrollTo(0, y);
        document.querySelector('[data-act="all-prices"]')?.focus({ preventScroll: true });
        break;
      }
      case 'all-reviews': toast('Not built yet'); break;
      case 'new-job': T.newJob(); go('c-job', { fresh: true }); break;
      default: break;
    }
  }, { signal: ac.signal });
}

register(ID, view, wire);
