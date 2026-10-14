/* ============================================================
   Taily v5 — the system layer (M5, docs/v5/M5-spec.md §A9, D-138…D-140).
   Shared by the router and any host screen:
     systemBanner(s)            the offline banner (html, or '' while online)
     wireSystem(root, id, …)    Retry on that banner; the re-auth sheet when the session expired
     openReauth(who, …)         locked "Sign in again" sheet: code, Verify, Resend, Sign out
     openPushPrompt(…)          the soft "Turn on notifications" ask
     pushBanner(…)              the in-app push card: a new request reaches the tailor (D-167)
   Every wait goes through withLatency; every failure says what happened and what did not.
   ============================================================ */
import { state, now } from './state.js';
import * as A from './account.js';
import { withLatency } from './sim.js';
import { POLICY } from './money-config.js';
import { myTailor, inbox, requestView } from './tailor-data.js';
import { setFocus } from './focus.js';
import { fmtExact } from './money.js';
import { fmtDay, fmtCountdown, toDate } from './dates.js';
import { sheetOverlay, modalOverlay, codeInput, cta, toast, esc, ICON_WIFI_OFF, ICON_BELL } from './components.js';

/** Screens that run before / outside a signed-in session: no re-auth sheet on them (the offline banner still shows). */
export const SYSTEM_EXEMPT = ['c-welcome', 'c-phone', 'c-code', 'c-name', 't-phone', 't-code', 'sys-index', 'sys-components'];

/* ---------- offline banner ---------- */
/** The offline banner — pinned under the top bar. Empty while online. */
export function systemBanner(s = state) {
  if (s.sim?.network !== 'offline') return '';
  return `<div class="sys-banner" data-sys="offline" role="status">
  <span class="sys-banner__glyph">${ICON_WIFI_OFF}</span>
  <span class="sys-banner__text"><span class="sys-banner__title t-small w-700">You’re offline</span><span class="sys-banner__body t-small">Some things won’t load or send until you’re back.</span></span>
  <button type="button" class="sys-banner__retry t-small w-700" data-act="sys-retry">Retry</button>
</div>`;
}

/**
 * Wire the system layer for one render. `root` = the fresh #screen node, `screenId` = what it shows, `go` = the router's render.
 * (1) Retry on the offline banner simulates the reconnect (D-138): busy "Checking…" → network online → re-render → toast.
 * (2) An expired session on a non-exempt screen opens the re-auth sheet.
 */
export function wireSystem(root, screenId, { go } = {}) {
  const banner = root.querySelector('.sys-banner');
  root.classList.toggle('has-sys-banner', !!banner);
  if (banner) root.style.setProperty('--sys-banner-h', `${banner.offsetHeight}px`);   // the page's top offset grows by exactly the banner's height

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act="sys-retry"]');
    if (!btn || btn.disabled) return;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Checking…';
    withLatency(() => {
      state.sim.network = 'online';
      if (!root.isConnected) return;   // the user moved on while it was checking
      go?.(screenId, { replace: true });
      toast('You’re back online', { tone: 'success' });
    });
  });

  if (state.sim.session === 'expired' && !SYSTEM_EXEMPT.includes(screenId)) openReauth(state.persona, { go, screenId });
  else if (state.persona === 'tailor' && !SYSTEM_EXEMPT.includes(screenId)) pushNewRequests(root, { go });
}

/* ---------- re-auth ---------- */
const REAUTH_ERRORS = {
  'code-wrong': 'That code doesn’t match. Check your texts and try again.',
  'code-expired': 'That code has expired. Send a new one.',
  'code-format': 'Enter all 6 digits.',
};
/* R5-2-C-02: the line under the code box says something the lead doesn't — how long the code lasts */
const REAUTH_HELPER = () => `The code works for ${POLICY.CODE_TTL_MIN} minutes.`;
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const accountPhone = (who) => (who === 'tailor' ? myTailor()?.phone : state.customer?.phone) ?? '';

/** The re-auth sheet's body (also the gallery's): lead, code input (+ error), resend, Verify / Sign out. */
export function reauthHtml({ phone = '', code = '', error = '', msToResend = 0, busy = false } = {}) {
  const wait = msToResend > 0;
  return `<p class="t-body c-700 reauth__lead">Your session timed out. To keep your account safe, enter the code we sent to ${esc(phone)}.</p>
  ${codeInput({ id: 'reauth-code', value: code, error: REAUTH_ERRORS[error] ?? '', helper: REAUTH_HELPER() })}
  <button type="button" class="reauth__resend t-small w-600" data-act="reauth-resend"${wait || busy ? ' disabled' : ''}>${wait ? `Resend code in ${mmss(msToResend)}` : 'Resend code'}</button>
  <div class="reauth__actions">
    ${cta('Verify', { busy, busyLabel: 'Checking…', attrs: 'data-act="reauth-verify"' })}
    ${cta('Sign out', { variant: 'secondary', disabled: busy, attrs: 'data-act="reauth-sign-out"' })}
  </div>`;
}

