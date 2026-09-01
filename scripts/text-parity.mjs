/* ============================================================
   Text parity — every visible Figma text node must appear in the
   rendered screen (Phase R / npm run check step 2).

   One REST call pulls every screen's node subtree; each subtree is
   walked in document order collecting visible TEXT node strings.
   Each screen is then rendered (same server/browser setup as
   diff.mjs) and its text harvested as .screen innerText plus input
   values/placeholders (04b's card field and M1's composer are real
   inputs whose placeholder copy is Figma text).

   Comparison is by normalised occurrence count, not strict sequence:
   Figma frames put the absolutely-positioned chrome (Status Bar /
   Top Nav) LAST in document order while the DOM renders it first, so
   sequence equality would fail structurally on every screen. Each
   Figma string must occur in the screen's text at least as many
   times as it occurs in the frame.

   ALLOW lists the documented deliberate divergences (CLAUDE.md
   "Known Figma inconsistencies") — Figma strings the build
   intentionally renders differently.

   Usage: FIGMA_TOKEN=… node scripts/text-parity.mjs [ids…]
   Exit 1 if any screen is missing frame text.
   ============================================================ */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- deliberate divergences (see CLAUDE.md) ---------- */
// 02's fee fiction is stale: the frame CTA says $20 where the build
// computes $24 — on 02 itself and on every sheet whose backdrop is 02.
const STALE_DEPOSIT = 'Request Tailor · $20 Deposit (10%)';
const ALLOW = {
  '02-appointment-details': [STALE_DEPOSIT],
  '02a-date-time-sheet': [STALE_DEPOSIT],
  '02b-address-sheet': [STALE_DEPOSIT],
  '04a-payment-sheet': [STALE_DEPOSIT],
  '04b-add-card-sheet': [STALE_DEPOSIT],
};

/* ---------- token (same conventions as export-refs.mjs) ---------- */
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

function readToken() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN.trim();
  const files = readdirSync(ROOT).filter((f) => f === '.env' || f.toLowerCase().endsWith('.env'))
    .sort((a, b) => (a === '.env' ? -1 : b === '.env' ? 1 : a.localeCompare(b)));
  for (const name of files) {
    const text = decodeEnvFile(resolve(ROOT, name));
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.replace(/^﻿/, '').trim();
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^FIGMA_TOKEN\s*=\s*(.+?)$/i);
      if (m) return m[1].replace(/^["']|["']$/g, '').trim();
      if (/^figd_[A-Za-z0-9_-]+$/.test(line)) return line;
    }
  }
  return null;
}

const token = readToken();
if (!token) {
  console.error('FIGMA_TOKEN is not set (env or .env at the repo root) — text parity needs the Figma API.');
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(resolve(ROOT, 'scripts/screens.json'), 'utf8'));
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const entries = Object.entries(cfg.screens).filter(([id]) => !wanted.length || wanted.includes(id));

/* ---------- Figma text ---------- */
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function collectText(node, out) {
  if (node.visible === false) return;
  if (node.type === 'TEXT' && node.characters) {
    const t = norm(node.characters);
    if (t) out.push(t);
  }
  for (const c of node.children ?? []) collectText(c, out);
}

const ids = entries.map(([, nodeId]) => nodeId).join(',');
const res = await fetch(
  `https://api.figma.com/v1/files/${cfg.fileKey}/nodes?ids=${encodeURIComponent(ids)}`,
  { headers: { 'X-Figma-Token': token } },
);
if (!res.ok) {
  console.error(`Figma API ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const doc = await res.json();

const figmaText = {};
for (const [id, nodeId] of entries) {
  const tree = doc.nodes?.[nodeId]?.document;
  if (!tree) {
    console.error(`${id}: node ${nodeId} not in API response`);
    process.exit(1);
  }
  const out = [];
  collectText(tree, out);
  figmaText[id] = out;
}

/* ---------- rendered text (server + browser like diff.mjs) ---------- */
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};
const server = createServer((req, res2) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = resolve(ROOT, '.' + (p === '/' ? '/index.html' : p));
  if (!f.startsWith(ROOT) || !existsSync(f)) { res2.writeHead(404).end(); return; }
  res2.writeHead(200, { 'Content-Type': MIME[extname(f)] ?? 'application/octet-stream' });
  res2.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

let failures = 0;
for (const [id] of entries) {
  await page.goto(`${origin}/index.html?screen=${encodeURIComponent(id)}`, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  const domText = norm(await page.evaluate(() => {
    const scr = document.querySelector('.screen');
    const inputs = [...scr.querySelectorAll('input')].map((i) => `${i.value} ${i.placeholder}`).join(' ');
    return `${scr.innerText} ${inputs}`;
  }));

  const count = (hay, needle) => {
    let n = 0;
    for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) n++;
    return n;
  };

  const want = new Map();
  for (const t of figmaText[id]) {
    if ((ALLOW[id] ?? []).includes(t)) continue;
    want.set(t, (want.get(t) ?? 0) + 1);
  }
  const missing = [];
  for (const [t, n] of want) {
    const have = count(domText, t);
    if (have < n) missing.push(`"${t}" (frame ×${n}, rendered ×${have})`);
  }

  if (missing.length) {
    failures++;
    console.log(`FAIL  ${id}`);
    for (const m of missing.slice(0, 8)) console.log(`        missing ${m}`);
    if (missing.length > 8) console.log(`        …and ${missing.length - 8} more`);
  } else {
    console.log(`PASS  ${id.padEnd(26)} ${figmaText[id].length} frame text nodes present`);
  }
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} screen(s) missing frame text` : '\nText parity: all screens carry their frame text.');
process.exit(failures ? 1 : 0);
