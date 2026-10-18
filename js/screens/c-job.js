/* ============================================================
   c-job — C1 What needs work (Home tab). M1 spec §C2.
   Garments + the services for each one. No prices here (per tailor, D-45).
   Focal: the garment grid while empty; the "Your items" list once filled.
   ============================================================ */
import { register, render as go } from '../app.js';
import {
  state, T, activeAppt, statusScreen, tailorById, priceChangeView, reviewReminder, apptsFor, freeUntil, now, visitReminder, reminderState, autoCancelAt,
  jobEditView, handoffMissed, slotText, noticesFor, autoCancelArmed, proposalOf, visitCheckOpen, overdue,
} from '../state.js';
import {
  chrome, bookingSteps, garmentTile, photoTile, actionBar, checkRow, cta, listRow, apptRow,
  sheetOverlay, toast, esc, garmentHead, sectionHead, textLink, reminderCard, visitPrompt, chargedWhen,
} from '../components.js';
import { GARMENT_TYPES, SERVICES, MAX_ITEMS, itemsLabel, servicesForType } from '../data.js';
import { CHEVRON_RIGHT } from '../icons.js';
import { fmtColumn, fmtExact } from '../money.js';
import { fmtWhen, fmtTime, fmtDay, dayWord } from '../dates.js';
import { VISIT_LABEL } from '../data.js';
import { setFocus, statusWord } from '../focus.js';

const ID = 'c-job';
const MAX_PHOTOS = 3;   // per garment (D-42)

/* ---------- typed / transient UI: which garments show the "choose a service" error ---------- */
const ui = () => (state.ui[ID] ??= { errors: {} });

/* K-26 (H2): every service, one per line after a K-25 cognac bullet; from the 5th service the list flows into two columns
   (CSS :has, same markup at every count). Spans, not a <ul>, because the list sits inside the field's <button>; sr-only commas read it as a list. */
const serviceList = (g) => {
  const labels = g.services.map((id) => SERVICES[id]?.label).filter(Boolean);
  return `<span class="sr-only">Services: </span><span class="job-item__svcs">${labels.map((l, i) => `<span class="job-item__svc">${esc(l)}${i < labels.length - 1 ? '<span class="sr-only">, </span>' : ''}</span>`).join('')}</span>`;
};

function itemCard(g) {
  const hasErr = !!ui().errors[g.id];
  const errId = `svc-err-${g.id}`;
  const thumbs = Array.from({ length: g.photos }, (_, i) => photoTile('photo', { type: g.type, tone: i })).join('');
  const addPhoto = g.photos < MAX_PHOTOS
    ? `<button type="button" class="job-item__add" data-act="add-photo" data-id="${g.id}" aria-label="Add a photo of the ${esc(g.type)}">${photoTile('add')}</button>`
    : '';
  return `<article class="card job-item" data-id="${g.id}">
  <div class="job-item__head">${garmentHead({ type: g.type, services: g.services.length ? g.services.map((id) => SERVICES[id]?.label).filter(Boolean) : null, trailing: `<button type="button" class="job-item__remove" data-act="remove-garment" data-id="${g.id}" aria-label="Remove ${esc(g.type)}"><span aria-hidden="true">✕</span></button>` })}</div>
  <div class="job-item__task">
  <button type="button" class="job-item__services${hasErr ? ' job-item__services--error' : ''}" data-act="pick-services" data-id="${g.id}"${hasErr ? ` aria-invalid="true" aria-describedby="${errId}"` : ''}>
    <span class="job-item__services-text t-body ${g.services.length ? 'c-700' : 'c-accent-ink'}">${g.services.length ? serviceList(g) : 'Choose what needs doing'}</span>
    ${CHEVRON_RIGHT.replace('method-row__chevron', 'job-item__chevron')}
  </button>
  ${hasErr ? `<p class="field__msg field__msg--error" id="${errId}" data-error="service" role="alert">Choose at least one service.</p>` : ''}
  </div>
  <div class="job-item__photos">
    <div class="photo-tiles">${thumbs}${addPhoto}</div>
    <p class="job-item__caption t-small c-600">Photo (optional)</p>
  </div>
</article>`;
}