/**
 * Locked "Sign in again" sheet (dataS `sys-reauth`): ✕, scrim and Escape do nothing. Texts a code once (guarded by `state.ui.reauth`),
 * then Verify → session valid → toast → the screen re-renders in place; Sign out → the welcome / tailor phone screen.
 */
export function openReauth(who = 'customer', { go, screenId } = {}) {
  const target = screenId ?? document.getElementById('screen')?.dataset.screen;
  if (!state.ui.reauth || !A.codeStatus(who)) {
    A.sendCode(accountPhone(who), who);
    state.ui.reauth = { code: '', error: '', busy: false };
  }
  const ui = state.ui.reauth;

  const body = () => {
    const st = A.codeStatus(who);
    return reauthHtml({ phone: st?.phone ?? accountPhone(who), code: ui.code, error: ui.error || (st?.expired ? 'code-expired' : ''), msToResend: st?.msToResend ?? 0, busy: ui.busy });
  };

  return sheetOverlay(`<div class="reauth" data-reauth>${body()}</div>`, { header: 'Sign in again', dataS: 'sys-reauth', confirm: false }, (holder, close) => {
    holder.dataset.locked = 'true';
    const paint = (focus = false) => {
      const box = holder.querySelector('[data-reauth]');
      if (!box) return;
      box.innerHTML = body();
      const input = box.querySelector('#reauth-code');
      if (ui.busy) input.disabled = true;
      else if (focus) input.focus({ preventScroll: true });
    };
    const input = () => holder.querySelector('#reauth-code');
    if (!document.documentElement.classList.contains('is-test')) input()?.focus({ preventScroll: true });

    const verify = () => {
      if (ui.busy) return;
      ui.code = input()?.value ?? '';
      ui.error = '';
      ui.busy = true;
      paint();
      withLatency(() => {
        ui.busy = false;
        if (!holder.isConnected) return;
        const r = A.verifyCode(ui.code, who);
        if (!r.ok) { ui.error = r.error === 'no-code' ? 'code-expired' : r.error; paint(true); return; }
        state.sim.session = 'valid';
        state.ui.reauth = null;
        holder.dataset.locked = 'false';
        close({ instant: true });
        go?.(target, { replace: true });
        toast('You’re signed in', { tone: 'success' });
      });
    };

    holder.addEventListener('input', (e) => {
      if (!e.target.matches('#reauth-code')) return;
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
      ui.code = e.target.value;
      if (ui.error) {   // clear the error on edit, in place
        ui.error = '';
        const f = e.target.closest('.field');
        f.classList.remove('field--error'); e.target.removeAttribute('aria-invalid');
        const msg = f.querySelector('.field__msg');
        msg.classList.remove('field__msg--error'); msg.removeAttribute('role'); msg.textContent = REAUTH_HELPER();
      }
      if (e.target.value.length === 6) verify();   // the sixth digit submits
    });
    holder.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('#reauth-code')) { e.preventDefault(); verify(); } });
    holder.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a || a.disabled) return;
      if (a.dataset.act === 'reauth-verify') verify();
      else if (a.dataset.act === 'reauth-resend') {
        if (A.resendCode(who).ok) { ui.code = ''; ui.error = ''; paint(true); }
      } else if (a.dataset.act === 'reauth-sign-out') {
        A.signOut(who);
        state.sim.session = 'valid';
        state.ui.reauth = null;
        holder.dataset.locked = 'false';
        close({ instant: true });
        go?.(who === 'tailor' ? 't-phone' : 'c-welcome', { fresh: true });
      }
    });
  });
}

/* ---------- push ask ---------- */
/** The push ask's modal markup (also the gallery's). */
export function pushPromptHtml({ title = '', body = '' } = {}) {
  return `<div class="modal modal--push" role="alertdialog" aria-modal="true" aria-labelledby="push-title" aria-describedby="push-body">
  <span class="modal__bell" aria-hidden="true">${ICON_BELL}</span>
  <h2 class="modal__title t-h2" id="push-title">${esc(title)}</h2>
  <p class="t-body c-700 modal__body" id="push-body">${esc(body)}</p>
  <div class="modal__actions">
    ${cta('Turn on notifications', { attrs: 'data-act="push-on"' })}
    ${cta('Not now', { variant: 'secondary', attrs: 'data-act="push-later"' })}
  </div>
</div>`;
}

