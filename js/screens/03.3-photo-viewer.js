/* ============================================================
   PV3 - Photo Viewer V3 (Filmstrip) — Figma 559:2112.
   04D dimmed under an ink@95% scrim; panel at the 128 offset:
   header (title + "Pinned by" sub, ✕), Before/Pinned legend, 440px
   stage with ‹ › arrows, five 52px filmstrip thumbs (active ringed).
   Opened by tapping a photo on any post-appointment card (Before/
   Pinned rows); pre-appointment photo tiles do nothing (Kevin).
   All art is the media placeholder — no real photos exist yet.
   ============================================================ */

import { register, render as go } from '../app.js';
import { modalOverlay } from '../components.js';
import { viewTailoring } from './03-status-tailoring.js';

const THUMBS = 5;

function panelHtml({ garment = 'Suit Jacket', active = 2 } = {}) {
  const thumbs = Array.from({ length: THUMBS }, (_, i) =>
    `<button type="button" class="photo-viewer__thumb${i === active ? ' is-active' : ''}" data-thumb="${i}" aria-label="Photo ${i + 1}"></button>`).join('');
  return `<div class="photo-viewer">
  <div class="photo-viewer__header">
    <div class="photo-viewer__titles">
      <span class="photo-viewer__title" data-pv-title>${garment} — Before</span>
      <span class="photo-viewer__sub">Pinned by Marco · Thu, Jul 17</span>
    </div>
    <button type="button" class="photo-viewer__ctl" data-act="pv-close" aria-label="Close">✕</button>
  </div>
  <div class="photo-viewer__photos">
    <div class="photo-viewer__legend">
      <button type="button" class="is-active" data-legend="Before">Before</button>
      <button type="button" data-legend="Pinned">Pinned</button>
    </div>
    <div class="photo-viewer__stage">
      <button type="button" class="photo-viewer__ctl photo-viewer__arrow photo-viewer__arrow--left" data-act="pv-prev" aria-label="Previous photo">‹</button>
      <button type="button" class="photo-viewer__ctl photo-viewer__arrow photo-viewer__arrow--right" data-act="pv-next" aria-label="Next photo">›</button>
    </div>
    <div class="photo-viewer__film">${thumbs}</div>
  </div>
</div>`;
}

/* Thumb selection + Before/Pinned legend are live; the stage stays the
   placeholder (no real photos in the prototype). */
function wirePanel(root, close) {
  root.querySelector('[data-act="pv-close"]')?.addEventListener('click', () => close());
  const thumbs = [...root.querySelectorAll('[data-thumb]')];
  const select = (i) => thumbs.forEach((t, j) => t.classList.toggle('is-active', i === j));
  const current = () => thumbs.findIndex((t) => t.classList.contains('is-active'));
  thumbs.forEach((t, i) => t.addEventListener('click', () => select(i)));
  root.querySelector('[data-act="pv-prev"]')?.addEventListener('click', () => select(Math.max(0, current() - 1)));
  root.querySelector('[data-act="pv-next"]')?.addEventListener('click', () => select(Math.min(THUMBS - 1, current() + 1)));
  const legends = [...root.querySelectorAll('[data-legend]')];
  legends.forEach((l) => l.addEventListener('click', () => {
    legends.forEach((x) => x.classList.toggle('is-active', x === l));
    const title = root.querySelector('[data-pv-title]');
    if (title) title.textContent = title.textContent.replace(/— (Before|Pinned)$/, `— ${l.dataset.legend}`);
  }));
}

/** Open the viewer over the live screen (post-appointment cards). */
export function openPhotoViewer(opts) {
  modalOverlay(`<div class="pv-scrim" data-act="modal-dismiss"></div>${panelHtml(opts)}`, { dataS: '03.3-photo-viewer', instant: true }, wirePanel);
}

/** Wire every Before/Pinned photo row in `root`: mouse click-drag
    scrolls the strip (touch/wheel scroll natively), and a clean click
    opens the viewer — a >5px drag suppresses the click so the viewer
    doesn't open mid-scroll (the 02 filters' old drag pattern).
    Pre-appointment ViewOnly tiles are never wired — tapping them does
    nothing (Kevin). */
export function wirePhotoViewer(root) {
  root.querySelectorAll('.photo-row').forEach((row) => {
    let startX = null; let startScroll = 0; let dragged = false;
    row.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      startX = e.clientX;
      startScroll = row.scrollLeft;
      dragged = false;
    });
    row.addEventListener('pointermove', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { dragged = true; row.setPointerCapture(e.pointerId); }
      if (dragged) row.scrollLeft = startScroll - dx;
    });
    const endDrag = () => { startX = null; };
    row.addEventListener('pointerup', endDrag);
    row.addEventListener('pointercancel', endDrag);
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dragged) { e.preventDefault(); dragged = false; return; }
      const card = row.closest('.garment-card');
      const garment = card?.querySelector('.garment-card__row--tight span:last-child')?.textContent ?? 'Suit Jacket';
      openPhotoViewer({ garment });
    }, true);
  });
}

/* Route registration keeps the frame-verbatim render for the diff
   harness: 04D as backdrop, near-opaque scrim, panel. */
function renderScreen(s) {
  return `<div class="screen-sheet" data-s="03.3-photo-viewer">
  <div class="sheet-backdrop" aria-hidden="true">${viewTailoring(s)}</div>
  <div class="pv-scrim"></div>
  ${panelHtml()}
</div>`;
}

function wire(root) {
  wirePanel(root, () => go('03-status-tailoring'));
}

register('03.3-photo-viewer', renderScreen, wire);
