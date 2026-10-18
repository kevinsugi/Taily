/* ============================================================
   Chromium for the v5 harness — one config, every script.
   Viewport 390 x 844, deviceScaleFactor 2, reduced motion, the app
   opened on /?test=1 (instant latency, transitions off). Collects
   page errors, console errors and `flow "…"` warnings.
   ============================================================ */
import { chromium } from 'playwright';
import { startServer } from './server.mjs';

export const VIEWPORT = { width: 390, height: 844 };
export const DSF = 2;
export const MIN_TARGET = 44;

/** The ids a flow entry's persona must land on, from its screen id. */
export const personaOf = (entry) =>
  entry.persona ?? (/^c-/.test(entry.screen) ? 'customer' : /^(t|to)-/.test(entry.screen) ? 'tailor' : /^a-/.test(entry.screen) ? 'admin' : null);   // pre-MVP A2: a- = the admin

export async function open({ path = '/?test=1' } = {}) {
  const server = await startServer();
  let browser;
  try {
    // Greyscale AA + no hinting keeps screenshots stable between runs.
    browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
  } catch (e) {
    await server.close();
    throw new Error(`Could not launch Chromium: ${e.message}\n  If the browser is missing, run:  npx playwright install chromium`);
  }
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DSF, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const warnings = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    if (m.type() === 'warning' && /flow "/.test(m.text())) warnings.push(m.text());
  });
  const goto = async (p = path) => {
    await page.goto(`${server.origin}${p}`, { waitUntil: 'load' });
    /* boot() imports the screens after `load`; Taily.ready resolves once the first screen has painted */
    await page.evaluate(() => window.Taily?.ready);
    await settle(page);
  };
  await goto(path);
  return {
    page, server, errors, warnings, goto,
    origin: server.origin,
    clear() { errors.length = 0; warnings.length = 0; },
    async close() { await browser.close(); await server.close(); },
  };
}

/** Fonts loaded + two frames painted. */
export async function settle(page) {
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
}

/**
 * The flow registry as the app exposes it: `window.Taily.flows` (the
 * ALL_FLOWS array from js/flows.js). Returns { flows, legacy } — `legacy`
 * is true while the page is still the v4 app (no Taily.runFlow), in
 * which case there are no v5 flows to run yet.
 */
export async function loadFlows(page) {
  return page.evaluate(async () => {
    const T = window.Taily;
    const legacy = typeof T?.runFlow !== 'function';
    if (legacy) return { legacy, flows: [] };
    let list = Array.isArray(T?.flows) ? T.flows : null;
    if (!list) {
      try {
        const m = await import('/js/flows.js');
        list = Array.isArray(m.FLOWS) ? m.FLOWS : Array.isArray(m.ALL_FLOWS) ? m.ALL_FLOWS : [];
      } catch (e) { list = []; }
    }
    const pick = ({ key, screen, persona, group, title, note, click, expect, visual }) =>
      ({ key, screen, persona: persona ?? null, group, title, note, click: click ?? [], expect: expect ?? null, visual: visual !== false });
    return { legacy, flows: list.map(pick) };
  });
}

/** `PASS` / `FAIL` reporter shared by the scripts. */
export function reporter() {
  const r = { passes: 0, failures: 0 };
  r.check = (desc, ok, detail = '') => {
    if (ok) r.passes++; else r.failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc.padEnd(58)} ${ok ? '' : detail}`.trimEnd());
    return ok;
  };
  r.note = (msg) => console.log(`NOTE  ${msg}`);
  return r;
}
