/* ============================================================
   c-tailor — C4 Tailor profile (M1 spec §C3)
   Decide on this tailor: who she is, what THIS job costs with her, when, how it comes back.
   K-18 (2-I): a centred host profile — portrait, name, a ruled stat strip, the next opening beside Book now (the standard primary),
   About, photos, Your estimate, reviews. Focal: Book now / the action bar's Pick a time (Ask a question is a link under it).
   ============================================================ */
import { register, render as go, back, currentScreen, previousScreen } from '../app.js';
import { state, T, tailorById, estimateNext, eligible, nextOpening, apptsFor, isVerified, milesToShop } from '../state.js';
import {
  chrome, flowBar, avatar, verifiedCheck, reviewRow, priceRow, metaRow, cta, navBackMark,
  sectionHead, textLink, infoButton, stitchDivider, ICON_CHAT,
  actionBar, banner, toast, returnsRows, readOnlyBanner, openPhotoViewer, esc, hoodSentence, HOME_FEE_CAPTION, HOME_FEE_HELP, shopPlace,
} from '../components.js';
import { ICON_CAMERA, VISIT_ICONS } from '../icons.js';
import { cents, fmtColumn } from '../money.js';
import { TAILOR_LIMITS, placeForZip } from '../data.js';
import { fmtWhen, fmtDay, nb } from '../dates.js';

const ID = 'c-tailor';
const REVIEWS_SHOWN = 3;
const WORK_PHOTOS_MAX = 4;

/* screen-local UI: state.ui['c-tailor'] = { preview } (D-34, D-71) */
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
    services: 'Doesn’t offer every service you picked',   // K-48.2 (D-354)
  }[el.reason] ?? 'Not available for this request';
}

/** One group (A3, A5.5): a caps heading over flat rows, 32 apart. `key` names the heading id; `domId` lets a link scroll to it. */
const section = (title, inner, { key = '', aside = '', domId = '', cls = '' } = {}) => {
  const hid = `c-tailor-h-${key || title.toLowerCase().replace(/\W+/g, '-')}`;
  return `<section class="sec c-tailor__sec${cls ? ` ${cls}` : ''}"${domId ? ` id="${domId}"` : ''} aria-labelledby="${hid}">${sectionHead(title, { id: hid, aside })}<div class="sec__body">${inner}</div></section>`;
};

/** K-18 (2-I): the portrait slot (a placeholder tile until she adds a photo) with her initials avatar straddling its bottom edge. */
function portrait(t) {
  const first = (t.name || 'The tailor').split(' ')[0];
  return `<div class="c-tailor__portrait">
    <div class="c-tailor__photo" role="img" aria-label="Placeholder photo: portrait of ${esc(first)}"><span class="c-tailor__glyph" aria-hidden="true">${ICON_CAMERA}</span><span class="c-tailor__tag" aria-hidden="true"><b>Placeholder</b>Photo: portrait</span></div>
    ${avatar({ initials: t.initials, photo: t.photo, size: 'lg' })}
  </div>`;
}

/** Name (serif, with the Verified check), then "Shop · Neighbourhood". */
function identity(t) {
  const area = t.shop?.hood || placeForZip(t.shop?.zip)?.hood || '';
  const sub = [t.shopName ? `<span class="w-600 c-700">${esc(t.shopName)}</span>` : '', area ? `<span class="c-600">${esc(area)}</span>` : ''].filter(Boolean).join('<span class="c-600"> · </span>');
  return `<div class="c-tailor__centre">
    <div class="c-tailor__namerow"><h1 class="t-title c-tailor__name">${esc(t.name)}</h1>${isVerified(t) ? verifiedCheck({ years: t.years }) : ''}</div>
    ${sub ? `<p class="t-body c-tailor__shop">${sub}</p>` : ''}
  </div>`;
}

