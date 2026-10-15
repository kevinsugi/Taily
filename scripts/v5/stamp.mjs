/* ============================================================
   npm run stamp — content-hash cache-busting (D-246).

   GitHub Pages serves every file with max-age=600, so after a push a
   browser can mix cached old files with new ones. This script makes
   every deploy load as ONE consistent set:
     1. every local <link rel="stylesheet"> href in index.html /
        components.html becomes  <path>?v=<sha1(file)[0..10]>
     2. an import map (between <!-- stamp:importmap --> markers, before
        any modulepreload / module script) maps EVERY runtime .js under
        js/ (js/v4 and js/screens/v4 are archived, never loaded: skipped)
        from "./js/x.js" to "./js/x.js?v=<hash>". Keys are document-
        relative so they match the resolved URL of static AND dynamic
        imports.
     3. local <link rel="modulepreload"> hrefs and <script type="module"
        src> are stamped to the same value as the map.
   Idempotent + deterministic (sorted paths, content hashes only).

   node scripts/v5/stamp.mjs            rewrite the HTML files
   node scripts/v5/stamp.mjs --check    exit 1 if any stamp is stale
   ============================================================ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PAGES = ['index.html', 'components.html'];
const SKIP_DIRS = new Set(['v4']);                 // js/v4, js/screens/v4: archived, never loaded
const SKIP_FILES = new Set([]);
const OPEN = '<!-- stamp:importmap -->';
const CLOSE = '<!-- /stamp:importmap -->';

const hashOf = (file) => createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 10);
const isLocal = (u) => u && !/^([a-z][a-z0-9+.-]*:|\/\/|#|data:)/i.test(u);
const bare = (u) => u.replace(/[?#].*$/, '');

function walkJs(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walkJs(join(dir, e.name), out); }
    else if (e.name.endsWith('.js') && !SKIP_FILES.has(e.name)) out.push(join(dir, e.name));
  }
  return out;
}

const jsFiles = walkJs(resolve(ROOT, 'js')).map((f) => relative(ROOT, f).split(sep).join('/'));
const jsHash = new Map(jsFiles.map((f) => [f, hashOf(resolve(ROOT, f))]));

function importMap() {
  const imports = {};
  for (const f of [...jsFiles].sort()) imports[`./${f}`] = `./${f}?v=${jsHash.get(f)}`;
  return `<script type="importmap">${JSON.stringify({ imports }, null, 1).replace(/\n\s*/g, '\n')}</script>`;
}

/** Stamp `u` (an href/src as written in HTML); unknown / remote refs are returned untouched. */
function stampUrl(u, kind) {
  if (!isLocal(u)) return u;
  const path = bare(u).replace(/^\.\//, '');
  const file = resolve(ROOT, path);
  if (!existsSync(file)) return u;
  if (kind === 'js' && !jsHash.has(path)) return u;
  return `${path}?v=${kind === 'js' ? jsHash.get(path) : hashOf(file)}`;
}

function stampHtml(html) {
  // 1. stylesheets
  html = html.replace(/<link\b[^>]*>/g, (tag) => {
    if (/\brel=["']stylesheet["']/.test(tag)) return tag.replace(/\bhref=(["'])([^"']*)\1/, (m, q, u) => `href=${q}${stampUrl(u, 'css')}${q}`);
    if (/\brel=["']modulepreload["']/.test(tag)) return tag.replace(/\bhref=(["'])([^"']*)\1/, (m, q, u) => `href=${q}${stampUrl(u, 'js')}${q}`);
    return tag;
  });
  // 3. <script type="module" src="…">
  html = html.replace(/<script\b[^>]*\btype=["']module["'][^>]*>/g, (tag) =>
    tag.replace(/\bsrc=(["'])([^"']*)\1/, (m, q, u) => `src=${q}${stampUrl(u, 'js')}${q}`));
  // 2. import map block (create the markers on first run)
  const block = `${OPEN}\n${importMap()}\n${CLOSE}`;
  const re = new RegExp(`${OPEN.replace(/[/*]/g, '\\$&')}[\\s\\S]*?${CLOSE.replace(/[/*]/g, '\\$&')}`);
  if (re.test(html)) return html.replace(re, () => block);
  const anchor = html.search(/<link\b[^>]*rel=["']modulepreload["']|<script\b[^>]*type=["']module["']/);
  if (anchor < 0) return html;                       // page loads no modules
  // keep a preceding HTML comment (e.g. "D-212: …") attached to its modulepreload
  const before = html.slice(0, anchor);
  const cm = before.match(/<!--(?:(?!-->)[\s\S])*-->\s*$/);
  const at = cm ? anchor - cm[0].length : anchor;
  return `${html.slice(0, at)}${block}\n\n${html.slice(at)}`;
}

const check = process.argv.includes('--check');
let stale = 0;
for (const page of PAGES) {
  const file = resolve(ROOT, page);
  if (!existsSync(file)) continue;
  const cur = readFileSync(file, 'utf8');
  const next = stampHtml(cur);
  if (next === cur) { console.log(`${check ? 'PASS' : 'ok  '} ${page} stamps are current`); continue; }
  stale++;
  if (check) {
    console.log(`FAIL ${page} has stale or missing cache-busting stamps — run \`npm run stamp\``);
  } else {
    writeFileSync(file, next);
    console.log(`stamped ${page}`);
  }
}
if (check && stale) process.exit(1);
