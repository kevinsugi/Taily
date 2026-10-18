/* ============================================================
   docs/v5/COPY-DECK.md — the copy deck for the design freeze (K-53 a7).
   Renders every Test-flows entry in the real app (the same harness as `npm run check`), reads the words a person sees, and writes
   them by persona → screen → state, plus the 94 texts (docs/v5/TEXTS.md, regenerated first) and the policy pages' headings and
   In short summaries (the full drafts stay in js/policies.js). Every COUNSEL placeholder and made-up value is flagged.

   Run: node scripts/v5/copy-deck.mjs        (≈ 3 minutes; rerun after any copy edit, then commit the file)

   How the words are read: each state is run with runFlow, then `document.body.innerText` with CSS `text-transform` switched off (so
   caps labels print in their source case) and the prototype chrome hidden (the drawn status bar, the Test-flows panel, screen-reader
   only text and the live regions); visible input placeholders are added as "(placeholder) …". Dedupe: within a screen, a state lists
   only the lines its screen has not shown yet; lines on SHARED_MIN or more screens are listed once under "Shared lines".
   ============================================================ */
import { writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execSync } from 'node:child_process';
import { open, loadFlows, settle } from './lib/browser.mjs';
import { SCREENS } from '../../js/inventory.js';
import { POLICIES, policyList, policyPage, HELP_CONTACT, COMPANY, LEGAL_VERSION, DRAFT_LINE, protectionLine } from '../../js/policies.js';
import { MONEY, POLICY } from '../../js/money-config.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(ROOT, 'docs/v5/COPY-DECK.md');
const SHARED_MIN = 8;                                       // a line on this many screens or more is "shared chrome"
const SKIP_SCREENS = new Set(['sys-components', 'sys-index', 'sys-texts']);   // the gallery, the screen index, the texts board (section 6)
const GROUPS = [
  ['customer', 'Customer', (id) => id.startsWith('c-')],
  ['tailor', 'Tailor', (id) => id.startsWith('t-')],
  ['onboarding', 'Tailor onboarding', (id) => id.startsWith('to-')],
  ['admin', 'Admin', (id) => id.startsWith('a-')],
  ['system', 'System', (id) => id.startsWith('sys-')],
];

/* ---------- placeholders: what counsel must replace, and values made up for the prototype ---------- */
const COUNSEL_DRAFT = 'Draft for counsel';
const MADE_UP = [HELP_CONTACT.text, HELP_CONTACT.email, HELP_CONTACT.hours].filter(Boolean);
const flag = (line) => {
  if (line.includes(DRAFT_LINE) || line.includes(COUNSEL_DRAFT) || line === protectionLine()) return ' **[COUNSEL]**';
  if (MADE_UP.some((v) => line.includes(v))) return ' **[PLACEHOLDER]**';
  return '';
};
/** Every `COUNSEL` comment in js/ (not v4), as file:line + the comment. */
function counselComments() {
  const out = [];
  const walk = (dir) => readdirSync(dir).forEach((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'v4' && n !== 'fixtures') walk(p); return; }   // product code only (not the test fixtures)
    if (!n.endsWith('.js') || /garment-icons|icons\.js|inventory\.js/.test(n)) return;
    readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
      /* a comment that names COUNSEL as a word (not the COUNSEL_DRAFT constant or a data-counsel hook) */
      const c = l.match(/(?:\/\/|\/\*|^\s*\*|^\s{2,})\s*(.*\bCOUNSEL\b(?!_).*?)\s*(?:\*\/)?$/)?.[1];
      if (!c || /^import/.test(l.trim())) return;
      out.push(`${relative(ROOT, p)}:${i + 1} — ${c.trim().slice(0, 220)}`);
    });
  });
  walk(resolve(ROOT, 'js'));
  return out;
}

/** Words, not values: a line with no run of two letters (a glyph ✕ ‹ ●, a count, a wheel number, a bare amount "$16.00") or an avatar's
    initials ("AR", "Ta") is not copy. Amounts come from money.js; a line that says something about one ("Kept by Amara") stays. */
const isCopy = (l) => /\p{L}{2}/u.test(l) && !/^(?:[A-Z]{2}|Ta)$/.test(l);

