/* ============================================================
   Static hygiene — no browser. Fails on:
     1. literal hex colours / px font-sizes in css/ outside
        tokens.css + base.css (v4 allowlist: #E2DCD1)
     2. v5 CSS (components-v5.css, css/screens/*.css): font-size only
        from the scale tokens --size-10|12|16|24|28|32|36
     3. rate literals in js/ outside js/money-config.js
        (0.10 / .1 / 10% / 24% ...) — rates live in one file
     4. `%` in money copy: a fee / deposit / refund / payout / balance /
        courier / total string with a percentage in it (money copy is
        dollars, always)
     5. Date.now() / argument-less new Date() in js/screens/ and
        js/components.js — time comes from the demo clock
     6. a screen file importing another screen file
   Skips js/v4/, js/screens/v4/, css/v4/, js/garment-icons.js,
   js/icons.js (SVG matrices). Prints PASS/FAIL per rule, offenders
   with file:line. Exit 1 on any offender.
   ============================================================ */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, relative, dirname, join } from 'node:path';
import { ROOT } from './lib/server.mjs';

const rel = (p) => relative(ROOT, p).split('\\').join('/');
const exists = (p) => existsSync(resolve(ROOT, p));
const list = (dir, ext) => {
  const d = resolve(ROOT, dir);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((f) => f.endsWith(ext) && statSync(join(d, f)).isFile()).map((f) => join(d, f));
};
const lines = (file) => readFileSync(file, 'utf8').split('\n');

/* strip comments (block spans per line + trailing //), keep strings */
function stripComments(src) {
  let inBlock = false;
  return src.map((raw) => {
    let s = raw;
    if (inBlock) {
      const end = s.indexOf('*/');
      if (end < 0) return '';
      s = s.slice(end + 2); inBlock = false;
    }
    s = s.replace(/\/\*.*?\*\//g, '');
    const open = s.indexOf('/*');
    if (open >= 0) { s = s.slice(0, open); inBlock = true; }
    s = s.replace(/(^|[^:'"`\\])\/\/.*$/, '$1');
    return s;
  });
}

const results = [];
function rule(name, offenders, note = '') {
  results.push({ name, offenders, note });
}

/* ---------- CSS ---------- */
const ALLOWED_LITERALS = ['#E2DCD1'];
const cssFiles = [...list('css', '.css'), ...list('css/screens', '.css')]
  .filter((f) => !/\/(tokens|base)\.css$/.test(f));
const V5_CSS = (f) => /css\/components-v5\.css$/.test(f) || /css\/screens\/[^/]+\.css$/.test(f);

const hexOff = [];
const sizeOff = [];
for (const f of cssFiles) {
  stripComments(lines(f)).forEach((code, i) => {
    for (const hex of code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
      if (!ALLOWED_LITERALS.some((a) => a.toUpperCase() === hex.toUpperCase())) hexOff.push(`${rel(f)}:${i + 1}  literal colour ${hex}`);
    }
    if (/font-size:\s*[0-9.]+(px|rem|em)/.test(code)) hexOff.push(`${rel(f)}:${i + 1}  literal font-size`);
    if (V5_CSS(f)) {
      const m = code.match(/font-size:\s*([^;}]+)/);
      if (m && !/^(var\(--size-(10|12|16|24|28|32|36)\)|inherit|unset|initial)\s*(!important)?$/.test(m[1].trim())) {
        sizeOff.push(`${rel(f)}:${i + 1}  font-size ${m[1].trim()} (use --size-10|12|16|24|28|32|36)`);
      }
    }
  });
}
rule('css: no literal hex / px font-size outside tokens.css + base.css', hexOff);
rule('css (v5): font-size only from the scale tokens', sizeOff);

/* ---------- JS ---------- */
const walk = (dir) => {
  const d = resolve(ROOT, dir);
  if (!existsSync(d)) return [];
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = join(d, e.name);
    if (e.isDirectory()) return e.name === 'v4' ? [] : walk(rel(p));
    return e.name.endsWith('.js') ? [p] : [];
  });
};
const SKIP_JS = /js\/(garment-icons|icons)\.js$/;
const jsFiles = walk('js').filter((f) => !SKIP_JS.test(rel(f)));
const code = new Map(jsFiles.map((f) => [f, stripComments(lines(f))]));

const rateOff = [];
const moneyOff = [];
const MONEY_PROSE = /(fee|deposit|refund|payout|balance|courier|total)[^.\n]{0,40}\d\s?%/i;
const RATE = /(?<![\w.])0?\.10?(?!\d)|\b(10|24)\s?%/;
for (const [f, src] of code) {
  const isCfg = /js\/money-config\.js$/.test(rel(f));
  src.forEach((l, i) => {
    if (!isCfg && RATE.test(l)) rateOff.push(`${rel(f)}:${i + 1}  rate literal  ${l.trim().slice(0, 80)}`);
    if (MONEY_PROSE.test(l)) moneyOff.push(`${rel(f)}:${i + 1}  % in money copy  ${l.trim().slice(0, 80)}`);
  });
}
rule('js: no rate literals outside js/money-config.js', rateOff);
rule('js: no % in money copy (dollar amounts only)', moneyOff);

const dateOff = [];
for (const [f, src] of code) {
  const r = rel(f);
  if (!(r.startsWith('js/screens/') || r === 'js/components.js')) continue;
  src.forEach((l, i) => {
    if (/Date\.now\s*\(/.test(l) || /new Date\(\s*\)/.test(l)) dateOff.push(`${r}:${i + 1}  wall-clock time — use the demo clock`);
  });
}
rule('js: no Date.now() / new Date() in screens + components', dateOff);

const importOff = [];
for (const [f, src] of code) {
  const r = rel(f);
  if (!r.startsWith('js/screens/')) continue;
  src.forEach((l, i) => {
    for (const m of l.matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)) {
      if (!m[1].startsWith('.')) continue;
      const target = rel(resolve(dirname(f), m[1]));
      if (target.startsWith('js/screens/') && target !== r && !target.startsWith('js/screens/v4/')) {
        importOff.push(`${r}:${i + 1}  imports another screen (${m[1]})`);
      }
    }
  });
}
rule('js: a screen file imports no other screen file', importOff);

/* ---------- report ---------- */
let failed = 0;
for (const r of results) {
  const ok = !r.offenders.length;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.name}`);
  for (const o of r.offenders.slice(0, 25)) console.log(`        ${o}`);
  if (r.offenders.length > 25) console.log(`        … ${r.offenders.length - 25} more`);
}
console.log(`\nlint: ${results.length - failed}/${results.length} rules clean (${cssFiles.length} css, ${jsFiles.length} js files).`);
process.exit(failed ? 1 : 0);
