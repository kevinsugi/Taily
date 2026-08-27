/* ============================================================
   Taily v4 — components
   One export per Figma component variant. Phase 2 seeds only the two
   chrome pieces (V2/Status Bar 122:114, Top Nav 197:437); Phase 3 fills
   in the rest of the library.

   Every value comes from css/components.css or css/base.css — never
   inline styles, never literal colours here.
   ============================================================ */

/**
 * Status bar icons, 46x12.
 * This is the exact vector exported from Figma (assets/status-icons.svg),
 * not a hand-drawn approximation: four signal bars, then the battery
 * body, fill and tip. The Figma asset has no wifi glyph.
 * fill/stroke are currentColor so the ink token drives the colour.
 */
const STATUS_ICONS = `
<svg class="status-bar__icons" width="46" height="12" viewBox="0 0 46 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <g clip-path="url(#taily-status-clip)">
    <path d="M2 7H1C0.447715 7 0 7.44772 0 8V10C0 10.5523 0.447715 11 1 11H2C2.55228 11 3 10.5523 3 10V8C3 7.44772 2.55228 7 2 7Z" fill="currentColor"/>
    <path d="M6.5 5H5.5C4.94772 5 4.5 5.44772 4.5 6V10C4.5 10.5523 4.94772 11 5.5 11H6.5C7.05228 11 7.5 10.5523 7.5 10V6C7.5 5.44772 7.05228 5 6.5 5Z" fill="currentColor"/>
    <path d="M11 2.5H10C9.44772 2.5 9 2.94772 9 3.5V10C9 10.5523 9.44772 11 10 11H11C11.5523 11 12 10.5523 12 10V3.5C12 2.94772 11.5523 2.5 11 2.5Z" fill="currentColor"/>
    <path d="M15.5 0H14.5C13.9477 0 13.5 0.447715 13.5 1V10C13.5 10.5523 13.9477 11 14.5 11H15.5C16.0523 11 16.5 10.5523 16.5 10V1C16.5 0.447715 16.0523 0 15.5 0Z" fill="currentColor"/>
    <path d="M39.5 0.5H25.5C23.8431 0.5 22.5 1.84315 22.5 3.5V8.5C22.5 10.1569 23.8431 11.5 25.5 11.5H39.5C41.1569 11.5 42.5 10.1569 42.5 8.5V3.5C42.5 1.84315 41.1569 0.5 39.5 0.5Z" stroke="currentColor"/>
    <path d="M37.4 2H25.6C24.7163 2 24 2.71634 24 3.6V8.4C24 9.28366 24.7163 10 25.6 10H37.4C38.2837 10 39 9.28366 39 8.4V3.6C39 2.71634 38.2837 2 37.4 2Z" fill="currentColor"/>
    <path d="M44.5 4V8C45.5 7.7 46 7 46 6C46 5 45.5 4.3 44.5 4Z" fill="currentColor"/>
  </g>
  <defs><clipPath id="taily-status-clip"><rect width="46" height="12" fill="white"/></clipPath></defs>
</svg>`.trim();

/** V2/Status Bar — 390x44, absolute at 0,0. */
export function statusBar(time = '9:41') {
  return `<div class="status-bar" role="presentation">
  <span class="status-bar__time">${time}</span>
  ${STATUS_ICONS}
</div>`;
}

/**
 * The Taily logo — the exact vector from logo/Taily Logo.svg (assets/taily-logo.svg),
 * not a redraw. fill=currentColor so .top-nav__logo's ink colour drives it.
 * 74x34 keeps the source aspect (131.5:60.74) at the nav wordmark height.
 */