/** SF-39: the day the order came back (the handoff, else the completed step). */
const cameBack = (a) => a.handoff?.completedAt ?? [...a.history].reverse().find((h) => h.status === 'completed')?.at ?? a.slot.start;

/** The tailor of a "Book again" draft (Study-1 A4): `ui.booking.again` and an order with her that came back; else null. */
function againTailor() {
  const b = state.ui.booking;
  if (!b?.again) return null;
  const t = tailorById(b.tailorId);
  return t && apptsFor('customer').some((a) => a.tailorId === t.id && a.status === 'completed') ? t : null;
}

/** D-168: Home leads with the booking in flight — one appointment row, then the wizard under "Book something else".
    SF-08: the booking that needs her leads — the reminder first, then a reply she owes (new time, final order, edit, way back). */
function activeRow() {
  const a = visitReminder() ?? apptsFor('customer').find((x) => reminderState(x) === 'missed')
    ?? apptsFor('customer').find((x) => ['price-change', 'ready', 'suggested'].includes(x.status) || x.edit?.state === 'pending' || proposalOf(x) || visitCheckOpen(x, 'customer'))   // pre-MVP A1: a move Amara asked for (D-12), "Did the visit happen?" (D-11)
    ?? activeAppt();
  if (!a) return '';
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const w = statusWord(a, 'customer', { short: true });
  const row = {
    id: a.id, name: t.name, initials: t.initials, status: w.pill, pillLabel: w.label,
    when: fmtWhen(a.status === 'suggested' && a.suggested ? a.suggested.start : a.slot.start), place: VISIT_LABEL.customer[a.job.visitType],
  };
  let cents = a.money.total;
  if (a.status === 'price-change') { cents = priceChangeView(a).after.total; row.amountCaption = 'Approve order'; row.captionTone = 'action'; }
  else if (a.status === 'in-progress' && a.edit?.state === 'pending') { cents = jobEditView(a).after.total; row.amountCaption = 'Approve changes'; row.captionTone = 'action'; }   // SF-12
  else if (a.status === 'ready') { cents = a.money.balance; row.amountCaption = 'Choose a way back'; row.captionTone = 'action'; }   // K-27: the balance is held, not paid, at this step
  else if (a.status === 'suggested') { row.amountCaption = 'New time'; row.captionTone = 'action'; }
  else if (proposalOf(a)) { row.when = fmtWhen(proposalOf(a).start); row.amountCaption = 'New time asked'; row.captionTone = 'action'; }   // D-12
  else if (visitCheckOpen(a, 'customer')) { row.amountCaption = 'Did it happen?'; row.captionTone = 'action'; }                   // D-11
  else if (overdue(a)) { row.when = `Overdue · due ${fmtDay(a.job.needBy)}`; }                                                       // B-07
  else if (a.status === 'awaiting-handoff') {
    /* SF-12: the c-bookings rule — the held balance and when it is charged; the picked time and where she gets it */
    const b = a.payments.balance;
    cents = b.cents > 0 ? b.cents : a.money.total;
    row.amountCaption = b.state === 'capture-failed' ? 'Update card' : b.state === 'captured' ? 'Charged' : b.cents > 0 ? chargedWhen(a.returnOption) : 'Paid';
    if (b.state === 'capture-failed') row.captionTone = 'action';   // D-04
    if (a.handoff?.slot) row.when = handoffMissed(a) ? `Missed ${fmtTime(a.handoff.slot.start)} pickup` : slotText(a.handoff.slot);
    row.place = a.returnOption === 'courier' ? 'Delivered to my place' : `At ${t.shopName || t.shop?.street || 'the shop'}`;
  }
  /* K-41 (R3, D-296) + SF-09: while the reminder waits on her (asked, or missed and not yet cancelled) the row becomes the prompt card */
  const r = reminderState(a);
  const prompt = r === 'asked' || r === 'missed';
  const fmtAmt = fmtColumn(prompt ? [cents, a.payments.deposit.cents] : [cents]);   // SF-39: one precision for the row and the deposit rule
  if (a.status !== 'requested' && a.status !== 'suggested' && a.status !== 'expired') row.amountText = ['confirmed', 'fitting'].includes(a.status) ? `Est. ${fmtAmt(cents)}` : fmtAmt(cents);
  const first = (t.name || 'The tailor').split(' ')[0];
  const dep = `<span data-money>${fmtAmt(a.payments.deposit.cents)}</span>`;
  const away = a.job.visitType === 'home' ? 'aren’t home' : 'don’t come to the shop';   // SF-10
  let inner = apptRow(row);
  if (r === 'asked') {
    inner = visitPrompt({
      id: a.id, row,
      text: 'Please confirm your visit',   // K-51: as the reminder text (C7) asks it
      right: `Free until ${fmtTime(freeUntil(a))} ${dayWord(freeUntil(a), now())}`,
      rule: `After that, ${esc(first)} keeps your ${dep} deposit if you cancel or ${away}.`,   // K-53: confirming doesn't end the free window
    });
  } else if (r === 'missed' && !autoCancelArmed(a)) {
    /* D-02 (pre-MVP A1): the reminder text never reached her, so nothing will cancel the visit — the plain 24 h rule */
    inner = visitPrompt({
      id: a.id, row, tone: 'warn',
      text: 'You haven’t confirmed',
      right: dayWord(a.slot.start, now()) === 'today' ? `Visit ${fmtTime(a.slot.start)}` : `Visit ${dayWord(a.slot.start, now())} ${fmtTime(a.slot.start)}`,
      rule: `The visit is still on. If you cancel now or ${away}, ${esc(first)} keeps your ${dep} deposit.`,
    });
  } else if (r === 'missed') {
    /* SF-09 (D-304, overrides D-296(4)): Home keeps the Confirm card once the free window closed unanswered — the c-booking missed rule */
    const by = fmtTime(autoCancelAt(a));
    inner = visitPrompt({
      id: a.id, row, tone: 'warn',
      text: `Confirm by ${by} or we’ll cancel`,
      right: dayWord(a.slot.start, now()) === 'today' ? `Visit ${fmtTime(a.slot.start)}` : `Visit ${dayWord(a.slot.start, now())} ${fmtTime(a.slot.start)}`,
      rule: `If you don’t confirm by ${by}, we cancel it and ${esc(first)} keeps your ${dep} deposit. She keeps it too if you cancel now or ${away}.`,
    });
  }
  return `<section class="${ID}__active" data-active-appt aria-label="Your booking">${inner}</section>
  <p class="t-caps c-600 ${ID}__book-else">Book something else</p>`;
}

