/* ============================================================
   Flows click-through — the v5 "Test flows" registry, end to end.

   Driven by the FLOWS list exported from js/flows.js (ALL_FLOWS,
   exposed as window.Taily.flows) plus the EXPECT map below. For every
   entry it runs window.Taily.runFlow(key) and asserts:
     · #screen[data-screen] is the entry's screen, html[data-persona]
       is the right persona (c-* customer, t-* / to-* tailor, sys-* any)
     · `expect` holds — { has, not, sel } against the visible text of
       #screen + any open overlay (`has` / `not` = string | string[])
     · no console error, no "nothing to click" warning
     · money lint: no `%` inside [data-money]; no "fee … 10%" prose
     · target lint: every visible control is >= 44 x 44
       (opt out with data-hit="inline")
   Plus the registry rules (keys unique + url-safe, screens registered,
   every registered screen has an entry, every built state has one) and
   the menu's own behaviour (open, tabs, run an entry, Escape,
   ?flow=<key> boot, persona flip keeps state). From M3,
   scripts/v5/journeys.mjs (cross-persona) is run by check.mjs.

   An entry's `expect` lives on the entry (js/fixtures/m#.js). EXPECT
   below is the optional script-side map, keyed by flow key — it is used
   when an entry carries none. Dollar strings come from fmt*() in
   js/money.js, never typed by hand.

   A missing window.Taily.runFlow or an empty registry FAILS (M0 registered
   entries); pass --allow-empty only for a scratch run before any screen exists.

   node scripts/v5/clickthrough-flows.mjs [--dump] [key|prefix* ...]
   --dump prints each entry's landing text (for writing `expect`).
   ============================================================ */

import { open, loadFlows, personaOf, reporter, settle, MIN_TARGET } from './lib/browser.mjs';

const DUMP = process.argv.includes('--dump');
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'));

/* script-side expectations, keyed by flow key (fallback when an entry has no `expect`) */
const EXPECT = {
  // 'c-tailors--empty-zip': { has: 'No tailors', sel: '[data-empty="zip"]' },
};

const KEY_RE = /^[a-z0-9.-]+$/;
const MONEY_PROSE = /(fee|deposit|refund|payout|balance|courier|total)[^.\n]{0,40}\d\s?%/i;
const OVERLAY_SEL = '[role="dialog"], [aria-modal="true"], .modal-overlay, .overlay, .screen-sheet--overlay';
const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const matches = (key) => !ONLY.length || ONLY.some((p) => (p.endsWith('*') ? key.startsWith(p.slice(0, -1)) : key === p));

const h = await open();
const { page } = h;
const R = reporter();
const { check } = R;

/* what an open page shows: #screen + overlays outside it, one line */
const landing = () => page.evaluate(({ OVERLAY_SEL }) => {
  const screen = document.getElementById('screen');
  const overlays = [...document.querySelectorAll(OVERLAY_SEL)]
    .filter((o) => !screen.contains(o) && !o.closest('.stage-caption, #flow-menu') && !o.hidden && o.getClientRects().length);
  return {
    screen: screen?.dataset.screen ?? null,
    persona: document.documentElement.dataset.persona ?? null,
    text: [screen?.innerText ?? '', ...overlays.map((o) => o.innerText)].join('\n'),
    overlays: overlays.length,
    missing: !!document.querySelector('.screen-missing'),
    url: new URL(location.href).searchParams.get('flow'),
  };
}, { OVERLAY_SEL });

