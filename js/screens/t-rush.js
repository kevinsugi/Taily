/* ============================================================
   t-rush — T7 Rush fees editor (M2-spec §C3). Charge extra for
   rush jobs. Tiers are 1 / 2 / 3 days after the visit;
   4+ days is always free. Focal: the three tier fields. The
   preview reads exactly like the c-tailor ladder, live.
   ============================================================ */
import { register, render as go, back, currentScreen } from '../app.js';
import { state, T, validateRush } from '../state.js';
import { myTailor } from '../tailor-data.js';
import { RUSH_TIERS, TAILOR_LIMITS } from '../data.js';
import { cents, fmt } from '../money.js';
import { withLatency } from '../sim.js';
import {
  chrome, headingRow, toggle, field, customerPreview, sectionHead, actionBar, modalOverlay, leaveModal, leaveSheet, toast, wireToggles, editScopeNote, priceRow,
} from '../components.js';

const ID = 't-rush';
const TIER_LABEL = { 1: 'Ready within 1 day of the visit', 2: 'Within 2 days', 3: 'Within 3 days' };

const ui = () => (state.ui[ID] ??= {});
/** Saved ladder → the draft: strings as typed; a missing tier is blank, an empty ladder is "off" (D-64). */
function fromTailor(t) {
  const ladder = t.rush ?? [];
  const fees = {};
  RUSH_TIERS.forEach((d) => { const r = ladder.find((x) => x.days === d); fees[d] = r ? String(r.fee) : ''; });
  return { on: ladder.length > 0, fees };
}
function draftOf() {
  const u = ui();
  const base = fromTailor(myTailor());
  u.draft = { ...base, ...(u.draft ?? {}), fees: { ...base.fees, ...(u.draft?.fees ?? {}) } };
  return u.draft;
}
const isDirty = () => JSON.stringify(draftOf()) !== JSON.stringify(fromTailor(myTailor()));
/** The ladder the draft would save — only whole-dollar fees above $0, so a half-typed field never shows. */
function draftLadder(d) {
  if (!d.on) return [];
  return RUSH_TIERS.map((days) => ({ days, raw: String(d.fees[days] ?? '').trim() }))
    .filter((r) => /^\d+$/.test(r.raw) && Number(r.raw) > 0)
    .map((r) => ({ days: r.days, fee: Number(r.raw) }));
}
/** D-71: while the draft has errors the preview never shows it — customers keep seeing the saved ladder, with a muted note. */
const draftOk = (d) => validateRush(d).ok;
const shownLadder = (d) => (draftOk(d) ? draftLadder(d) : (myTailor().rush ?? []));
const invalidNote = (d) => (draftOk(d) ? '' : 'Showing your saved rush fees. Fix the errors to preview your changes.');
/** S-39 (D-359): customers never see the ladder — a rushed customer sees ONE line on her estimate (c-tailor "Your estimate"): the rush
    fee for her need-by. The preview is that line for the quickest tier she charges, then the other tiers in words. */
function previewHtml(d) {
  const ladder = [...shownLadder(d)].sort((a, b) => a.days - b.days);
  const top = ladder[0];
  const dayWord = (n) => `${n} day${n === 1 ? '' : 's'}`;
  const row = top
    ? priceRow({ label: 'Rush fee', cents: cents(top.fee), note: `Need-by ${dayWord(top.days)} after the visit` })
    : '<p class="t-small c-600">No rush fee on any estimate.</p>';
  const rest = ladder.slice(1).map((r) => `${dayWord(r.days)}: ${fmt(cents(r.fee))}`).join(' · ');
  return `<div class="${ID}__ladder">${sectionHead('Your estimate')}<div data-ladder>${row}</div>
  ${top ? `<p class="t-small c-600 ${ID}__caption">A customer who needs it ${dayWord(top.days)} after the visit sees this line.${rest ? ` Other need-by dates: ${rest}.` : ''}</p>` : ''}
  <p class="t-small c-600 ${ID}__ladder-note" data-ladder-note${draftOk(d) ? ' hidden' : ''}>${invalidNote(d)}</p></div>`;
}

function errorCopy(code, tier, d) {
  if (code === 'fee-missing') return 'Enter an amount, or 0 for no fee.';
  if (code === 'fee-invalid') return `Enter a whole-dollar amount up to ${fmt(cents(TAILOR_LIMITS.RUSH_MAX))}.`;
  if (code === 'fee-order') return `Can’t be more than your ${tier - 1}-day fee (${fmt(cents(Number(d.fees[tier - 1])))}).`;
  return '';
}

