/* ============================================================
   to-where — O3 Where you work. M2 spec §C2.
   Shop, home visits, or both; for home visits the neighborhoods (Study-1 C5: borough groups + a tile map; the model derives
   the ZIP codes from them) and the flat per-visit fee (C4).
   Focal: the two switches. Two modes (D-56): onboarding (not live yet) and edit (live).
   Drafts live in state.ui['to-where'].draft (D-34); the model is written only on Next / Save / Finish later.
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state, T, SECTIONS, onboarded } from '../state.js';
import { myTailor } from '../tailor-data.js';
import {
  onboardingHeader, onboardingSteps, ONBOARDING_STEPS, resumeText, editScopeNote, headingRow, banner, toggle, field, hoodPicker, hoodMap, customerPreview,
  actionBar, wireToggles, toast, modalOverlay, leaveModal, leaveSheet, esc, infoButton, HOME_FEE_HELP, metaRow, hoodSentence, sectionHead,
} from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';
import { fmt, cents } from '../money.js';
import { TAILOR_LIMITS, VISIT_MINUTES, NEIGHBORHOODS, HOOD_BY_ID, placeForZip } from '../data.js';

const ID = 'to-where';
const SECTION = 'where';
const STEP = ONBOARDING_STEPS.findIndex((s) => s.id === SECTION);
const PREV = ONBOARDING_STEPS[STEP - 1]?.screen ?? 't-phone';
const NEXT = ONBOARDING_STEPS[STEP + 1]?.screen ?? 'to-done';

const ui = () => (state.ui[ID] ??= {});
const editing = () => onboarded(myTailor());

/* ---------- copy ---------- */
const MSG = {
  'where-required': 'Turn on your shop, home visits, or both.',
  'street-required': 'Enter your shop’s street address.',
  'zip-invalid': 'Enter a 5-digit ZIP code.',
  'zip-unserved': 'Taily isn’t in that area yet.',   // S-42 (D-357)
  'note-long': `Keep the note to ${TAILOR_LIMITS.COURIER_NOTE_MAX} characters.`,
  'hoods-required': 'Pick at least one neighborhood.',
  'hood-unknown': 'Pick at least one neighborhood.',
  'fee-missing': 'Enter your home visit fee, or 0 for none.',
  'fee-invalid': `Enter a whole-dollar fee up to ${fmt(cents(TAILOR_LIMITS.FEE_MAX))}.`,
};
const FEE_HELP = HOME_FEE_HELP;   // C4: flat, per visit — the same sentence customers read on the profile
/** S-42 (D-357): the ZIP says where it is — "SoHo, New York, NY" — from the mock geocoder (data.js placeForZip), never a fixed borough. */
const hoodLine = (zip) => { const p = placeForZip(zip); return p ? `${p.hood}, ${p.city}, ${p.state}` : ''; };
/** B-15 (D-356): private, and what it is for. */
const COLLECT_HELP = 'Private. Customers never see it. Taily’s courier collects finished orders here.';
const HELP = { shopZip: (d) => hoodLine(String(d.shop.zip ?? '').trim()), collectZip: (d) => hoodLine(String(d.collect.zip ?? '').trim()), fee: () => FEE_HELP, collectStreet: () => '' };

/* ---------- draft ⇄ model ---------- */
/** The draft this screen starts from: the model, except a brand-new tailor starts with the shop on (D-60). */
function fromTailor(t) {
  const fresh = !editing() && !t.onboarding.where && !t.shop.enabled && !t.home.enabled;
  return {
    shop: { enabled: fresh ? true : !!t.shop.enabled, street: t.shop.street ?? '', unit: t.shop.unit ?? '', zip: t.shop.zip ?? '' },
    home: { enabled: !!t.home.enabled, hoods: [...(t.home.hoods ?? [])], fee: t.home.enabled ? t.home.fee : null },
    collect: { street: t.collect?.street ?? '', unit: t.collect?.unit ?? '', zip: t.collect?.zip ?? '', notes: t.collect?.notes ?? '' },
  };
}
/** The draft: what she has typed, filled out once with the model's values for a part it doesn't hold yet (a fixture draft predates `collect`). */
const draft = () => {
  const u = ui();
  if (!u.draft) u.draft = fromTailor(myTailor());
  else if (!u.draft.collect) u.draft.collect = fromTailor(myTailor()).collect;
  return u.draft;
};
const feeNum = (raw) => (raw == null || String(raw).trim() === '' ? null : Number(raw));
const trimAll = (o = {}) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v ?? '').trim()]));
const norm = (d) => ({
  shop: { enabled: !!d.shop?.enabled, street: String(d.shop?.street ?? '').trim(), unit: String(d.shop?.unit ?? '').trim(), zip: String(d.shop?.zip ?? '').trim() },
  home: { enabled: !!d.home?.enabled, hoods: [...(d.home?.hoods ?? [])], fee: String(d.home?.fee ?? '').trim() },
  collect: d.shop?.enabled ? null : trimAll(d.collect),
});
/** Unsaved changes — or, in edit mode, a section that currently fails its rules (so Save can fix it). */
const dirty = () => JSON.stringify(norm(draft())) !== JSON.stringify(norm(fromTailor(myTailor())))
  || (editing() && !myTailor().onboarding[SECTION]);

