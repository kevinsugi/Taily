// Director screenshots: node scripts/v5/shoot.mjs <outDir> <screen-or-flow>... (prefix "flow:" for ?flow=)
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const [out, ...ids] = process.argv.slice(2);
const PORT = Number(process.env.SHOOT_PORT) || 4200 + Math.floor(Math.random() * 700); // random: concurrent shooters never share a server
const srv = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
for (const id of ids) {
  const q = id.startsWith('flow:') ? `flow=${id.slice(5)}` : `screen=${id}`;
  await p.goto(`http://127.0.0.1:${PORT}/?${q}&test=1`);
  await p.evaluate(() => window.Taily?.ready).catch(() => {});
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${id.replace(/[:/]/g, '_')}.png`, fullPage: true });
}
console.log(errs.length ? `ERRORS: ${errs.join(' | ')}` : 'no page errors');
await b.close(); srv.kill();