/** The ruled three-column stat strip: rating + reviews · years · distance (a column with nothing to say is left out). */
function stats(t, job) {
  const rated = t.rating?.count > 0;
  const miles = t.shop?.enabled ? milesToShop(t, job.zip) : null;   // S-42: from her shop
  const cols = [];
  cols.push(rated
    ? `<a class="c-tailor__stat c-tailor__stat--link" href="#reviews" data-anchor="reviews" data-hit="inline" aria-label="Rated ${Number(t.rating.avg).toFixed(1)} out of 5 from ${t.rating.count} review${t.rating.count === 1 ? '' : 's'}"><span class="c-tailor__fig"><span class="c-tailor__star" aria-hidden="true">★</span>${Number(t.rating.avg).toFixed(1)}</span><span class="t-small c-600">${t.rating.count} review${t.rating.count === 1 ? '' : 's'}</span></a>`
    : '<div class="c-tailor__stat"><span class="c-tailor__fig">New</span><span class="t-small c-600">on Taily</span></div>');
  if (t.years > 0) cols.push(`<div class="c-tailor__stat"><span class="c-tailor__fig">${t.years}</span><span class="t-small c-600">${t.years === 1 ? 'year' : 'years'} tailoring</span></div>`);
  if (miles != null) cols.push(`<div class="c-tailor__stat"><span class="c-tailor__fig">${miles.toFixed(1)} mi</span><span class="t-small c-600">from you</span></div>`);
  else if (t.home?.enabled) cols.push('<div class="c-tailor__stat"><span class="c-tailor__fig">At home</span><span class="t-small c-600">she comes to you</span></div>');
  return `<div class="c-tailor__stats" data-n="${cols.length}">${cols.join('')}</div>`;
}

/** The split control: the next opening as plain text beside Book now, the standard black primary (it opens the time picker with that time already chosen). */
function split(next, job, { ok, reason }) {
  const when = next ? nb(fmtWhen(next)) : `None before ${nb(fmtDay(job.needBy))}`;
  const can = ok && !!next;
  return `<div class="c-tailor__split">
    <div class="c-tailor__slot"><span class="c-tailor__slot-icon" aria-hidden="true">${VISIT_ICONS.calendar}</span><span class="c-tailor__slot-text"><span class="t-small c-600">Next opening</span><span class="t-small w-600">${when}</span></span></div>
    ${cta('Book now', { disabled: !can, attrs: `data-act="book-now"${can && next ? ` aria-label="${esc(`Book now: ${fmtWhen(next)}`)}"` : ''}` })}
  </div>
  <p class="t-small c-600 c-tailor__split-note">${can ? 'Book now takes this time. For another day, use Pick a time.' : esc(reason)}</p>`;
}

/* photo placeholders (K-18): a striped tile with a camera and a caption, until she adds real photos */
const WORK_CAPTIONS = ['the shop', 'pinning a jacket sleeve', 'a finished suit', 'a dress hem, finished'];

