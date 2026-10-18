/* ============================================================
   to-profile — O1 Profile (M2-spec §C1). Focal: the "Your name"
   field. Two modes (D-56): onboarding (not live yet: stepper +
   Next) and edit (live: Shop chrome + Save changes). The draft
   lives in state.ui['to-profile'].draft (D-34) and is written to
   the model only through T.setTailorSection. Live captions (the
   counter, the initials, the preview) update IN PLACE on input.
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state, T, SECTIONS, validateSection, onboarded, isVerified, waitlisted, checkState } from '../state.js';
import { myTailor } from '../tailor-data.js';
import { TAILOR_LIMITS, GARMENT_TYPES, TAILORS, SEED_JOB, ZIP_INFO, hoodNames } from '../data.js';
import { estimate, fmt } from '../money.js';
import {
  onboardingHeader, onboardingSteps, ONBOARDING_STEPS, resumeText, headingRow, banner, field, textArea, avatar, textLink, photoTile, photoStub,
  customerPreview, tailorRow, actionBar, sheetOverlay, modalOverlay, leaveModal, leaveSheet, listRow, toast, esc, wireTextLimit, openIdSheet, statusPill, checkWords,
} from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';

const ID = 'to-profile';
const STEP = 'profile';
const { BIO_MAX, CARD_LINE_MAX, WORK_PHOTOS_MAX, YEARS_MIN, YEARS_MAX } = TAILOR_LIMITS;
const HELPERS = {
  name: 'Customers see your full name.',
  bio: '',
  cardLine: '',
  photo: 'Required. Customers see it on the list.',
  years: `Taily tailors have at least ${YEARS_MIN} years of experience.`,   // D-18 (D-353)
  idDoc: 'Required. We match it to your profile photo. Only Taily sees it.',   // DG-4 (D-350): the "ID and profile photo" check
};
/* Study-1 C1: what each text is for, in the label; a grey example as the placeholder (never a value, so it can't be saved by accident) */
const LABELS = {
  cardLine: 'Card line — the one sentence customers see in search results',
  bio: 'About — the full bio on your profile',
};
const PLACEHOLDERS = {
  cardLine: 'Example: I’ve been tailoring luxury clothes for 10 years and frequently work with designers for fashion week',
  bio: 'Example: I’ve tailored luxury and designer clothing for 10 years, including looks for fashion week. I specialize in suits, coats and eveningwear, and I pin every fitting myself. I make home visits in SoHo, Tribeca, the West Village and Williamsburg.',
};
/* K-19: the card preview is drawn for the demo customer's sample job (suit jacket + suit pants, at her place); price and next opening fill in per job */
const SAMPLE_NEXT = '2026-10-15T17:00';
const PREVIEW_CAPTION = 'Shown for a sample job (suit jacket + suit pants) at the customer’s place. Price and next opening fill in per job.';
/* work photos are drawn as garments, cycling the catalog (M7 A5.12) */
const GARMENTS = Object.keys(GARMENT_TYPES);
const workType = (i) => GARMENTS[i % GARMENTS.length];
const bioLen = (v) => [...String(v ?? '')].length;
const ui = () => (state.ui[ID] ??= {});

/* ---------- draft ---------- */
const fromTailor = (t) => ({ name: t.name ?? '', shopName: t.shopName ?? '', years: t.years == null ? '' : String(t.years), cardLine: t.cardLine ?? '', bio: t.bio ?? '', photo: t.photo || false, idDoc: !!t.idDoc, workPhotos: t.workPhotos ?? 0 });
const sig = (d) => JSON.stringify(fromTailor(d));
/** The draft: what she has typed, filled out once with the model's values for any field not in it yet (a fixture draft predates years / idDoc). */
const draftOf = () => {
  const u = ui();
  if (!u.draft || !('years' in u.draft) || !('idDoc' in u.draft)) u.draft = { ...fromTailor(myTailor()), ...(u.draft ?? {}) };
  return u.draft;
};
const isDirty = () => sig(draftOf()) !== sig(fromTailor(myTailor()));
const initialsOf = (name) => String(name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => [...w][0].toUpperCase()).join('');

/* ---------- copy ---------- */
function errorCopy(code, d) {
  if (code === 'name-required') return 'Enter your name as customers will see it.';
  if (code === 'bio-required') return 'Write a line or two about your work.';
  if (code === 'bio-long') return `Keep it to ${BIO_MAX} characters — you’re at ${bioLen(d.bio)}.`;
  if (code === 'cardline-required') return 'Write the line customers see on the list.';
  if (code === 'cardline-long') return `Keep it to ${CARD_LINE_MAX} characters — you’re at ${bioLen(d.cardLine)}.`;
  if (code === 'photo-required') return 'Add a profile photo.';
  if (code === 'years-required') return 'Enter how many years you’ve been tailoring.';
  if (code === 'years-invalid') return `Enter a whole number of years, up to ${YEARS_MAX}.`;
  if (code === 'id-required') return 'Add a photo of your ID.';
  return '';
}

