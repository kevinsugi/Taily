/* ============================================================
   to-where — O3 Where you work. M2 spec §C2.
   Shop, home visits, or both; for home visits the ZIPs and the fee.
   Focal: the two switches. Two modes (D-56): onboarding (not live yet) and edit (live).
   Drafts live in state.ui['to-where'].draft (D-34); the model is written only on Next / Save / Finish later.
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state, T, SECTIONS } from '../state.js';
import { myTailor } from '../tailor-data.js';
import {
  onboardingHeader, onboardingSteps, ONBOARDING_STEPS, headingRow, banner, toggle, field, zipList, customerPreview, miniProfile,
  actionBar, wireToggles, toast, modalOverlay, leaveModal, esc, infoButton,
} from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';
import { fmt, cents } from '../money.js';
import { ZIP_INFO, SHOP_CITY, TAILOR_LIMITS, VISIT_MINUTES } from '../data.js';

const ID = 'to-where';
const SECTION = 'where';
const STEP = ONBOARDING_STEPS.findIndex((s) => s.id === SECTION);
const LABEL = ONBOARDING_STEPS[STEP].label;
const PREV = ONBOARDING_STEPS[STEP - 1]?.screen ?? 't-phone';
const NEXT = ONBOARDING_STEPS[STEP + 1]?.screen ?? 'to-done';

const ui = () => (state.ui[ID] ??= {});
const editing = () => !!myTailor().live;

/* ---------- copy ---------- */
const MSG = {
  'where-required': 'Turn on your shop, home visits, or both.',
  'street-required': 'Enter your shop’s street address.',
  'zip-invalid': 'Enter a 5-digit ZIP code.',
  'zips-required': 'Add at least one ZIP code.',
  'fee-missing': 'Enter your home-visit fee, or 0 for none.',
  'fee-invalid': `Enter a whole-dollar fee up to ${fmt(cents(TAILOR_LIMITS.FEE_MAX))}.`,
};
const FEE_HELP = 'Paid to you in full.';
const hoodLine = (zip) => (ZIP_INFO[zip]?.hood ? `${ZIP_INFO[zip].hood}, ${SHOP_CITY.city}, ${SHOP_CITY.state}` : `${SHOP_CITY.city}, ${SHOP_CITY.state}`);
const HELP = { shopZip: (d) => hoodLine(String(d.shop.zip ?? '').trim()), fee: () => FEE_HELP };

/* ---------- draft ⇄ model ---------- */
/** The draft this screen starts from: the model, except a brand-new tailor starts with the shop on (D-60). */
function fromTailor(t) {
  const fresh = !editing() && !t.onboarding.where && !t.shop.enabled && !t.home.enabled;
  return {
    shop: { enabled: fresh ? true : !!t.shop.enabled, street: t.shop.street ?? '', zip: t.shop.zip ?? '' },
    home: { enabled: !!t.home.enabled, zips: [...(t.home.zips ?? [])], fee: t.home.enabled ? t.home.fee : null },
  };
}
const draft = () => (ui().draft ??= fromTailor(myTailor()));
const feeNum = (raw) => (raw == null || String(raw).trim() === '' ? null : Number(raw));
const norm = (d) => ({
  shop: { enabled: !!d.shop?.enabled, street: String(d.shop?.street ?? '').trim(), zip: String(d.shop?.zip ?? '').trim() },
  home: { enabled: !!d.home?.enabled, zips: [...(d.home?.zips ?? [])], fee: String(d.home?.fee ?? '').trim() },
});
/** Unsaved changes — or, in edit mode, a section that currently fails its rules (so Save can fix it). */
const dirty = () => JSON.stringify(norm(draft())) !== JSON.stringify(norm(fromTailor(myTailor())))
  || (editing() && !myTailor().onboarding[SECTION]);

