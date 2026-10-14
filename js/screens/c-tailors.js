/* ============================================================
   c-tailors — C3 Tailors near you (M1 spec §C3)
   Compare matching tailors by estimate, distance and next opening.
   Focal: the tailor row's estimate. No action bar — the rows are the action.
   ============================================================ */
import { register, render as go, currentScreen } from '../app.js';
import { state, T, tailorsFor, tailorById } from '../state.js';
import {
  chrome, bookingSteps, headingRow, filterPill, tailorRow, skeleton, emptyState, banner, sheetOverlay, optionRow, esc,
} from '../components.js';
import { withLatency } from '../sim.js';
import { fmtColumn } from '../money.js';
import { itemsLabel, VISIT_LABEL } from '../data.js';
import { fmtDay, nb } from '../dates.js';

const ID = 'c-tailors';

export const SORTS = [
  { value: 'recommended', label: 'Recommended', sub: 'Rating, distance and price together' },
  { value: 'price', label: 'Lowest price', sub: '' },
  { value: 'nearest', label: 'Nearest', sub: '' },
  { value: 'soonest', label: 'Soonest opening', sub: '' },
];
const sortLabel = (v) => (SORTS.find((s) => s.value === v) ?? SORTS[0]).label;

/* screen-local UI: state.ui['c-tailors'] = { loadedFor, sort } (D-34) */
const ui = () => (state.ui[ID] ??= {});
const filterKey = (job) => [job.visitType, job.zip, job.needBy].join('|');

/** Re-order rows for the chosen sort. Declined rows always go last; "Recommended" keeps the model's order. */
function sorted(rows, sort) {
  const by = {
    price: (a, b) => a.quote.total - b.quote.total,
    nearest: (a, b) => (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity),
    soonest: (a, b) => String(a.nextOpening).localeCompare(String(b.nextOpening)),
  }[sort];
  const live = rows.filter((r) => !r.declined);
  const declined = rows.filter((r) => r.declined);
  return [...(by ? [...live].sort(by) : live), ...declined];
}

/* the pills summarise the Where-and-when answers and open that screen — a pencil, not a dropdown chevron (R1-2-C-06) */
function filters(job) {
  return `<div class="c-tailors__filters" role="group" aria-label="Your search">
    ${filterPill('Visit', VISIT_LABEL.customer[job.visitType], { edit: true, attrs: 'data-act="edit-where" aria-label="Visit: change on Where and when"' })}
    ${filterPill('ZIP', esc(job.zip), { edit: true, attrs: 'data-act="edit-where" aria-label="ZIP: change on Where and when"' })}
    ${filterPill('Need by', fmtDay(job.needBy), { edit: true, attrs: 'data-act="edit-where" aria-label="Need by: change on Where and when"' })}
  </div>`;
}

/** The empty wrapper for each `tailorsFor(...).empty` kind. */
function empty(kind, job) {
  const home = job.visitType === 'home';
  if (kind === 'zip') {
    return `<div data-empty="zip">${emptyState(home
      ? { title: `No tailors visit ${esc(job.zip)} yet`, body: 'Taily is growing across Brooklyn. Shops within 5 miles of you may still fit you in.',
          ctaLabel: 'Try a visit at the shop', ctaAct: 'try-shop', secondaryLabel: 'Change address', secondaryAct: 'edit-where' }
      : { title: `No shops near ${esc(job.zip)} yet`, body: 'Taily is growing across Brooklyn. A tailor who comes to you may still fit you in.',
          ctaLabel: 'Switch to At my place', ctaAct: 'try-home', secondaryLabel: 'Change address', secondaryAct: 'edit-where' })}</div>`;
  }
  if (kind === 'shop') {
    return `<div data-empty="shop">${emptyState({ title: `No shops near ${esc(job.zip)} right now`, body: 'Tailors near you are doing home visits instead.',
      ctaLabel: 'Switch to At my place', ctaAct: 'try-home', secondaryLabel: 'Change ZIP', secondaryAct: 'edit-where' })}</div>`;
  }
  if (kind === 'nothing-open') {
    return `<div data-empty="nothing-open">${emptyState({ title: `Nothing open before ${nb(fmtDay(job.needBy))}`,
      body: 'Tailors near you are booked until after your need-by date. A later date opens more times.',
      ctaLabel: 'Pick a later date', ctaAct: 'later',
      ...(home ? { secondaryLabel: 'Try a visit at the shop', secondaryAct: 'try-shop' } : {}) })}</div>`;
  }
  /* none-left (M3, D-83): every tailor is hidden for this job after the last expiry */
  const hidden = tailorById((job.hiddenTailors ?? [])[0]);
  const hf = esc((hidden?.name || 'The tailor').split(' ')[0]);
  return `<div data-empty="none-left">${emptyState({ title: 'No other tailors for this job yet',
    body: `${hf} didn’t reply in time. We’ll let you know when more tailors join near ${esc(job.zip)}.`,
    ctaLabel: 'Change need-by date', ctaAct: 'later',
    secondaryLabel: 'Change ZIP', secondaryAct: 'edit-where' })}</div>`;
}