/** The tailor-shaped patch for T.setTailorSection (a blank fee stays null so the flag reflects it). */
function toPatch(d) {
  const zip = String(d.shop.zip ?? '').trim();
  return {
    shop: { enabled: !!d.shop.enabled, street: String(d.shop.street ?? '').trim(), unit: String(d.shop.unit ?? '').trim(), zip },   // the model derives hood / city / state from the ZIP (S-42)
    home: { enabled: !!d.home.enabled, hoods: [...d.home.hoods], fee: feeNum(d.home.fee) },   // the model derives home.zips
    collect: trimAll(d.collect),   // B-15: kept when the shop is on (unused), required while it is off
  };
}
function validate() {
  const { errors } = T.validateSection(SECTION, toPatch(draft()));
  return errors;
}
/** Write the draft to the model (D-61: no shop → no in-store pickup). */
function persist() {
  const patch = toPatch(draft());
  T.setTailorSection(SECTION, patch);
  if (!patch.shop.enabled && myTailor().returns?.pickup) T.setTailorSection('returns', { returns: { pickup: false } });
}

/* ---------- view ---------- */
const errOf = (key) => (ui().errors?.[key] ? MSG[ui().errors[key]] ?? '' : '');

/** S-39 (D-359): the preview is c-tailor's own "Where" block — the shop line, "Comes to you in …" and the fee line customers read. */
function feeLine(raw) {
  const n = feeNum(raw);
  if (n == null || !Number.isInteger(n) || n < 0 || n > TAILOR_LIMITS.FEE_MAX) return '';
  return n > 0 ? `${fmt(cents(n))} home visit fee · ${HOME_FEE_HELP}` : 'No home visit fee';
}
function wherePreviewHtml(d) {
  const t = myTailor();
  const blocks = [];
  const zip = String(d.shop.zip ?? '').trim();
  const place = placeForZip(zip);
  if (d.shop.enabled && String(d.shop.street ?? '').trim()) {
    const line = [t.shopName, String(d.shop.street).trim(), String(d.shop.unit ?? '').trim(), place ? `${place.city}, ${place.state} ${zip}` : ''].filter(Boolean).join(', ');
    blocks.push(`<div class="to-where__place">${metaRow('', esc(line), { icon: 'shop' })}</div>`);
  }
  if (d.home.enabled && d.home.hoods.length) {
    const fee = feeLine(d.home.fee);
    blocks.push(`<div class="to-where__place">${metaRow('', esc(`Comes to you in ${hoodSentence(d.home.hoods)}`), { icon: 'home' })}${fee ? `<p class="t-small c-600" data-money>${esc(fee)}</p>` : ''}</div>`);
  }
  if (!blocks.length) return '';
  return `<div class="to-where__pv" data-where-preview>${sectionHead('Where')}${blocks.join('')}</div>`;
}
function wherePreview(d) {
  const html = wherePreviewHtml(d);
  return `<div class="to-where__fee-preview" data-fee-preview${html ? '' : ' hidden'}>${customerPreview({ html })}</div>`;
}

/** D-61: no shop → no in-store pickup. Tell her before she saves, and again in the toast (R2-2-T-07). */
const PICKUP_NOTE = 'In-store pickup will turn off too — customers can’t collect from a shop you don’t have.';
/** SF-23: pickup is her ONLY way back (courier off) — turning the shop off leaves her with none, so say what that means. */
const PICKUP_ONLY_NOTE = 'In-store pickup will turn off too. It’s your only way to get orders back, so customers can’t book you until you turn on the Taily courier.';
const pickupGoesOff = (d) => !d.shop.enabled && !!myTailor().returns?.pickup;
const pickupOnly = () => !!myTailor().returns?.pickup && !myTailor().returns?.courier;

