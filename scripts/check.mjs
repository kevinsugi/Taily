/* ============================================================
   npm run check — the whole gate in one command (Phase R).

   Runs, in order:
     1. diff  — pixel diffs for every screen against ratchet baselines
     2. text  — Figma text parity for every screen
     3. click — behaviour click-through
     4. lint  — literal hex colors / px font-sizes outside
                css/tokens.css + css/base.css

   Prints one summary block; exits 1 if anything failed.
   ============================================================ */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const t0 = Date.now();
const steps = [];

function run(name, args) {
  console.log(`\n━━ ${name} ${'━'.repeat(Math.max(1, 60 - name.length))}`);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  steps.push({ name, ok: r.status === 0 });
}

run('diff (ratchet baselines)', ['scripts/diff.mjs', 'all']);
run('text parity', ['scripts/text-parity.mjs']);
run('click-through', ['scripts/clickthrough.mjs']);

/* ---------- style hygiene ---------- */
console.log(`\n━━ style hygiene ${'━'.repeat(44)}`);
// The one documented literal (CLAUDE.md): the photo-tile gradient start,
// one digit off neutral-200, kept verbatim pending Kevin's call.
const ALLOWED_LITERALS = ['#E2DCD1'];
const offenders = [];
for (const f of readdirSync(resolve(ROOT, 'css'))) {
  if (f === 'tokens.css' || f === 'base.css' || !f.endsWith('.css')) continue;
  const lines = readFileSync(resolve(ROOT, 'css', f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    const code = line.replace(/\/\*.*?\*\//g, '');       // ignore comments
    for (const hex of code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
      if (!ALLOWED_LITERALS.includes(hex.toUpperCase()) && !ALLOWED_LITERALS.includes(hex)) {
        offenders.push(`css/${f}:${i + 1}  literal color ${hex}`);
      }
    }
    if (/font-size:\s*[0-9.]+px/.test(code)) offenders.push(`css/${f}:${i + 1}  literal px font-size`);
  });
}
if (offenders.length) for (const o of offenders) console.log(`  ${o}`);
else console.log('  clean — colors and type sizes go through tokens.css');
steps.push({ name: 'style hygiene', ok: offenders.length === 0 });

/* ---------- summary ---------- */
const failed = steps.filter((s) => !s.ok);
console.log(`\n${'═'.repeat(62)}`);
for (const s of steps) console.log(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.name}`);
console.log(`  ${failed.length ? `${failed.length} step(s) FAILED` : 'ALL CHECKS PASS'} — ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('═'.repeat(62));
process.exit(failed.length ? 1 : 0);