/* ---------- markdown helpers ---------- */
const mdLine = (s) => String(s).replace(/\\/g, '\\\\').replace(/([*_`[\]<>|])/g, '\\$1').replace(/^([#+-])/, '\\$1');
const bullet = (s) => `- ${mdLine(s)}${flag(s)}`;

/* ---------- 1. render every state ---------- */
console.log('copy-deck: rendering every Test-flows state…');
const h = await open();
const { page } = h;
const { flows } = await loadFlows(page);
const titleOf = new Map(SCREENS.map((s) => [s.id, s.title]));
const order = new Map(SCREENS.map((s, i) => [s.id, i]));
const states = [];
for (const f of flows) {
  if (SKIP_SCREENS.has(f.screen)) continue;
  await page.evaluate((k) => window.Taily.runFlow(k), f.key);
  await settle(page);
  const lines = await page.evaluate(() => {
    if (!document.getElementById('deck-css')) {
      const st = document.createElement('style');
      st.id = 'deck-css';
      st.textContent = '*{text-transform:none!important}.sr-only,.status-bar,.stage-caption,#route-status,#toast-live,#toast-alert{display:none!important}';
      document.head.appendChild(st);
    }
    const text = document.body.innerText.split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const ph = [...document.querySelectorAll('input[placeholder], textarea[placeholder]')].filter((e) => e.getClientRects().length && e.placeholder).map((e) => `(placeholder) ${e.placeholder}`);
    return [...text, ...ph];
  });
  states.push({ key: f.key, screen: f.screen, title: f.title, lines: [...new Set(lines.filter(isCopy))] });
}
await h.close();
console.log(`copy-deck: ${states.length} states read`);

/* ---------- 2. dedupe: shared lines, then per screen ---------- */
const screensOfLine = new Map();
for (const s of states) for (const l of s.lines) (screensOfLine.get(l) ?? screensOfLine.set(l, new Set()).get(l)).add(s.screen);
const shared = [...screensOfLine].filter(([, set]) => set.size >= SHARED_MIN).map(([l, set]) => [l, set.size]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const sharedSet = new Set(shared.map(([l]) => l));
/* a system-wide state (`sys-offline`, `sys-session-expired`, …) is a Test-flows entry on a host screen: it prints in the System section with
   only the lines its host screen doesn't already show (the banner, the sheet, the toast) */
const SYS = 'sys-states';
const isSys = (s) => s.key.startsWith('sys-') && !s.screen.startsWith('sys-');
const byScreen = new Map();
for (const s of states) { const id = isSys(s) ? SYS : s.screen; (byScreen.get(id) ?? byScreen.set(id, []).get(id)).push(s); }
const hostLines = (screen) => new Set((byScreen.get(screen) ?? []).flatMap((x) => x.lines));
titleOf.set(SYS, 'System-wide states, shown over any screen (only what they add to their host screen)');

let unique = 0;
let printed = 0;
function screenBlock(id) {
  const list = byScreen.get(id) ?? [];
  const seen = new Set();
  const out = [`### \`${id}\` — ${mdLine(titleOf.get(id) ?? '')}`, ''];
  for (const s of list) {
    const host = id === SYS ? hostLines(s.screen) : null;
    const fresh = s.lines.filter((l) => !sharedSet.has(l) && !seen.has(l) && !host?.has(l));
    fresh.forEach((l) => seen.add(l));
    printed += fresh.length;
    out.push(`**\`${s.key}\`** — ${mdLine(s.title)}${id === SYS ? ` *(on \`${s.screen}\`)*` : ''}${fresh.length ? '' : ' *(no new lines)*'}`);
    if (fresh.length) out.push('', ...fresh.map(bullet));
    out.push('');
  }
  unique += seen.size;
  return out.join('\n');
}
const screenIds = [...byScreen.keys()].sort((a, b) => (order.get(a) ?? 1e6) - (order.get(b) ?? 1e6));   // SYS has no inventory row: last

/* ---------- 3. the texts (TEXTS.md, regenerated from js/texts.js) ---------- */
spawnSync(process.execPath, [resolve(ROOT, 'scripts/v5/texts-doc.mjs')], { cwd: ROOT, stdio: 'ignore' });
const textsMd = readFileSync(resolve(ROOT, 'docs/v5/TEXTS.md'), 'utf8');
const textRows = textsMd.split('\n').filter((l) => /^\| [CTA]\d+ \|/.test(l)).map((l) => {
  const c = l.split(/(?<!\\)\|/).map((x) => x.trim());
  return { no: c[1], event: c[2], body: c[3], when: c[4] };
});
const textsFor = (p) => textRows.filter((r) => r.no.startsWith(p));

/* ---------- 4. the policy pages ---------- */
function policyBlock() {
  const out = [];
  const keys = [...new Set([...policyList('customer'), ...policyList('tailor')].map((x) => x.key))];
  for (const key of keys) {
    const who = policyList('customer').some((x) => x.key === key) ? ['customer', ...(policyList('tailor').some((x) => x.key === key) ? ['tailor'] : [])] : ['tailor'];
    const p0 = policyPage(key, who[0]);
    out.push(`### ${mdLine(p0.title)} (\`${key}\`)${p0.legal ? ` — COUNSEL #${p0.legal}` : ''}${p0.draft ? ' **[COUNSEL]**' : ''}`, '');
    out.push(`Readers: ${who.join(', ')} · list line: “${mdLine(POLICIES[key].sub(who[0]))}”${p0.draft ? ` · opens with “${DRAFT_LINE}”` : ''}${p0.version ? ` · “${LEGAL_VERSION}”` : ''}`, '');
    for (const w of who) {
      const pg = policyPage(key, w);
      const short = pg.sections.find((x) => /^in short$/i.test(x.title));
      const lead = short ?? pg.sections[0];
      if (who.length > 1) out.push(`*${w === 'customer' ? 'Customer' : 'Tailor'} version*`, '');
      out.push(`Headings: ${pg.sections.map((x) => mdLine(x.title)).join(' · ')}`, '');
      out.push(`${short ? 'In short' : `Summary (first section, “${mdLine(lead.title)}”)`}:`, '', ...lead.lines.map(bullet), '');
    }
  }
  return out.join('\n');
}

/* ---------- 5. write ---------- */
let head = '';
try { head = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch { /* not a repo */ }
const nStates = states.length;
const words = [...screensOfLine.keys()].reduce((n, l) => n + l.split(' ').length, 0);
const counsel = counselComments();
let sec = 1;   // section 1 = the shared lines; the persona groups that have screens follow, then texts, policies, placeholders
const groupsMd = GROUPS.map(([, name, test]) => {
  const ids = screenIds.filter(test);
  if (!ids.length) return '';
  const n = ids.reduce((k, id) => k + (byScreen.get(id)?.length ?? 0), 0);
  sec += 1;
  const what = ids.length === 1 && ids[0] === SYS ? `System-wide states (${n})` : `${name} screens (${ids.length} ${ids.length === 1 ? 'screen' : 'screens'}, ${n} states)`;
  return `## ${sec}. ${what}\n\n${ids.map(screenBlock).join('\n')}`;
}).filter(Boolean).join('\n\n');
const S_TEXTS = sec + 1;
const S_POLICIES = sec + 2;
const S_PLACEHOLDERS = sec + 3;

const md = `# Taily copy deck — for the design freeze (K-53 a7)

Generated by \`node scripts/v5/copy-deck.mjs\` from the running prototype${head ? ` (on top of \`${head}\`)` : ''} — do not edit by hand: change the copy
in the code (screens, \`js/components.js\`, \`js/texts.js\`, \`js/policies.js\`), then rerun. Every Test-flows state is rendered in the real
app and its visible words read off the page (caps labels in their source case; the drawn status bar, the Test-flows panel and
screen-reader-only text left out; input placeholders as "(placeholder) …"). Lines with no words — glyphs, counts, wheel numbers, a bare
amount, an avatar's initials — are left out; amounts inside sentences are whatever the seed scenario prints (dollars only).

**Stats.** ${screenIds.length} screens · ${nStates} states rendered · ${screensOfLine.size} distinct lines of screen copy (${words} words) ·
${shared.length} shared lines · ${textRows.length} texts (${textsFor('C').length} customer, ${textsFor('T').length} tailor, ${textsFor('A').length} admin) ·
${Object.keys(POLICIES).length} policy pages · ${counsel.length} COUNSEL marks in the code.

**How to read it.** Screens are grouped by persona and listed in the order of \`docs/v5/SCREENS.md\`. Under a screen, its first state prints
all its lines; every further state prints only the lines that screen has not shown yet ("no new lines" = the same words, a different
layout or data). Lines that appear on ${SHARED_MIN} or more screens are printed once, in section 1. **[COUNSEL]** marks a placeholder counsel
must write or approve; **[PLACEHOLDER]** marks a made-up value (Help's contact details) to replace before launch. Section ${S_PLACEHOLDERS} lists every
placeholder with where it lives.

**Not in this deck:** the gallery (\`sys-components\`), the screen index (\`sys-index\`) and the texts board (\`sys-texts\`, = section ${S_TEXTS}).
System-wide states (offline, session expired, the error toast, …) are Test-flows entries on a host screen; they print in the System
section with only what they add to that screen.

## 1. Shared lines (on ${SHARED_MIN}+ screens)

| Line | Screens |
|---|---|
${shared.map(([l, n]) => `| ${mdLine(l)}${flag(l)} | ${n} |`).join('\n')}

${groupsMd}

## ${S_TEXTS}. Texts (${textRows.length}) — exactly as sent, from docs/v5/TEXTS.md

Every text starts "Taily: " (the admin's "Taily admin: ") and ends with its unique link (\`<link>\`). Numbers: C… customer, T… tailor,
A… admin (K-51). Triggers and landing screens are in \`docs/v5/TEXTS.md\`.

${[['C', 'Customer'], ['T', 'Tailor'], ['A', 'Admin']].map(([p, name]) => `### ${name} (${textsFor(p).length})

| No. | Event | Text | When |
|---|---|---|---|
${textsFor(p).map((r) => `| ${r.no} | ${r.event} | ${r.body} | ${r.when} |`).join('\n')}`).join('\n\n')}

## ${S_POLICIES}. Policy pages — headings and In short (full drafts stay in js/policies.js)

Every legal page is a draft by ${COMPANY.name} (${COMPANY.city}) that opens with “${DRAFT_LINE}” and carries “${LEGAL_VERSION}”; counsel
replaces each one before launch (docs/v5/COUNSEL.md, row named per page).

${policyBlock()}

## ${S_PLACEHOLDERS}. Placeholders to replace before launch

Values made up for the prototype or waiting on counsel / a vendor:

| What | Value | Where |
|---|---|---|
| Help contact — text | ${mdLine(HELP_CONTACT.text ?? '')} **[PLACEHOLDER]** | js/policies.js \`HELP_CONTACT\` |
| Help contact — email | ${mdLine(HELP_CONTACT.email ?? '')} **[PLACEHOLDER]** | js/policies.js \`HELP_CONTACT\` |
| Help hours | ${mdLine(HELP_CONTACT.hours ?? '')} **[PLACEHOLDER]** | js/policies.js \`HELP_CONTACT\` |
| Legal entity | ${mdLine(`${COMPANY.name}, ${COMPANY.city}`)} (registered address: counsel) | js/policies.js \`COMPANY\` |
| Legal version line | ${mdLine(LEGAL_VERSION)} | js/policies.js \`LEGAL_VERSION\` |
| Draft line on every legal page | ${mdLine(DRAFT_LINE)} **[COUNSEL]** | js/policies.js \`DRAFT_LINE\` |
| Background-check disclosure | "${mdLine(COUNSEL_DRAFT)}: the final disclosure, authorization and summary of your rights go here." **[COUNSEL]** | js/components.js \`BACKGROUND_DISCLOSURE\`, \`COUNSEL_DRAFT\` |
| Garment protection cap | ${mdLine(`$${MONEY.GARMENT_PROTECTION_CAP} per order`)} **[COUNSEL]** | js/money-config.js \`MONEY.GARMENT_PROTECTION_CAP\` |
| Garment report window | ${POLICY.GARMENT_REPORT_H} hours **[COUNSEL]** | js/money-config.js \`POLICY.GARMENT_REPORT_H\` |
| Help reply promise | ${POLICY.HELP_REPLY_H} hours **[COUNSEL]** | js/money-config.js \`POLICY.HELP_REPLY_H\` |

Every \`COUNSEL\` mark in the code (${counsel.length}):

${counsel.map((c) => `- ${mdLine(c)}`).join('\n')}
`;

writeFileSync(OUT, md);
console.log(`copy-deck: wrote ${relative(ROOT, OUT)} — ${screenIds.length} screens, ${nStates} states, ${screensOfLine.size} distinct lines (${printed} printed after dedupe, ${shared.length} shared), ${textRows.length} texts, ${Object.keys(POLICIES).length} policy pages, ${counsel.length} COUNSEL marks`);
