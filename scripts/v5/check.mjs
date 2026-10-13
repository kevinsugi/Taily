/* ============================================================
   npm run check — the whole v5 gate in one command.

   Runs SEQUENTIALLY (never in parallel — screenshots corrupt):
     1. model     scripts/v5/model-test.mjs      (Node, no browser)
     2. flows     scripts/v5/clickthrough-flows.mjs   registry + every
                  FLOWS entry + money / target lint + menu behaviour
     3. journeys  scripts/v5/journeys.mjs        (cross-persona; from M3,
                  runs only when the file exists)
     4. visual    scripts/v5/diff.mjs            ref/v5 self-baselines
     5. lint      scripts/v5/lint.mjs            hex / px / rates / % in money

   Quiet unless a step fails: each step's output is captured and only
   its signal lines are printed (FAIL / NOTE / summary) plus a PASS
   count; a failing step is printed in full. `--verbose` streams all.
   `--accept-new` is passed through to visual (first build: writes the
   MISSING baselines only). `--only a,b` / `--skip a,b` pick steps.
   An empty FLOWS list (M0, before screens register) is reported as
   such, not failed. One summary block; exit 1 on any failure.
   ============================================================ */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const flag = (name) => (argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : '') ?? '').split(',').filter(Boolean);
const ONLY = flag('only');
const SKIP = flag('skip');
const t0 = Date.now();
const steps = [];

const SIGNAL = /^FAIL|^NOTE|^SKIP|Error|CONSOLE|over gate|^Baselines written|^\d+ (flow|visual) entries|^lint:|^model:|passed|ALL (ASSERTIONS|TESTS)/;

function run(id, name, script, args = []) {
  if ((ONLY.length && !ONLY.includes(id)) || SKIP.includes(id)) return;
  console.log(`\n━━ ${name} ${'━'.repeat(Math.max(1, 60 - name.length))}`);
  const file = resolve(ROOT, script);
  if (!existsSync(file)) {
    console.log(`FAIL  ${script} is missing`);
    steps.push({ name, ok: false });
    return;
  }
  const cmd = [file, ...args];
  if (VERBOSE) {
    const r = spawnSync(process.execPath, cmd, { cwd: ROOT, stdio: 'inherit' });
    steps.push({ name, ok: r.status === 0 });
    return;
  }
  const r = spawnSync(process.execPath, cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const ok = r.status === 0;
  if (!ok) {
    process.stdout.write(out.endsWith('\n') || !out ? out : `${out}\n`);
    if (r.error) console.log(`  ${r.error.message}`);
    console.log(`  (exit ${r.status ?? r.signal})`);
  } else {
    const lines = out.split(/\r?\n/);
    for (const line of lines) if (SIGNAL.test(line)) console.log(line);
    console.log(`  ${lines.filter((l) => /^PASS/.test(l)).length} PASS`);
  }
  steps.push({ name, ok });
}

run('model', 'model (golden numbers, guards)', 'scripts/v5/model-test.mjs');
run('flows', 'flows (registry, expect, money + target lint, menu)', 'scripts/v5/clickthrough-flows.mjs');
if (existsSync(resolve(ROOT, 'scripts/v5/journeys.mjs'))) run('journeys', 'journeys (cross-persona)', 'scripts/v5/journeys.mjs');
run('visual', 'visual (ref/v5 self-baselines)', 'scripts/v5/diff.mjs', argv.includes('--accept-new') ? ['--accept-new'] : []);
run('lint', 'lint (hex / px / rates / % in money)', 'scripts/v5/lint.mjs');

/* ---------- summary ---------- */
const failed = steps.filter((s) => !s.ok);
console.log(`\n${'═'.repeat(62)}`);
for (const s of steps) console.log(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.name}`);
console.log(`  ${failed.length ? `${failed.length} step(s) FAILED` : 'ALL CHECKS PASS'} — ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('═'.repeat(62));
process.exit(failed.length ? 1 : 0);