/** The tailor-shaped patch for T.setTailorSection (a blank fee stays null so the flag reflects it). */
function toPatch(d) {
  const zip = String(d.shop.zip ?? '').trim();
  return {
    shop: { enabled: !!d.shop.enabled, street: String(d.shop.street ?? '').trim(), zip, hood: ZIP_INFO[zip]?.hood ?? '', ...SHOP_CITY },
    home: { enabled: !!d.home.enabled, zips: [...d.home.zips], fee: feeNum(d.home.fee) },
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

function feeCaption(raw) {
  const n = feeNum(raw);
  if (n == null || !Number.isInteger(n) || n < 0 || n > TAILOR_LIMITS.FEE_MAX) return '';
  return n > 0 ? `Includes ${fmt(cents(n))} home-visit fee` : 'No home-visit fee';
}
function feePreview(raw) {
  const text = feeCaption(raw);
  return `<div class="to-where__fee-preview" data-fee-preview${text ? '' : ' hidden'}>${customerPreview({
    html: `<div class="card to-where__pv">${miniProfile({ name: myTailor().name, initials: myTailor().initials, photo: myTailor().photo, shopName: myTailor().shopName, bio: null })}<div class="to-where__card-foot t-small c-600" data-money data-fee-caption>${esc(text)}</div></div>`,
  })}</div>`;
}

/** D-61: no shop → no in-store pickup. Tell her before she saves, and again in the toast (R2-2-T-07). */
const PICKUP_NOTE = 'In-store pickup will turn off too — customers can’t collect from a shop you don’t have.';
const pickupGoesOff = (d) => !d.shop.enabled && !!myTailor().returns?.pickup;

function shopCard(d) {
  const s = d.shop;
  return `<section class="card to-where__card" aria-label="Shop">
  ${toggle({ id: 'shop-on', label: 'Customers come to my shop', helper: `${VISIT_MINUTES.shop}-minute visits at your shop.`, checked: !!s.enabled })}
  ${s.enabled ? `<div class="to-where__fields">
    ${field({ id: 'street', label: 'Shop street address', autocomplete: 'address-line1', value: s.street ?? '', error: errOf('street') })}
    ${field({ id: 'shopZip', label: 'ZIP code', inputmode: 'numeric', maxlength: 5, autocomplete: 'postal-code', value: s.zip ?? '', helper: HELP.shopZip(d), error: errOf('shopZip') })}
  </div>` : ''}
</section>
${pickupGoesOff(d) ? `<p class="to-where__pickup-note t-small c-600" data-pickup-note>${PICKUP_NOTE}</p>` : ''}`;
}

function homeCard(d) {
  const h = d.home;
  return `<section class="card to-where__card" aria-label="Home visits">
  ${toggle({ id: 'home-on', label: 'I visit customers at home', helper: `${VISIT_MINUTES.home}-minute visits at the customer’s place.`, checked: !!h.enabled })}
  ${h.enabled ? `<div class="to-where__fields">
    ${zipList({ zips: h.zips, input: ui().zipInput ?? '', inputError: ui().zipError ?? '', error: errOf('zips'), suggestions: Object.keys(ZIP_INFO) })}
    <div class="to-where__fee-field">${field({ id: 'fee', label: 'Home-visit fee', prefix: '$', inputmode: 'numeric', maxlength: 4, autocomplete: 'off', value: h.fee == null ? '' : String(h.fee), helper: FEE_HELP, error: errOf('fee') })}<span class="to-where__fee-info">${infoButton('fee', { label: 'The Taily fee' })}</span></div>
  </div>` : ''}
</section>`;
}

function resumeBanner() {
  if (editing() || !state.ui.onboarding?.resumed) return '';
  const t = myTailor();
  const done = ONBOARDING_STEPS.filter((s) => t.onboarding[s.id]).map((s) => s.label);
  const left = ONBOARDING_STEPS.length - done.length;
  const names = done.map((l, i) => (i ? l[0].toLowerCase() + l.slice(1) : l));
  const list = names.length < 2 ? names[0] ?? 'Nothing' : names.length === 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
  return banner({
    tone: 'info', title: 'Pick up where you left off', dismissible: true,
    text: `${list} ${names.length < 2 ? 'is' : 'are'} done. ${left} ${left === 1 ? 'step' : 'steps'} to go before customers can book you.`,
  });
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
  ${mode ? headingRow(title, { backRow: true }) : `<div class="${ID}__title">${title}</div>`}
  <p class="to-where__lead t-body c-600">Turn on one or both.</p>
  <div class="to-where__cards">
    ${shopCard(d)}
    ${homeCard(d)}
  </div>
  ${d.home.enabled ? feePreview(d.home.fee) : ''}
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
  modalOverlay(leaveModal(), { dataS: `${ID}-leave` }, (holder, close) => {
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
    const first = ['where', 'street', 'shopZip', 'zips', 'fee'].find((k) => errors[k]);
    const sel = { where: '#shop-on', street: '#street', shopZip: '#shopZip', zips: '#zip-add', fee: '#fee' }[first];
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
    persist();
    state.ui[ID] = {};
    if (state.ui.onboarding) state.ui.onboarding.resumed = false;
    if (wasEditing) {
      back() || go('t-shop');
      toast(pickupOff ? `${LABEL} saved. In-store pickup is off.` : `${LABEL} saved`, { tone: 'success' });
    } else {
      go(NEXT);
    }
  });
}

/* ---------- ZIP list ---------- */
function addZip(raw) {
  const z = String(raw ?? '').trim();
  const d = draft();
  if (!/^\d{5}$/.test(z)) { ui().zipError = MSG['zip-invalid']; ui().zipInput = z; rerender('#zip-add'); return; }
  if (d.home.zips.includes(z)) { ui().zipError = `${z} is already on your list.`; ui().zipInput = z; rerender('#zip-add'); return; }
  d.home.zips.push(z);
  ui().zipInput = '';
  ui().zipError = '';
  if (ui().errors) delete ui().errors.zips;
  rerender('#zip-add');
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
      if (checked && !d.home.zips.length && /^\d{5}$/.test(String(d.shop.zip ?? '').trim())) d.home.zips = [String(d.shop.zip).trim()];
      if (ui().errors) { delete ui().errors.where; if (!checked) { delete ui().errors.zips; delete ui().errors.fee; } }
    } else return;
    ui().zipError = '';
    rerender(`#${id}`);
  });

  main.addEventListener('input', (e) => {
    const el = e.target;
    const d = draft();
    if (el.id === 'street') { d.shop.street = el.value; clearError('street', 'street'); }
    else if (el.id === 'shopZip') {
      el.value = el.value.replace(/\D/g, '').slice(0, 5);
      d.shop.zip = el.value;
      clearError('shopZip', null);
      setFieldMsg('shopZip', '');
    } else if (el.id === 'fee') {
      el.value = el.value.replace(/\D/g, '').slice(0, 4);
      d.home.fee = el.value;
      clearError('fee', null);
      setFieldMsg('fee', '');
      const text = feeCaption(el.value);
      const box = main.querySelector('[data-fee-preview]');
      if (box) { box.hidden = !text; box.querySelector('[data-fee-caption]').textContent = text; }
    } else if (el.id === 'zip-add') {
      el.value = el.value.replace(/\D/g, '').slice(0, 5);
      ui().zipInput = el.value;
      if (ui().zipError) { ui().zipError = ''; setFieldMsg('zip-add', ''); }
    } else return;
    refreshBar(root);
  });

  main.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'zip-add') { e.preventDefault(); addZip(e.target.value); }
  });

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    switch (a.dataset.act) {
      case 'zip-add': addZip(main.querySelector('#zip-add')?.value); break;
      case 'zip-suggest': addZip(a.dataset.zip); break;
      case 'zip-remove': {
        const d = draft();
        d.home.zips = d.home.zips.filter((z) => z !== a.dataset.zip);
        rerender('#zip-add');
        break;
      }
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

register(ID, view, wire);