function shopCard(d) {
  const s = d.shop;
  return `<div class="to-where__shop"><section class="card to-where__card" aria-label="Shop">
  ${toggle({ id: 'shop-on', label: 'Customers come to your shop', helper: `${VISIT_MINUTES.shop}-minute visits at your shop.`, checked: !!s.enabled })}
  ${s.enabled ? `<div class="to-where__fields">
    ${field({ id: 'street', label: 'Shop street address', autocomplete: 'address-line1', value: s.street ?? '', error: errOf('street') })}
    ${field({ id: 'shopUnit', label: 'Suite or floor (optional)', autocomplete: 'address-line2', value: s.unit ?? '' })}
    ${field({ id: 'shopZip', label: 'ZIP code', inputmode: 'numeric', maxlength: 5, autocomplete: 'postal-code', value: s.zip ?? '', helper: HELP.shopZip(d), error: errOf('shopZip') })}
  </div>` : ''}
</section>
${pickupGoesOff(d) ? `<p class="to-where__pickup-note t-small c-600" data-pickup-note>${pickupOnly() ? PICKUP_ONLY_NOTE : PICKUP_NOTE}</p>` : ''}</div>`;
}

/** The borough groups shown open: what she opened or closed, else every borough holding a pick. */
const openBoroughs = (d) => ui().open ?? [...new Set(d.home.hoods.map((id) => HOOD_BY_ID[id]?.borough).filter(Boolean))];

function homeCard(d) {
  const h = d.home;
  return `<section class="card to-where__card" aria-label="Home visits">
  ${toggle({ id: 'home-on', label: 'You visit customers at home', helper: `${VISIT_MINUTES.home}-minute visits at the customer’s place.`, checked: !!h.enabled })}
  ${h.enabled ? `<div class="to-where__fields">
    ${hoodPicker({ selected: h.hoods, open: openBoroughs(d), error: errOf('hoods'), map: hoodMap({ selected: h.hoods }) })}
    ${field({ id: 'fee', label: 'Home visit fee (flat, per visit)', prefix: '$', inputmode: 'numeric', maxlength: 4, autocomplete: 'off', value: h.fee == null ? '' : String(h.fee), helper: FEE_HELP, error: errOf('fee'), labelEnd: infoButton('fee', { label: 'The Taily fee' }) })}
  </div>` : ''}
</section>`;
}

/** B-15 (D-356): no shop → the courier is her only way back, so she tells it where to collect (private, required while the shop is off). */
function collectCard(d) {
  if (d.shop.enabled || !d.home.enabled) return '';
  const c = d.collect;
  return `<section class="card to-where__card to-where__collect" aria-labelledby="collect-h">
  <div class="to-where__collect-head"><h2 class="t-body w-600" id="collect-h">Where should the courier collect finished orders?</h2><p class="t-small c-600">${COLLECT_HELP}</p></div>
  <div class="to-where__fields">
    ${field({ id: 'collectStreet', label: 'Street address', autocomplete: 'address-line1', value: c.street ?? '', error: errOf('collectStreet') })}
    ${field({ id: 'collectUnit', label: 'Apartment or floor (optional)', autocomplete: 'address-line2', value: c.unit ?? '' })}
    ${field({ id: 'collectZip', label: 'ZIP code', inputmode: 'numeric', maxlength: 5, autocomplete: 'postal-code', value: c.zip ?? '', helper: HELP.collectZip(d), error: errOf('collectZip') })}
    ${field({ id: 'collectNotes', label: 'Notes for the courier (optional)', value: c.notes ?? '', placeholder: 'Example: Buzzer 2F, ring twice', maxlength: TAILOR_LIMITS.COURIER_NOTE_MAX, error: errOf('collectNotes') })}
  </div>
</section>`;
}

function resumeBanner() {
  if (editing() || !state.ui.onboarding?.resumed) return '';
  const t = myTailor();
  return banner({ tone: 'info', title: 'Pick up where you left off', dismissible: true, text: resumeText(t) });   // SF-43
}

function barHtml() {
  const busy = !!ui().busy;
  if (editing()) {
    const d = dirty();
    return actionBar({ ctaLabel: 'Save changes', ctaAct: 'save', disabled: !d, note: d ? '' : 'No changes yet.', busy, busyLabel: 'Saving…' });
  }
  return actionBar({ ctaLabel: 'Next', ctaAct: 'next', busy, busyLabel: 'Saving…' });
}

