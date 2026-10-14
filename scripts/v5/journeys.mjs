/* ============================================================
   Journeys — cross-persona walks through the real UI (from M3).

   Browser, /?test=1 (instant latency), same reporter as the flows
   script. Persona flips go through the real control (#flow-trigger ->
   #persona-toggle). After each step it asserts the visible text.
   Dollar strings come from fmt*() / SCENARIOS, never typed.

     J1  book -> accept -> Confirmed (the M3 proof)
     J2  suggest -> accept the new time
     J3  decline -> the job is kept
     J4  customer cancels late -> tailor keeps the deposit
     J5  tailor can't make it -> customer refunded
     J6  edit the job (new item, service off) -> Sarah approves -> tailoring (K-01)
     J6b no changes still needs Sarah's approval (K-01)
     J7  courier return, money identical on both sides, never in the payout (D-143); the tailor sees no courier money (D-160)
     J8  completed -> review -> c-tailor shows it (D-143)
     J9  one thread from a question to a booking, masked on both sides (D-143)
     J10 the expiry loop: no reply -> Try again (1 of 2) -> Sent again -> expire twice -> no tailors left (D-85, D-94)
     J11 payout lifecycle: completed -> Pending (the Friday) -> the Friday run -> Paid, fee and payout in dollars (D-24, D-136)
     J12 a suggested time lapses: both sides end it and the hold is released (D-154)

   node scripts/v5/journeys.mjs [J1 J2 ...]
   ============================================================ */

import { open, reporter, settle } from './lib/browser.mjs';
import { SCENARIOS, SEED_SLOT, fmtExact, fmtNeg } from './money.mjs';
import { SUGGESTED_SLOT, AMARA } from '../../js/fixtures/money-scenarios.js';
import { CHAT } from '../../js/fixtures/common.js';
import { CUSTOMER } from '../../js/data.js';
import { fmtWhen, fmtDay } from '../../js/dates.js';
import { PAYOUT_DAYS } from '../../js/fixtures/money-scenarios.js';
import { POLICY } from '../../js/money-config.js';

const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const want = (id) => !ONLY.length || ONLY.includes(id);
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

const h = await open();
const { page } = h;
const R = reporter();
const { check } = R;

const OVERLAY_SEL = '[role="dialog"], [aria-modal="true"], .modal-overlay, .overlay, .screen-sheet--overlay';
const here = () => page.evaluate(() => document.getElementById('screen')?.dataset.screen ?? null);
const text = () => page.evaluate((sel) => {
  const screen = document.getElementById('screen');
  const extra = [...document.querySelectorAll(sel)].filter((o) => !screen?.contains(o)).map((o) => o.innerText);
  return [screen?.innerText ?? '', ...extra].join('\n');
}, OVERLAY_SEL);

/** Assert: on `screen`, visible text has every `has`, none of `not`. */
async function at(desc, screen, { has = [], not = [] } = {}) {
  await settle(page);
  const [id, t] = [await here(), norm(await text())];
  const miss = arr(has).filter((s) => !t.includes(norm(s)));
  const bad = arr(not).filter((s) => t.includes(norm(s)));
  const ok = id === screen && !miss.length && !bad.length;
  check(desc, ok, `[${id}] ${id !== screen ? `expected ${screen}; ` : ''}${miss.length ? `missing ${JSON.stringify(miss)}; ` : ''}${bad.length ? `unexpected ${JSON.stringify(bad)}; ` : ''}`);
  return ok;
}

async function click(sel) {
  const loc = page.locator(sel).first();
  try {
    await loc.waitFor({ state: 'visible', timeout: 3000 });
    await loc.click({ timeout: 3000 });
    await settle(page);
    return true;
  } catch (e) {
    check(`click ${sel}`, false, e.message.split('\n')[0]);
    return false;
  }
}

/** The real persona control: Test flows trigger, then "View as ...". */
async function flip() {
  await click('#flow-trigger');
  await click('#persona-toggle');
}

const flow = async (key) => {
  await page.evaluate((k) => window.Taily.runFlow(k), key);
  await settle(page);
};

/** Fresh boot per journey so no state leaks between them. */
const fresh = async () => { await h.goto('/?test=1'); h.clear(); };