const lints = () => page.evaluate(({ OVERLAY_SEL, MIN }) => {
  const screen = document.getElementById('screen');
  const roots = [screen, ...[...document.querySelectorAll(OVERLAY_SEL)]
    .filter((o) => !screen.contains(o) && !o.closest('.stage-caption, #flow-menu') && !o.hidden && o.getClientRects().length)];
  const money = [];
  for (const r of roots) for (const m of r.querySelectorAll('[data-money]')) if (/%/.test(m.textContent)) money.push(m.textContent.replace(/\s+/g, ' ').trim().slice(0, 60));
  const small = [];
  const CONTROLS = 'button, a, input, select, textarea, [role="button"], [role="switch"], [data-act]';
  for (const r of roots) for (const el of r.querySelectorAll(CONTROLS)) {
    if (el.closest('[data-hit="inline"]') || el.dataset.hit === 'inline') continue;
    if (el.type === 'hidden' || el.closest('[hidden], [inert]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const b = el.getBoundingClientRect();
    if (b.width <= 1 || b.height <= 1) continue;               // sr-only / hairline
    /* a visually hidden native input is hit through its wrapping label */
    const box = (cs.opacity === '0' && el.closest('label')) ? el.closest('label').getBoundingClientRect() : b;
    if (box.width < MIN - 0.5 || box.height < MIN - 0.5) {
      small.push(`${el.tagName.toLowerCase()}${el.dataset.act ? `[data-act=${el.dataset.act}]` : ''} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(box.width)}x${Math.round(box.height)}`);
    }
  }
  return { money, small };
}, { OVERLAY_SEL, MIN: MIN_TARGET });

/* ---------- the registry ---------- */
const { legacy, flows: all } = await loadFlows(page);
check('app boots on /?test=1 with no console error', h.errors.length === 0, h.errors.slice(0, 3).join(' | '));
h.clear();

/* M0 registered entries: a missing runFlow (the v4 page) or an empty registry is now a failure, not a pass-through.
   --allow-empty opts back in for a scratch run before any screen registers. */
const ALLOW_EMPTY = process.argv.includes('--allow-empty');
if (legacy && !ALLOW_EMPTY) check('registry: window.Taily.runFlow exists (the page is the v5 app)', false, 'runFlow is missing — js/app.js no longer exposes it, or the page is still v4');
if (!legacy && !all.length && !ALLOW_EMPTY) check('registry: window.Taily.flows is not empty', false, 'ALL_FLOWS is empty — js/flows.js registered no entries');
if (!all.length) {
  R.note(`flows: 0 entries — nothing to run${legacy ? ' (runFlow absent)' : ''}.`);
  console.log(`\n0 flow entries, ${R.passes} checks, ${R.failures} failed.`);
  await h.close();
  process.exit(R.failures ? 1 : 0);
}
console.log(`${all.length} flow entries\n`);

const registered = await page.evaluate(() => window.Taily.registered?.() ?? []);
const keys = all.map((f) => f.key);
const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
check('registry: keys unique', !dupes.length, dupes.join(', '));
check('registry: keys match /^[a-z0-9.-]+$/', keys.every((k) => KEY_RE.test(k)), keys.filter((k) => !KEY_RE.test(k)).join(', '));
check('registry: every entry names a registered screen', all.every((f) => registered.includes(f.screen)), [...new Set(all.filter((f) => !registered.includes(f.screen)).map((f) => f.screen))].join(', '));
check('registry: every registered screen has an entry', registered.every((s) => all.some((f) => f.screen === s)), registered.filter((s) => !all.some((f) => f.screen === s)).join(', '));
check('registry: every entry has an expect', all.every((f) => f.expect || EXPECT[f.key]), all.filter((f) => !f.expect && !EXPECT[f.key]).map((f) => f.key).join(', '));
try {
  const inv = await page.evaluate(async () => {
    const m = await import('/js/inventory.js');
    return { built: m.BUILT ?? [], screens: m.SCREENS ?? [] };
  });
  const missing = inv.screens.flatMap((s) => (s.states ?? []).filter((st) => inv.built.includes(st.m)).map((st) => st.key)).filter((k) => !keys.includes(k));
  check('registry: every built state in js/inventory.js has an entry', !missing.length, missing.join(', '));
} catch { R.note('js/inventory.js not loadable — built-state coverage not checked'); }

/* ---------- each entry ---------- */
for (const f of all.filter((e) => matches(e.key))) {
  h.clear();
  const ran = await page.evaluate((k) => window.Taily.runFlow(k), f.key);
  await settle(page);
  const r = await landing();
  if (DUMP) {
    console.log(`${f.key.padEnd(34)} ${String(r.screen).padEnd(22)} ${String(r.persona).padEnd(9)} ${norm(r.text).slice(0, 150)}`);
    continue;
  }
  const problems = [];
  if (ran === false) problems.push('runFlow returned false');
  if (r.missing) problems.push('screen missing');
  if (r.screen !== f.screen) problems.push(`screen=${r.screen} (want ${f.screen})`);
  const wantPersona = personaOf(f);
  if (wantPersona && r.persona !== wantPersona) problems.push(`persona=${r.persona} (want ${wantPersona})`);
  const spec = f.expect ?? EXPECT[f.key];
  const exp = typeof spec === 'string' || Array.isArray(spec) ? { has: spec } : spec;
  if (!exp) problems.push('no expect');
  else {
    const text = norm(r.text);
    for (const s of arr(exp.has)) if (!text.includes(norm(s))) problems.push(`missing "${s}"`);
    for (const s of arr(exp.not)) if (text.includes(norm(s))) problems.push(`should not show "${s}"`);
    if (exp.sel && !(await page.evaluate((q) => { const el = document.querySelector(q); return !!el && el.getClientRects().length > 0; }, exp.sel))) problems.push(`no visible ${exp.sel}`);
  }
  if (f.click.length && !r.overlays) problems.push('click set but no overlay open');
  if (r.url !== f.key) problems.push(`?flow=${r.url}`);
  if (h.errors.length) problems.push(`console: ${h.errors.slice(0, 2).join(' | ')}`);
  if (h.warnings.length) problems.push(h.warnings.join(' | '));
  const lint = await lints();
  if (lint.money.length) problems.push(`% in money rows: ${lint.money.join(' / ')}`);
  const prose = norm(r.text).match(MONEY_PROSE);
  if (prose) problems.push(`% in money copy: "${prose[0]}"`);
  if (lint.small.length) problems.push(`targets < ${MIN_TARGET}px: ${lint.small.slice(0, 4).join('; ')}${lint.small.length > 4 ? ` (+${lint.small.length - 4})` : ''}`);
  check(f.key, !problems.length, problems.join('; '));
}

/* ---------- the menu's own behaviour (full runs only) ---------- */
if (!DUMP && !ONLY.length) {
  const first = all[0];
  await h.goto('/?test=1');
  await page.mouse.move(100, 300); await page.mouse.move(120, 320);   // reveal the pinned control
  check('menu: trigger visible after the first input', await page.isVisible('#flow-trigger'));
  await page.click('#flow-trigger');
  check('menu: trigger opens the panel', await page.evaluate(() => !document.querySelector('#flow-menu')?.hidden && document.querySelector('#flow-trigger').getAttribute('aria-expanded') === 'true'));

  const tabs = await page.$$eval('.flow-menu__tab', (t) => t.map((b) => b.dataset.tab));
  check('menu: tabs are customer / tailor / system', ['customer', 'tailor', 'system'].every((t) => tabs.includes(t)), `tabs=${tabs.join(',')}`);
  for (const t of ['customer', 'tailor', 'system']) {
    if (!tabs.includes(t)) continue;
    await page.click(`.flow-menu__tab[data-tab="${t}"]`);
    const shown = await page.$$eval('[data-flow]', (els) => els.map((e) => e.dataset.flow));
    const want = all.filter((f) => (t === 'system' ? /^sys-/.test(f.screen) : personaOf(f) === t)).map((f) => f.key);
    check(`menu: ${t} tab lists its entries`, shown.length === want.length && want.every((k) => shown.includes(k)), `shown=${shown.length} want=${want.length}`);
  }
  const tab = /^sys-/.test(first.screen) ? 'system' : personaOf(first) === 'tailor' ? 'tailor' : 'customer';
  if (tabs.includes(tab)) {
    await page.click(`.flow-menu__tab[data-tab="${tab}"]`);
    await page.click(`[data-flow="${first.key}"]`);
    await settle(page);
    const r = await landing();
    check('menu: clicking an entry runs it and closes the panel', r.screen === first.screen && await page.evaluate(() => document.querySelector('#flow-menu')?.hidden === true), `screen=${r.screen}`);
  }
  await page.click('#flow-trigger');
  await page.keyboard.press('Escape');
  check('menu: Escape closes the panel', await page.evaluate(() => document.querySelector('#flow-menu')?.hidden === true));

  /* persona flip keeps state: write REAL model state (a job field + a booked request), flip, and read it back.
     The module is the same instance the app uses (ES module cache), so this is the live state, not a copy. */
  const before = await page.evaluate(async () => {
    const S = await import('/js/state.js');
    S.T.setJob({ needBy: '2026-10-30' });
    const slotStart = S.nextOpening(S.state.tailors[0].id, S.state.job.visitType, { until: S.state.job.needBy });
    const r = S.T.requestBooking({ tailorId: S.state.tailors[0].id, slotStart, cardId: 'visa-4242' });
    return { persona: document.documentElement.dataset.persona, needBy: S.state.job.needBy, appts: S.state.appts.length, booked: r.ok };
  });
  check('menu: persona flip probe set up (need-by changed, one request booked)', before.booked && before.needBy === '2026-10-30' && before.appts === 1 && ['customer', 'tailor'].includes(before.persona), JSON.stringify(before));
  await page.click('#flow-trigger');
  await page.click('#persona-toggle');
  await settle(page);
  const after = await page.evaluate(async () => {
    const S = await import('/js/state.js');
    return { persona: document.documentElement.dataset.persona, statePersona: S.state.persona, needBy: S.state.job.needBy, appts: S.state.appts.length };
  });
  const flipped = before.persona === 'customer' ? 'tailor' : 'customer';
  check('menu: persona flip switches html[data-persona]', after.persona === flipped && after.statePersona === flipped, `before=${before.persona} after=${after.persona} state=${after.statePersona}`);
  check('menu: persona flip keeps state (need-by and appointments unchanged)', after.needBy === before.needBy && after.appts === before.appts, `needBy ${before.needBy} -> ${after.needBy}, appts ${before.appts} -> ${after.appts}`);

  for (const f of [first, all[all.length - 1]].filter((e, i, a) => a.indexOf(e) === i)) {
    await h.goto(`/?test=1&flow=${encodeURIComponent(f.key)}`);
    const r = await landing();
    check(`?flow=${f.key} boots straight into the step`, r.screen === f.screen, `screen=${r.screen}`);
  }
}

console.log(`\n${all.length} flow entries, ${R.passes} passed, ${R.failures} failed.`);
await h.close();
process.exit(R.failures ? 1 : 0);
