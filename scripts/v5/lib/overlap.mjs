/* K9-2-04 (D-233): text overprinting text. Runs in the page (page.evaluate(textOverlaps, opts)).
   A "text item" is an element's own non-blank text nodes (Range client rects, one per line box,
   clipped to every ancestor that clips overflow) or a text input / select / textarea box.
   Two items overlap when they sit in the same layer (#screen, or the same open overlay), neither
   element contains the other, and one rect pair intersects by more than TOL_W x TOL_H px.
   Skipped: items under a sticky / fixed ancestor (bars that content scrolls under), .sr-only /
   visually hidden, invisible or zero-opacity, and wheel pickers (rows overlap the lens by design). */
export function textOverlaps({ OVERLAY_SEL, TOL_W = 3, TOL_H = 4, MAX = 6 }) {
  const scr = document.getElementById('screen');
  if (!scr) return [];
  const SKIP = '.sr-only, .visually-hidden, .is-closing, [hidden], .wheel, [aria-hidden="true"]';
  const layerOf = (el) => el.closest(OVERLAY_SEL) || scr;
  const label = (el, s) => `${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className ?? '').split(' ')[0]} "${String(s).replace(/\s+/g, ' ').trim().slice(0, 18)}"`;
  const blocked = new Map();
  const isBlocked = (el) => {
    if (blocked.has(el)) return blocked.get(el);
    let v = false;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.position === 'sticky' || cs.position === 'fixed' || cs.opacity === '0' || cs.display === 'none') { v = true; break; }
    }
    blocked.set(el, v);
    return v;
  };
  /* the visible window of a text item: cut by its own element (an ellipsis box) and every ancestor that clips in x and / or y */
  const clipOf = (el) => {
    let c = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const ox = cs.overflowX !== 'visible', oy = cs.overflowY !== 'visible';
      if (!ox && !oy) continue;
      const r = a.getBoundingClientRect();
      if (ox) { c.l = Math.max(c.l, r.left); c.r = Math.min(c.r, r.right); }
      if (oy) { c.t = Math.max(c.t, r.top); c.b = Math.min(c.b, r.bottom); }
    }
    return c;
  };
  const cut = (r, c) => ({ l: Math.max(r.left, c.l), t: Math.max(r.top, c.t), r: Math.min(r.right, c.r), b: Math.min(r.bottom, c.b) });
  const roots = [scr, ...[...document.querySelectorAll(OVERLAY_SEL)].filter((o) => !scr.contains(o))];
  const items = [];
  for (const root of roots) {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = walk.currentNode; n; n = walk.nextNode()) {
      const isText = n.nodeType === 3;
      const el = isText ? n.parentElement : n;
      if (!el || el.closest(SKIP)) continue;
      if (isText && !n.textContent.trim()) continue;
      if (!isText && !el.matches('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]), select, textarea')) continue;
      if (getComputedStyle(el).visibility === 'hidden' || isBlocked(el)) continue;
      let rects;
      if (isText) { const rg = document.createRange(); rg.selectNodeContents(n); rects = [...rg.getClientRects()]; }
      else rects = [el.getBoundingClientRect()];
      const c = clipOf(el);
      const boxes = rects.map((r) => cut(r, c)).filter((b) => b.r - b.l > 1 && b.b - b.t > 1);
      if (boxes.length) items.push({ el, layer: layerOf(el), boxes, text: isText ? n.textContent : (el.value || el.placeholder || el.tagName) });
    }
  }
  const out = [];
  for (let i = 0; i < items.length && out.length < MAX; i++) {
    for (let j = i + 1; j < items.length && out.length < MAX; j++) {
      const a = items[i], b = items[j];
      if (a.el === b.el || a.layer !== b.layer || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const hit = a.boxes.some((p) => b.boxes.some((q) => Math.min(p.r, q.r) - Math.max(p.l, q.l) > TOL_W && Math.min(p.b, q.b) - Math.max(p.t, q.t) > TOL_H));
      if (hit) out.push(`${label(a.el, a.text)} x ${label(b.el, b.text)}`);
    }
  }
  return out;
}
