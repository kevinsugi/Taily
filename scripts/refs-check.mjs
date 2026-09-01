/* ============================================================
   npm run refs:check — the design-side tripwire (Phase R).

   For each ref/<id>.png, decodes the committed version
   (git show HEAD:ref/<id>.png) and the working-tree version and
   pixel-compares them — NEVER bytes; Figma's PNG encoder is not
   byte-stable, so byte diffs lie in both directions. Prints only
   the screens that visually differ (or are new/removed) and by how
   much. After `npm run refs`, this list must be exactly the screens
   the current round meant to touch.

   Exit 1 if anything differs, so it works as a guard.
   ============================================================ */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(resolve(ROOT, 'scripts/screens.json'), 'utf8'));

let changed = 0;
for (const id of Object.keys(cfg.screens)) {
  const rel = `ref/${id}.png`;
  const workPath = resolve(ROOT, rel);
  const head = spawnSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
  const inHead = head.status === 0;
  const inTree = existsSync(workPath);

  if (!inHead && !inTree) continue;
  if (!inHead || !inTree) {
    changed++;
    console.log(`${id.padEnd(26)} ${inHead ? 'REMOVED from working tree' : 'NEW (not in HEAD)'}`);
    continue;
  }

  const a = PNG.sync.read(head.stdout);
  const b = PNG.sync.read(readFileSync(workPath));
  const w = Math.max(a.width, b.width);
  const h = Math.max(a.height, b.height);
  const pad = (src) => {
    if (src.width === w && src.height === h) return src;
    const out = new PNG({ width: w, height: h });
    out.data.fill(0);
    PNG.bitblt(src, out, 0, 0, src.width, src.height, 0, 0);
    return out;
  };
  const diffPixels = pixelmatch(pad(a).data, pad(b).data, null, w, h, { threshold: 0.05 });
  if (diffPixels > 0) {
    changed++;
    const sizeNote = a.width !== b.width || a.height !== b.height
      ? `  (${a.width}x${a.height} → ${b.width}x${b.height})` : '';
    console.log(`${id.padEnd(26)} ${((diffPixels / (w * h)) * 100).toFixed(2)}% changed vs HEAD${sizeNote}`);
  }
}

console.log(changed
  ? `\n${changed} ref(s) visually differ from HEAD — expected only for this round's screens.`
  : 'refs match HEAD — no visual changes.');
process.exit(changed ? 1 : 0);
