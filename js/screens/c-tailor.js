/* ============================================================
   c-tailor — C4 Tailor profile (M1 spec §C3)
   Decide on this tailor: who she is, what THIS job costs with her, when, how it comes back.
   Focal: the action bar — "Est. $160 · 2 items" + Pick a time.
   ============================================================ */
import { register, render as go, back, currentScreen, previousScreen } from '../app.js';
import { state, T, tailorById, estimateNext, eligible, nextOpening } from '../state.js';
import {
  chrome, flowBar, headingRow, avatar, ratingLine, verifiedMark, reviewRow, photoStub, priceRow, metaRow,
  sectionHead, textLink, infoButton, rushLadder, stitchDivider, ICON_CHAT,
  actionBar, banner, toast, returnsRows, readOnlyBanner, openPhotoViewer, esc,
} from '../components.js';
import { cents, fmtColumn } from '../money.js';
import { SERVICES, ZIP_INFO, GARMENT_TYPES, itemsLabel, TAILOR_LIMITS } from '../data.js';
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
    declined: 'Not available for this request',
    hidden: 'Not available for this request',
    'nothing-open': `Nothing open before ${nb(fmtDay(job.needBy))}`,
    zip: job.visitType === 'home' ? `Doesn’t visit ${job.zip}` : `No shop within 5 miles of ${job.zip}`,
    'shop-off': 'Doesn’t take shop visits',
  }[el.reason] ?? 'Not available for this request';
}

/** One group (A3, A5.5): a caps heading over flat rows, 32 apart. `key` names the heading id; `domId` lets a link scroll to it. */
const section = (title, inner, { key = '', aside = '', domId = '', cls = '' } = {}) => {
  const hid = `c-tailor-h-${key || title.toLowerCase().replace(/\W+/g, '-')}`;
  return `<section class="sec c-tailor__sec${cls ? ` ${cls}` : ''}"${domId ? ` id="${domId}"` : ''} aria-labelledby="${hid}">${sectionHead(title, { id: hid, aside })}<div class="sec__body">${inner}</div></section>`;
};

/* M7-2-C-03: identity only (name, shop, place · years, rating + Verified, tight); the action group renders after it */
function hero(t, { back = false } = {}) {
  const area = t.shop?.hood || ZIP_INFO[t.shop?.zip]?.hood || '';
  const line2 = [area, t.years ? `${t.years} years tailoring` : ''].filter(Boolean).join(' · ');
  const rated = t.rating?.count > 0;
  const proof = [rated ? ratingLine({ ...t.rating, anchor: '#reviews' }) : '<span class="t-small c-600 c-tailor__new">New on Taily</span>', t.verified ? verifiedMark() : ''].filter(Boolean).join('');
  /* K-04 / D-205: opened from Bookings (profile) or previewed by the tailor, the Back sits inline with the tailor's name, not on its own row */
  const id = `<div class="c-tailor__id">
      ${avatar({ initials: t.initials, photo: t.photo, size: 'md' })}
      <div class="c-tailor__who">
        <h1 class="t-title c-tailor__name">${esc(t.name)}</h1>
        ${t.shopName ? `<p class="t-body w-600 c-700 c-tailor__shop">${esc(t.shopName)}</p>` : ''}
      </div>
    </div>`;
  return `<div class="hero c-tailor__hero">
    ${back ? headingRow(id, { whole: true }) : id}
    <div class="c-tailor__meta">
      ${line2 ? `<p class="t-small c-600 c-tailor__sub">${esc(line2)}</p>` : ''}
      <div class="c-tailor__proof">${proof}</div>
    </div>
  </div>`;
}

/* portfolio placeholders cycle the garment drawings in catalogue order */
const TYPES = Object.keys(GARMENT_TYPES);

