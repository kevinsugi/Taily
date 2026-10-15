/* ============================================================
   Study run — the Test flows "Study" tab, end to end (js/study.js, js/flow-menu.js).

   At 390 x 844 it walks STUDY_SCRIPT in order through the REAL menu
   (reveal the pill -> open the panel -> Study tab -> tap the Start /
   Jump-to button) and, for every key, asserts what clickthrough-flows
   asserts for that registry entry: the screen id, the persona, the
   entry's `expect` ({ has, not, sel, also, inView, rowFit, noClip })
   and no console error / "nothing to click" warning. With the panel
   closed it also checks the pill never covers the screen's action bar
   (390 x 844 and 320 x 568). Then:
     · ?study=1 / ?study=1&s=3 open the panel on the Study tab at the right section
     · Next / Prev section run the neighbouring section's start key
     · a key that is not in the registry shows as "missing: <key>" in the error colour
     · screenshots: .shots/study/study-tab.png (panel open) and
       .shots/study/study-tab-bottom.png (scrolled to the Prev / Next buttons)

   node scripts/v5/study-run.mjs        prints a PASS / FAIL table, exit 1 on any FAIL
   ============================================================ */

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { open, settle, personaOf, MIN_TARGET } from './lib/browser.mjs';
import { ROOT } from './lib/server.mjs';

const SHOTS = resolve(ROOT, '.shots/study');
mkdirSync(SHOTS, { recursive: true });

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const OVERLAY_SEL = '[role="dialog"], [aria-modal="true"], .modal-overlay, .overlay, .screen-sheet--overlay';

const h = await open();
const { page } = h;
const rows = [];
let failures = 0;
const record = (id, key, ok, detail = '') => {
  rows.push({ id, key, ok, detail });
  if (!ok) failures++;
};

/* the script under test + the registry */
const { script, title } = await page.evaluate(async () => {
  const m = await import('/js/study.js');
  return { script: m.STUDY_SCRIPT, title: m.STUDY_TITLE };
});
const flows = await page.evaluate(() => window.Taily.loadTools().then(() => window.Taily.flows.map(({ key, screen, persona, expect, click }) => ({ key, screen, persona: persona ?? null, expect: expect ?? null, click: click ?? [] }))));
const flowOf = (k) => flows.find((f) => f.key === k);

/* ---------- helpers ---------- */
const landing = () => page.evaluate(({ OVERLAY_SEL }) => {
  const screen = document.getElementById('screen');
  const open = [...document.querySelectorAll(OVERLAY_SEL)]
    .filter((o) => !o.closest('.stage-caption, #flow-menu, .is-closing') && !o.hidden && o.getClientRects().length);
  const overlays = open.filter((o) => !screen.contains(o));
  return {
    screen: screen?.dataset.screen ?? null,
    persona: document.documentElement.dataset.persona ?? null,
    text: [screen?.innerText ?? '', ...overlays.map((o) => o.innerText)].join('\n'),
    missing: !!document.querySelector('.screen-missing'),
    url: new URL(location.href).searchParams.get('flow'),
    panelClosed: document.querySelector('#flow-menu')?.hidden === true,
  };
}, { OVERLAY_SEL });

const reveal = async () => { await page.mouse.move(100, 300); await page.mouse.move(120, 320); };
async function openStudyTab() {
  if (await page.evaluate(() => document.querySelector('#flow-menu')?.hidden !== false)) await page.click('#flow-trigger');
  await page.click('.flow-menu__tab[data-tab="study"]');
}
/** Tap the section's button for `key` through the open Study tab. */
async function tap(sec, key) {
  await openStudyTab();
  const sel = `[data-flow="${key}"][data-study-sec="${sec}"]`;
  await page.locator(sel).scrollIntoViewIfNeeded();
  await page.click(sel);
  await settle(page);
}