function about(t) {
  const total = Math.min(t.workPhotos ?? 0, TAILOR_LIMITS.WORK_PHOTOS_MAX);
  const n = Math.min(total, WORK_PHOTOS_MAX);
  const more = total > WORK_PHOTOS_MAX;                                  // X-13: the 4th tile is "+N" and opens the rest
  const first = (t.name || 'The tailor').split(' ')[0];
  const street = (t.shop?.street ?? '').replace(/^\d+\s+/, '');
  const caps = [street ? `the shop on ${street}` : WORK_CAPTIONS[0], ...WORK_CAPTIONS.slice(1)];
  const tiles = Array.from({ length: n }, (_, i) => (more && i === n - 1
    ? `<button type="button" class="c-tailor__work c-tailor__work--more t-title" data-act="more-work" data-count="${total}" aria-label="See all ${total} photos of ${esc(first)}’s work">+${total - (n - 1)}</button>`
    : `<span class="c-tailor__work" role="img" aria-label="${esc(`Placeholder photo ${i + 1} of ${total}: ${caps[i % caps.length]}`)}"><span class="c-tailor__glyph" aria-hidden="true">${ICON_CAMERA}</span><span class="c-tailor__tag" aria-hidden="true"><b>Placeholder</b>Photo: ${esc(caps[i % caps.length])}</span></span>`)).join('');
  const paras = String(t.bio ?? '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const bio = paras.map((x, i) => `<p class="t-body ${i === 0 ? 'w-600 c-ink' : 'c-700'} c-tailor__bio">${esc(x)}</p>`).join('');
  return section('About', `${bio}${n ? `<div class="c-tailor__photos">${tiles}</div>` : ''}`);
}

/** D-98: one precision per screen — set once per render from every amount the profile prints (prices, fees, rush, estimate). */
let F = fmtColumn([]);
const allAmounts = (t, q) => [...q.lines.map((l) => l.cents), q.homeFee, q.rush, q.total, cents(t.home?.fee ?? 0)];

function estimateCard(q, job) {
  const rows = q.lines.map((l) => priceRow({ label: `${l.garmentType} · ${l.label}`, cents: l.cents, format: F }));
  if (job.visitType === 'home' && q.homeFee > 0) rows.push(priceRow({ label: 'Home visit fee', cents: q.homeFee, note: HOME_FEE_CAPTION, format: F }));
  if (q.rush > 0) rows.push(priceRow({ label: 'Rush fee', cents: q.rush, note: `Need-by ${q.rushDays} day${q.rushDays === 1 ? '' : 's'} after the visit`, format: F }));
  const total = `${stitchDivider()}<div class="c-tailor__total w-600">${priceRow({ label: 'Estimated total', cents: q.total, format: F })}</div>`;
  return section('Your estimate', `<div class="c-tailor__estimate">${rows.join('')}${total}</div>`, { key: 'estimate', cls: 'c-tailor__sec--estimate', aside: infoButton('pricing', { label: 'How pricing works' }) });
}

/** CP-C13 / Study-1 C5: "Williamsburg, Greenpoint, East Williamsburg and Bushwick" — her neighborhoods, in the order she picked them. */
const hoodList = (t) => hoodSentence(t.home?.hoods ?? []);

function where(t, job) {
  const blocks = [];
  if (t.shop?.enabled) {
    const miles = milesToShop(t, job.zip);   // S-42
    blocks.push(`<div class="c-tailor__place">${metaRow('', esc(shopPlace(t, { full: true })), { icon: 'shop' })}${miles != null ? `<p class="t-small c-600">${miles.toFixed(1)} mi from you</p>` : ''}</div>`);
  }
  if (t.home?.enabled) {
    const fee = t.home.fee > 0 ? `${F(cents(t.home.fee))} home visit fee · ${HOME_FEE_HELP}` : 'No home visit fee';   // C4: flat, per visit
    blocks.push(`<div class="c-tailor__place">${metaRow('', esc(`Comes to you in ${hoodList(t)}`), { icon: 'home' })}<p class="t-small c-600" data-money>${esc(fee)}</p></div>`);
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
  return section('Reviews', `<p class="t-small c-600 c-tailor__reviews-note">From customers who booked through Taily.</p>
    <div class="c-tailor__reviews">${list}</div>
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
  const booking = !preview && !profile;   // opened from c-tailors: the flow bar owns Back and the exit (D-186)
  /* Study-1 A4: a "Book again" draft names the tailor it is for (only once an order with her came back) */
  const again = booking && state.ui.booking?.again && state.ui.booking.tailorId === t.id && apptsFor('customer').some((a) => a.tailorId === t.id && a.status === 'completed');
  return `${booking ? flowBar({ step: 2 }) : chrome(profile ? 'bookings' : 'home')}<main class="body ${preview ? '' : 'body--with-bar '}${ID}${profile ? ` ${ID}--profile` : ''}">
  ${again ? `<p class="t-small c-600 ${ID}__again" data-again>Booking again with ${esc(first)}</p>` : ''}
  ${booking ? '' : navBackMark()}${portrait(t)}
  ${identity(t)}
  ${stats(t, job)}
  ${preview ? `<div class="c-tailor__preview">${readOnlyBanner({ text: 'You’re viewing your own profile', ctaLabel: 'Back to Taily for tailors', ctaAct: 'exit-preview' })}</div>` : ''}
  ${declined ? `<div class="c-tailor__banner">${banner({ tone: 'warning', title: `${esc(first)} declined this request`, text: `Your items are saved for other tailors. To book ${esc(first)}, start over with different work.` })}</div>` : ''}
  ${booking ? split(next, job, { ok: el.ok, reason: reasonNote(el, job) }) : ''}
  ${about(t)}
  ${profile ? '' : estimateCard(q, job)}
  ${reviews(t)}
  ${where(t, job)}
  ${gettingItBack(t)}
</main>
${preview ? ''
  : profile
    ? actionBar({ ctaLabel: `Book ${esc(first)} again`, ctaAct: 'book-again', secondaryLabel: 'Ask a question', secondaryAct: 'ask', secondaryIcon: ICON_CHAT })
    : declined
    ? actionBar({ ctaLabel: 'Start over with new items', ctaAct: 'new-job', note: `${esc(first)} declined this request` })
    : actionBar({ ctaLabel: 'Pick a time', ctaAct: 'pick-time', disabled: !el.ok, note: el.ok ? '' : reasonNote(el, job), secondaryLabel: 'Ask a question', secondaryAct: 'ask', secondaryIcon: ICON_CHAT })}`;
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
      case 'book-now': {   // K-18: the next opening goes into the booking draft, so the picker opens on it (one tap to confirm)
        const job = state.job; const t = chosen();
        const slot = nextOpening(t.id, job.visitType, { until: job.needBy });
        if (!slot) break;
        state.ui.booking = { ...state.ui.booking, tailorId: t.id, slot };
        go('c-book');
        break;
      }
      case 'book-again': {
        const tailorId = chosen().id;
        T.newJob();
        state.ui.booking = { tailorId };
        go('c-job', { fresh: true });
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
