/* ============================================================
   Flows click-through — the v5 "Test flows" registry, end to end.

   Driven by the FLOWS list exported from js/flows.js (ALL_FLOWS,
   exposed as window.Taily.flows) plus the EXPECT map below. For every
   entry it runs window.Taily.runFlow(key) and asserts:
     · #screen[data-screen] is the entry's screen, html[data-persona]
       is the right persona (c-* customer, t-* / to-* tailor, sys-* any)
     · `expect` holds — { has, not, sel, also, inView } against the visible text of
       #screen + any open overlay (`has` / `not` = string | string[])
     · no console error, no "nothing to click" warning
     · money lint: no `%` inside [data-money]; no "fee … 10%" prose; K-53: no visible "15%" anywhere except
       to-fee's [data-fee-rate] (PERCENT_OK — the one screen that explains the Taily fee rate)
     · target lint: every visible control is >= 44 x 44
       (opt out with data-hit="inline")
     · edge lint (B5 P2-5 / D-230): .screen is `overflow: clip`, so a clipped
       overflow never shows in scrollWidth. No visible element outside a
       horizontal scroller may cross #screen's left / right edge — at 390
       and 320 for every entry, and at 195 x 422 (page zoom 200%) for the
       short list EDGE_195 (tab roots, stars, wheel, day-hours, t-adjust,
       every sheet / overlay entry)
     · overlap lint (K9-2-04 / D-233): at 195 x 422, no text item (own text
       nodes' Range rects, or a text input) intersects another in the same
       layer by more than 3 x 4 px (scripts/v5/lib/overlap.mjs)
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
import { textOverlaps } from './lib/overlap.mjs';

const DUMP = process.argv.includes('--dump');
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'));

/* script-side expectations, keyed by flow key (fallback when an entry has no `expect`) */
const EXPECT = {
  // 'c-tailors--empty-zip': { has: 'No tailors', sel: '[data-empty="zip"]' },
};

/* P2-5: the states that also run the edge lint (and, K9-2-04, the text-overlap lint) at 195 x 422 (a 390 phone at 200% zoom).
   K9-2 (D-233) adds every screen whose rows reflowed in the zoom tier: appt-row lists, saved-item / money list rows, service rows,
   zip chips, toggle rows, garment tiles, the customer preview, the offline banner */
const EDGE_195 = [/^(c-tailors|c-messages|c-account|t-messages)$/, /^c-bookings/, /^t-home/, /^t-earnings/, /^c-orders/, /^c-review/, /^c-book(--|$)/, /^c-where--needby-sheet$/, /^to-availability/, /^t-adjust/,
  /^c-job/, /^c-cards/, /^c-addresses/, /^c-ready/, /^c-tailors/, /^to-services/, /^to-where/, /^to-profile/, /^t-shop/, /^sys-offline/, /^sys-session-expired$/];

const KEY_RE = /^[a-z0-9.-]+$/;
const MONEY_PROSE = /(fee|deposit|refund|payout|balance|courier|total)[^.\n]{0,40}\d\s?%/i;
/* K-53: the ONE screen allowed to print a percent — the Taily fee rate on to-fee, inside [data-fee-rate] only. Every other rendered text
   (every screen, every overlay) fails on a number followed by % (money copy is dollars, always). */
const PERCENT_OK = new Set(['to-fee']);
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
  /* sheetOverlay / modalOverlay mount INSIDE #screen (their text is already in screen.innerText); count them,
     and add only the ones outside #screen to the text */
  const open = [...document.querySelectorAll(OVERLAY_SEL)]
    .filter((o) => !o.closest('.stage-caption, #flow-menu, .is-closing') && !o.hidden && o.getClientRects().length);
  const overlays = open.filter((o) => !screen.contains(o));
  return {
    screen: screen?.dataset.screen ?? null,
    persona: document.documentElement.dataset.persona ?? null,
    text: [screen?.innerText ?? '', ...overlays.map((o) => o.innerText)].join('\n'),
    overlays: open.length,
    missing: !!document.querySelector('.screen-missing'),
    url: new URL(location.href).searchParams.get('flow'),
  };
}, { OVERLAY_SEL });

/* inventory kinds: only a state marked `overlay` must open one (a `click` can also press an inline control) */
const OVERLAY_KEYS = new Set(await page.evaluate(async () => {
  try { const m = await import('/js/inventory.js'); return m.SCREENS.flatMap((s) => s.states.filter((st) => st.kind === 'overlay').map((st) => st.key)); } catch { return []; }
}));