function declinedBanner(job) {
  const names = (job.declinedBy ?? []).map((id) => tailorById(id)?.name?.split(' ')[0]).filter(Boolean);
  if (!names.length) return '';
  return `<div class="c-tailors__banner">${banner({
    tone: 'warning',
    title: names.length === 1 ? `${esc(names[0])} can’t take this job` : `${names.length} tailors can’t take this job`,
    text: `Your job details are saved. You can still book ${names.length === 1 ? esc(names[0]) : 'them'} for a different job.`,
    actionLabel: 'Start a different job', actionAct: 'new-job',
  })}</div>`;
}

function view(s) {
  const job = s.job;
  const u = ui();
  const loaded = u.loadedFor === filterKey(job);
  let body;
  if (!loaded) {
    body = `<div class="c-tailors__bar"><span class="t-small c-600" role="status">Finding tailors…</span></div>${skeleton({ kind: 'tailor-row', count: 3 })}`;
  } else {
    const res = tailorsFor(job);
    if (res.empty) {
      body = empty(res.empty, job);
    } else {
      const rows = sorted(res.rows, u.sort);
      const fmtAmt = fmtColumn(rows.flatMap((r) => (r.declined ? [] : [r.quote.total, r.quote.homeFee, r.quote.rush])));   // D-98: one precision across the list
      body = `${declinedBanner(job)}
  <div class="c-tailors__bar">
    <span class="t-small c-600">${rows.some((r) => !r.declined) ? itemsLabel(rows.filter((r) => !r.declined).length, 'tailor') : 'No tailors available for this job'}</span>
    <button type="button" class="c-tailors__sort t-small w-600" data-act="sort" aria-haspopup="dialog">Sort: ${sortLabel(u.sort)}</button>
  </div>
  <div class="c-tailors__rows">${rows.map((r) => tailorRow({
        id: r.tailor.id, name: r.tailor.name, initials: r.tailor.initials, photo: r.tailor.photo, verified: r.tailor.verified,
        rating: r.tailor.rating?.count > 0 ? r.tailor.rating : null, distanceMi: r.distanceMi, quote: r.quote,
        nextOpening: r.nextOpening, visitType: job.visitType, declined: r.declined, format: fmtAmt })).join('')}</div>
  <p class="t-small c-600 c-tailors__note">Estimates come from each tailor’s own price list. Your tailor confirms the price at the fitting.</p>`;
    }
  }
  return `${chrome('home')}<main class="body ${ID}">
  ${bookingSteps(2)}
  ${headingRow('<h1 class="t-title">Tailors near you</h1>')}
  ${filters(job)}
  ${body}
</main>`;
}

function openSort(root) {
  const current = ui().sort ?? 'recommended';
  const rows = SORTS.map((o) => optionRow({ name: 'sort', value: o.value, title: o.label, sub: o.sub, checked: o.value === current, act: 'sort-opt' })).join('');
  sheetOverlay(`<div class="c-tailors__sheet" role="radiogroup" aria-label="Sort by">${rows}</div>`, { header: 'Sort by', dataS: 'c-tailors--sort', confirm: false }, (holder, close) => {
    holder.addEventListener('click', (e) => {
      const opt = e.target.closest('[data-act="sort-opt"]');
      if (!opt) return;
      ui().sort = opt.dataset.value;
      close({ instant: true });
      go(ID);
    });
  });
}

let cancelLoad = () => {};
let ac = null;

function wire(root) {
  ac?.abort(); ac = new AbortController();
  cancelLoad();
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.closest('.screen-sheet')) return;
    switch (el.dataset.act) {
      case 'open-tailor':
        state.ui.booking = { ...state.ui.booking, from: undefined, tailorId: el.dataset.id };
        go('c-tailor');
        break;
      case 'edit-where': go('c-where'); break;
      case 'message-hidden':
        state.ui.booking = { ...state.ui.booking, from: undefined, tailorId: (state.job.hiddenTailors ?? [])[0] };
        go('c-thread');
        break;
      case 'new-job': T.newJob(); go('c-job', { fresh: true }); break;
      case 'sort': openSort(root); break;
      case 'try-shop': T.setJob({ visitType: 'shop' }); go(ID); break;
      case 'try-home': T.setJob({ visitType: 'home' }); go(ID); break;
      case 'later':
        state.ui['c-where'] = { ...state.ui['c-where'], openNeedBy: true };
        go('c-where');
        break;
      default: break;
    }
  }, { signal: ac.signal });

  /* the skeleton is showing: "ask the server", then paint the results (instant under test, 'hold' never ends).
     Listeners go on first — an instant load re-renders this screen from inside this call. */
  const key = filterKey(state.job);
  if (ui().loadedFor !== key) {
    let sync = true;
    cancelLoad = withLatency(() => {
      if (!sync && currentScreen() !== ID) return;
      ui().loadedFor = key;
      go(ID);
    });
    sync = false;
  }
}

register(ID, view, wire);
