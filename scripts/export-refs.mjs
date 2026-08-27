/* ============================================================
   Export Figma frames to ref/<screen-id>.png at @2x.

   Usage:  FIGMA_TOKEN=figd_xxx npm run refs
           npm run refs -- 01-home 09-bookings     (subset)

   The token can also live in a .env file at the repo root as
   FIGMA_TOKEN=figd_xxx  (.env is gitignored).
   ============================================================ */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REF_DIR = resolve(ROOT, 'ref');
const SCALE = 2;

/* ---------- token ---------- */
function readToken() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN.trim();
  const envFile = resolve(ROOT, '.env');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*FIGMA_TOKEN\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

const token = readToken();
if (!token) {
  console.error(`FIGMA_TOKEN is not set.

Set it for one run:
  FIGMA_TOKEN=figd_xxx npm run refs

or create a .env file at the repo root (gitignored):
  FIGMA_TOKEN=figd_xxx

Create a token at https://www.figma.com/developers/api#access-tokens
(a personal access token with file read scope).`);
  process.exit(1);
}

/* ---------- screen map ---------- */
const cfg = JSON.parse(readFileSync(resolve(ROOT, 'scripts/screens.json'), 'utf8'));
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const entries = Object.entries(cfg.screens).filter(([id]) => !wanted.length || wanted.includes(id));

if (!entries.length) {
  console.error(`No matching screens. Known ids:\n  ${Object.keys(cfg.screens).join('\n  ')}`);
  process.exit(1);
}

if (!existsSync(REF_DIR)) mkdirSync(REF_DIR, { recursive: true });

/* ---------- ask Figma for render URLs ---------- */
const ids = entries.map(([, node]) => node).join(',');
const api = `https://api.figma.com/v1/images/${cfg.fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=${SCALE}`;

console.log(`Requesting ${entries.length} frame${entries.length === 1 ? '' : 's'} at @${SCALE}x…`);

const res = await fetch(api, { headers: { 'X-Figma-Token': token } });
if (!res.ok) {
  const body = await res.text().catch(() => '');
  console.error(`Figma API ${res.status} ${res.statusText}\n${body.slice(0, 500)}`);
  if (res.status === 403) console.error('\n403 usually means the token is wrong, expired, or lacks access to this file.');
  process.exit(1);
}

const json = await res.json();
if (json.err) {
  console.error(`Figma API error: ${json.err}`);
  process.exit(1);
}

/* ---------- download ---------- */
let ok = 0;
const failed = [];

for (const [id, node] of entries) {
  const url = json.images[node];
  if (!url) {
    failed.push(`${id} (${node}): no render URL returned`);
    continue;
  }
  try {
    const img = await fetch(url);
    if (!img.ok) throw new Error(`${img.status} ${img.statusText}`);
    const buf = Buffer.from(await img.arrayBuffer());
    const out = resolve(REF_DIR, `${id}.png`);
    writeFileSync(out, buf);
    // PNG dimensions live at bytes 16..24 of the IHDR chunk.
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    console.log(`  ${id.padEnd(26)} ${String(w).padStart(4)}x${String(h).padStart(4)}  ${(buf.length / 1024).toFixed(0)} KB`);
    if (w !== 390 * SCALE) console.warn(`    ! expected width ${390 * SCALE}, got ${w}`);
    ok++;
  } catch (e) {
    failed.push(`${id} (${node}): ${e.message}`);
  }
}

console.log(`\n${ok}/${entries.length} exported to ref/`);
if (failed.length) {
  console.error('Failed:\n  ' + failed.join('\n  '));
  process.exit(1);
}