const LOGO = `<svg class="top-nav__logo" viewBox="0 0 131.5 60.74" width="74" height="34" fill="currentColor" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Taily"><path d="M22.73,9.03c-3.62-.89-6.88-1.63-9.34-1.63-5.46,0-6.77,3.57-6.77,5.72,0,3.04,2.41,5.3,6.04,4.99l.95,7.56C6.14,26.93,0,21.47,0,14.17,0,8.24,4.04,1.73,13.86,1.73c7.4,0,16.75,3.73,24.36,3.73,4.2,0,7.14-1.21,9.29-5.46l6.56,2.89c-2.52,6.82-8.35,9.03-14.49,9.03-3.04,0-6.25-.47-9.5-1.15l-9.92,32.6h-7.93L22.73,9.03Z"/><path d="M62.26,16.59l-5.62,18.43c-.58,1.78-.68,3.46.94,3.46,2.36,0,5.41-4.04,8.29-9.92,1,.05,2.47.84,2.99,1.47-3.62,7.93-8.5,13.81-14.49,13.81-3.41,0-4.99-1.84-5.46-4.25-2.36,2.62-5.41,4.25-8.71,4.25-5.25,0-8.77-3.46-8.77-9.61,0-8.77,6.3-18.11,14.59-18.11,3.31,0,5.93,1.68,7.24,4.72l1.31-4.25h7.66ZM46.88,23.2c-3.62,0-7.3,5.25-7.3,9.82,0,2.83,1.47,4.46,3.78,4.46,3.73,0,7.4-5.25,7.4-9.87,0-2.78-1.58-4.41-3.88-4.41Z"/><path d="M77.11,16.59l-5.46,17.85c-.68,2.26-.37,4.04,1.68,4.04,2.94,0,5.77-3.94,8.71-9.92,1,.05,2.47.84,2.99,1.47-3.73,8.14-8.35,13.81-14.7,13.81s-7.66-5.09-5.83-11.18l4.93-16.06h7.66ZM75.54,4.51c2.57,0,4.51,2.05,4.51,4.57s-1.94,4.46-4.51,4.46-4.46-1.94-4.46-4.46,1.94-4.57,4.46-4.57Z"/><path d="M96.38,6.61l-8.56,27.82c-.68,2.26-.37,4.04,1.68,4.04,2.94,0,5.77-3.94,8.71-9.92,1,.05,2.47.84,2.99,1.47-3.73,8.14-8.35,13.81-14.7,13.81s-7.72-5.09-5.83-11.18l8.03-26.04h7.66Z"/><path d="M131.5,30.03c-3.52,7.66-8.08,12.86-15.59,16.38l-.32,1.05c-3.25,10.66-9.29,13.28-13.81,13.28s-7.35-2.57-7.35-6.19c0-6.88,9.61-7.93,14.17-9.19l1.42-4.62c-1.94,1.94-4.1,3.1-6.77,3.1-6.67,0-8.14-5.41-6.35-11.18l4.88-16.06h7.66l-4.83,15.91c-.84,2.68-.68,4.99,2.15,4.99,2.05,0,3.78-1.52,5.25-3.41l5.35-17.48h7.66l-7.66,25.09c5.46-3.31,8.5-7.82,11.13-13.12,1,.05,2.47.84,2.99,1.47ZM107.35,49.45c-4.04,1-8.82,1.94-8.82,4.78,0,1.21.89,2.31,2.57,2.31,2.52,0,4.83-2.57,6.25-7.09Z"/></svg>`;

/** Top Nav — 390x56, absolute at 0,44. `active` is home | bookings | profile. */
export function topNav(active = 'home') {
  const items = [
    ['home', 'Home'],
    ['bookings', 'Bookings'],
    ['profile', 'Profile'],
  ];

  const links = items.map(([key, label]) => {
    const isActive = key === active;
    return `<a class="top-nav__link${isActive ? ' is-active' : ''}" href="#" data-nav="${key}"${isActive ? ' aria-current="page"' : ''}>
      <span>${label}</span>${isActive ? '<span class="top-nav__stitch"></span>' : ''}
    </a>`;
  }).join('\n    ');

  return `<nav class="top-nav" aria-label="Primary">
  ${LOGO}
  <div class="top-nav__links">
    ${links}
  </div>
</nav>`;
}

/** Both chrome pieces, in the order screens use them. */
export function chrome(active = 'home', time = '9:41') {
  return statusBar(time) + '\n' + topNav(active);
}