/** The entry's `expect`, same semantics as clickthrough-flows.mjs. Returns a list of problems. */
async function expectProblems(f, r) {
  const problems = [];
  if (r.missing) problems.push('screen missing');
  if (r.screen !== f.screen) problems.push(`screen=${r.screen} (want ${f.screen})`);
  const want = personaOf(f);
  if (want && r.persona !== want) problems.push(`persona=${r.persona} (want ${want})`);
  const spec = f.expect;
  const exp = typeof spec === 'string' || Array.isArray(spec) ? { has: spec } : spec;
  if (!exp) { problems.push('no expect'); return problems; }
  const text = norm(r.text);
  for (const s of arr(exp.has)) if (!text.includes(norm(s))) problems.push(`missing "${s}"`);
  for (const s of arr(exp.not)) if (text.includes(norm(s))) problems.push(`should not show "${s}"`);
  const visible = (q) => page.evaluate((s) => { const el = document.querySelector(s); return !!el && el.getClientRects().length > 0; }, q);
  if (exp.sel && !(await visible(exp.sel))) problems.push(`no visible ${exp.sel}`);
  for (const q of arr(exp.also)) if (!(await visible(q))) problems.push(`no visible ${q}`);
  if (exp.inView && exp.sel && !(await page.evaluate((q) => {
    const el = document.querySelector(q); if (!el) return false;
    const b = el.getBoundingClientRect();
    if (b.top < 0 || b.bottom > window.innerHeight) return false;
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return !!hit && (el === hit || el.contains(hit));
  }, exp.sel))) problems.push(`${exp.sel} is outside the viewport or covered`);
  if (exp.rowFit) {
    for (const w of [390, 320]) {
      await page.setViewportSize({ width: w, height: 844 });
      const bad = await page.evaluate(() => [...document.querySelectorAll('.garment-head')].filter((hd) => hd.querySelector('.photo-stack')).map((hd) => {
        const ic = hd.querySelector('.garment-icon').getBoundingClientRect(); const st = hd.querySelector('.photo-stack').getBoundingClientRect();
        return Math.round(Math.abs((st.top + st.height / 2) - (ic.top + ic.height / 2)));
      }).filter((d) => d > 8));
      if (bad.length) problems.push(`rowFit@${w}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  if (exp.noClip) {
    for (const w of [390, 320]) {
      await page.setViewportSize({ width: w, height: 844 });
      const cut = await page.evaluate((qs) => qs.flatMap((q) => [...document.querySelectorAll(q)].filter((el) => {
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 16;
        return el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().height > lh * 1.5;
      }).map(() => q)), arr(exp.noClip));
      if (cut.length) problems.push(`noClip@${w}: ${cut.join(', ')}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  return problems;
}

/** With the panel closed: the pill must not overlap the sticky action bar (or any fixed/sticky bottom control). */
const pillOverlap = () => page.evaluate(() => {
  const pill = document.querySelector('#flow-trigger')?.getBoundingClientRect();
  if (!pill) return 'no pill';
  const hits = [];
  for (const el of document.querySelectorAll('#screen .action-bar, #screen [class*="action-bar"]')) {
    const b = el.getBoundingClientRect();
    if (b.width <= 1 || b.height <= 1 || getComputedStyle(el).visibility === 'hidden') continue;
    if (pill.left < b.right && pill.right > b.left && pill.top < b.bottom && pill.bottom > b.top) hits.push(el.className.split(' ')[0]);
  }
  return hits.length ? `pill overlaps ${hits.join(', ')}` : '';
});

/* ---------- 1. every study key, in order, through the menu ---------- */
await reveal();
await page.waitForSelector('#flow-trigger', { state: 'visible' });
h.clear();
let n = 0;
for (let i = 0; i < script.length; i++) {
  const sec = script[i];
  const keys = [['start', sec.start], ...sec.jump.map((k) => ['jump', k])];
  for (const [kind, key] of keys) {
    n++;
    const id = `S${i + 1} ${kind}`;
    const f = flowOf(key);
    if (!f) { record(id, key, false, 'not in the registry'); continue; }
    h.clear();
    const problems = [];
    try {
      await tap(i, key);
      const r = await landing();
      problems.push(...await expectProblems(f, r));
      if (!r.panelClosed) problems.push('panel stayed open');
      if (r.url !== key) problems.push(`?flow=${r.url}`);
      if (h.errors.length) problems.push(`console: ${h.errors.slice(0, 2).join(' | ')}`);
      if (h.warnings.length) problems.push(h.warnings.join(' | '));
      /* the closed pill vs the action bar, at both phone sizes */
      for (const [w, hgt] of [[390, 844], [320, 568]]) {
        await page.setViewportSize({ width: w, height: hgt });
        await settle(page);
        const o = await pillOverlap();
        if (o) problems.push(`@${w}: ${o}`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await settle(page);
      /* the Start / Jump button is the highlighted one when the panel is reopened */
      await openStudyTab();
      const hl = await page.evaluate(() => ({
        sec: document.querySelector('.flow-menu__sec[data-current]')?.dataset.sec ?? null,
        cur: document.querySelector('[aria-current="true"][data-flow]')?.dataset.flow ?? null,
      }));
      if (hl.sec !== String(i)) problems.push(`highlighted section=${hl.sec} (want ${i})`);
      if (hl.cur !== key) problems.push(`highlighted key=${hl.cur}`);
      await page.keyboard.press('Escape');
    } catch (e) {
      problems.push(`threw: ${e.message.split('\n')[0]}`);
    }
    record(id, key, !problems.length, problems.join('; '));
  }
}

/* ---------- 2. Next / Prev section run the neighbour's start key ---------- */
async function stepCheck(label, dir, wantSec) {
  h.clear();
  await openStudyTab();
  await page.click(`[data-study-step="${dir}"]`);
  await settle(page);
  const r = await landing();
  const want = script[wantSec].start;
  const f = flowOf(want);
  const problems = [];
  if (r.screen !== f.screen) problems.push(`screen=${r.screen} (want ${f.screen})`);
  if (r.url !== want) problems.push(`?flow=${r.url} (want ${want})`);
  if (!r.panelClosed) problems.push('panel stayed open');
  await openStudyTab();
  const sec = await page.evaluate(() => document.querySelector('.flow-menu__sec[data-current]')?.dataset.sec);
  if (sec !== String(wantSec)) problems.push(`highlighted section=${sec} (want ${wantSec})`);
  if (h.errors.length) problems.push(`console: ${h.errors[0]}`);
  await page.keyboard.press('Escape');
  record('nav', label, !problems.length, problems.join('; '));
}
await h.goto('/?test=1');
await reveal();
await tap(0, script[0].start);                       // section 1 start
for (let s = 1; s < script.length; s++) await stepCheck(`Next -> section ${s + 1}`, 1, s);
for (let s = script.length - 2; s >= 0; s--) await stepCheck(`Prev -> section ${s + 1}`, -1, s);
{
  /* at the ends the buttons are disabled and do nothing */
  await openStudyTab();
  const off = await page.evaluate(() => document.querySelector('[data-study-step="-1"]').getAttribute('aria-disabled'));
  record('nav', 'Prev is disabled on section 1', off === 'true', `aria-disabled=${off}`);
  await page.keyboard.press('Escape');
}

/* ---------- 3. a missing key is shown, not dropped ---------- */
{
  await page.evaluate(async () => { const m = await import('/js/study.js'); m.STUDY_SCRIPT.push({ title: 'Bogus', start: 'zz-not-a-flow', jump: ['zz-also-missing'] }); });
  await openStudyTab();
  const miss = await page.evaluate(() => [...document.querySelectorAll('.flow-menu__missing')].map((el) => ({ t: el.textContent.trim(), c: getComputedStyle(el).color })));
  const errInk = await page.evaluate(() => { const d = document.createElement('i'); d.style.color = 'var(--error-ink)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
  const ok = miss.length === 2 && miss[0].t === 'missing: zz-not-a-flow' && miss[1].t === 'missing: zz-also-missing' && miss.every((m) => m.c === errInk);
  record('missing', 'unknown key renders "missing: <key>" in the error colour', ok, JSON.stringify(miss));
  await page.evaluate(async () => { const m = await import('/js/study.js'); m.STUDY_SCRIPT.pop(); });
  await page.keyboard.press('Escape');
}

/* ---------- 4. cold links ---------- */
for (const [path, want] of [['/?study=1', 0], ['/?study=1&s=3', 2], ['/?test=1&study=1&s=5', 4]]) {
  await h.goto(path);
  const st = await page.evaluate(() => ({
    open: document.querySelector('#flow-menu')?.hidden === false,
    shown: getComputedStyle(document.querySelector('.stage-caption')).visibility === 'visible',
    tab: document.querySelector('.flow-menu__tab[aria-selected="true"]')?.dataset.tab,
    sec: document.querySelector('.flow-menu__sec[data-current]')?.dataset.sec,
    screen: document.getElementById('screen')?.dataset.screen,
  }));
  const problems = [];
  if (!st.open) problems.push('panel not open');
  if (!st.shown) problems.push('control hidden');
  if (st.tab !== 'study') problems.push(`tab=${st.tab}`);
  if (st.sec !== String(want)) problems.push(`section=${st.sec} (want ${want})`);
  record('link', path, !problems.length, problems.join('; ') + (problems.length ? '' : ` (behind the panel: ${st.screen}, nothing auto-run)`));
}

/* ---------- 5. screenshots ---------- */
await h.goto('/?study=1');
await page.screenshot({ path: resolve(SHOTS, 'study-tab.png') });
await page.evaluate(() => { const l = document.querySelector('[data-flow-list]'); l.scrollTop = l.scrollHeight; });
await page.screenshot({ path: resolve(SHOTS, 'study-tab-bottom.png') });
await page.setViewportSize({ width: 320, height: 568 });
await settle(page);
await page.screenshot({ path: resolve(SHOTS, 'study-tab-320.png') });
const tabFit = await page.evaluate(() => {
  const list = document.querySelector('[data-flow-list]').getBoundingClientRect();
  const tabs = [...document.querySelectorAll('.flow-menu__tab')].map((b) => ({ t: b.textContent, over: b.scrollWidth > b.clientWidth + 1, h: Math.round(b.getBoundingClientRect().height) }));
  const small = [...document.querySelectorAll('.flow-menu__start, .flow-menu__jump, .flow-menu__step, .flow-menu__tab, .flow-menu__missing')].map((b) => b.getBoundingClientRect()).filter((b) => b.height < 43.5).length;
  const menu = document.querySelector('#flow-menu').getBoundingClientRect();
  return { tabs, small, scrolls: document.querySelector('[data-flow-list]').scrollHeight > list.height, menuIn: menu.left >= 0 && menu.right <= innerWidth && menu.bottom <= innerHeight };
});
record('layout', '320x568: 4 tabs fit, controls >= 44px high, panel inside the screen', tabFit.tabs.every((t) => !t.over) && tabFit.small === 0 && tabFit.menuIn, JSON.stringify(tabFit));
await page.setViewportSize({ width: 390, height: 844 });

/* ---------- report ---------- */
const w = Math.max(...rows.map((r) => r.key.length), 10);
console.log(`\n${title} — ${n} study keys run through the menu\n`);
console.log(`${'RESULT'.padEnd(7)}${'WHERE'.padEnd(11)}${'KEY'.padEnd(w + 2)}DETAIL`);
for (const r of rows) console.log(`${(r.ok ? 'PASS' : 'FAIL').padEnd(7)}${r.id.padEnd(11)}${r.key.padEnd(w + 2)}${r.ok ? '' : r.detail}`);
console.log(`\nscreenshots: ${SHOTS}/study-tab.png, study-tab-bottom.png, study-tab-320.png`);
console.log(`${rows.length - failures} passed, ${failures} failed.`);
await h.close();
process.exit(failures ? 1 : 0);