/**
 * The soft notification ask (dataS `sys-push`, `role="alertdialog"`): Turn on → `sim.push = 'granted'` + toast;
 * Not now / Escape / scrim → `'denied'`. Both then `onDone()` so the host re-renders its denied banner / note.
 */
export function openPushPrompt({ title = '', body = '' } = {}, { onDone } = {}) {
  const html = pushPromptHtml({ title, body });
  return modalOverlay(html, { dataS: 'sys-push' }, (holder, close) => {
    let settled = false;
    const settle = (granted) => {
      if (settled) return;
      settled = true;
      state.sim.push = granted ? 'granted' : 'denied';
      close();
      onDone?.();
      if (granted) toast('Notifications are on', { tone: 'success' });
    };
    holder.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'push-on') settle(true);
      else if (a.dataset.act === 'push-later' || a.dataset.act === 'modal-dismiss') settle(false);
    });
    /* Escape: the chassis closes the modal; record the "not now" with it */
    holder.ownerDocument.addEventListener('keydown', function onKey(e) {
      if (!holder.isConnected) { holder.ownerDocument.removeEventListener('keydown', onKey); return; }
      if (e.key === 'Escape') settle(false);
    });
  });
}

/* ---------- in-app push (D-167) ---------- */
/** The push card's markup (also the gallery's): a button, so the whole card is one tap target. */
export function pushBannerHtml({ title = '', body = '', act = 'push-open' } = {}) {
  return `<button type="button" class="push-banner" data-act="${esc(act)}">
  <span class="push-banner__glyph" aria-hidden="true">${ICON_BELL}</span>
  <span class="push-banner__text"><span class="push-banner__title t-small w-700">${esc(title)}</span><span class="push-banner__body t-small" data-money>${esc(body)}</span></span>
</button>`;
}

/**
 * A notification card over the status bar of `root` (the screen). One at a time; it dismisses itself after 6 s (not under
 * `html.is-test`, so a baseline is stable) and slides in only when motion is allowed. Tapping it dismisses it and runs `onOpen`.
 */
export function pushBanner({ title = '', body = '', act = 'push-open', onOpen } = {}, root = document.getElementById('screen')) {
  if (!root) return null;
  root.querySelector('.push-banner')?.remove();
  root.insertAdjacentHTML('beforeend', pushBannerHtml({ title, body, act }));
  const el = root.querySelector('.push-banner');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('is-test');
  if (calm) el.classList.add('push-banner--in'); else requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('push-banner--in')));
  let timer = null;
  const dismiss = () => {
    clearTimeout(timer);
    if (!el.isConnected) return;
    el.classList.remove('push-banner--in');
    if (calm) el.remove(); else setTimeout(() => el.remove(), 250);
  };
  el.addEventListener('click', () => { dismiss(); onOpen?.(); });
  if (!document.documentElement.classList.contains('is-test')) timer = setTimeout(dismiss, 6000);
  return dismiss;
}

/**
 * Tailor persona, notifications on: a request she has not been told about arrives as a push card ("New request · Sarah C."),
 * and tapping it opens that request. While notifications are off (or it is the customer's side) new requests are only
 * remembered — they were seen on Home, so turning notifications on later never replays them.
 */
function pushNewRequests(root, { go } = {}) {
  const seen = (state.ui.pushSeen ??= []);
  const fresh = inbox().requests.filter((a) => a.status === 'requested' && !seen.includes(a.id));
  fresh.forEach((a) => seen.push(a.id));
  if (state.sim.push !== 'granted' || !fresh.length) return;
  const a = fresh.reduce((x, y) => (x.requestedAt >= y.requestedAt ? x : y));
  const v = requestView(a);
  const left = fmtCountdown(toDate(a.expiresAt).getTime() - now());
  pushBanner({
    title: `New request · ${v.customer.name}`,
    body: `${v.visitLabel} ${fmtDay(a.slot.start)} · You take home ${fmtExact(v.payout)} · ${left} to reply`,
  }, root);
  root.querySelector('.push-banner')?.addEventListener('click', () => { setFocus(a.id); go?.('t-request'); });
}
