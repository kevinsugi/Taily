/* ============================================================
   to-profile — O1 Profile (M2-spec §C1). Focal: the "Your name"
   field. Two modes (D-56): onboarding (not live yet: stepper +
   Next) and edit (live: Shop chrome + Save changes). The draft
   lives in state.ui['to-profile'].draft (D-34) and is written to
   the model only through T.setTailorSection. Live captions (the
   counter, the initials, the preview) update IN PLACE on input.
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state, T, SECTIONS, validateSection } from '../state.js';
import { myTailor } from '../tailor-data.js';
import { TAILOR_LIMITS, GARMENT_TYPES } from '../data.js';
import {
  onboardingHeader, onboardingSteps, ONBOARDING_STEPS, headingRow, banner, field, textArea, avatar, textLink, photoTile, photoStub,
  customerPreview, miniProfile, actionBar, sheetOverlay, modalOverlay, leaveModal, listRow, toast, esc,
} from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';

const ID = 'to-profile';
const STEP = 'profile';
const { BIO_MAX, WORK_PHOTOS_MAX } = TAILOR_LIMITS;
const HELPERS = {
  name: 'Customers see your full name.',
  bio: 'A line or two: what you’re best at and how you work.',
};
/* work photos are drawn as garments, cycling the catalog (M7 A5.12) */
const GARMENTS = Object.keys(GARMENT_TYPES);
const workType = (i) => GARMENTS[i % GARMENTS.length];
const bioLen = (v) => [...String(v ?? '')].length;
const ui = () => (state.ui[ID] ??= {});

/* ---------- draft ---------- */
const fromTailor = (t) => ({ name: t.name ?? '', shopName: t.shopName ?? '', bio: t.bio ?? '', photo: t.photo || false, workPhotos: t.workPhotos ?? 0 });
const sig = (d) => JSON.stringify(fromTailor(d));
const draftOf = () => (ui().draft ??= fromTailor(myTailor()));
const isDirty = () => sig(draftOf()) !== sig(fromTailor(myTailor()));
const initialsOf = (name) => String(name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => [...w][0].toUpperCase()).join('');

/* ---------- copy ---------- */
function errorCopy(code, d) {
  if (code === 'name-required') return 'Enter your name as customers will see it.';
  if (code === 'bio-required') return 'Write a line or two about your work.';
  if (code === 'bio-long') return `Keep it to ${BIO_MAX} characters — you’re at ${bioLen(d.bio)}.`;
  return '';
}

/* ---------- resume banner (onboarding) ---------- */
function resumeBanner(t) {
  if (!state.ui.onboarding?.resumed) return '';
  const done = ONBOARDING_STEPS.filter((s) => t.onboarding?.[s.id]);
  const left = ONBOARDING_STEPS.length - done.length;
  const was = done.length === 1 ? `${done[0].label} is done.` : done.length ? `${done.length} steps are done: ${done.map((s) => s.label).join(', ')}.` : '';
  return `<div class="${ID}__resume">${banner({
    tone: 'info', title: 'Pick up where you left off',
    text: `${was} ${left} ${left === 1 ? 'step' : 'steps'} to go before customers can book you.`.trim(), dismissible: true,
  })}</div>`;
}

/* ---------- pieces ---------- */
function previewHtml(d) {
  return miniProfile({ name: d.name, initials: initialsOf(d.name), photo: d.photo || null, shopName: d.shopName, bio: d.bio });
}

function workPhotos(d) {
  /* a tile opens a small sheet (View / Remove) — a tap never deletes (D-71) */
  const tiles = Array.from({ length: d.workPhotos }, (_, i) => `<button type="button" class="${ID}__work" data-act="work-open" data-i="${i}" aria-label="Photo ${i + 1} of ${d.workPhotos}: view or remove" aria-haspopup="dialog">${photoTile('photo', { type: workType(i), tone: i % 4 })}</button>`).join('');
  const add = d.workPhotos < WORK_PHOTOS_MAX
    ? `<button type="button" class="${ID}__work" data-act="work-add" aria-label="Add a photo of your work">${photoTile('add')}</button>` : '';
  return `<div class="photo-tiles ${ID}__tiles">${tiles}${add}</div>`;
}

