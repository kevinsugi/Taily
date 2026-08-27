/* ============================================================
   Export Figma frames to ref/<screen-id>.png at @2x.

   Usage:  FIGMA_TOKEN=figd_xxx npm run refs
           npm run refs -- 01-home 09-bookings     (subset)

   The token can also live in a .env file at the repo root as
   FIGMA_TOKEN=figd_xxx  (.env is gitignored).
   ============================================================ */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REF_DIR = resolve(ROOT, 'ref');
const SCALE = 2;

/* ---------- token ---------- */

/**
 * Decode an env file regardless of encoding.
 * PowerShell's `>` and Out-File default to UTF-16LE on Windows, which reads
 * as mojibake if you assume UTF-8 — so honour the BOM.
 */
function decodeEnvFile(path) {
  const buf = readFileSync(path);
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  if (buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.subarray(2));
    swapped.swap16();
    return swapped.toString('utf16le');
  }
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString('utf8');
  return buf.toString('utf8');
}

/** Any *.env at the repo root, .env first. All are gitignored. */
function envCandidates() {
  const files = readdirSync(ROOT).filter((f) => f === '.env' || f.toLowerCase().endsWith('.env'));
  return files.sort((a, b) => (a === '.env' ? -1 : b === '.env' ? 1 : a.localeCompare(b)));
}

function readToken() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN.trim();

  for (const name of envCandidates()) {
    const text = decodeEnvFile(resolve(ROOT, name));
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.replace(/^﻿/, '').trim();
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^FIGMA_TOKEN\s*=\s*(.+?)$/i);
      if (m) return m[1].replace(/^["']|["']$/g, '').trim();
      // a file holding nothing but the bare token
      if (/^figd_[A-Za-z0-9_-]+$/.test(line)) return line;
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