function about(t) {
  const total = Math.min(t.workPhotos ?? 0, TAILOR_LIMITS.WORK_PHOTOS_MAX);
  const n = Math.min(total, WORK_PHOTOS_MAX);
  const more = total > WORK_PHOTOS_MAX;                                  // X-13: the 4th tile is "+N" and opens the rest
  const first = (t.name || 'The tailor').split(' ')[0];
  const tiles = Array.from({ length: n }, (_, i) => (more && i === n - 1
    ? `<button type="button" class="c-tailor__work c-tailor__work--more t-body w-600" data-act="more-work" data-count="${total}" aria-label="See all ${total} photos of ${esc(first)}’s work">+${total - (n - 1)}</button>`
    : `<span class="c-tailor__work" role="img" aria-label="Work photo ${i + 1} of ${total}">${photoStub({ type: TYPES[i % TYPES.length], tone: i % 4, size: 'tile' })}</span>`)).join('');
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
  const total = `${stitchDivider()}<div class="c-tailor__total w-600">${priceRow({ label: 'Estimated total', cents: q.total, format: F })}</div>`;
  return section('Your estimate', `<div class="c-tailor__estimate">${rows.join('')}${total}</div>`, { key: 'estimate', cls: 'c-tailor__sec--estimate', aside: infoButton('pricing', { label: 'How pricing works' }) });
}

function prices(t) {
  const offered = Object.keys(SERVICES).filter((id) => typeof t.prices?.[id] === 'number');
  const all = ui().allPrices === true;
  const shown = all ? offered : offered.slice(0, PRICES_SHOWN);
  const rows = shown.map((id) => priceRow({ label: SERVICES[id].label, cents: cents(t.prices[id]), format: F })).join('');
  const toggle = offered.length > PRICES_SHOWN
    ? `<div class="c-tailor__more">${textLink(all ? 'Show fewer prices' : `See all ${offered.length} prices`, { act: 'all-prices', attrs: `aria-expanded="${all}"` })}</div>` : '';
  return section('Prices', `<div class="c-tailor__prices">${rows}</div>${toggle}
    <div class="c-tailor__rush" role="group" aria-labelledby="c-tailor-rush-h"><h3 class="t-small w-600 c-700 c-tailor__rush-h" id="c-tailor-rush-h">Rush fees</h3><div class="t-body" data-money>${rushLadder(t.rush)}</div></div>`);
}