function view() {
  const { garments } = state.job;
  const count = (type) => garments.filter((g) => g.type === type).length;
  const full = garments.length >= MAX_ITEMS;
  const tiles = Object.keys(GARMENT_TYPES).map((type) => {
    const qty = count(type);
    const off = full && qty === 0 ? ' disabled aria-disabled="true"' : '';
    return garmentTile(type, { qty, attrs: `data-act="add-garment" data-type="${esc(type)}"${off}`, addDisabled: full });
  }).join('');
  const helper = full ? `You can add up to ${MAX_ITEMS} items per visit.` : '';
  const items = garments.length
    ? `<section class="sec job__items" aria-labelledby="job-items-h">
    ${sectionHead('Your items', { id: 'job-items-h', count: itemsLabel(garments.length, 'item') })}
    <div class="sec__body job__items-list">${garments.map(itemCard).join('')}</div>
  </section>`
    : '';
  /* Study-1 A4 (K-28): 7 days after an order came back with no review, the reminder card leads Home */
  const due = reviewReminder();
  const dueFirst = due ? (tailorById(due.tailorId)?.name || 'your tailor').split(' ')[0] : '';
  const reminder = due ? `<div class="${ID}__reminder">${reminderCard({ title: `How did ${dueFirst} do?`, text: `Your order came back on ${fmtDay(cameBack(due))}. Your review helps other customers.`, act: 'review-reminder', id: due.id, dismissAct: 'dismiss-review' })}</div>` : '';   // P-04: ✕ = Not now
  const notices = noticesFor('customer').map(noticeCard).join('');
  /* Study-1 A4 (default 9): "Book Amara again" starts here with her named; Next then goes straight to her profile */
  const again = againTailor();
  return `${chrome('home')}<main class="body body--with-bar ${ID}">
  ${notices ? `<div class="${ID}__notices">${notices}</div>` : ''}
  ${reminder}
  ${activeRow()}
  ${bookingSteps(0)}
  ${again ? `<p class="t-small c-600 job__again" data-again>Booking again with ${esc((again.name || '').split(' ')[0])}</p>` : ''}
  <h1 class="t-title job__title">What needs work?</h1>
  <p class="t-body c-600 job__lead">Tap a garment to add it.</p>
  <div class="tile-grid job__grid"${full ? ' data-max="true"' : ''}>${tiles}</div>
  <p class="sr-only" aria-live="polite" data-tile-live></p>
  ${helper ? `<p class="t-small c-600 job__helper" data-helper>${helper}</p>` : ''}
  ${items}
</main>${actionBar({
    ctaLabel: 'Next: where and when', ctaAct: 'next', disabled: !garments.length,
    note: garments.length ? '' : 'Add at least one garment to continue.',
  })}`;
}