/* ---------- resume banner (onboarding) ---------- */
function resumeBanner(t) {
  if (!state.ui.onboarding?.resumed) return '';
  return `<div class="${ID}__resume">${banner({ tone: 'info', title: 'Pick up where you left off', text: resumeText(t), dismissible: true })}</div>`;   // SF-43
}

/* ---------- pieces ---------- */
/** The real list card (`tailorRow`) for the draft: her name, photo and card line, over the sample job's estimate and opening. */
function previewHtml(d) {
  const t = myTailor();
  const hood = t.shop?.hood || hoodNames(t.home?.hoods)[0] || ZIP_INFO[SEED_JOB.zip]?.hood || '';
  return tailorRow({
    id: 'preview', name: d.name.trim() || 'Your name', initials: initialsOf(d.name), photo: d.photo || null, verified: isVerified(t), years: Number(d.years) || 0,
    rating: t.rating?.count > 0 ? t.rating : null, quote: estimate(TAILORS[0], SEED_JOB, SAMPLE_NEXT), nextOpening: SAMPLE_NEXT,
    visitType: 'home', cardLine: d.cardLine, hood, format: fmt,
  });
}

function workPhotos(d) {
  /* a tile opens a small sheet (View / Remove) — a tap never deletes (D-71) */
  const tiles = Array.from({ length: d.workPhotos }, (_, i) => `<button type="button" class="${ID}__work" data-act="work-open" data-i="${i}" aria-label="Photo ${i + 1} of ${d.workPhotos}: view or remove" aria-haspopup="dialog">${photoTile('photo', { type: workType(i), tone: i % 4 })}</button>`).join('');
  const add = d.workPhotos < WORK_PHOTOS_MAX
    ? `<button type="button" class="${ID}__work" data-act="work-add" aria-label="Add a photo of your work">${photoTile('add')}</button>` : '';
  return `<div class="photo-tiles ${ID}__tiles">${tiles}${add}</div>`;
}

/** DG-4: the photo ID beside the profile photo — the first check. Onboarding: add it (required); afterwards: its check status. */
function idBlock(d, errors) {
  const t = myTailor();
  const st = checkState(t, 'id');
  const saved = !!t.idDoc && d.idDoc;
  const w = saved ? checkWords(t, 'id') : null;
  const canChange = !saved || st === 'needs-info';
  const msg = errors.idDoc ? `<p class="t-small w-600 c-error" id="id-msg" role="alert">${esc(errorCopy(errors.idDoc, d))}</p>`
    : `<p class="t-small c-600" id="id-msg">${esc(saved ? w.sub : d.idDoc ? 'Added. We check it once you finish.' : HELPERS.idDoc)}</p>`;
  return `<div class="${ID}__id${errors.idDoc ? ` ${ID}__id--error` : ''}" data-id-block>
    <div class="${ID}__id-head"><p class="t-body w-600">Photo ID</p>${saved ? statusPill(w.pill, w.pillLabel) : ''}</div>
    ${msg}
    ${canChange ? textLink(d.idDoc && !saved ? 'Change ID photo' : 'Add your ID', { act: 'id', attrs: 'aria-describedby="id-msg"' }) : ''}
  </div>`;
}