/** CP-C13: "Williamsburg, Greenpoint, East Williamsburg and Bushwick" — each neighbourhood once, in ZIP order. */
function hoodList(zips = []) {
  const names = [...new Set(zips.map((z) => ZIP_INFO[z]?.hood).filter(Boolean))];
  if (!names.length) return zips.join(', ');
  return names.length < 2 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function where(t, job) {
  const blocks = [];
  if (t.shop?.enabled) {
    const miles = ZIP_INFO[job.zip]?.miles;
    blocks.push(`<div class="c-tailor__place">${metaRow('', esc(`${t.shopName}, ${t.shop.street}, ${t.shop.city}, ${t.shop.state} ${t.shop.zip}`), { icon: 'shop' })}${miles != null ? `<p class="t-small c-600">${miles.toFixed(1)} mi from you</p>` : ''}</div>`);
  }
  if (t.home?.enabled) {
    blocks.push(`<div class="c-tailor__place">${metaRow('', esc(`Comes to you in ${hoodList(t.home.zips)}`), { icon: 'home' })}<p class="t-small c-600">${esc(t.home.zips.join(', '))}</p><p class="t-small c-600" data-money>${F(cents(t.home.fee))} home-visit fee</p></div>`);
  }
  return blocks.length ? section('Where', blocks.join('')) : '';
}

function gettingItBack(t) {
  const rows = returnsRows(t.returns);   // shared with to-returns' preview (R2-2-T-04)
  return rows ? section('Getting it back', rows) : '';
}

function reviews(t) {
  const count = t.rating?.count ?? 0;
  if (!count && !(t.reviews ?? []).length) return section('Reviews', '<p class="t-body c-600">No reviews yet.</p>', { key: 'reviews', domId: 'reviews' });
  const list = (t.reviews ?? []).slice(0, REVIEWS_SHOWN)
    .map((r) => reviewRow({ name: r.name, initials: r.initials, stars: r.stars, date: r.date, text: r.text, photos: r.photos, photoType: r.photoType })).join('');
  return section('Reviews', `<div class="c-tailor__reviews">${list}</div>
    <div class="c-tailor__more">${textLink(`See all ${count} reviews`, { act: 'all-reviews' })}</div>`, { key: 'reviews', domId: 'reviews' });
}

/** The tailor looking at her own profile from to-done (D-71): no booking stepper, no action bar, nothing to start. */
/* view() runs before the router pushes this screen: then the screen we came from is currentScreen(); on a re-render it is previousScreen() */
const cameFrom = () => (currentScreen() === ID ? previousScreen() : currentScreen());
const isPreview = () => !!ui().preview && cameFrom() === 'to-done';

/** Profile mode (R4-1-C-03): reached from a finished review, so there is no booking in progress — no stepper, no draft
    estimate, one "Book again" action. Fixtures land here with no history; a real visit comes from c-review. */
const isProfile = () => state.ui.booking?.from === 'review';

function view(s) {
  const job = s.job;
  const preview = isPreview();
  const profile = !preview && isProfile();
  const t = chosen();
  const q = { ...estimateNext(t, job), tailorFirst: (t.name || 'The tailor').split(' ')[0] };
  F = fmtColumn(allAmounts(t, q));
  const el = eligible(t, job);
  const next = nextOpening(t.id, job.visitType, { until: job.needBy });
  const declined = el.reason === 'declined';
  const first = q.tailorFirst;
  const lead = `<span>Est. <b data-money>${F(q.total)}</b> · ${itemsLabel(job.garments.length, 'item')}</span>`;
  const booking = !preview && !profile;   // opened from c-tailors: the flow bar owns Back and the exit (D-186)
  return `${booking ? flowBar({ step: 2 }) : chrome(profile ? 'bookings' : 'home')}<main class="body ${preview ? '' : 'body--with-bar '}${ID}${profile ? ` ${ID}--profile` : ''}">
  ${hero(t, { back: !booking })}
  ${preview ? `<div class="c-tailor__preview">${readOnlyBanner({ text: 'You’re viewing your own profile', ctaLabel: 'Back to Taily for tailors', ctaAct: 'exit-preview' })}</div>` : ''}
  ${declined ? `<div class="c-tailor__banner">${banner({ tone: 'warning', title: `${esc(first)} declined this request`, text: `Your items and services are saved. You can still book ${esc(first)} for other work.` })}</div>` : ''}
  ${declined ? '' : `<div class="c-tailor__act">
    <p class="t-small w-600 c-700 c-tailor__next">${next ? `Next opening ${nb(fmtWhen(next))}` : `Nothing open before ${nb(fmtDay(job.needBy))}`}</p>
    ${preview ? '' : `<div class="c-tailor__ask">${textLink('Ask a question', { act: 'ask', icon: ICON_CHAT })}</div>`}
  </div>`}
  ${profile ? '' : estimateCard(q, job)}
  ${about(t)}
  ${prices(t)}
  ${where(t, job)}
  ${gettingItBack(t)}
  ${reviews(t)}
</main>
${preview ? ''
  : profile
    ? actionBar({ ctaLabel: `Book ${esc(first)} again`, ctaAct: 'book-again' })
    : declined
    ? actionBar({ ctaLabel: 'Start a new request', ctaAct: 'new-job', note: `${esc(first)} declined this request` })
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
      case 'book-again': {
        const tailorId = chosen().id;
        T.newJob();
        state.ui.booking = { tailorId };
        go('c-job', { fresh: true });
        break;
      }
      case 'all-prices': {
        const y = window.scrollY;
        ui().allPrices = !ui().allPrices;
        go(ID);
        window.scrollTo(0, y);
        document.querySelector('[data-act="all-prices"]')?.focus({ preventScroll: true });
        break;
      }
      case 'more-work': openPhotoViewer({ title: `${(chosen().name || 'The tailor').split(' ')[0]}’s work`, count: Number(el.dataset.count) }); break;
      case 'all-reviews': toast('Not built yet'); break;
      case 'new-job': T.newJob(); go('c-job', { fresh: true }); break;
      default: break;
    }
  }, { signal: ac.signal });
}

register(ID, view, wire);