function view(s) {
  const t = myTailor();
  const editing = !!t.live;
  const d = draftOf();
  const errors = ui().errors ?? {};
  const done = SECTIONS.filter((x) => t.onboarding?.[x]);
  const dirty = isDirty();
  const busy = !!ui().busy;
  const title = `<h1 class="t-title">Your profile</h1>`;
  return `${onboardingHeader({ editing, back: editing })}
<main class="body body--with-bar ${ID}">
  ${editing ? headingRow(title) : `${onboardingSteps(STEP, done)}${resumeBanner(t)}<div class="${ID}__title">${title}</div>`}
  <p class="t-body c-600 ${ID}__lead">This is the first thing customers see.</p>
  <div class="${ID}__photo">
    ${initialsOf(d.name) ? avatar({ initials: initialsOf(d.name), photo: d.photo || null, size: 'lg' }) : avatar({ photo: true, size: 'lg' })}
    <div class="${ID}__photo-side">
      ${textLink(d.photo ? 'Change photo' : 'Add a photo', { act: 'photo' })}
      <p class="t-small c-600">Optional.</p>
    </div>
  </div>
  <div class="${ID}__group">${field({ id: 'name', label: 'Your name', value: d.name, autocomplete: 'name', helper: HELPERS.name, error: errorCopy(errors.name, d) })}</div>
  <div class="${ID}__group">${field({ id: 'shopName', label: 'Business name (optional)', value: d.shopName, autocomplete: 'organization', helper: HELPERS.shopName })}</div>
  <div class="${ID}__group">${textArea({ id: 'bio', label: 'About your work', value: d.bio, max: BIO_MAX, rows: 4, helper: HELPERS.bio, error: errorCopy(errors.bio, d) })}</div>
  <div class="${ID}__work-block">
    <p class="t-small w-600 c-700" id="${ID}-work-label">Photos of your work (optional)</p>
    ${workPhotos(d)}
    <p class="t-small c-600">Up to ${WORK_PHOTOS_MAX}.</p>
  </div>
  <div class="${ID}__preview">${customerPreview({ html: previewHtml(d) })}</div>
</main>
${editing
    ? actionBar({ ctaLabel: 'Save changes', ctaAct: 'save', disabled: !dirty && !busy, note: dirty || busy ? '' : 'No changes yet.', busy, busyLabel: 'Saving…' })
    : actionBar({ ctaLabel: 'Next', ctaAct: 'next', busy, busyLabel: 'Saving…' })}`;
}

/* ---------- wiring ---------- */
const cameraGlyph = () => { const t = document.createElement('template'); t.innerHTML = avatar({ photo: true }); return t.content.firstChild.innerHTML; };
const hangerGlyph = () => { const t = document.createElement('template'); t.innerHTML = avatar({ glyph: true }); return t.content.firstChild.innerHTML; };
function openPhoto(header, onAdd) {
  const html = `<div class="${ID}__sheet-list">${listRow({ title: 'Take photo', act: 'photo-take' })}${listRow({ title: 'Choose from library', act: 'photo-library' })}</div>
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
  const editing = !!t.live;
  const main = root.querySelector('main');
  const bar = root.querySelector('.action-bar');
  const isTest = document.documentElement.classList.contains('is-test');
  const d = draftOf();
  const name = root.querySelector('#name');
  const shop = root.querySelector('#shopName');
  const bio = root.querySelector('#bio');

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
  const paintPreview = () => {
    const ini = initialsOf(d.name);
    root.querySelectorAll('.avatar').forEach((a) => {
      if (ini) a.textContent = ini;
      else if (a.classList.contains('avatar--placeholder')) a.innerHTML = cameraGlyph();
      else if (a.classList.contains('avatar--glyph')) a.innerHTML = hangerGlyph();   // CR-m4: the preview's empty well
      else a.textContent = '';
    });
    const pn = root.querySelector('[data-pv="name"]');
    pn.textContent = d.name.trim() || 'Your name';
    pn.classList.toggle('c-500', !d.name.trim());
    const ps = root.querySelector('[data-pv="shop"]');
    ps.textContent = d.shopName.trim(); ps.hidden = !d.shopName.trim();
    const pb = root.querySelector('[data-pv="bio"]');
    pb.textContent = d.bio.trim(); pb.hidden = !d.bio.trim();
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
  bio.addEventListener('input', () => {
    d.bio = bio.value;
    const n = bioLen(d.bio);
    const c = root.querySelector('[data-count]');
    c.textContent = `${n} / ${BIO_MAX}`;
    c.classList.toggle('text-area__count--over', n > BIO_MAX);
    clearError(bio, 'bio');
    paintPreview(); paintBar();
  });

  /* ----- actions ----- */
  const leave = () => { state.ui[ID] = {}; back() || go('t-shop'); };
  const askLeave = () => modalOverlay(leaveModal(), { dataS: `${ID}-leave` }, (holder, close) => {
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
    name: d.name.trim(), shopName: d.shopName.trim(), initials: initialsOf(d.name), bio: d.bio.trim(),
    photo: d.photo || null, workPhotos: d.workPhotos,
  });
  function submit() {
    if (ui().busy) return;
    const v = validateSection(STEP, { name: d.name, bio: d.bio });
    if (!v.ok) {
      ui().errors = v.errors;
      ui().focus = v.errors.name ? '#name' : '#bio';
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
    } else if (act === 'photo') openPhoto('Add a photo', () => { d.photo = true; });
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

register(ID, view, wire);