function view() {
  const t = myTailor();
  const mode = editing();
  const d = draft();
  const done = SECTIONS.filter((s) => t.onboarding[s]);
  const title = '<h1 class="t-title">Where do you work?</h1>';
  return `${onboardingHeader({ editing: mode })}<main class="body body--with-bar ${ID} ${ID}--${mode ? 'edit' : 'onboarding'}">
  ${mode ? '' : onboardingSteps(SECTION, done)}
  ${resumeBanner()}
  ${mode ? headingRow(title) : `<div class="heading-block ${ID}__title">${title}</div>`}
  <p class="to-where__lead t-body c-600">Turn on one or both.</p>${mode ? editScopeNote() : ''}
  <div class="to-where__cards">
    ${shopCard(d)}
    ${homeCard(d)}
    ${collectCard(d)}
  </div>
  ${wherePreview(d)}
  ${errOf('where') ? `<p class="field__msg field__msg--error to-where__error" id="where-msg" role="alert">${esc(errOf('where'))}</p>` : ''}
</main>${barHtml()}`;
}

/* ---------- in-place helpers (never re-render while typing) ---------- */
function rerender(focusSel) {
  const y = window.scrollY;
  go(ID);
  window.scrollTo(0, y);
  if (focusSel) document.querySelector(`#screen ${focusSel}`)?.focus({ preventScroll: true });
}

function setFieldMsg(inputId, error) {
  const input = document.querySelector(`#screen #${inputId}`);
  const wrap = input?.closest('.field');
  if (!wrap) return;
  const d = draft();
  const text = error || HELP[inputId]?.(d) || '';
  wrap.classList.toggle('field--error', !!error);
  if (error) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  let p = wrap.querySelector('.field__msg');
  if (!text) { p?.remove(); input.removeAttribute('aria-describedby'); return; }
  if (!p) { p = document.createElement('p'); p.id = `${inputId}-msg`; wrap.appendChild(p); }
  p.className = `field__msg${error ? ' field__msg--error' : ''}`;
  if (error) p.setAttribute('role', 'alert'); else p.removeAttribute('role');
  p.textContent = text;
  input.setAttribute('aria-describedby', p.id);
}
function clearError(key, inputId) {
  if (!ui().errors?.[key]) return;
  delete ui().errors[key];
  if (inputId) setFieldMsg(inputId, '');
}
/** Swap the action bar when Save should flip on / off (delegated listeners live on #screen). */
function refreshBar(root) {
  const bar = root.querySelector('.action-bar');
  if (!bar) return;
  const tpl = document.createElement('div');
  tpl.innerHTML = barHtml();
  const next = tpl.firstElementChild;
  if (bar.outerHTML !== next.outerHTML) bar.replaceWith(next);
}

/* ---------- leave / finish later ---------- */
function openLeave() {
  leaveSheet({}, { dataS: `${ID}-leave` }, (holder, close) => {
    holder.querySelector('[data-act="keep-editing"]')?.addEventListener('click', () => close());
    holder.querySelector('[data-act="discard"]')?.addEventListener('click', () => {
      close();
      state.ui[ID] = {};
      back() || go('t-shop');
    });
  });
}
function finishLater() {
  if (ui().busy) return;
  persist();
  state.ui[ID] = {};
  state.ui['t-phone'] = { saved: true, phone: myTailor().phone };
  A.signOut('tailor');
  go('t-phone', { fresh: true });
}

/* ---------- Next / Save ---------- */
function submit() {
  if (ui().busy) return;
  const errors = validate();
  const keys = Object.keys(errors);
  if (keys.length) {
    ui().errors = errors;
    const first = ['where', 'street', 'shopZip', 'hoods', 'fee', 'collectStreet', 'collectZip', 'collectNotes'].find((k) => errors[k]);
    const sel = { where: '#shop-on', street: '#street', shopZip: '#shopZip', hoods: '.hood-group__head', fee: '#fee', collectStreet: '#collectStreet', collectZip: '#collectZip', collectNotes: '#collectNotes' }[first];
    rerender(sel);
    return;
  }
  ui().errors = {};
  ui().busy = true;
  rerender();
  withLatency(() => {
    ui().busy = false;
    if (currentScreen() !== ID) return;
    const wasEditing = editing();
    const pickupOff = pickupGoesOff(draft());
    const noWayBack = pickupOff && pickupOnly();   // SF-23
    persist();
    state.ui[ID] = {};
    if (state.ui.onboarding) state.ui.onboarding.resumed = false;
    if (wasEditing) {
      back() || go('t-shop');
      if (noWayBack) toast('Saved. Customers can’t book you until you add a return option.', { tone: 'warning', action: 'Return options', onAction: () => go('to-returns') });   // SF-23
      else toast(pickupOff ? 'Saved. In-store pickup is off. New requests use this now.' : 'Saved. New requests use this now.', { tone: 'success' });   // SF-43
    } else {
      go(NEXT);
    }
  });
}