/* ---------- DG-2 A (pre-MVP A1): a cancelled visit never just vanishes — a one-time notice card, ✕ or its button clears it ---------- */
function noticeCard(a) {
  const t = tailorById(a.tailorId) ?? state.tailors[0];
  const first = (t.name || 'Your tailor').split(' ')[0];
  const dep = fmtExact(a.payments.deposit.cents);
  const day = dayWord(a.slot.start, now());
  const items = a.job.garments.length;
  const services = a.job.garments.reduce((n, g) => n + g.services.length, 0);
  const saved = `Your ${items} ${items === 1 ? 'item' : 'items'} and ${services} ${services === 1 ? 'service' : 'services'} are saved`;
  const cfg = {
    'tailor-cant-make-it': { title: `${first} can’t make it ${day}`, text: `Your ${dep} deposit is refunded. ${saved}, so you can book someone else.`, actionLabel: 'Find another tailor', act: 'notice-find' },
    unconfirmed: { title: `We cancelled your ${fmtTime(a.slot.start)} visit`, text: `You didn’t confirm by ${fmtTime(a.cancel.at)}, so ${first} keeps your ${dep} deposit. Your order is saved.`, actionLabel: `Book ${first} again`, act: 'notice-book' },
    /* K-51: closed "Not confirmed" — the deposit on hold; or her "I'm here" made it a no-show */
    'no-record': { title: `Your ${fmtDay(a.slot.start)} visit wasn’t confirmed`, text: `Nobody confirmed it, so your ${dep} deposit is on hold. If the visit didn’t happen, tell us on the booking by ${fmtWhen(a.cancel.holdUntil ?? a.cancel.at)}. Your order is saved.`, actionLabel: 'See the booking', act: 'notice-open' },
    'no-show': a.cancel?.by === 'system'
      ? { title: `Your ${fmtDay(a.slot.start)} visit counts as a no-show`, text: `You didn’t tell us if it happened, and ${first} tapped I’m here, so she keeps your ${dep} deposit. If you were there, tell us on the booking.`, actionLabel: 'See the booking', act: 'notice-open' }
      : { title: `${first} marked you as not there`, text: `She keeps your ${dep} deposit. If you were there, tell us on the booking.`, actionLabel: 'See the booking', act: 'notice-open' },
  }[a.cancel?.reason];
  return cfg ? reminderCard({ ...cfg, id: a.id, dismissAct: 'dismiss-notice', notice: true }) : '';
}

