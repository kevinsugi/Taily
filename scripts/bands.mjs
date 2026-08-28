/* ============================================================
   Where does a screen's mismatch live?
   Usage: node scripts/bands.mjs <screen-id> [bandHeightDevicePx=100]
   Renders like diff.mjs, then reports mismatch per horizontal band
   (device px), worst first, and writes diff/_bands-<id>.png with a
   side-stack of the worst band (ref above, built below).
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];
const BAND = Number(process.argv[3] ?? 100);
const cfg = JSON.parse(readFileSync(resolve(ROOT, 'scripts/screens.json'), 'utf8'));
if (!id || !(id in cfg.screens)) { console.error('usage: node scripts/bands.mjs <screen-id> [bandPx]'); process.exit(1); }

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = resolve(ROOT, '.' + (p === '/' ? '/index.html' : p));
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const ref = PNG.sync.read(readFileSync(resolve(ROOT, `ref/${id}.png`)));
const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 390, height: Math.round(ref.height / 2) }, deviceScaleFactor: 2 });
await page.goto(`${origin}/index.html?screen=${id}`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);
const shot = PNG.sync.read(await (await page.$('.screen')).screenshot());
await browser.close(); server.close();

const w = Math.min(ref.width, shot.width);
const H = Math.min(ref.height, shot.height);
const rows = [];
for (let y = 0; y < H; y += BAND) {
  const h = Math.min(BAND, H - y);
  const a = new PNG({ width: w, height: h }), b = new PNG({ width: w, height: h });
  PNG.bitblt(ref, a, 0, y, w, h, 0, 0); PNG.bitblt(shot, b, 0, y, w, h, 0, 0);
  const out = new PNG({ width: w, height: h });
  const n = pixelmatch(a.data, b.data, out.data, w, h, { threshold: 0.2 });
  rows.push({ y, h, n, pct: n / (w * h) * 100 });
}
rows.sort((a, b) => b.n - a.n);
const totalPx = ref.width * ref.height;
console.log(`bands of ${BAND} device px, worst first (screen share):`);
for (const r of rows.slice(0, 12)) {
  console.log(`  y ${String(r.y).padStart(5)}-${String(r.y + r.h).padEnd(5)} (css ${Math.round(r.y/2)}-${Math.round((r.y+r.h)/2)})  ${r.pct.toFixed(2).padStart(6)}%  ${(r.n / totalPx * 100).toFixed(3)}% of screen`);
}
const total = rows.reduce((s, r) => s + r.n, 0);
console.log(`sum ${(total / totalPx * 100).toFixed(2)}% of screen (excl. size-delta padding)`);

// side-stack of the worst band ±context
const wb = rows[0];
const y0 = Math.max(0, wb.y - 40), hh = Math.min(H - y0, wb.h + 80);
const stack = new PNG({ width: w, height: hh * 2 + 8 });
for (let i = 0; i < stack.data.length; i += 4) { stack.data[i] = 255; stack.data[i+1] = 0; stack.data[i+2] = 255; stack.data[i+3] = 255; }
PNG.bitblt(ref, stack, 0, y0, w, hh, 0, 0);
PNG.bitblt(shot, stack, 0, y0, w, hh, 0, hh + 8);
writeFileSync(resolve(ROOT, `diff/_bands-${id}.png`), PNG.sync.write(stack));
console.log(`worst-band stack (ref top / built bottom): diff/_bands-${id}.png  [y ${y0}..${y0+hh}]`);
