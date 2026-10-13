/* ============================================================
   sys-index — the boot route. One section per milestone M0-M6
   (js/inventory.js): a built / todo badge, and for built milestones
   every screen as a deep link (?screen=<id>) with its states as
   links (?flow=<key>). Unbuilt milestones show their counts only.
   ============================================================ */
import { register, render as go } from '../app.js';
import { nowIso } from '../state.js';
import { runFlow } from '../flow-menu.js';
import { statusBar, esc } from '../components.js';
import { fmtWhen } from '../dates.js';
import { MILESTONES, BUILT, SCREENS } from '../inventory.js';

const ID = 'sys-index';

/* keep ?test=1 on deep links so a harness / demo session stays in the same mode */
const keep = () => (new URLSearchParams(location.search).get('test') ? '&test=1' : '');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Screens of a milestone, each with the states that belong to it. */
function screensOf(m) {
  return SCREENS
    .map((s) => ({ ...s, states: s.states.filter((st) => st.m === m) }))
    .filter((s) => s.states.length);
}

function milestone(ms) {
  const built = BUILT.includes(ms.id);
  const list = screensOf(ms.id);
  const states = list.reduce((n, s) => n + s.states.length, 0);
  const counts = `${plural(list.length, 'screen')} · ${plural(states, 'state')}`;
  const body = built ? `
    <div class="idx-screens">${list.map((s) => `
      <div class="idx-screen">
        <a class="idx-screen__link" href="?screen=${s.id}${keep()}" data-screen-link="${s.id}">
          <span class="idx-screen__id">${esc(s.id)}</span>
          <span class="idx-screen__sub">${esc(s.title)}</span>
        </a>
        <div class="idx-keys">${s.states.map((st) => `<a class="idx-key${st.kind === 'overlay' ? ' idx-key--overlay' : ''}" href="?flow=${st.key}${keep()}" data-flow-link="${st.key}">${esc(st.key)}</a>`).join('')}</div>
      </div>`).join('')}
    </div>` : '';
  return `<section class="idx-milestone" data-milestone="${ms.id}" aria-label="${esc(ms.id)} ${esc(ms.name)}">
    <div class="idx-milestone__head">
      <div class="idx-milestone__name">
        <span class="idx-milestone__code">${ms.id}</span>
        <h2 class="t-h2">${esc(ms.name)}</h2>
        <p class="idx-milestone__count">${counts}</p>
      </div>
      <span class="idx-badge idx-badge--${built ? 'built' : 'todo'}">${built ? 'Built' : 'To do'}</span>
    </div>${body}
  </section>`;
}

function view() {
  return `${statusBar()}<main class="body sys-index" data-s="${ID}">
  <header class="sys-index__head">
    <h1 class="t-display">Taily v5</h1>
    <p class="t-body c-600 sys-index__sub">Prototype index · demo clock ${esc(fmtWhen(nowIso()))}</p>
  </header>
  ${MILESTONES.map(milestone).join('')}
</main>`;
}

/* The links are real hrefs (shareable deep links). A plain click stays in the app instead of reloading:
   ?flow= resets the demo and opens that state, ?screen= just renders the screen. Modified clicks open a new tab. */
function wire(root) {
  root.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    const flow = e.target.closest('[data-flow-link]');
    const screen = e.target.closest('[data-screen-link]');
    if (flow) { e.preventDefault(); runFlow(flow.dataset.flowLink); }
    else if (screen) { e.preventDefault(); go(screen.dataset.screenLink); }
  });
}

register(ID, view, wire);
