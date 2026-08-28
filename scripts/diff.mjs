/* ============================================================
   Pixel-diff a rendered screen against its Figma export.

   Usage:  npm run diff -- 01-home
           npm run diff -- all

   Renders index.html?screen=<id> in Chromium at 390 CSS px wide with
   deviceScaleFactor 2 (so the shot matches the @2x Figma export),
   screenshots .screen, and compares against ref/<id>.png.

   Writes diff/<id>.png and exits 1 if any screen is over 1.00%.
   ============================================================ */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REF_DIR = resolve(ROOT, 'ref');
const DIFF_DIR = resolve(ROOT, 'diff');
const WIDTH = 390;
const DSF = 2;
const THRESHOLD = 0.2;      // per-pixel sensitivity (0.1 flagged pure AA softness vs Figma's rasteriser — raised per Kevin, gate stays 1%)
const FAIL_OVER = 1.0;      // % mismatch that fails the run

const cfg = JSON.parse(readFileSync(resolve(ROOT, 'scripts/screens.json'), 'utf8'));

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const target = args[0] ?? 'all';
const ids = target === 'all'
  ? Object.keys(cfg.screens)
  : args.filter((a) => a in cfg.screens);

if (!ids.length) {
  console.error(`Unknown screen "${target}". Known ids:\n  ${Object.keys(cfg.screens).join('\n  ')}`);
  process.exit(1);
}
if (!existsSync(DIFF_DIR)) mkdirSync(DIFF_DIR, { recursive: true });

/* ---------- tiny static server (ES modules need http://, not file://) ---------- */
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = resolve(ROOT, '.' + (path === '/' ? '/index.html' : path));
  if (!file.startsWith(ROOT) || !existsSync(file)) {   // no path traversal
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

/* ---------- browser ---------- */
let browser;
try {
  // Greyscale AA + no hinting renders text close to Figma's rasteriser;
  // Chromium's default LCD subpixel text ghosts every glyph edge in diffs.
  browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
} catch (e) {
  console.error(`Could not launch Chromium: ${e.message}\n\nIf the browser is missing, run:  npx playwright install chromium`);
  server.close();
  process.exit(1);
}

const results = [];
const consoleErrors = [];

for (const id of ids) {
  const refPath = resolve(REF_DIR, `${id}.png`);
  if (!existsSync(refPath)) {
    results.push({ id, skipped: 'no ref/' + id + '.png — run: npm run refs' });
    continue;
  }

  const ref = PNG.sync.read(readFileSync(refPath));
  // Ref is @2x, so its CSS height is half.
  const cssHeight = Math.max(1, Math.round(ref.height / DSF));

  const page = await browser.newPage({
    viewport: { width: WIDTH, height: cssHeight },
    deviceScaleFactor: DSF,
  });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${id}: ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`${id}: ${e.message}`));

  await page.goto(`${origin}/index.html?screen=${encodeURIComponent(id)}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);   // let webfont paint settle

  const el = await page.$('.screen');
  if (!el) {
    results.push({ id, skipped: '.screen element not found' });
    await page.close();
    continue;
  }

  const shot = PNG.sync.read(await el.screenshot());
  await page.close();

  /* ---------- compare, padding the shorter image ---------- */
  const w = Math.max(ref.width, shot.width);
  const h = Math.max(ref.height, shot.height);
  const heightDelta = (shot.height - ref.height) / DSF;   // in CSS px
  const widthDelta = (shot.width - ref.width) / DSF;

  const pad = (src) => {
    if (src.width === w && src.height === h) return src;
    const out = new PNG({ width: w, height: h });
    out.data.fill(0);                                     // transparent padding
    PNG.bitblt(src, out, 0, 0, src.width, src.height, 0, 0);
    return out;
  };

  const a = pad(ref);
  const b = pad(shot);
  const out = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(a.data, b.data, out.data, w, h, { threshold: THRESHOLD });
  writeFileSync(resolve(DIFF_DIR, `${id}.png`), PNG.sync.write(out));

  results.push({
    id,
    pct: (diffPixels / (w * h)) * 100,
    diffPixels,
    heightDelta,
    widthDelta,
    refSize: `${ref.width}x${ref.height}`,
    shotSize: `${shot.width}x${shot.height}`,
  });
}

await browser.close();
server.close();

/* ---------- report ---------- */
let worst = 0;
let skipped = 0;

for (const r of results) {
  if (r.skipped) {
    console.log(`${r.id.padEnd(26)} SKIPPED — ${r.skipped}`);
    skipped++;
    continue;
  }
  const flag = r.pct > FAIL_OVER ? '  FAIL' : '';
  console.log(`${r.id.padEnd(26)} ${r.pct.toFixed(2)}% mismatch${flag}`);
  if (r.heightDelta) console.log(`${''.padEnd(26)}   height delta ${r.heightDelta > 0 ? '+' : ''}${r.heightDelta}px CSS (ref ${r.refSize} vs shot ${r.shotSize})`);
  if (r.widthDelta) console.log(`${''.padEnd(26)}   width delta ${r.widthDelta > 0 ? '+' : ''}${r.widthDelta}px CSS`);
  worst = Math.max(worst, r.pct);
}

if (consoleErrors.length) {
  console.log(`\nConsole errors (${consoleErrors.length}):`);
  for (const e of consoleErrors.slice(0, 20)) console.log(`  ${e}`);
}

const compared = results.length - skipped;
console.log(`\n${compared} compared, ${skipped} skipped. Worst: ${worst.toFixed(2)}%. Diffs in diff/.`);

process.exit(compared > 0 && worst > FAIL_OVER ? 1 : 0);
