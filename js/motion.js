/* js/motion.js — V6 entry motion (docs/v6/V6-spec.md §A9, V6-D-08).
   Content is visible at rest: nothing hides unless html.motion-ok is set, and that is set only when the page is NOT in
   test mode and the viewer has no reduced-motion preference. Runs once per screen ARRIVAL, never on a same-screen
   re-render (render() runs on every interaction). Animates opacity + transform only. */
let last = null;

const motionOk = () => !document.documentElement.classList.contains('is-test')
  && 'IntersectionObserver' in window
  && window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches;

/* bars, overlays and the system banner never reveal */
const SKIP = '.action-bar, .sheet, .modal, .toast, .top-nav, .status-bar, .flow-bar, .ob-bar, .sys-banner, .screen-sheet, .ambient';
/* repeated rows: any parent holding two or more of these staggers its first 12 */
const ITEMS = '.appt-row, .request-card, .thread-row, .tailor-row, .list-row, .garment-tile, .review-row, .price-row, .money-row, .step, .option-row, .check-row-wrap';

/** wireReveal(root, screenId) — call after a screen's wire(). */
export function wireReveal(root, screenId) {
  const arrival = screenId !== last;
  last = screenId;
  if (!arrival || !motionOk()) return;
  document.documentElement.classList.add('motion-ok');

  const blocks = [...root.querySelectorAll('.body > *')].filter((el) => !el.matches(SKIP));
  const groups = new Map();
  for (const item of root.querySelectorAll(`.body :is(${ITEMS})`)) {
    if (!groups.has(item.parentElement)) groups.set(item.parentElement, []);
    groups.get(item.parentElement).push(item);
  }
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    items.slice(0, 12).forEach((item, i) => {
      item.dataset.stagger = '';
      item.style.setProperty('--i', Math.min(i, 8));
    });
  }

  let batch = 0;
  const io = new IntersectionObserver((entries) => {
    const ins = entries.filter((e) => e.isIntersecting);
    ins.forEach((e, k) => {
      e.target.style.setProperty('--i', Math.min(batch + k, 5));
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
    batch = 0;   // only the first (above-the-fold) batch cascades; later blocks enter on their own
  }, { rootMargin: '0px', threshold: 0 });

  blocks.forEach((el) => { el.dataset.reveal = ''; io.observe(el); });
  /* V6-1-M-01: a block already in view on arrival is revealed straight away (a page that cannot scroll never fires the observer for blocks at its foot) */
  const vh = innerHeight;
  let k = 0;
  blocks.forEach((el) => {
    if (el.getBoundingClientRect().top < vh) {
      el.style.setProperty('--i', Math.min(k++, 5));
      el.classList.add('is-in');
      io.unobserve(el);
    }
  });
}