function view(s) {
  const t = myTailor();
  const editing = onboarded(t);
  const d = draftOf();
  const errors = ui().errors ?? {};
  const done = SECTIONS.filter((x) => t.onboarding?.[x]);
  const dirty = isDirty();
  const busy = !!ui().busy;
  const title = `<h1 class="t-title">Your profile</h1>`;
  return `${onboardingHeader({ editing, back: editing })}
<main class="body body--with-bar ${ID}">
  ${editing ? headingRow(title) : `${onboardingSteps(STEP, done)}${resumeBanner(t)}<div class="heading-block ${ID}__title">${title}</div>`}
  <p class="t-body c-600 ${ID}__lead">This is the first thing customers see.</p>
  ${customerPreview({ title: 'What customers see', html: previewHtml(d), sticky: true })}
  <p class="t-small c-600 ${ID}__preview-caption">${PREVIEW_CAPTION}</p>
  <div class="${ID}__photo${errors.photo ? ` ${ID}__photo--error` : ''}">
    ${initialsOf(d.name) ? avatar({ initials: initialsOf(d.name), photo: d.photo || null, size: 'lg' }) : avatar({ photo: true, size: 'lg' })}
    <div class="${ID}__photo-side">
      ${textLink(d.photo ? 'Change photo' : 'Add a photo', { act: 'photo' })}
      ${errors.photo ? `<p class="t-small w-600 c-error" id="photo-msg" role="alert">${esc(errorCopy(errors.photo, d))}</p>` : `<p class="t-small c-600" id="photo-msg">${HELPERS.photo}</p>`}
    </div>
  </div>
  ${idBlock(d, errors)}
  <div class="${ID}__group">${field({ id: 'name', label: 'Your name', value: d.name, autocomplete: 'name', helper: HELPERS.name, error: errorCopy(errors.name, d) })}</div>
  <div class="${ID}__group">${field({ id: 'shopName', label: 'Business name (optional)', value: d.shopName, autocomplete: 'organization', helper: HELPERS.shopName })}</div>
  <div class="${ID}__group ${ID}__years">${field({ id: 'years', label: 'Years tailoring', value: d.years, inputmode: 'numeric', maxlength: 2, autocomplete: 'off', helper: HELPERS.years, error: errorCopy(errors.years, d) })}</div>
  <div class="${ID}__group">${textArea({ id: 'cardLine', label: LABELS.cardLine, value: d.cardLine, maxlength: CARD_LINE_MAX, rows: 3, placeholder: PLACEHOLDERS.cardLine, helper: HELPERS.cardLine, error: errorCopy(errors.cardLine, d) })}</div>
  <div class="${ID}__group">${textArea({ id: 'bio', label: LABELS.bio, value: d.bio, maxlength: BIO_MAX, rows: 6, placeholder: PLACEHOLDERS.bio, helper: HELPERS.bio, error: errorCopy(errors.bio, d) })}</div>
  <div class="${ID}__work-block">
    <p class="t-small w-600 c-700" id="${ID}-work-label">Photos of your work (optional)</p>
    ${workPhotos(d)}
    <p class="t-small c-600">Up to ${WORK_PHOTOS_MAX}. Before-and-after shots in daylight work best. Ask before showing a customer’s face.</p>
  </div>
</main>
${editing
    ? actionBar({ ctaLabel: 'Save changes', ctaAct: 'save', disabled: !dirty && !busy, note: dirty || busy ? '' : 'No changes yet.', busy, busyLabel: 'Saving…' })
    : actionBar({ ctaLabel: 'Next', ctaAct: 'next', busy, busyLabel: 'Saving…' })}`;
}

/* ---------- wiring ---------- */
const cameraGlyph = () => { const t = document.createElement('template'); t.innerHTML = avatar({ photo: true }); return t.content.firstChild.innerHTML; };
const hangerGlyph = () => { const t = document.createElement('template'); t.innerHTML = avatar({ glyph: true }); return t.content.firstChild.innerHTML; };
function openPhoto(header, onAdd) {
  const html = `<div class="${ID}__sheet-list">${listRow({ title: 'Take a photo', act: 'photo-take' })}${listRow({ title: 'Choose from library', act: 'photo-library' })}</div>
<div class="${ID}__sheet-foot">${textLink('Cancel', { act: 'photo-cancel' })}</div>`;
  sheetOverlay(html, { header, dataS: `${ID}-photo`, confirm: false }, (holder, close) => {
    const add = () => { onAdd(); close(); go(ID); toast('Photo added'); };
    holder.querySelector('[data-act="photo-take"]').addEventListener('click', add);
    holder.querySelector('[data-act="photo-library"]').addEventListener('click', add);
    holder.querySelector('[data-act="photo-cancel"]').addEventListener('click', () => close());
  });
}

/** The View / Remove sheet for one work photo. View shows it larger in place; Remove lets go of it with an Undo toast. */
function openWorkPhoto(i, onRemove) {
  const n = draftOf().workPhotos;
  const html = `<div class="${ID}__viewer" role="img" aria-label="Photo ${i + 1} of ${n}" hidden>${photoStub({ type: workType(i), tone: i % 4, size: 'stage' })}</div>
<div class="${ID}__sheet-list">${listRow({ title: 'View photo', act: 'work-view' })}${listRow({ title: 'Remove photo', act: 'work-remove' })}</div>
<div class="${ID}__sheet-foot">${textLink('Close', { act: 'photo-cancel' })}</div>`;
  sheetOverlay(html, { header: `Photo ${i + 1} of ${n}`, dataS: `${ID}-work`, confirm: false }, (holder, close) => {
    holder.querySelector('[data-act="work-view"]').addEventListener('click', (e) => {
      holder.querySelector(`.${ID}__viewer`).hidden = false;
      e.currentTarget.remove();
    });
    holder.querySelector('[data-act="work-remove"]').addEventListener('click', () => { close(); onRemove(); });
    holder.querySelector('[data-act="photo-cancel"]').addEventListener('click', () => close());
  });
}