async function journey(id, title, fn) {
  if (!want(id)) return;
  console.log(`\n${id}  ${title}`);
  await fresh();
  try { await fn(); } catch (e) { check(`${id} ran to the end`, false, e.message.split('\n')[0]); }
  const errs = h.errors.splice(0);
  check(`${id} no console or page errors`, !errs.length, errs.join(' | ').slice(0, 200));
}

/** Move the demo clock the way a real wait would (the model's own advanceClock, so expiries run), then repaint a screen. */
const advance = (minutes) => page.evaluate(async (m) => { (await import('/js/state.js')).advanceClock(m); }, minutes);
const paint = async (screen) => { await page.evaluate((id) => window.Taily.render(id), screen); await settle(page); };

const S = SCENARIOS;
const SEED_WHEN = fmtWhen(SEED_SLOT);
const SUGG_WHEN = fmtWhen(SUGGESTED_SLOT);

/* ---------- J1 ---------- */
await journey('J1', 'book -> accept -> Confirmed', async () => {
  await flow('c-pay');
  await click('[data-act="pay"]');
  await at('J1 request sent', 'c-request', { has: ['Waiting for Amara', 'On hold', SEED_WHEN, fmtExact(S.seed.deposit)] });
  await flip();
  await at('J1 tailor home', 't-home', { has: ['Sarah C.', fmtExact(S.seed.payout)] });
  await click('.request-card');
  await at('J1 request card', 't-request', {
    has: [SEED_WHEN, 'Williamsburg · 11211', fmtExact(S.seed.services), fmtExact(S.seed.homeFee), fmtNeg(S.seed.tailyFee)],
    not: '145 N 7th St',
  });
  await click('[data-act="accept"]');
  await at('J1 job after accept', 't-job', { has: ['You accepted', 'Sarah Chen', '145 N 7th St, 2R', SEED_WHEN] });
  await flip();
  await click('[data-nav="bookings"]');
  await at('J1 customer bookings', 'c-bookings', { has: ['Confirmed', 'Amara Reyes', SEED_WHEN] });
  await click('.appt-row');
  await at('J1 booking detail', 'c-booking', {
    has: ['booked with Amara', 'Paid', SEED_WHEN, fmtExact(S.seed.services), fmtExact(S.seed.homeFee)],
    not: 'On hold',
  });
});

