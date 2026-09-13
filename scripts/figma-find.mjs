/* ============================================================
   figma-find — list Figma TEXT nodes whose characters match a query,
   straight from the REST API (no MCP round-trips). Survey a sync with:

     node scripts/figma-find.mjs <query> [--page user|tailor|components|all]
                                         [--hidden] [--json] [--ids]

   <query> is a case-sensitive substring, or /regex/flags (under Git
   Bash prefix MSYS_NO_PATHCONV=1 so the slashes aren't path-converted).
   Default output, one line per match (the round-12 survey format):
     <nodeId>|<top-level frame>|<parent>|[HIDDEN|]<characters, 80 chars>
   --hidden  also lists nodes with an invisible ancestor (marked HIDDEN)
   --json    prints [{ id, frame, parent, hidden, characters }]
   --ids     prints the matching ids comma-separated (paste-ready)
   Exit 1 on a missing token or an API error; 0 otherwise.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readToken } from './lib/figma-token.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: node scripts/figma-find.mjs <query> [--page user|tailor|components|all] [--hidden] [--json] [--ids]';
const fail = (msg) => { throw new Error(msg); };

async function main() {
  /* ---------- args ---------- */
  const args = process.argv.slice(2);
  const flags = { page: 'user', hidden: false, json: false, ids: false };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--page') flags.page = args[++i];
    else if (a.startsWith('--page=')) flags.page = a.slice(7);
    else if (a === '--hidden' || a === '--json' || a === '--ids') flags[a.slice(2)] = true;
    else if (a.startsWith('--')) fail(`unknown flag ${a}\n${USAGE}`);
    else positional.push(a);
  }
  if (positional.length !== 1) fail(USAGE);
  const [query] = positional;

  const cfg = JSON.parse(readFileSync(resolve(ROOT, 'scripts/screens.json'), 'utf8'));
  const PAGES = { user: cfg.page, tailor: cfg.tailorPage, components: cfg.componentsPage };
  if (!(flags.page in PAGES) && flags.page !== 'all') fail(`--page must be user, tailor, components or all\n${USAGE}`);
  const pageIds = flags.page === 'all' ? Object.values(PAGES) : [PAGES[flags.page]];

  const rx = query.match(/^\/(.+)\/([a-z]*)$/s);
  const re = rx && new RegExp(rx[1], rx[2]);
  const test = re ? (s) => re.test(s) : (s) => s.includes(query);

  /* ---------- fetch (one request for every requested page) ---------- */
  const token = readToken();
  if (!token) fail('FIGMA_TOKEN is not set (env or .env at the repo root) — figma-find needs the Figma API.');
  const res = await fetch(
    `https://api.figma.com/v1/files/${cfg.fileKey}/nodes?ids=${encodeURIComponent(pageIds.join(','))}`,
    { headers: { 'X-Figma-Token': token } },
  ).catch((e) => fail(`Figma API request failed: ${e.message}`));
  if (!res.ok) fail(`Figma API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const doc = await res.json();

  /* ---------- walk ---------- */
  const matches = [];
  function walk(node, frame, parent, hidden) {
    hidden = hidden || node.visible === false;
    if (hidden && !flags.hidden) return;
    if (node.type === 'TEXT') {
      const characters = node.characters ?? '';
      if (test(characters)) matches.push({ id: node.id, frame, parent, hidden, characters });
      return;
    }
    for (const c of node.children ?? []) walk(c, frame, node.name, hidden);
  }
  for (const pageId of pageIds) {
    const page = doc.nodes?.[pageId]?.document;
    if (!page) fail(`page ${pageId} not in API response`);
    for (const top of page.children ?? []) walk(top, top.name, page.name, false);
  }

  /* ---------- print ---------- */
  if (!matches.length) { console.log(`no matches for ${query} on page ${flags.page}`); return; }
  if (flags.json) { console.log(JSON.stringify(matches, null, 2)); return; }
  if (flags.ids) { console.log(matches.map((m) => m.id).join(',')); return; }
  for (const m of matches) {
    const text = m.characters.replace(/\s*\n\s*/g, ' ').slice(0, 80);
    console.log(`${m.id}|${m.frame}|${m.parent}|${m.hidden ? 'HIDDEN|' : ''}${text}`);
  }
  console.error(`${matches.length} match${matches.length === 1 ? '' : 'es'}`);
}

/* No process.exit() after the fetch — on Windows it trips a libuv
   assertion while undici's socket is still closing; exitCode is enough. */
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
