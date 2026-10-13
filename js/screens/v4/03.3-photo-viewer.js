/* ============================================================
   PV3 - Photo Viewer V3 (Filmstrip) — Figma 559:2112.
   04D dimmed under an ink@95% scrim; panel at the 128 offset:
   header (title + "Pinned by" sub, ✕), Before/Pinned legend, 440px
   stage with ‹ › arrows, five 52px filmstrip thumbs (active ringed).
   Opened by tapping a photo on any post-appointment card (Before/
   Pinned rows). Round 9 (Kevin): 03/Confirmed's booking cards open it
   too — `booking` mode shows the customer's own uploads (title
   "<garment> — Your photos", sub "Added when you booked", no Before /
   Pinned legend, one thumb per photo); the other pre-appointment
   screens' tiles stay inert. Sibling frame "03.3 - Photo Viewer /
   Booking" → route `03.3-photo-viewer-booking`.
   All art is the media placeholder — no real photos exist yet.
   ============================================================ */

import { register, render as go } from '../app.js';
import { modalOverlay } from '../components.js';
import { viewTailoring } from './03-status-tailoring.js';

const THUMBS = 5;

/** `booking` (round 9): the customer's own booking photos — no legend,
    `count` thumbs (one per photo), the first one active. Exported for
    the 03.3-photo-viewer-booking fixture route. */
export function panelHtml({ garment = 'Suit Jacket', active = 2, booking = false, count = THUMBS } = {}) {
  const n = booking ? Math.max(1, count) : THUMBS;
  const start = booking ? Math.min(active, n - 1) : active;
  const thumbs = Array.from({ length: n }, (_, i) =>
    `<button type="button" class="photo-viewer__thumb${i === start ? ' is-active' : ''}" data-thumb="${i}" aria-label="Photo ${i + 1}"></button>`).join('');
  const legend = booking ? '' : `<div class="photo-viewer__legend">
      <button type="button" class="is-active" data-legend="Before">Before</button>
      <button type="button" data-legend="Pinned">Pinned</button>
    </div>`;
  return `<div class="photo-viewer${booking ? ' photo-viewer--booking' : ''}">
  <div class="photo-viewer__header">
    <div class="photo-viewer__titles">
      <span class="photo-viewer__title" data-pv-title>${garment} — ${booking ? 'Your photos' : 'Before'}</span>
      <span class="photo-viewer__sub">${booking ? 'Added when you booked' : 'Pinned by Marco · Thu, Jul 17'}</span>
    </div>
    <button type="button" class="photo-viewer__ctl" data-act="pv-close" aria-label="Close">✕</button>
  </div>
  <div class="photo-viewer__photos">
    ${legend}
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
export function wirePanel(root, close) {
  root.querySelector('[data-act="pv-close"]')?.addEventListener('click', () => close());
  const thumbs = [...root.querySelectorAll('[data-thumb]')];
  const select = (i) => thumbs.forEach((t, j) => t.classList.toggle('is-active', i === j));
  const current = () => thumbs.findIndex((t) => t.classList.contains('is-active'));
  thumbs.forEach((t, i) => t.addEventListener('click', () => select(i)));
  root.querySelector('[data-act="pv-prev"]')?.addEventListener('click', () => select(Math.max(0, current() - 1)));
  root.querySelector('[data-act="pv-next"]')?.addEventListener('click', () => select(Math.min(thumbs.length - 1, current() + 1)));
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
      /* round 13: the Before / Pinned labels on a NEW card swap the tile set instead of opening the viewer */
      const tab = e.target.closest('[data-photo-tab]');
      if (tab) {
        e.preventDefault();
        const which = tab.dataset.photoTab;
        row.querySelectorAll('[data-photo-tab]').forEach((t) => t.classList.toggle('is-active', t === tab));
        row.querySelectorAll('[data-photo-set]').forEach((set) => { set.hidden = set.dataset.photoSet !== which; });
        return;
      }
      const card = row.closest('.garment-card');
      const garment = card?.querySelector('.garment-card__row--tight span:last-child')?.textContent ?? 'Suit Jacket';
      openPhotoViewer({ garment });
    }, true);
  });
}

/** Round 9 (Kevin): wire the ViewOnly booking cards' photo tiles in
    `root` (03/Confirmed) — tapping a tile opens the same viewer in
    `booking` mode on that photo. Only the screen that calls this gets
    it; the other pre-appointment tiles stay inert. */
export function wireBookingPhotos(root) {
  root.querySelectorAll('.garment-card--view .photo-tiles').forEach((row) => {
    const tiles = [...row.querySelectorAll('.photo-tile--photo')];
    if (!tiles.length) return;
    row.classList.add('photo-tiles--tappable');
    const card = row.closest('.garment-card');
    const garment = card?.querySelector('.garment-card__row--tight span:last-child')?.textContent ?? 'Suit Jacket';
    tiles.forEach((tile, i) => {
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', `Photo ${i + 1} of ${tiles.length}`);
      tile.addEventListener('click', (e) => {
        e.stopPropagation();
        openPhotoViewer({ garment, booking: true, count: tiles.length, active: i });
      });
    });
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
/* The booking-mode fixture route lives in 03.3-photo-viewer-booking.js
   (app.js imports one module per route id). */