function view(s) {
  const u = s.ui[ID] ?? {};
  const d = draftOf();
  const errs = u.errors ?? {};
  const busy = !!u.busy;
  const dirty = isDirty();
  const tiers = d.on ? `<div class="card ${ID}__card">
    ${RUSH_TIERS.map((n) => field({ id: `rush-${n}`, label: TIER_LABEL[n], prefix: '$', inputmode: 'numeric', autocomplete: 'off', value: d.fees[n], error: errorCopy(errs[`d${n}`], n, d), disabled: busy })).join('')}
    <div class="${ID}__free"><span class="t-body w-600">4 days or more</span><span class="t-body c-600">No rush fee</span></div>
  </div>` : '';
  return `${chrome('shop', { persona: 'tailor' })}
<main class="body body--with-bar ${ID}">
  ${headingRow('<h1 class="t-title">Rush fees</h1>')}
  <p class="t-body c-600 ${ID}__lead">Charge extra when a customer needs it back soon after the visit. 4 days or more is always free.</p>${editScopeNote()}
  <div class="${ID}__toggle">${toggle({ id: 'rush-on', label: 'Charge rush fees', checked: d.on, disabled: busy })}</div>
  ${tiers}
  <p class="t-small c-600 ${ID}__note">Rush fees are yours in full.</p>
  <div class="${ID}__preview">${customerPreview({ html: previewHtml(d) })}</div>
</main>
${actionBar({ ctaLabel: 'Save rush fees', ctaAct: 'save', disabled: !dirty && !busy, note: dirty || busy ? '' : 'No changes yet.', busy, busyLabel: 'Saving…' })}`;
}

function wire(root) {
  const first = root.querySelector('[aria-invalid="true"]');
  if (ui().focus) first?.focus();
  ui().focus = false;

  wireToggles(root);
  root.addEventListener('toggle', (e) => {
    if (e.detail.id !== 'rush-on') return;
    const d = draftOf();
    d.on = e.detail.checked;
    ui().errors = {};
    go(ID);
  });

  RUSH_TIERS.forEach((n) => {
    const input = root.querySelector(`#rush-${n}`);
    input?.addEventListener('input', () => {
      draftOf().fees[n] = input.value;
      if (ui().errors?.[`d${n}`]) {          // clear this field's error on edit, in place
        delete ui().errors[`d${n}`];
        const box = input.closest('.field');
        box.classList.remove('field--error');
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        box.querySelector('.field__msg')?.remove();
      }
      const pv = root.querySelector('.customer-preview__body');
      if (pv) pv.innerHTML = previewHtml(draftOf());   // the one estimate line follows the draft in place
      syncBar(root);
    });
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  });

  const backBtn = root.querySelector('.back[data-act="back"]');
  if (backBtn) {
    backBtn.dataset.wired = '1';
    backBtn.addEventListener('click', () => { if (isDirty()) leave(); else back() || go('t-shop'); });
  }
  function leave() {
    leaveSheet({ body: 'Your rush fee changes will be lost.' }, { dataS: `${ID}-unsaved` }, (holder, close) => {
      holder.querySelector('[data-act="keep-editing"]').addEventListener('click', () => close());
      holder.querySelector('[data-act="discard"]').addEventListener('click', () => {
        close({ instant: true });
        delete state.ui[ID];
        back() || go('t-shop');
      });
    });
  }

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act="save"]');
    if (a && !a.closest('.modal-host')) save();
  });

  function save() {
    const u = ui();
    if (u.busy || !isDirty()) return;
    const d = draftOf();
    const r = T.setRush({ on: d.on, fees: { ...d.fees } });
    if (!r.ok) { u.errors = r.errors ?? {}; u.focus = true; go(ID); return; }
    u.errors = {};
    u.busy = true;
    go(ID);
    withLatency(() => {
      ui().busy = false;
      if (currentScreen() !== ID) return;
      delete state.ui[ID];
      back() || go('t-shop');
      toast('Saved. New requests use this now.', { tone: 'success' });
    });
  }
}

/** Enable / disable Save rush fees in place as the draft changes. */
function syncBar(root) {
  const btn = root.querySelector('.action-bar [data-act="save"]');
  if (!btn || btn.getAttribute('aria-busy')) return;
  const dirty = isDirty();
  btn.disabled = !dirty;
  btn.classList.toggle('cta--disabled', !dirty);
  if (dirty) { btn.removeAttribute('aria-disabled'); btn.removeAttribute('aria-describedby'); } else { btn.setAttribute('aria-disabled', 'true'); }
  const bar = root.querySelector('.action-bar');
  let note = bar.querySelector('.action-bar__note');
  if (dirty) note?.remove();
  else if (!note) {
    note = document.createElement('p');
    note.className = 'action-bar__note t-small c-600';
    note.id = 'action-bar-note-save';
    note.textContent = 'No changes yet.';
    bar.appendChild(note);
    btn.setAttribute('aria-describedby', note.id);
  }
}

/* S-22 (D-360): the top nav asks before dropping unsaved edits */
register(ID, view, wire, { canLeave: () => !isDirty() || !!(state.ui[ID]?.busy), discard: () => { delete state.ui[ID]; } });