/* ---------- overlays ---------- */
/* K-23: after a tile / + adds a garment, focus lands on that tile's + (the tile becomes a stepper at qty 1) */
const focusTile = (type) => {
  const hits = [...document.querySelectorAll(`#screen [data-act="add-garment"][data-type="${CSS.escape(type)}"]`)];
  (hits.find((h) => h.matches('[data-plus]')) ?? hits.find((h) => !h.matches('[data-minus]')) ?? hits[0])?.focus({ preventScroll: true });
};
function openServices(root, id) {
  const g = state.job.garments.find((x) => x.id === id);
  if (!g) return;
  const rows = servicesForType(g.type).map((sid) => checkRow({
    id: `svc-${sid}`, label: SERVICES[sid].label, checked: g.services.includes(sid), attrs: `data-service="${sid}"`,
  })).join('');
  const html = `<p class="t-small c-600">Pick all that apply.</p>
<div class="job-svc__list">${rows}</div>
<div class="job-svc__cta">${cta('Done', { attrs: 'data-act="services-done"' })}</div>`;
  sheetOverlay(html, { header: `${esc(g.type)} — what needs doing?`, dataS: `${ID}-services`, confirm: false }, (holder, close) => {
    const done = () => {
      const ids = [...holder.querySelectorAll('[data-service]:checked')].map((el) => el.dataset.service);
      T.setServices(g.id, ids);
      if (ids.length) delete ui().errors[g.id];
      close();
      go(ID);
      requestAnimationFrame(() => document.querySelector(`#screen [data-act="pick-services"][data-id="${g.id}"]`)?.focus({ preventScroll: true }));
    };
    holder.querySelector('[data-act="services-done"]').addEventListener('click', done);
  });
}

function openPhoto(root, id) {
  const g = state.job.garments.find((x) => x.id === id);
  if (!g || g.photos >= MAX_PHOTOS) return;
  const html = `<div class="job-photo__list">${listRow({ title: 'Take a photo', act: 'photo-take' })}${listRow({ title: 'Choose from library', act: 'photo-library' })}</div>
<div class="job-photo__cancel">${textLink('Cancel', { act: 'photo-cancel', tone: 'muted' })}</div>`;
  sheetOverlay(html, { header: 'Add a photo', dataS: `${ID}-photo`, confirm: false }, (holder, close) => {
    const add = () => {
      T.setJob({ garments: state.job.garments.map((x) => (x.id === id ? { ...x, photos: Math.min(MAX_PHOTOS, x.photos + 1) } : x)) });
      close();
      go(ID);
      toast('Photo added');
    };
    holder.querySelector('[data-act="photo-take"]').addEventListener('click', add);
    holder.querySelector('[data-act="photo-library"]').addEventListener('click', add);
    holder.querySelector('[data-act="photo-cancel"]').addEventListener('click', () => close());
  });
}

/* ---------- wiring ----------
   Listeners go on the screen's own <main> / action bar (replaced on every render), never on the
   shared #screen element, so nothing stacks up across renders or screens. */
