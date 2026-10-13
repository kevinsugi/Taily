/* ============================================================
   Static server on an ephemeral port — shared by every v5 script
   that drives a browser. Same MIME table as scripts/serve.mjs.
   ES modules need http://, not file://.
   ============================================================ */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

/* TAILY_ROOT lets the harness be pointed at a stub app (self-tests) */
export const ROOT = process.env.TAILY_ROOT ? resolve(process.env.TAILY_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

/** Start the server; resolves `{ origin, close() }`. */
export async function startServer() {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = resolve(ROOT, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {   // no path traversal
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((r) => server.close(r)),
  };
}
