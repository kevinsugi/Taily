/* ============================================================
   Figma token — shared by the scripts that call the Figma REST API
   (text-parity.mjs, figma-find.mjs). FIGMA_TOKEN from the env, else
   from `.env` / any `*.env` at the repo root (UTF-8, UTF-8 BOM or
   UTF-16 — Windows editors save both). A file may hold either a
   `FIGMA_TOKEN=…` line or the bare `figd_…` token.
   ============================================================ */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function decodeEnvFile(path) {
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

export function readToken() {
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
