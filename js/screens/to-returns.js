/* ============================================================
   to-returns — O4 Return options. M2 spec §C2.
   How finished orders get back: in-store pickup, home drop-off, Taily courier.
   Focal: the three option rows. Two modes (D-56): onboarding (not live yet) and edit (live).
   Drafts live in state.ui['to-returns'].draft (D-34).
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state, T, SECTIONS } from '../state.js';
import { myTailor } from '../tailor-data.js';
import {
  onboardingHeader, onboardingSteps, ONBOARDING_STEPS, headingRow, banner, checkRow, customerPreview,
  actionBar, toast, modalOverlay, leaveModal, returnsRows, esc,
} from '../components.js';
import { withLatency } from '../sim.js';
import * as A from '../account.js';
import { RETURN_LABEL } from '../data.js';

const ID = 'to-returns';
const SECTION = 'returns';
const STEP = ONBOARDING_STEPS.findIndex((s) => s.id === SECTION);
const LABEL = ONBOARDING_STEPS[STEP].label;
const PREV = ONBOARDING_STEPS[STEP - 1]?.screen ?? 't-phone';
const NEXT = ONBOARDING_STEPS[STEP + 1]?.screen ?? 'to-done';

const TITLE = '<h1 class="t-title">How do orders get back?</h1>';
const KEYS = ['pickup', 'dropoff', 'courier'];
const ui = () => (state.ui[ID] ??= {});
const editing = () => !!myTailor().live;
const hasShop = () => !!myTailor().shop?.enabled;

const ROWS = {
  pickup: { label: RETURN_LABEL.pickup, caption: 'The customer collects it from your shop.' },
  dropoff: { label: RETURN_LABEL.dropoff, caption: 'You bring it back to the customer’s door.' },
  courier: { label: RETURN_LABEL.courier, caption: 'We send a courier. The customer pays for it — nothing comes out of your payout.' },
};
const NEEDS_SHOP = 'Needs a shop. Turn it on in Where you work.';
const MSG = {
  'return-required': 'Pick at least one way to get orders back.',
  'pickup-needs-shop': NEEDS_SHOP,
};

/* ---------- draft ⇄ model ---------- */
/** The model's options — a tailor who has set none starts from what she offers: pickup with a shop, drop-off with home visits (D-61). */
function fromTailor(t) {
  const r = t.returns ?? {};
  const none = !KEYS.some((k) => r[k]);
  if (none && !t.onboarding.returns) return { pickup: !!t.shop?.enabled, dropoff: !!t.home?.enabled, courier: false };
  return { pickup: !!r.pickup, dropoff: !!r.dropoff, courier: !!r.courier };
}
const draft = () => (ui().draft ??= fromTailor(myTailor()));
/** What is really on: in-store pickup needs a shop. */
const effective = (d) => ({ pickup: !!d.pickup && hasShop(), dropoff: !!d.dropoff, courier: !!d.courier });
const dirty = () => JSON.stringify(effective(draft())) !== JSON.stringify(effective(fromTailor(myTailor())))
  || (editing() && !myTailor().onboarding[SECTION]);

function validate() {
  const { errors } = T.validateSection(SECTION, { returns: effective(draft()), shop: myTailor().shop });
  return errors;
}
function persist() { T.setTailorSection(SECTION, { returns: effective(draft()) }); }

/* ---------- view ---------- */
const errText = () => MSG[ui().errors?.returns ?? ui().errors?.pickup] ?? '';

/** The customer's own "Getting it back" rows from c-tailor (shared `returnsRows`), updated in place as boxes are ticked. */
function previewHtml(d) {
  return `<div class="to-returns__preview" data-ret-preview>
    <p class="t-body w-600">Getting it back</p>
    ${returnsRows(effective(d), { empty: 'No return options yet.' })}
  </div>`;
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
  const eff = effective(d);
  const err = errText();
  const done = SECTIONS.filter((s) => t.onboarding[s]);
  const rows = KEYS.map((k) => {
    const off = k === 'pickup' && !hasShop();
    return checkRow({
      id: `ret-${k}`, label: ROWS[k].label, caption: off ? NEEDS_SHOP : ROWS[k].caption, checked: eff[k], disabled: off,
      error: '', attrs: `data-act="ret" data-id="${k}"`,
    });
  }).join('');
  return `${onboardingHeader({ editing: mode })}<main class="body body--with-bar ${ID} ${ID}--${mode ? 'edit' : 'onboarding'}">
  ${mode ? '' : onboardingSteps(SECTION, done)}
  ${resumeBanner()}
  ${mode ? headingRow(TITLE) : `<div class="${ID}__title">${TITLE}</div>`}
  <p class="to-returns__lead t-body c-600">Pick every option you offer. The customer chooses one when the order is ready.</p>
  <div class="to-returns__card${err ? ' to-returns__card--error' : ''}" role="group" aria-label="Return options"${err ? ' aria-describedby="returns-msg"' : ''}>${rows}</div>
  <p class="field__msg field__msg--error to-returns__error" id="returns-msg" role="alert"${err ? '' : ' hidden'}>${esc(err)}</p>
  ${customerPreview({ html: previewHtml(d) })}
</main>${barHtml()}`;
}

/* ---------- in-place helpers ---------- */
function rerender(focusSel) {
  const y = window.scrollY;
  go(ID);
  window.scrollTo(0, y);
  if (focusSel) document.querySelector(`#screen ${focusSel}`)?.focus({ preventScroll: true });
}
function refreshBar(root) {
  const bar = root.querySelector('.action-bar');
  if (!bar) return;
  const tpl = document.createElement('div');
  tpl.innerHTML = barHtml();
  const next = tpl.firstElementChild;
  if (bar.outerHTML !== next.outerHTML) bar.replaceWith(next);
}
function clearError(root) {
  if (!ui().errors) return;
  ui().errors = {};
  const p = root.querySelector('#returns-msg');
  p.hidden = true; p.textContent = '';
  root.querySelector('.to-returns__card')?.classList.remove('to-returns__card--error');
  root.querySelector('.to-returns__card')?.removeAttribute('aria-describedby');
  root.querySelectorAll('.check-row__input[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
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
  if (Object.keys(errors).length) {
    ui().errors = errors;
    rerender('.to-returns__card input:not(:disabled)');
    return;
  }
  ui().errors = {};
  ui().busy = true;
  rerender();
  withLatency(() => {
    ui().busy = false;
    if (currentScreen() !== ID) return;
    const wasEditing = editing();
    persist();
    state.ui[ID] = {};
    if (state.ui.onboarding) state.ui.onboarding.resumed = false;
    if (wasEditing) {
      back() || go('t-shop');
      toast(`${LABEL} saved`, { tone: 'success' });
    } else {
      go(NEXT);
    }
  });
}

/* ---------- wiring ---------- */
function wire(root) {
  const main = root.querySelector('main');

  root.querySelectorAll('.back[data-act="back"]').forEach((btn) => {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      if (ui().busy) return;
      if (!editing()) { go(PREV); return; }
      if (dirty()) openLeave(); else { state.ui[ID] = {}; back() || go('t-shop'); }
    });
  });

  /* ticking a row updates the draft, the preview and the Save bar in place — no re-render */
  main.addEventListener('change', (e) => {
    const box = e.target.closest('[data-act="ret"]');
    if (!box) return;
    draft()[box.dataset.id] = box.checked;
    clearError(root);
    const p = main.querySelector('[data-ret-preview]');
    if (p) p.outerHTML = previewHtml(draft());
    refreshBar(root);
  });

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    switch (a.dataset.act) {
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