const lints = (rateOk = false) => page.evaluate(({ OVERLAY_SEL, MIN, rateOk }) => {
  const screen = document.getElementById('screen');
  const roots = [screen, ...[...document.querySelectorAll(OVERLAY_SEL)]
    .filter((o) => !screen.contains(o) && !o.closest('.stage-caption, #flow-menu') && !o.hidden && o.getClientRects().length)];
  const money = [];
  for (const r of roots) for (const m of r.querySelectorAll('[data-money]')) if (/%/.test(m.textContent)) money.push(m.textContent.replace(/\s+/g, ' ').trim().slice(0, 60));
  /* K-53: any visible "15%" — only to-fee's [data-fee-rate] may hold one */
  const pct = [];
  for (const r of roots) {
    const walk = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('script, style, #flow-menu, .stage-caption, [hidden]') || (rateOk && el.closest('[data-fee-rate]'))) continue;
      if (/\d\s?%/.test(n.textContent)) pct.push(n.textContent.replace(/\s+/g, ' ').trim().slice(0, 60));
    }
  }
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
  return { money, small, pct };
}, { OVERLAY_SEL, MIN: MIN_TARGET, rateOk });

/* P2-5: elements outside a horizontal scroller whose box crosses #screen's left / right edge (the clip hides them from scrollWidth) */
const edgeCrossers = () => page.evaluate(() => {
  const scr = document.getElementById('screen');
  const sr = scr.getBoundingClientRect();
  const cn = (el) => String(el.className?.baseVal ?? el.className ?? '').split(' ')[0];
  const inScroller = (el) => { for (let a = el.parentElement; a && a !== scr; a = a.parentElement) if (/(auto|scroll)/.test(getComputedStyle(a).overflowX)) return true; return false; };
  const out = [];
  for (const el of scr.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    if (el.closest('.sr-only, .visually-hidden, .is-closing, [hidden]') || inScroller(el)) continue;
    if (r.right > sr.right + 1 || r.left < sr.left - 1) out.push(`${el.tagName.toLowerCase()}.${cn(el)} "${String(el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24)}" ${Math.round(r.left - sr.left)}..${Math.round(r.right - sr.left)} of ${Math.round(sr.width)}`);
  }
  return out;
});
const edgeAt = async (w, hgt) => {
  await page.setViewportSize({ width: w, height: hgt });
  await settle(page);
  const o = await edgeCrossers();
  return o.length ? `edge@${w}: ${o.slice(0, 3).join('; ')}${o.length > 3 ? ` (+${o.length - 3})` : ''}` : '';
};

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
    /* also (M7-1-C-02): extra selectors that must all match a visible element (e.g. an aria-label) */
    for (const q of arr(exp.also)) if (!(await page.evaluate((s) => { const el = document.querySelector(s); return !!el && el.getClientRects().length > 0; }, q))) problems.push(`no visible ${q}`);
    /* inView (R5-1-C-02): the `sel` element sits inside the viewport and nothing (a sticky foot, a toast) covers its centre */
    if (exp.inView && exp.sel && !(await page.evaluate((q) => {
      const el = document.querySelector(q); if (!el) return false;
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) return false;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && (el === hit || el.contains(hit));
    }, exp.sel))) problems.push(`${exp.sel} is outside the viewport or covered`);
  }
  /* rowFit (K4-1-02, D-207): every item row that has a photo stack keeps it on the icon / name line — at 390 and at 320 */
  if (exp?.rowFit) {
    const measure = () => page.evaluate(() => [...document.querySelectorAll('.garment-head')].filter((hd) => hd.querySelector('.photo-stack')).map((hd) => {
      const ic = hd.querySelector('.garment-icon').getBoundingClientRect(); const st = hd.querySelector('.photo-stack').getBoundingClientRect();
      /* K-05 (D-220): the row is [icon] [name + tag] … [stack], all centred on one line; the stack is on that line when its centre meets the icon's */
      return { name: hd.querySelector('.garment-head__name')?.textContent, drop: Math.round(Math.abs((st.top + st.height / 2) - (ic.top + ic.height / 2))) };
    }));
    for (const w of [390, 320]) {
      await page.setViewportSize({ width: w, height: 844 });
      const rows = await measure();
      if (!rows.length) problems.push(`rowFit@${w}: no item row with a photo stack`);
      for (const row of rows) if (row.drop > 8) problems.push(`rowFit@${w}: the photo stack of "${row.name}" sits ${row.drop}px below the name`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  /* noClip (K4-2-01, D-219): none of these elements is cut short by an ellipsis or wraps past one line — at 390 and at 320 */
  if (exp?.noClip) {
    for (const w of [390, 320]) {
      await page.setViewportSize({ width: w, height: 844 });
      const cut = await page.evaluate((qs) => qs.flatMap((q) => [...document.querySelectorAll(q)].filter((el) => {
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 16;
        return el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().height > lh * 1.5;
      }).map((el) => `${q} "${el.textContent.trim()}"`)), arr(exp.noClip));
      for (const c of cut) problems.push(`noClip@${w}: ${c} is cut or wraps`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  if (f.click.length && OVERLAY_KEYS.has(f.key) && !r.overlays) problems.push('click set but no overlay open');
  if (r.url !== f.key) problems.push(`?flow=${r.url}`);
  if (h.errors.length) problems.push(`console: ${h.errors.slice(0, 2).join(' | ')}`);
  if (h.warnings.length) problems.push(h.warnings.join(' | '));
  const lint = await lints(PERCENT_OK.has(f.screen));
  if (lint.money.length) problems.push(`% in money rows: ${lint.money.join(' / ')}`);
  if (lint.pct.length) problems.push(`a percent on screen (only to-fee's [data-fee-rate] may show one, K-53): ${lint.pct.slice(0, 2).join(' / ')}`);
  const prose = norm(PERCENT_OK.has(f.screen) ? r.text.replace(/\d+\s?%/g, '') : r.text).match(MONEY_PROSE);
  if (prose) problems.push(`% in money copy: "${prose[0]}"`);
  if (lint.small.length) problems.push(`targets < ${MIN_TARGET}px: ${lint.small.slice(0, 4).join('; ')}${lint.small.length > 4 ? ` (+${lint.small.length - 4})` : ''}`);
  /* P2-5 edge lint: 390 (as run), 320, and 195 x 422 for the short list */
  /* sys-components is the 390-wide specimen sheet (fixed-width frames, not a phone screen): 390 only */
  const sizes = f.screen === 'sys-components' ? [[390, 844]] : [[390, 844], [320, 568], ...(OVERLAY_KEYS.has(f.key) || EDGE_195.some((re) => re.test(f.key)) ? [[195, 422]] : [])];
  for (const [w, hgt] of sizes) {
    const msg = await edgeAt(w, hgt);
    if (msg) problems.push(msg);
    /* K9-2-04 (D-233): at 195 no text may overprint other text in the same layer (scripts/v5/lib/overlap.mjs) */
    if (w === 195) {
      const ov = await page.evaluate(textOverlaps, { OVERLAY_SEL: `${OVERLAY_SEL}, .text-banner` });   // K-43 (D-301): a text message floats over the app (its own layer), like the OS banner it stands for
      if (ov.length) problems.push(`overlap@195: ${ov.slice(0, 3).join('; ')}${ov.length > 3 ? ` (+${ov.length - 3})` : ''}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
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
  check('menu: tabs are customer / tailor / admin / system', ['customer', 'tailor', 'admin', 'system'].every((t) => tabs.includes(t)), `tabs=${tabs.join(',')}`);
  for (const t of ['customer', 'tailor', 'admin', 'system']) {
    if (!tabs.includes(t)) continue;
    await page.click(`.flow-menu__tab[data-tab="${t}"]`);
    const shown = await page.$$eval('[data-flow]', (els) => els.map((e) => e.dataset.flow));
    const want = all.filter((f) => (t === 'system' ? /^sys-/.test(f.screen) || /^sys-/.test(f.key) : personaOf(f) === t)).map((f) => f.key);
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
  /* pre-MVP A2 (K-48.1): the admin persona — View as Admin lands on a-inbox with the same live state */
  await page.click('#flow-trigger');
  await page.click('#persona-admin');
  await settle(page);
  const adm = await page.evaluate(async () => {
    const S = await import('/js/state.js');
    return { persona: document.documentElement.dataset.persona, screen: document.getElementById('screen')?.dataset.screen, appts: S.state.appts.length };
  });
  check('menu: View as Admin opens the admin inbox, state kept', adm.persona === 'admin' && adm.screen === 'a-inbox' && adm.appts === before.appts, JSON.stringify(adm));
  /* K-53 a8 (D-422): the admin opens Test flows from his inbox too */
  await page.evaluate(() => document.querySelector('#screen [data-admin-tools] [data-act="test-flows"]')?.click());
  await settle(page);
  check('menu: the admin inbox’s Test flows opens the panel', await page.evaluate(() => document.querySelector('#flow-menu')?.hidden === false));
  await page.keyboard.press('Escape');
  /* K-53 a8 (D-422): a plain visit (a customer or a tailor) never gets the Test-flows tools — not even after input; ?test=1 / ?flow= / ?study= are admin test sessions */
  await h.goto('/');
  await page.mouse.move(100, 300); await page.mouse.move(120, 320);
  await settle(page);
  const plain = await page.evaluate(() => ({ tools: document.documentElement.classList.contains('tools-on'), trigger: !!document.querySelector('#flow-trigger')?.getClientRects().length }));
  check('menu: hidden on a plain visit (only the signed-in admin gets Test flows)', !plain.tools && !plain.trigger, JSON.stringify(plain));
  await h.goto('/?screen=a-inbox');
  await page.waitForSelector('#screen[data-screen="a-login"]', { timeout: 3000 }).catch(() => {});
  check('menu: a cold a-* link without the admin’s session lands on a-login (K-52)', (await landing()).screen === 'a-login');

  for (const f of [first, all[all.length - 1]].filter((e, i, a) => a.indexOf(e) === i)) {
    await h.goto(`/?test=1&flow=${encodeURIComponent(f.key)}`);
    const r = await landing();
    check(`?flow=${f.key} boots straight into the step`, r.screen === f.screen, `screen=${r.screen}`);
  }
}

console.log(`\n${all.length} flow entries, ${R.passes} passed, ${R.failures} failed.`);
await h.close();
process.exit(R.failures ? 1 : 0);