function wire(root) {
  const main = root.querySelector('main');
  const bar = root.querySelector('.action-bar');

  main.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-act="add-garment"]');
    if (tile) {
      if (tile.disabled) return;
      const type = tile.dataset.type;
      let added = null;
      if (e.target.closest('[data-minus]')) {
        const last = [...state.job.garments].reverse().find((g) => g.type === type);
        if (last) { T.removeGarment(last.id); delete ui().errors[last.id]; }
      } else if (state.job.garments.length < MAX_ITEMS) {
        added = T.addGarment(type).garment ?? null;
      }
      go(ID);   // the router puts focus back on the same tile / − / + (AU-P1-2a)
      /* K-23 (reverses D-226): adding a garment only adds it — the item shows "Choose what needs doing" under Your items, and Next still requires a service */
      if (added) focusTile(type);
      /* SF-42: say the new count ("2 Suit Jackets" / "0 Suit Jacket") — the re-render replaces the group, so its label alone is not announced */
      const n = state.job.garments.filter((g) => g.type === type).length;
      const live = document.querySelector('#screen [data-tile-live]');
      if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = `${n} ${n === 1 ? type : GARMENT_TYPES[type]?.plural ?? type}`; }); }
      return;
    }
    const note = e.target.closest('[data-act^="notice-"], [data-act="dismiss-notice"], [data-act="dismiss-review"]');
    if (note) {
      const id = note.dataset.id;
      const act = note.dataset.act;
      if (act === 'dismiss-review') { T.dismissReviewReminder(id); go(ID); return; }
      T.dismissNotice(id, 'customer');
      const n = apptsFor('customer').find((x) => x.id === id);
      if (act === 'dismiss-notice') { go(ID); requestAnimationFrame(() => document.querySelector('#screen main [data-act="next"], #screen .job__title')?.focus?.({ preventScroll: true })); return; }
      if (act === 'notice-find') { go('c-tailors', { fresh: true }); return; }
      if (act === 'notice-book' && n) { state.ui.booking = { tailorId: n.tailorId }; go('c-book'); return; }
      if (n) { setFocus(n.id); go('c-booking'); }
      return;
    }
    const remind = e.target.closest('[data-act="review-reminder"]');
    if (remind) { setFocus(remind.dataset.id); state.ui['c-review'] = { apptId: remind.dataset.id }; go('c-review'); return; }
    const yes = e.target.closest('[data-act="confirm-visit"]');
    if (yes) {
      const res = T.confirmVisit(yes.dataset.id);
      go(ID);
      if (res.ok) toast(`You’re confirmed. See you ${dayWord(res.appt.slot.start, now())} at ${fmtTime(res.appt.slot.start)}.`, { tone: 'success' });
      return;
    }
    const open = e.target.closest('[data-act="open-appt"]');
    if (open) {
      const a = (open.dataset.id && apptsFor('customer').find((x) => x.id === open.dataset.id)) || activeAppt();   // SF-08: the row shown may not be activeAppt()
      if (a) { setFocus(a.id); go(statusScreen(a, 'customer')); }
      return;
    }
    const rm = e.target.closest('[data-act="remove-garment"]');
    if (rm) {
      T.removeGarment(rm.dataset.id);
      delete ui().errors[rm.dataset.id];
      go(ID);
      return;
    }
    const pick = e.target.closest('[data-act="pick-services"]');
    if (pick) { openServices(root, pick.dataset.id); return; }
    const photo = e.target.closest('[data-act="add-photo"]');
    if (photo) openPhoto(root, photo.dataset.id);
  });

  bar.addEventListener('click', (e) => {
    const next = e.target.closest('[data-act="next"]');
    if (!next || next.disabled) return;
    const { ok, errors } = T.validateJob(state.job, 'what');
    if (ok) {
      ui().errors = {};
      go('c-where');
      return;
    }
    ui().errors = {};
    Object.keys(errors).filter((k) => k.startsWith('service:')).forEach((k) => { ui().errors[k.slice(8)] = true; });
    go(ID);
    const first = document.querySelector('#screen [data-error="service"]')?.closest('.job-item');
    if (first) {
      first.scrollIntoView({ block: 'center' });
      first.querySelector('[data-act="pick-services"]')?.focus({ preventScroll: true });
    }
  });
}

register(ID, view, wire);
