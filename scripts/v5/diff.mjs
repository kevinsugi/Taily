/* ============================================================
   Visual regression for v5 — the screens baseline THEMSELVES.

   Every flow entry with `visual !== false` is run, fonts awaited,
   and `#screen` (full height, 390 CSS px wide, dsf 2) is compared
   with ref/v5/<key>.png. There is no Figma export to chase: the
   first build writes the baseline, afterwards the gate is
   <= 0.10 % AND <= 2000 mismatching pixels (pixelmatch threshold 0.1;
   the pixel cap keeps a tall page like sys-components honest).

   node scripts/v5/diff.mjs                       compare all
   node scripts/v5/diff.mjs c-job c-booking*      compare some (key | prefix*)
   node scripts/v5/diff.mjs --accept-new          also write MISSING baselines (first-build rule)
   node scripts/v5/diff.mjs --accept <key|prefix*|all> ...
                                                  re-baseline on purpose (list the keys in the commit body):
                                                  writes ref/v5/<key>.png and records the mismatch it
                                                  replaced in ref/v5/mismatch.json

   No baseline -> FAIL "no baseline" (unless --accept-new / --accept).
   A baseline with no flow entry -> FAIL "stale baseline".
   Diff images go to diff/v5/<key>.png. An empty FLOWS list is reported.
   ============================================================ */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { open, loadFlows, reporter, settle, DSF } from './lib/browser.mjs';
import { ROOT } from './lib/server.mjs';

const THRESHOLD = 0.1;     // per-pixel sensitivity
const GATE = 0.10;         // % of mismatching pixels allowed ...
const MAX_PX = 2000;       // ... AND at most this many in absolute terms (a tall page like sys-components is 21.6M px: 0.10 % alone would hide a whole ~73x73 css-px component)
const REF_DIR = resolve(ROOT, 'ref/v5');
const DIFF_DIR = resolve(ROOT, 'diff/v5');
const LOG = resolve(REF_DIR, 'mismatch.json');

const argv = process.argv.slice(2);
const ACCEPT = argv.includes('--accept');
const ACCEPT_NEW = argv.includes('--accept-new');
const patterns = argv.filter((a) => !a.startsWith('-'));
const want = (key) => !patterns.length || patterns.includes('all') || patterns.some((p) => (p.endsWith('*') ? key.startsWith(p.slice(0, -1)) : key === p));

if (ACCEPT && !patterns.length) {
  console.error('FAIL  --accept needs the keys to re-baseline on purpose: <key|prefix*|all> ...');
  process.exit(1);
}
mkdirSync(REF_DIR, { recursive: true });
mkdirSync(DIFF_DIR, { recursive: true });

const h = await open();
const { page } = h;
const R = reporter();
const { check } = R;
const { legacy, flows: all } = await loadFlows(page);
h.clear();

const baselines = existsSync(REF_DIR) ? readdirSync(REF_DIR).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)) : [];
const visual = all.filter((f) => f.visual);

/* M0 registered entries: a missing runFlow or an empty registry fails (--allow-empty for a scratch run before any screen exists) */
const ALLOW_EMPTY = argv.includes('--allow-empty');
if (legacy && !ALLOW_EMPTY) check('visual: window.Taily.runFlow exists (the page is the v5 app)', false, 'runFlow is missing — js/app.js no longer exposes it, or the page is still v4');
if (!legacy && !visual.length && !ALLOW_EMPTY) check('visual: at least one entry has a baseline to compare', false, 'ALL_FLOWS is empty or every entry has visual: false');
if (!visual.length) R.note('visual: 0 entries with visual !== false — nothing to compare.');

/* ---------- stale baselines ---------- */
if (!patterns.length) {
  const stale = baselines.filter((k) => !visual.some((f) => f.key === k));
  check('visual: no stale baselines', !stale.length, `no entry for: ${stale.join(', ')}`);
}

const log = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')) : {};
const accepted = [];

for (const f of visual.filter((e) => want(e.key))) {
  h.clear();
  const ran = await page.evaluate((k) => window.Taily.runFlow(k), f.key);
  await settle(page);
  if (ran === false) { check(f.key, false, 'runFlow returned false'); continue; }
  const el = await page.$('#screen');
  const shot = PNG.sync.read(await el.screenshot({ animations: 'disabled', caret: 'hide' }));
  const refPath = resolve(REF_DIR, `${f.key}.png`);
  const save = () => writeFileSync(refPath, PNG.sync.write(shot));

  if (!existsSync(refPath)) {
    if (ACCEPT || ACCEPT_NEW) {
      save(); accepted.push(f.key); log[f.key] = null;
      check(`${f.key} (new baseline)`, true);
    } else check(f.key, false, 'no baseline — run with --accept-new (first build) or --accept <key>');
    continue;
  }

  const ref = PNG.sync.read(readFileSync(refPath));
  const w = Math.max(ref.width, shot.width);
  const hh = Math.max(ref.height, shot.height);
  const pad = (src) => {
    if (src.width === w && src.height === hh) return src;
    const out = new PNG({ width: w, height: hh });
    out.data.fill(0);                                     // transparent padding
    PNG.bitblt(src, out, 0, 0, src.width, src.height, 0, 0);
    return out;
  };
  const diffImg = new PNG({ width: w, height: hh });
  const px = pixelmatch(pad(ref).data, pad(shot).data, diffImg.data, w, hh, { threshold: THRESHOLD });
  const pct = (px / (w * hh)) * 100;
  const dh = (shot.height - ref.height) / DSF;
  const note = dh ? `  height ${dh > 0 ? '+' : ''}${dh}px` : '';
  if (ACCEPT) {
    save(); accepted.push(f.key); log[f.key] = Number(pct.toFixed(3));
    check(`${f.key} (re-baselined, replaced ${pct.toFixed(3)}%)`, true);
    continue;
  }
  const ok = pct <= GATE + 1e-9 && px <= MAX_PX;
  if (!ok) writeFileSync(resolve(DIFF_DIR, `${f.key}.png`), PNG.sync.write(diffImg));
  else if (existsSync(resolve(DIFF_DIR, `${f.key}.png`))) unlinkSync(resolve(DIFF_DIR, `${f.key}.png`));
  check(`${f.key} (${pct.toFixed(3)}%, ${px} px)`, ok, `${pct.toFixed(3)}% / ${px} px > ${GATE}% / ${MAX_PX} px — diff/v5/${f.key}.png${note}`);
}

if (h.errors.length) check('visual: no console errors', false, h.errors.slice(0, 3).join(' | '));
if (accepted.length) {
  writeFileSync(LOG, JSON.stringify(Object.fromEntries(Object.entries(log).sort()), null, 2) + '\n');
  console.log(`\nBaselines written (${accepted.length}): ${accepted.join(' ')}`);
}
console.log(`\n${visual.length} visual entries, ${R.passes} passed, ${R.failures} failed (gate ${GATE}% and ${MAX_PX} px).`);
await h.close();
process.exit(R.failures ? 1 : 0);