function wire(root) {
  const t = myTailor();
  const editing = onboarded(t);
  const main = root.querySelector('main');
  const bar = root.querySelector('.action-bar');
  const isTest = document.documentElement.classList.contains('is-test');
  const d = draftOf();
  const name = root.querySelector('#name');
  const shop = root.querySelector('#shopName');
  const bio = root.querySelector('#bio');
  const card = root.querySelector('#cardLine');
  const years = root.querySelector('#years');

  /* focus: the first invalid field after Next / Save, else the focal field on a fresh onboarding visit */
  if (ui().focus) { root.querySelector(ui().focus)?.focus(); ui().focus = null; }
  else if (!isTest && !editing && !ui().busy && !ui().seen) name.focus();
  ui().seen = true;
  if (ui().busy) root.querySelectorAll('input, textarea').forEach((el) => { el.disabled = true; });

  /* ----- live, in place ----- */
  const clearError = (inputEl, key) => {
    if (!ui().errors?.[key]) return;
    delete ui().errors[key];
    const box = inputEl.closest('.field');
    box.classList.remove('field--error');
    inputEl.removeAttribute('aria-invalid');
    const msg = box.querySelector('.field__msg');
    if (msg) { msg.classList.remove('field__msg--error'); msg.removeAttribute('role'); msg.textContent = HELPERS[key]; }
  };
  /* the photo well follows the typed initials; the list card is re-drawn from the draft (it is the real tailorRow) */
  const paintPreview = () => {
    const ini = initialsOf(d.name);
    const well = root.querySelector(`.${ID}__photo .avatar`);
    if (ini) well.textContent = ini;
    else if (well.classList.contains('avatar--placeholder')) well.innerHTML = cameraGlyph();
    else well.textContent = '';
    root.querySelector('.customer-preview__body').innerHTML = previewHtml(d);
  };
  const paintBar = () => {
    if (!editing || !bar) return;
    const btn = bar.querySelector('[data-act="save"]');
    const dirty = isDirty();
    btn.disabled = !dirty; btn.setAttribute('aria-disabled', String(!dirty));
    btn.classList.toggle('cta--disabled', !dirty);
    const note = bar.querySelector('.action-bar__note');
    if (dirty) { note?.remove(); btn.removeAttribute('aria-describedby'); }
    else if (!note) {
      const p = document.createElement('p');
      p.className = 'action-bar__note t-small c-600'; p.id = 'action-bar-note-save'; p.textContent = 'No changes yet.';
      bar.appendChild(p); btn.setAttribute('aria-describedby', p.id);
    }
  };
  name.addEventListener('input', () => { d.name = name.value; clearError(name, 'name'); paintPreview(); paintBar(); });
  shop.addEventListener('input', () => { d.shopName = shop.value; paintPreview(); paintBar(); });
  /* C2: the hard stop (typing stops at 110, a paste is cut to fit + "Trimmed to 110 characters."); the counter is painted there */
  const pasteCard = wireTextLimit(root, 'cardLine');
  card.addEventListener('input', () => {
    d.cardLine = card.value;
    clearError(card, 'cardLine');
    paintPreview(); paintBar();
  });
  /* a Test-flows paste (ui.paste) goes through the same path as a real one */
  if (ui().paste != null) {
    const text = ui().paste;
    ui().paste = null;
    card.setSelectionRange(card.value.length, card.value.length);
    pasteCard(text);
  }
  /* P-30: About stops at 300 like the card line stops at 110 (a paste is trimmed with a note); the counter is painted there */
  wireTextLimit(root, 'bio');
  bio.addEventListener('input', () => {
    d.bio = bio.value;
    clearError(bio, 'bio');
    paintBar();
  });
  years.addEventListener('input', () => {
    const digits = years.value.replace(/\D/g, '').slice(0, 2);
    if (digits !== years.value) years.value = digits;
    d.years = digits;
    clearError(years, 'years');
    paintPreview(); paintBar();
  });

  /* ----- actions ----- */
  const leave = () => { state.ui[ID] = {}; back() || go('t-shop'); };
  const askLeave = () => leaveSheet({}, { dataS: `${ID}-leave` }, (holder, close) => {
    holder.querySelector('[data-act="keep-editing"]').addEventListener('click', () => close());
    holder.querySelector('[data-act="discard"]').addEventListener('click', () => { close(); leave(); });
  });
  root.querySelectorAll('.back[data-act="back"]').forEach((btn) => {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      if (ui().busy) return;
      if (isDirty()) return askLeave();      // (edit mode only: onboarding step 1 has no Back)
      leave();
    });
  });

  const patch = () => ({
    name: d.name.trim(), shopName: d.shopName.trim(), initials: initialsOf(d.name), cardLine: d.cardLine.trim(), bio: d.bio.trim(),
    photo: d.photo || null, workPhotos: d.workPhotos, years: String(d.years).trim() === '' ? null : Number(d.years), idDoc: !!d.idDoc,
  });
  function submit() {
    if (ui().busy) return;
    const v = validateSection(STEP, { name: d.name, cardLine: d.cardLine, bio: d.bio, photo: d.photo, years: d.years, idDoc: d.idDoc });
    if (!v.ok) {
      ui().errors = v.errors;
      ui().focus = v.errors.photo ? '[data-act="photo"]' : v.errors.idDoc ? '[data-act="id"]' : v.errors.name ? '#name' : v.errors.years ? '#years' : v.errors.cardLine ? '#cardLine' : '#bio';
      go(ID);
      return;
    }
    ui().errors = {};
    ui().busy = true;
    go(ID);
    withLatency(() => {
      ui().busy = false;
      T.setTailorSection(STEP, patch());
      if (state.ui.onboarding) state.ui.onboarding.resumed = false;
      if (editing) { state.ui[ID] = {}; back() || go('t-shop'); toast('Saved. Customers see the change now.', { tone: 'success' }); return; }
      /* D-18 (D-353): under the minimum years she goes on the waitlist — her profile is kept, nothing else to set up */
      if (waitlisted(myTailor())) { state.ui[ID] = {}; go('to-done', { fresh: true }); return; }
      go(ONBOARDING_STEPS[ONBOARDING_STEPS.findIndex((s) => s.id === STEP) + 1].screen);
    });
  }
  function finishLater() {
    if (ui().busy) return;
    T.setTailorSection(STEP, patch());        // as typed — the flag shows validity, no errors (D-57)
    state.ui['t-phone'] = { saved: true, phone: myTailor().phone };
    A.signOut('tailor');
    go('t-phone', { fresh: true });
  }

  root.querySelectorAll('.ob-bar [data-act="finish-later"]').forEach((b) => b.addEventListener('click', finishLater));
  bar?.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    if (a.dataset.act === 'next' || a.dataset.act === 'save') submit();
  });
  main.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled || ui().busy || a.classList.contains('back')) return;
    const act = a.dataset.act;
    if (act === 'dismiss') {
      if (state.ui.onboarding) state.ui.onboarding.resumed = false;
      a.closest(`.${ID}__resume`)?.remove();
    } else if (act === 'photo') openPhoto('Add a photo', () => { d.photo = true; if (ui().errors) delete ui().errors.photo; });
    else if (act === 'id') openIdSheet(() => { d.idDoc = true; if (ui().errors) delete ui().errors.idDoc; go(ID); toast('ID added'); });
    else if (act === 'work-add') openPhoto('Add a photo of your work', () => { d.workPhotos = Math.min(WORK_PHOTOS_MAX, d.workPhotos + 1); });
    else if (act === 'work-open') {
      const i = Number(a.dataset.i);
      openWorkPhoto(i, () => {
        const before = d.workPhotos;
        d.workPhotos = Math.max(0, before - 1);
        go(ID);
        const tiles = [...document.querySelectorAll(`#screen .${ID}__work`)];
        (tiles[Math.min(i, tiles.length - 1)])?.focus({ preventScroll: true });   // focus stays on the next tile
        toast('Photo removed', { action: 'Undo', onAction: () => { if (currentScreen() !== ID) return; d.workPhotos = Math.min(WORK_PHOTOS_MAX, d.workPhotos + 1); go(ID); } });
      });
    }
  });
  root.querySelectorAll('input, textarea').forEach((el) => el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && el.tagName === 'INPUT') { e.preventDefault(); if (!editing || isDirty()) submit(); }
  }));
}

/* S-22 (D-360): the top nav asks before dropping unsaved Shop edits (app.js calls canLeave; discard drops the draft) */
register(ID, view, wire, { canLeave: () => !onboarded(myTailor()) || !isDirty() || !!ui().busy, discard: () => { state.ui[ID] = {}; } });