/* ---------- J2 ---------- */
await journey('J2', 'suggest -> accept the new time', async () => {
  await flow('t-request');
  await click('[data-act="suggest"]');
  await at('J2 suggest screen', 't-suggest');
  await click('[data-act="send-suggestion"]');
  await at('J2 waiting on Sarah', 't-request', { has: ['Waiting on Sarah', SUGG_WHEN] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J2 customer sees the new time', 'c-request', { has: [SUGG_WHEN] });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));   // where Sarah's thumb is
  const before = await page.evaluate(() => window.scrollY);
  await click('[data-act="accept-time"]');
  await at('J2 booked at the new time', 'c-booking', { has: ['booked with Amara', SUGG_WHEN] });
  /* R3-2-C-01: a new screen opens at its top — the Confirmed pill and "You're booked" are in view */
  const after = await page.evaluate(() => window.scrollY);
  check('J2 c-booking opens scrolled to the top', before > 0 && after === 0, `scrollY before=${before} after=${after}`);
  await flip();
  await at('J2 tailor home', 't-home', { has: [SUGG_WHEN] });
});

/* ---------- J3 ---------- */
await journey('J3', 'decline -> the job is kept', async () => {
  await flow('t-request--decline');
  await click('[data-act="decline-ok"]');
  await at('J3 you declined', 't-request', { has: ['You declined'] });
  await flip();
  await click('[data-nav="bookings"]');
  await at('J3 past row Declined', 'c-bookings', { has: ['Declined'] });
  await click('.appt-row');
  await at('J3 customer sees the decline', 'c-request', { has: ['take this job'] });
  await click('[data-act="find-another"]');
  await at('J3 tailors, job kept', 'c-tailors', { has: ['Declined this job'] });
});

/* ---------- J4 ---------- */
await journey('J4', 'customer cancels late -> tailor keeps the deposit', async () => {
  await flow('c-booking--cancel-late');
  await click('[data-act="cancel-ok"]');
  await at('J4 customer: deposit kept', 'c-booking', { has: ['Kept'] });
  await flip();
  await at('J4 tailor home', 't-home');
  await page.evaluate(() => window.Taily.render('t-job'));
  await at('J4 tailor job: cancelled by Sarah', 't-job', { has: ['Cancelled by Sarah', fmtExact(S.lateCancel.tailorPaid)] });
});

/* ---------- J5 ---------- */
await journey('J5', "tailor can't make it -> customer refunded", async () => {
  await flow('t-job--cant-make-it');
  await click('[data-act="cant-ok"]');
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J5 customer: cancelled by Amara', 'c-booking', { has: ['Cancelled by Amara', 'Refunded', fmtExact(S.earlyCancel.refund)] });
});

/* ---------- J6 (K-01) ---------- */
await journey('J6', 'edit the job -> Sarah approves -> tailoring, both sides read the same ticket', async () => {
  await flow('t-job--visit');
  await click('[data-act="start-fitting"]');
  await at('J6 Start fitting lands on the editor', 't-adjust', { has: ['Edit the job', 'No changes'] });
  await click('[data-act="add-item"]');
  await click('[data-act="pick-type"][data-value="Pants / Jeans"]');
  await click('[data-act="pick-service"][data-value="hem-pants"]');
  await at('J6 new item card', 't-adjust', { has: ['New item', 'Pants / Jeans'] });
  await click('[data-act="remove-line"][data-key="g2:jacket-sides"]');
  await click('[data-act="send"]');
  await at('J6 tailor: waiting on Sarah with what she sent', 't-job', {
    has: ['Waiting on Sarah', 'The order you sent', 'New item', 'Pants / Jeans', '1 item added', fmtExact(S.priceItem.total), fmtExact(S.priceItem.payout)],
  });
  await flip();
  await click('[data-nav="bookings"]');
  await at('J6 customer bookings', 'c-bookings', { has: ['Approve', 'Final order'] });
  await click('.appt-row');
  await at('J6 customer: review the final order', 'c-price-change', {
    has: ['Review your final order', 'New item', 'Pants / Jeans', 'Removed', 'Take in jacket sides', '1 item added', fmtExact(S.priceItem.total),
      fmtExact(S.priceItem.balance), fmtExact(S.seed.deposit), 'Stays the same'],
  });
  await click('[data-act="approve"]');
  await at('J6 customer: in progress', 'c-booking', {
    has: ['In progress', 'approved the order', fmtExact(S.priceItem.balance), 'Your order', 'Pants / Jeans', 'New item', 'Hem pants'],
  });
  await flip();
  await click('.appt-row');
  await at('J6 tailor: approved your changes', 't-job', { has: ['approved your changes', fmtExact(S.priceItem.payout), 'Pants / Jeans', 'Mark ready'] });
});

/* ---------- J6b (K-01) ---------- */
await journey('J6b', 'no changes still needs approval', async () => {
  await flow('t-job--fitting');
  await click('[data-act="edit-order"]');
  await at('J6b editor, nothing touched', 't-adjust', { has: ['Edit the job', 'No changes'] });
  await click('[data-act="send"]');
  await at('J6b tailor: waiting on Sarah', 't-job', { has: ['Waiting on Sarah', 'No changes'] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J6b customer: no changes', 'c-price-change', { has: ['No changes', fmtExact(S.seed.total), 'Approve and start'] });
  await click('[data-act="approve"]');
  await at('J6b customer: in progress', 'c-booking', { has: ['In progress'] });
  await flip();
  await click('.appt-row');
  await at('J6b tailor: work in progress, as booked', 't-job', { has: ['Work in progress', 'approved the order'], not: 'approved your changes' });
});

/* ---------- J7 (D-143) ---------- */
await journey('J7', 'courier return: the three courier amounts match on both sides and stay out of the payout', async () => {
  const cq = S.courierQuote;
  await flow('t-job--in-progress');
  await click('[data-act="mark-ready"]');
  await click('[data-act="ready-ok"]');
  await at('J7 tailor: waiting on Sarah', 't-job', { has: ['Waiting on Sarah'] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J7 customer: ready', 'c-ready');
  await click('[data-act="return"][data-value="courier"]');
  await at('J7 customer: courier quote', 'c-ready', { has: [fmtExact(cq.quote), fmtExact(cq.markup), fmtExact(cq.cents), `Pay ${fmtExact(S.courier.balance)}`] });
  await click('[data-act="pay"]');
  await click('[data-act="pay-ok"]');
  await at('J7 customer: out for delivery', 'c-booking', { has: ['Out for delivery', fmtExact(cq.cents)] });
  await flip();
  await click('.appt-row');
  await at('J7 tailor: courier booked, not her money', 't-job', {
    has: ['Courier booked', 'Courier arrives', 'Paid by Sarah · nothing comes out of your payout', 'Handed to courier', fmtExact(S.seed.payout)],
    not: [fmtExact(cq.quote), fmtExact(cq.markup), fmtExact(cq.cents)],
  });
});

/* ---------- J8 (D-143) ---------- */
await journey('J8', 'completed -> review -> the tailor profile shows it', async () => {
  await flow('t-job--returning-pickup');
  await click('[data-act="complete"]');
  await at('J8 tailor: job completed', 't-job', { has: ['Job completed', fmtExact(S.seed.payout)] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J8 customer: complete', 'c-complete');
  await click('[data-act="leave-review"]');
  await click('label:has(input[name="stars"][value="5"])');
  await click('[data-act="post"]');
  await at('J8 customer: thanks', 'c-review', { has: ['Thanks, Sarah'] });
  await click('[data-act="see-profile"]');
  await at('J8 customer: the review on the profile', 'c-tailor', { has: ['Sarah C.', `${AMARA.rating.count + 1} reviews`] });
  await flip();
  await page.evaluate(() => window.Taily.render('t-job'));
  await settle(page);
  const stars = await page.locator('[aria-label="5 out of 5 stars"]').count();
  check('J8 tailor sees the 5-star review (by aria-label)', stars > 0, `found ${stars}`);
});

/* ---------- J9 (D-143) ---------- */
/** Send from the keyboard: at 390 wide the pinned Test-flows trigger sits over the Send button (it appears on the first keystroke). */
const send = async () => { await page.press('#composer-input', 'Enter'); await settle(page); };
await journey('J9', 'one thread from a question to a booking; a typed phone number is hidden on both sides', async () => {
  const phoneTail = CUSTOMER.phone.slice(-8);
  await flow('c-tailor');
  await click('[data-act="ask"]');
  await page.fill('#composer-input', CHAT.ask);
  await send();
  await at('J9 customer: the question, no booking yet', 'c-thread', { has: [CHAT.ask, 'No booking yet'] });
  await flip();
  await click('[data-nav="messages"]');
  await at('J9 tailor: Messages', 't-messages', { has: ['Sarah C.', '1 unread'], not: 'Sarah Chen' });
  await click('.thread-row');
  await at('J9 tailor: the question', 't-thread', { has: [CHAT.ask, 'Sarah C.'] });
  await page.fill('#composer-input', CHAT.reply);
  await send();
  await at('J9 tailor: replied', 't-thread', { has: [CHAT.reply] });
  await flip();
  await click('[data-nav="messages"]');
  await at('J9 customer: Messages', 'c-messages', { has: ['Amara Reyes', 'book a visit'] });
  await click('.thread-row');
  await click('[data-act="open-profile"]');
  await at('J9 customer: Amara profile', 'c-tailor');
  await click('[data-act="pick-time"]');
  await click('[data-act="slot-next"]');
  await click('[data-act="pay"]');
  await at('J9 customer: request sent', 'c-request');
  await click('[data-act="message"]');
  await at('J9 customer: the SAME thread carries the request', 'c-thread', { has: [CHAT.ask, 'book a visit', 'You sent a request', '2h left'] });
  await page.fill('#composer-input', CHAT.phoneCustomer);
  await at('J9 customer: the live hint', 'c-thread', { has: ['hidden when you send'] });
  await send();
  await at('J9 customer: number hidden, note on her side', 'c-thread', { has: ['phone hidden', 'stay private on Taily'], not: phoneTail });
  await flip();
  await click('[data-nav="messages"]');
  await click('.thread-row');
  await at('J9 tailor: number hidden, request noted', 't-thread', { has: ['phone hidden', 'Sarah sent a request', 'New request'], not: phoneTail });
  const themNotes = await page.locator('.chat-msg--them .chat-msg__note').count();
  check('J9 tailor: no privacy note under the other side bubble', themNotes === 0, `found ${themNotes}`);
  await click('[data-act="open-appt"]');
  await at('J9 tailor: the request', 't-request');
  await click('[data-act="accept"]');
  await click('[data-nav="messages"]');
  await click('.thread-row');
  await at('J9 tailor: accepted line', 't-thread', { has: ['You accepted', 'Sarah Chen'] });
  await flip();
  await click('[data-nav="messages"]');
  await click('.thread-row');
  await at('J9 customer: accepted line', 'c-thread', { has: ['Amara accepted', 'Confirmed'] });
});

/* ---------- J10 (D-85, D-94) ---------- */
await journey('J10', 'the expiry loop: no reply, Try again, Sent again, expire twice, no tailors left', async () => {
  const wait = POLICY.REQUEST_EXPIRY_H * 60;
  await flow('c-pay');
  await click('[data-act="pay"]');
  await at('J10 request sent', 'c-request', { has: ['Waiting for Amara', 'On hold'] });
  await advance(wait);
  await paint('c-request');
  await at('J10 no reply, hold released, first retry', 'c-request', { has: ['No reply', 'hold was released', 'Try again (1 of 2)'], not: 'On hold' });
  await click('[data-act="try-again"]');
  await at('J10 sent again', 'c-request', { has: ['Waiting for Amara', 'On hold'] });
  await flip();
  await at('J10 tailor home: Sent again', 't-home', { has: ['Sent again', fmtExact(S.seed.payout)] });
  await flip();
  await advance(wait);
  await paint('c-request');
  await at('J10 no reply again, last try', 'c-request', { has: ['No reply', 'Try again (2 of 2)', 'Last try'] });
  await click('[data-act="try-again"]');
  await advance(wait);
  await paint('c-request');
  await at('J10 no retries left', 'c-request', { has: ['didn’t reply again', 'Find another tailor'], not: 'Try again' });
  await click('[data-act="find-another"]');
  await at('J10 no tailors left', 'c-tailors', { has: ['No other tailors for this job yet'] });
  await flip();
  await paint('t-request');
  await at('J10 tailor: expired for good', 't-request', { has: ['This request expired', 'This job has gone to other tailors'], not: 'send it again' });
});

/* ---------- J11 (D-24, D-136) ---------- */
await journey('J11', 'payout lifecycle: scheduled for the Friday, then paid; the fee and the payout in dollars', async () => {
  const friday = fmtDay(PAYOUT_DAYS.first);
  await page.evaluate(async () => {
    const c = await import('/js/fixtures/common.js');
    c.completeJob(c.driveTo('confirmed').id);
  });
  await page.keyboard.press('Shift');                       // the Test-flows control appears on the first input
  await flip();
  await click('[data-nav="earnings"]');
  await at('J11 earnings: pending, the Friday it arrives', 't-earnings', { has: [fmtExact(S.seed.payout), `Arrives ${friday}`, '1 job'], not: 'Paid to' });
  await click('[data-act="open-payout"]');
  await at('J11 payout: pending, fee and payout in dollars', 't-payout', { has: ['Pending', fmtNeg(S.seed.tailyFee), fmtExact(S.seed.payout), fmtExact(S.seed.services)] });
  await page.evaluate(async (day) => {
    const st = await import('/js/state.js');
    st.setClock(`${day}T18:00`);
    st.T.settlePayouts();
  }, PAYOUT_DAYS.first);
  await paint('t-earnings');
  await at('J11 earnings: paid', 't-earnings', { has: ['Paid', friday, fmtExact(S.seed.payout)], not: 'Arrives' });
  await click('[data-act="open-payout"]');
  await at('J11 payout: paid, fee and payout in dollars', 't-payout', { has: ['Paid', fmtNeg(S.seed.tailyFee), fmtExact(S.seed.payout)], not: 'Pending' });
});

/* ---------- J12 (D-154) ---------- */
await journey('J12', 'a suggested time lapses: both sides end it, the hold is released', async () => {
  await flow('t-request');
  await click('[data-act="suggest"]');
  await click('[data-act="send-suggestion"]');
  await at('J12 waiting on Sarah', 't-request', { has: ['Waiting on Sarah', SUGG_WHEN] });
  await advance(24 * 60);
  await paint('t-request');
  await at('J12 tailor: the suggestion lapsed', 't-request', { has: ['Your suggested time passed', 'didn’t accept in time', 'Back to Home'], not: 'Withdraw suggestion' });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J12 customer: the time is no longer held, hold released', 'c-request', {
    has: ['suggested time has passed', 'hold is released', 'Released', 'Find another tailor'], not: ['Accept new time', 'Try again'],
  });
});

console.log(`\n${R.passes} journey checks passed, ${R.failures} failed.`);
await h.close();
process.exit(R.failures ? 1 : 0);