/* ---------- neighborhoods (C5) ---------- */
function toggleHood(id) {
  const d = draft();
  if (!HOOD_BY_ID[id]) return;
  if (!ui().open) ui().open = openBoroughs(d);
  d.home.hoods = d.home.hoods.includes(id) ? d.home.hoods.filter((x) => x !== id) : [...d.home.hoods, id];
  if (ui().errors) delete ui().errors.hoods;
  rerender(`[data-act="hood"][data-id="${id}"]`);
}
function toggleBorough(id) {
  const open = openBoroughs(draft());
  ui().open = open.includes(id) ? open.filter((x) => x !== id) : [...open, id];
  rerender(`[data-act="borough"][data-id="${id}"]`);
}

/* ---------- wiring ---------- */
function wire(root) {
  const main = root.querySelector('main');
  wireToggles(main);

  /* our own Back (D-56): edit mode asks before dropping a dirty draft; onboarding goes to the step before */
  root.querySelectorAll('.back[data-act="back"]').forEach((btn) => {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      if (ui().busy) return;
      if (!editing()) { go(PREV); return; }
      if (dirty()) openLeave(); else { state.ui[ID] = {}; back() || go('t-shop'); }
    });
  });

  main.addEventListener('toggle', (e) => {
    const { id, checked } = e.detail;
    const d = draft();
    if (id === 'shop-on') {
      d.shop.enabled = checked;
      if (ui().errors) { delete ui().errors.where; if (!checked) { delete ui().errors.street; delete ui().errors.shopZip; } }
    } else if (id === 'home-on') {
      d.home.enabled = checked;
      /* a first home-visit area: the neighborhood her shop is in, when it is one we know */
      const shopHood = NEIGHBORHOODS.find((n) => n.zips.includes(String(d.shop.zip ?? '').trim()));
      if (checked && !d.home.hoods.length && shopHood) d.home.hoods = [shopHood.id];
      if (ui().errors) { delete ui().errors.where; if (!checked) { delete ui().errors.hoods; delete ui().errors.fee; } }
    } else return;
    rerender(`#${id}`);
  });

  main.addEventListener('input', (e) => {
    const el = e.target;
    const d = draft();
    const zipOnly = () => { el.value = el.value.replace(/\D/g, '').slice(0, 5); return el.value; };
    if (el.id === 'street') { d.shop.street = el.value; clearError('street', 'street'); }
    else if (el.id === 'shopUnit') d.shop.unit = el.value;
    else if (el.id === 'shopZip') {
      d.shop.zip = zipOnly();
      clearError('shopZip', null);
      setFieldMsg('shopZip', '');
    } else if (el.id === 'fee') {
      el.value = el.value.replace(/\D/g, '').slice(0, 4);
      d.home.fee = el.value;
      clearError('fee', null);
      setFieldMsg('fee', '');
    } else if (el.id === 'collectStreet') { d.collect.street = el.value; clearError('collectStreet', 'collectStreet'); }
    else if (el.id === 'collectUnit') d.collect.unit = el.value;
    else if (el.id === 'collectZip') { d.collect.zip = zipOnly(); clearError('collectZip', null); setFieldMsg('collectZip', ''); }
    else if (el.id === 'collectNotes') { d.collect.notes = el.value; clearError('collectNotes', 'collectNotes'); }
    else return;
    /* the customer's Where block follows the draft in place */
    const box = main.querySelector('[data-fee-preview]');
    if (box) {
      const html = wherePreviewHtml(d);
      box.hidden = !html;
      const body = box.querySelector('.customer-preview__body');
      if (body) body.innerHTML = html;
    }
    refreshBar(root);
  });

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    switch (a.dataset.act) {
      case 'hood': toggleHood(a.dataset.id); break;
      case 'borough': toggleBorough(a.dataset.id); break;
      case 'dismiss':
        if (state.ui.onboarding) state.ui.onboarding.resumed = false;
        rerender();
        break;
      case 'next': case 'save': submit(); break;
      case 'finish-later': finishLater(); break;
      default:
    }
  });
}

/* S-22 (D-360): the top nav asks before dropping unsaved edits */
register(ID, view, wire, { canLeave: () => !editing() || !dirty() || !!ui().busy, discard: () => { state.ui[ID] = {}; } });
