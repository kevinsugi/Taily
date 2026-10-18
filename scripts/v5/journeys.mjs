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
     J6  edit the job (new item, service off) with before / pinned photos and a comment -> Sarah approves -> tailoring (K-01, K-02)
     J6b no changes still needs Sarah's approval, and photos are required (K-01, K-02)
     J7  courier return, money identical on both sides, never in the payout (D-143); the tailor sees no courier money (D-160)
     J8  completed -> review -> c-tailor shows it (D-143)
     J9  one thread from a question to a booking, masked on both sides (D-143)
     J10 the expiry loop: no reply -> Send request again -> Sent again -> expire twice -> no tailors left (D-85, D-94)
     J11 payout lifecycle: completed -> Pending (the Friday) -> the Friday run -> Paid, fee and payout in dollars (D-24, D-136)
     J12 a suggested time lapses: both sides end it and the hold is released (D-154)
     J13 Book now on the profile opens the picker on the next opening; one tap confirms it into review (K-18)
     J15 pickup with the code (Study-1 A2–A4, K-40): pick the time (Hold waits for it), Hold, move the time (Amara sees it), Sarah's code, a wrong code,
         the right code completes both sides, Job Done
     J16 pickup without the code (Study-1 A3, K-37 — was the drop-off): Amara marks it picked up -> the 47h countdown on both sides -> "I didn't get it"
         pauses it -> "I got it" completes
     J17 the clock (Study-1 A2–A3): +48 hours (Demo actions) auto-completes a marked pickup; +7 days captures an unclaimed hold, the job stays open
     J18 edit after the fitting (Study-1 B1–B2, K-30 overruled): a private note; Amara edits the job (price, reason) -> Mark ready waits ->
         Sarah sees "Amara edited your order" (Approve / Message, no decline) and messages -> Amara revises (price back, later date) ->
         Sarah approves -> Mark ready
     J14 the anchored popover (K-25): a garment thumb toggles it, another thumb moves it, Escape returns focus, it flips above near the
         window bottom, the Verified check shares its one slot; t-home's count cluster lists every item and the card still opens the request

   node scripts/v5/journeys.mjs [J1 J2 ...]
   ============================================================ */

import { open, reporter, settle } from './lib/browser.mjs';
import { SCENARIOS, SEED_SLOT, fmtExact, fmtNeg } from './money.mjs';
import { SUGGESTED_SLOT, AMARA, JOB_EDIT } from '../../js/fixtures/money-scenarios.js';
import { CHAT, FITTING_COMMENTS, EDIT_REASON, NOTE_TEXT } from '../../js/fixtures/common.js';
import { CUSTOMER } from '../../js/data.js';
import { fmtWhen, fmtDay, isoDay, addDays } from '../../js/dates.js';
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

/** Press a control inside #screen from the page (the pinned Test-flows trigger appears on the first keystroke and covers the bar, see J9). */
async function press(sel) {
  await page.evaluate((q) => document.querySelector(`#screen ${q}`)?.click(), sel);
  await settle(page);
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
const PICKUP_CODE = '8153';   // handoffCode() of the first appointment (A-1001), the copy deck's code
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
  await at('J2 waiting on Sarah', 't-request', { has: ['You suggested a new time', SUGG_WHEN] });
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
  await at('J3 customer sees the decline', 'c-request', { has: ['declined your request'] });
  await click('[data-act="find-another"]');
  await at('J3 tailors, job kept', 'c-tailors', { has: ['Declined this request'] });
});

/* ---------- J4 ---------- */
await journey('J4', 'customer cancels late -> tailor keeps the deposit', async () => {
  await flow('c-booking--cancel-late');
  await click('[data-act="cancel-ok"]');
  await at('J4 customer: deposit kept', 'c-booking', { has: ['Kept'] });
  await flip();
  await at('J4 tailor home', 't-home');
  await page.evaluate(() => window.Taily.render('t-job'));
  await at('J4 tailor job: cancelled by Sarah', 't-job', { has: ['Sarah cancelled', fmtExact(S.lateCancel.tailorPaid)] });
});

/* ---------- J5 ---------- */
await journey('J5', "tailor can't make it -> customer refunded", async () => {
  await flow('t-job--cancel');
  await click('[data-act="cant-ok"]');
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J5 customer: cancelled by Amara', 'c-booking', { has: ['Amara can’t make it', 'Refunded', fmtExact(S.earlyCancel.refund)] });
});

/* ---------- J6 (K-01) ---------- */
await journey('J6', 'edit the job -> Sarah approves -> tailoring, both sides read the same ticket', async () => {
  await flow('t-job--visit');
  await click('[data-act="start-fitting"]');
  await at('J6 Start fitting lands on the editor', 't-adjust', { has: ['Edit the job', 'No changes'] });
  await click('[data-act="add-item"]');
  await click('[data-act="pick-type"][data-value="Pants / Jeans"]');
  await click('[data-act="pick-service"][data-value="hem-pants"]');
  await at('J6 new item card', 't-adjust', { has: ['New item', 'Pants / Jeans', 'Add before and pinned photos for 3 items'] });
  for (const g of ['g1', 'g2', 'n1']) {
    await click(`[data-garment="${g}"] [data-act="add-doc"][data-kind="before"]`);
    await click(`[data-garment="${g}"] [data-act="add-doc"][data-kind="pinned"]`);
  }
  await at('J6 every item photographed: Send is on', 't-adjust', { has: ['1 of 4'], not: 'Add before and pinned photos for' });
  await click('[data-garment="g1"] [data-act="view-doc"][data-kind="before"]');
  await at('J6 the viewer', 't-adjust', { has: ['Suit Pant · Before', 'Remove photo'] });
  await click('[data-act="doc-remove"]');
  await at('J6 removing the only Before photo turns Send off again', 't-adjust', { has: ['Required', 'Add before and pinned photos for 1 item'] });
  await click('[data-garment="g1"] [data-act="add-doc"][data-kind="before"]');
  await click('[data-garment="g2"] [data-act="add-comment"]');
  await page.fill('#comment-g2', FITTING_COMMENTS.g2);
  await click('[data-garment="g2"] [data-act="save-comment"]');
  await at('J6 the comment is saved on the card', 't-adjust', { has: ['Your comment', FITTING_COMMENTS.g2] });
  await click('[data-act="remove-line"][data-key="g2:jacket-sides"]');
  await press('[data-act="send"]');
  await at('J6 tailor: waiting on Sarah with what she sent', 't-job', {
    has: ['Waiting on Sarah', 'THE ORDER YOU SENT', 'New item', 'Pants / Jeans', '1 item added', fmtExact(S.priceItem.total), fmtExact(S.priceItem.payout),
      'photos', 'Your comment', FITTING_COMMENTS.g2],
  });
  await flip();
  await click('[data-nav="bookings"]');
  await at('J6 customer bookings', 'c-bookings', { has: ['Approve', 'Final order'] });
  await click('.appt-row');
  await at('J6 customer: review the final order', 'c-price-change', {
    has: ['Approve your final order', 'New item', 'Pants / Jeans', 'Removed', 'Take in jacket sides', '1 item added', fmtExact(S.priceItem.total),
      fmtExact(S.priceItem.balance), fmtExact(S.seed.deposit), 'Stays the same', 'photos', 'Amara’s comment', FITTING_COMMENTS.g2],
  });
  await click('[data-garment="n1"] [data-act="view-photos"]');
  await click('[data-s="docs-viewer"] [data-act="docs-tab"][data-kind="pinned"]');
  await at('J6 customer: the new item’s viewer has its Pinned tab', 'c-price-change', { has: ['Pants / Jeans · Pinned'] });
  await page.keyboard.press('Escape');
  await settle(page);
  await click('[data-act="approve"]');
  await at('J6 customer: in progress', 'c-booking', {
    has: ['working on it', 'approved the order', fmtExact(S.priceItem.balance), 'YOUR ORDER', 'Pants / Jeans', 'New item', 'Hem pants', 'Amara’s comment', FITTING_COMMENTS.g2],
  });
  await flip();
  await click('.appt-row');
  await at('J6 tailor: approved your changes', 't-job', { has: ['Sarah approved', fmtExact(S.priceItem.payout), 'Pants / Jeans', 'Mark ready', 'Your comment', FITTING_COMMENTS.g2] });
});

/* ---------- J6b (K-01) ---------- */
await journey('J6b', 'no changes still needs approval', async () => {
  await flow('t-job--fitting');
  await click('[data-act="edit-order"]');
  await at('J6b editor, nothing touched', 't-adjust', { has: ['Edit the job', 'No changes', 'Add before and pinned photos for 2 items'] });
  await press('[data-act="send"]');
  await at('J6b Send is off until every item has photos', 't-adjust', { has: ['Edit the job', 'Add before and pinned photos for 2 items'] });
  for (const g of ['g1', 'g2']) {
    await click(`[data-garment="${g}"] [data-act="add-doc"][data-kind="before"]`);
    await click(`[data-garment="${g}"] [data-act="add-doc"][data-kind="pinned"]`);
  }
  await press('[data-act="send"]');
  await at('J6b tailor: waiting on Sarah', 't-job', { has: ['Waiting on Sarah', 'No changes'] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J6b customer: no changes', 'c-price-change', { has: ['No changes', fmtExact(S.seed.total), 'Approve and start'] });
  await click('[data-act="approve"]');
  await at('J6b customer: in progress', 'c-booking', { has: ['working on it'] });
  await flip();
  await click('.appt-row');
  await at('J6b tailor: work in progress, as booked', 't-job', { has: ['In progress', 'Mark ready'], not: ['Sarah approved', 'Work in progress'] });
});

/* ---------- J7 (D-143) ---------- */
await journey('J7', 'courier return: the three courier amounts match on both sides and stay out of the payout', async () => {
  const cq = S.courierQuote;
  await flow('t-job--in-progress');
  await click('[data-act="mark-ready"]');
  await click('[data-act="ready-ok"]');
  await at('J7 tailor: waiting on Sarah', 't-job', { has: ['Ready · Sarah is choosing how to get it back'] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J7 customer: ready', 'c-ready');
  await click('[data-act="return"][data-value="courier"]');
  await at('J7 customer: courier chosen, the window first (K-40)', 'c-ready', { has: ['Pick a delivery window', 'plus the courier fee', 'Pick a delivery window first.'], not: ['Uber quote', `Hold ${fmtExact(S.courier.balance)}`] });
  await click('[data-act="pick-time"]');
  await at('J7 customer: the window sheet prices the courier', 'c-ready', { has: ['Pick a delivery window', `Courier ${fmtExact(cq.cents)} · collects from Amara at`, 'Use this window'] });
  await click('[data-act="ht-ok"]');
  await at('J7 customer: courier quote', 'c-ready', { has: ['Fri, Oct 16 · 10:30–11:00 AM', fmtExact(cq.quote), fmtExact(cq.markup), fmtExact(cq.cents), `Hold ${fmtExact(S.courier.balance)}`] });
  await click('[data-act="pay"]');
  await click('[data-act="pay-ok"]');
  await at('J7 customer: courier booked', 'c-booking', { has: ['Courier booked · arrives Fri, Oct 16 · 10:30–11:00 AM', 'The courier collects from Amara at 10:15 AM', fmtExact(cq.cents)] });
  await flip();
  await click('.appt-row');
  await at('J7 tailor: courier booked, not her money', 't-job', {
    has: ['Courier collects 10:15 AM · arrives 10:30–11:00 AM', 'Only she can change it.', 'Paid by Sarah · nothing comes out of your payout', fmtExact(S.seed.payout)],
    not: [fmtExact(cq.quote), fmtExact(cq.markup), fmtExact(cq.cents), 'Handed to courier'],
  });
});

/* ---------- J8 (D-143) ---------- */
await journey('J8', 'completed -> review -> the tailor profile shows it', async () => {
  await flow('t-job--handoff-pickup');
  await click('[data-act="picked-up"]');
  await page.fill('#handoff-code', PICKUP_CODE);
  await press('[data-act="pickup-ok"]');
  await at('J8 tailor: job completed', 't-job', { has: ['JOB COMPLETED', 'Nice work, Amara.', fmtExact(S.seed.payout)] });   // K-20: the linen stage's eyebrow + title
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J8 customer: complete', 'c-complete');
  await click('label:has(input[name="rate"][value="5"])');   // CR-3: the star card is the one action; the tap carries the rating into c-review
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
  await at('J10 no reply, hold released, first retry', 'c-request', { has: ['reply in time', 'hold was released', 'Send request again'], not: 'On hold' });
  await click('[data-act="try-again"]');
  await at('J10 sent again', 'c-request', { has: ['Waiting for Amara', 'On hold'] });
  await flip();
  await at('J10 tailor home: Sent again', 't-home', { has: ['Sent again', fmtExact(S.seed.payout)] });
  await flip();
  await advance(wait);
  await paint('c-request');
  await at('J10 no reply again, last try', 'c-request', { has: ['reply in time', 'Send again (last try)', 'send it once more'] });
  await click('[data-act="try-again"]');
  await advance(wait);
  await paint('c-request');
  await at('J10 no retries left', 'c-request', { has: ['didn’t reply again', 'Find another tailor'], not: 'Try again' });
  await click('[data-act="find-another"]');
  await at('J10 no tailors left', 'c-tailors', { has: ['No other tailors for this request yet'] });
  await flip();
  await paint('t-request');
  await at('J10 tailor: expired for good', 't-request', { has: ['This request expired', 'Sarah can now book another tailor.'], not: 'send it again' });
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
  await at('J12 waiting on Sarah', 't-request', { has: ['You suggested a new time', SUGG_WHEN] });
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

/* ---------- J13 (K-18) ---------- */
await journey('J13', 'Book now takes the next opening: the picker opens on it and one tap carries it to review', async () => {
  await flow('c-tailor');
  const next = await page.evaluate(async () => { const m = await import('/js/state.js'); const t = m.state.tailors[0]; return m.nextOpening(t.id, m.state.job.visitType, { until: m.state.job.needBy }); });
  check('J13 the profile shows an opening to book', !!next, String(next));
  await click('[data-act="book-now"]');
  await at('J13 the picker', 'c-book', { has: ['Pick a time', 'Next: review and send', 'Step 4 of 5'] });
  const drafted = await page.evaluate(() => window.Taily.state.ui.booking?.slot);
  check('J13 the opening is already in the booking draft', drafted === next, `${drafted} vs ${next}`);
  await click('[data-act="slot-next"]');
  await at('J13 review and send', 'c-pay', { has: ['Review and send request'] });
  const kept = await page.evaluate(() => window.Taily.state.ui.booking?.slot);
  check('J13 the same time reaches review', kept === next, `${kept} vs ${next}`);
});

/* ---------- J15 (Study-1 A2–A4) ---------- */
await journey('J15', 'pickup with the code: hold at the choice, the code, a wrong code, the right code completes both sides', async () => {
  const bal = fmtExact(S.seed.balance);
  await flow('c-ready');
  await click('[data-act="return"][data-value="pickup"]');
  await at('J15 customer: what holding means; the time first (K-40)', 'c-ready', { has: [`Hold ${bal}`, `We’ll hold ${bal} now and charge it when you get your garments.`, 'If you haven’t got it 7 days after you choose', 'Pick a time', 'Pick a pickup time first.'], not: `Pay ${bal}` });
  await click('[data-act="pick-time"]');
  await at('J15 customer: the Scheduler sheet', 'c-ready', { has: ['Pick a pickup time', 'Fri, Oct 16 · 10:00 AM', 'Use this time'] });
  await click('[data-act="ht-ok"]');
  await at('J15 customer: the time picked, Hold is on', 'c-ready', { has: ['Fri, Oct 16 · 10:00 AM', 'Pickup Fri, Oct 16 · 10:00 AM · Free', `Hold ${bal}`], not: 'Pick a pickup time first.' });
  await click('[data-act="pay"]');
  await at('J15 customer: the hold sheet', 'c-ready', { has: ['Hold the balance', `Hold ${bal}`] });
  await click('[data-act="pay-ok"]');
  await at('J15 customer: on hold, the pickup code', 'c-booking', { has: ['Pickup Fri, Oct 16 · 10:00 AM · show your code at the shop', 'On hold', bal, 'YOUR PICKUP CODE', PICKUP_CODE, 'I got it', 'Change time'], not: 'Paid in full' });
  await click('[data-act="change-time"]');
  await at('J15 customer: change the time', 'c-booking', { has: ['Change pickup time', 'Booked for Fri, Oct 16 · 10:00 AM', 'NEW TIME', 'Move my pickup'] });
  await click('[data-act="ht-ok"]');
  await at('J15 customer: moved', 'c-booking', { has: ['Pickup Fri, Oct 16 · 10:30 AM · show your code at the shop', 'You moved it from Fri, Oct 16 · 10:00 AM'] });
  await flip();
  await click('.appt-row');
  await at('J15 tailor: Sarah moved her pickup; only she can change it', 't-job', { has: ['Sarah moved her pickup to Fri, Oct 16 · 10:30 AM', 'Sarah moved it from Fri, Oct 16 · 10:00 AM', 'Only Sarah can change the time.', 'Picked up'], not: 'Mark completed' });
  await click('[data-act="picked-up"]');
  await page.fill('#handoff-code', '0000');
  await press('[data-act="pickup-ok"]');
  await at('J15 tailor: a wrong code, next to the field', 't-job', { has: ['Enter Sarah’s pickup code', 'That code doesn’t match. Ask Sarah to check her booking.'] });
  await page.fill('#handoff-code', PICKUP_CODE);
  await press('[data-act="pickup-ok"]');
  await at('J15 tailor: completed, the payout pending', 't-job', { has: ['JOB COMPLETED', 'Nice work, Amara.', 'Picked up at your shop', fmtExact(S.seed.payout), 'Pending'] });
  await click('[data-nav="home"]');
  await at('J15 tailor: the Completed list', 't-home', { has: ['COMPLETED', 'Payout pending', fmtExact(S.seed.payout)] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J15 customer: Job Done', 'c-complete', { has: ['ORDER COMPLETE', `Charged ${bal}`, 'Leave a review', 'Book Amara again', 'Message Amara'] });
  await click('[data-act="book-again"]');
  await at('J15 customer: Book again starts on Home with Amara named', 'c-job', { has: ['Booking again with Amara', 'What needs work?'] });
});

/* ---------- J16 (Study-1 A3) ---------- */
await journey('J16', 'pickup without the code: Amara marks it, the countdown both sides, a reported problem pauses it, I got it completes', async () => {
  await flow('t-job--handoff-pickup');
  await click('[data-act="picked-up"]');
  await press('[data-act="no-code"]');
  await at('J16 tailor: marked picked up, the countdown', 't-job', { has: ['Marked as picked up', 'Completes automatically in 47h unless Sarah reports a problem'], not: ['Enter Sarah’s pickup code', 'Only Sarah can change the time'] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J16 customer: marked, the countdown', 'c-booking', { has: ['Amara marked it picked up', 'Completes automatically in 47h unless you report a problem', 'I got it', 'I didn’t get it'], not: 'Change time' });
  await click('[data-act="not-got-it"]');
  await at('J16 customer: the report sheet', 'c-booking', { has: ['Didn’t get it?', 'We’ll stop the automatic completion and tell Amara. Nothing is charged while you sort it out in chat.', 'Report a problem', 'Keep waiting'] });
  await click('[data-act="nr-ok"]');
  await at('J16 customer: problem reported, the countdown stopped', 'c-booking', { has: ['You reported a problem. We’ve stopped the automatic completion and told Amara.', 'I got it'], not: ['Completes automatically', 'I didn’t get it'] });
  await advance(3 * 24 * 60);
  await paint('c-booking');
  await at('J16 customer: three days on, still open (paused)', 'c-booking', { has: ['You reported a problem', 'On hold'] });
  await flip();
  await click('.appt-row');
  await at('J16 tailor: Sarah didn’t get it', 't-job', { has: ['Sarah says she didn’t get it. Sort it out in chat.', 'Message Sarah'], not: 'Completes automatically' });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await click('[data-act="got-it"]');
  await at('J16 customer: got everything?', 'c-booking', { has: ['Got everything?', `We’ll charge the ${fmtExact(S.seed.balance)} on hold and close the order.`, 'Yes, I got it', 'Not yet'] });
  await click('[data-act="got-ok"]');
  await at('J16 customer: Job Done', 'c-complete', { has: ['ORDER COMPLETE', `Charged ${fmtExact(S.seed.balance)}`, 'Leave a review'] });
  await flip();
  await click('.appt-row');
  await at('J16 tailor: completed', 't-job', { has: ['Nice work, Amara.', 'Picked up at your shop', fmtExact(S.seed.payout)] });
});

/* ---------- J17 (Study-1 A2–A3) ---------- */
/** A Demo action from the real Test-flows menu (moves the demo clock or delivers the courier on the live state). */
const demo = async (id) => { await page.mouse.move(5, 5); await page.mouse.move(10, 10); await click('#flow-trigger'); await click(`[data-demo="${id}"]`); };   // the first input reveals the pinned control
await journey('J17', 'the clock: +48 hours auto-completes a marked pickup; +7 days captures an unclaimed hold and the job stays open', async () => {
  const bal = fmtExact(S.seed.balance);
  await flow('t-job--handoff-pickup-marked');
  await advance(47 * 60);
  await paint('t-job');
  await at('J17 tailor: the last hour', 't-job', { has: ['Completes automatically in less than 1h unless Sarah reports a problem'] });
  await demo('h1');
  await at('J17 tailor: completed automatically at the 48h mark', 't-job', { has: ['COMPLETED AUTOMATICALLY · SARAH’S ORDER', fmtExact(S.seed.payout)] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J17 customer: completed automatically, charged', 'c-complete', { has: ['COMPLETED AUTOMATICALLY · SAT, OCT 17', `Charged ${bal}`, 'Leave a review'] });
  await demo('d7');
  await click('[data-nav="home"]');
  await at('J17 customer: a week later, the review reminder on Home', 'c-job', { has: ['How did Amara do?', 'It’s been a week since your order came back. Your review helps other customers.', 'Leave a review'] });
  await flow('c-booking--handoff-pickup');
  await demo('d7');
  await at('J17 customer: charged after 7 days, still open', 'c-booking', { has: [`We charged the ${bal} on hold after 7 days. Amara still keeps it for you until you pick it up.`, 'Charged', 'YOUR PICKUP CODE', `Ready · ${bal} charged`], not: 'On hold' });
  await flip();
  await click('.appt-row');
  await at('J17 tailor: charged, paid at the handoff', 't-job', { has: [`Sarah’s ${bal} was charged after 7 days. You’re paid when she picks it up.`, 'Picked up'] });
  await click('[data-nav="earnings"]');
  await at('J17 tailor: nothing paid out yet', 't-earnings', { not: fmtExact(S.seed.payout) });
});

/* ---------- J18 (Study-1 B1–B2, K-30 overruled) ---------- */
await journey('J18', 'edit after the fitting: Mark ready waits -> Sarah messages (no decline) -> Amara revises -> Sarah approves -> Mark ready', async () => {
  const ask = 'Can we keep the sleeves at the price we agreed? A few more days is fine.';
  const dueIso = isoDay(addDays('2026-10-23', JOB_EDIT.dueDays));   // the seed's need-by, three days later (the fixtures' edit)
  const due = fmtDay(dueIso);
  await flow('t-job--in-progress');
  await click('[data-act="note-add"]');
  await page.fill('#note-text', NOTE_TEXT.measure);
  await press('[data-act="note-save"]');
  await at('J18 tailor: a private note on the job', 't-job', { has: ['Only you can see these notes.', NOTE_TEXT.measure] });
  await press('[data-act="edit-job"]');
  await at('J18 tailor: edit the job after the fitting', 't-adjust', { has: ['AFTER THE FITTING', 'Edit the job', 'Change the price, the due date or the work to send it.'], not: 'Work done so far' });
  await page.fill('#price-g2-sleeves', String(AMARA.prices.sleeves + JOB_EDIT.sleevesUp));
  await press('[data-act="send"]');
  await at('J18 tailor: the reason is required', 't-adjust', { has: ['Tell Sarah why you’re changing it.'], not: 'whole-dollar amount' });
  await page.fill('#edit-reason', EDIT_REASON);
  await press('[data-act="send"]');
  await at('J18 tailor: waiting on Sarah, Mark ready waits', 't-job', { has: ['Waiting on Sarah to approve your changes', 'Your reason', EDIT_REASON, 'Sarah hasn’t answered your changes yet.', fmtExact(S.edit.payout)], not: 'declines' });
  const off = await page.locator('#screen ~ .action-bar [data-act="mark-ready"], .action-bar [data-act="mark-ready"]').first().isDisabled();
  check('J18 tailor: Mark ready is off while the edit is pending', off, 'enabled');
  await flip();
  await click('[data-nav="bookings"]');
  await at('J18 customer: Bookings says approve', 'c-bookings', { has: ['Approve'] });
  await click('.appt-row');
  await at('J18 customer: Amara edited your order — approve or message, no decline', 'c-price-change', { has: ['Amara edited your order', 'Amara’s reason', EDIT_REASON, 'New price', fmtExact(S.edit.total), 'Approve changes', 'Message Amara'], not: [NOTE_TEXT.measure, 'Approve and start', 'Decline and get my items back', 'If you decline', 'Work done so far'] });
  await click('[data-act="message"]');
  await page.fill('#composer-input', ask);
  await send();
  await at('J18 customer: she tells Amara', 'c-thread', { has: [ask] });
  await flip();
  await click('[data-nav="messages"]');
  await click('.thread-row');
  await at('J18 tailor: Sarah’s message', 't-thread', { has: [ask] });
  await click('[data-nav="home"]');
  await click('.appt-row');
  await at('J18 tailor: still waiting on Sarah', 't-job', { has: ['Waiting on Sarah to approve your changes'] });
  await press('[data-act="edit-job"]');
  await at('J18 tailor: revising replaces the pending changes', 't-adjust', { has: ['Sarah hasn’t answered your changes yet. Sending again replaces them.'] });
  await page.fill('#price-g2-sleeves', String(AMARA.prices.sleeves));
  await press('[data-act="edit-due"]');
  await click(`[data-act="pick-due"][data-value="${dueIso}"]`);
  await at('J18 tailor: the price back, a later due date', 't-adjust', { has: [`New due date ${due}`] });
  await press('[data-act="send"]');
  await at('J18 tailor: the revision is waiting on Sarah', 't-job', { has: ['Waiting on Sarah to approve your changes', `New due date ${due}`, fmtExact(S.seed.payout)], not: 'YOUR CHANGES' });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J18 customer: the revised changes — the date only', 'c-price-change', { has: ['Amara edited your order', `New due date ${due}`, 'Total', fmtExact(S.seed.total), 'Approve changes'], not: ['WHAT CHANGED', 'New total', 'Decline and get my items back'] });
  await click('[data-act="approve-edit"]');
  await at('J18 customer: approved, Amara carries on', 'c-booking', { has: ['Amara is working on it'] });
  await flip();
  await click('.appt-row');
  await at('J18 tailor: Sarah approved, Mark ready is back', 't-job', { has: ['Sarah approved your changes', NOTE_TEXT.measure] });
  const on = await page.locator('.action-bar [data-act="mark-ready"]').first().isEnabled();
  check('J18 tailor: Mark ready works once Sarah approved', on, 'disabled');
  await click('[data-act="mark-ready"]');
  await click('[data-act="ready-ok"]');
  await at('J18 tailor: ready', 't-job', { has: ['Ready · Sarah is choosing how to get it back'] });
});

/* ---------- J14 (K-25) ---------- */
await journey('J14', 'The garment popover: toggle, move, Escape, flip, one slot with Verified; the request card still opens', async () => {
  const pop = () => page.evaluate(() => {
    const p = document.querySelector('#screen .anchor-pop');
    const open = [...document.querySelectorAll('#screen [aria-expanded="true"][aria-controls]')].map((b) => b.dataset.peekLabel ?? (b.hasAttribute('data-verified') ? 'verified' : '?'));
    return { id: p?.id ?? null, side: p?.dataset.side ?? null, text: p?.innerText.replace(/\s+/g, ' ').trim() ?? '', open, focus: document.activeElement?.dataset?.peekLabel ?? document.activeElement?.id ?? document.activeElement?.tagName };
  });
  const PANT = '#screen .person-block .garment-strip__btn[data-peek-label="Suit Pant"]';
  const JACKET = '#screen .person-block .garment-strip__btn[data-peek-label="Suit Jacket"]';
  await flow('c-booking--confirmed');
  await click(PANT);
  let p = await pop();
  check('J14 a thumb opens the garment popover', p.id === 'garment-pop' && p.text.includes('Suit Pant') && p.text.includes('Hem pants') && p.open.join() === 'Suit Pant', JSON.stringify(p));
  check('J14 no prices in it', !/\$\d/.test(p.text), p.text);
  await click(PANT);
  p = await pop();
  check('J14 a second tap closes it, focus on the thumb', p.id === null && !p.open.length && p.focus === 'Suit Pant', JSON.stringify(p));
  await click(PANT);
  await click(JACKET);
  p = await pop();
  check('J14 another thumb moves it in one tap', p.id === 'garment-pop' && p.text.includes('Suit Jacket') && p.text.includes('Take in jacket sides') && !p.text.includes('Hem pants') && p.open.join() === 'Suit Jacket', JSON.stringify(p));
  await page.keyboard.press('Escape');
  await settle(page);
  p = await pop();
  check('J14 Escape closes it and returns focus to the thumb', p.id === null && !p.open.length && p.focus === 'Suit Jacket', JSON.stringify(p));
  await click(JACKET);
  await click('#screen .person-block [data-verified]');
  p = await pop();
  check('J14 the Verified check takes the same slot (one open at a time)', p.id === 'verified-pop' && p.open.join() === 'verified' && !(await page.$('#garment-pop')), JSON.stringify(p));
  await page.mouse.click(8, 300);
  await settle(page);
  p = await pop();
  check('J14 an outside tap closes it', p.id === null && !p.open.length, JSON.stringify(p));
  /* near the window bottom it opens above, arrow down */
  const vp = page.viewportSize();
  const low = await page.evaluate((q) => Math.round(document.querySelector(q).getBoundingClientRect().bottom + 60), JACKET);   // the thumb ends 60 px above the window bottom
  await page.setViewportSize({ width: vp.width, height: low });
  await settle(page);
  await click(JACKET);
  p = await pop();
  check('J14 near the window bottom it flips above', p.id === 'garment-pop' && p.side === 'above', JSON.stringify(p));
  const box = await page.evaluate(() => { const s = document.getElementById('screen').getBoundingClientRect(); const r = document.getElementById('garment-pop').getBoundingClientRect(); return { l: r.left - s.left, r: s.right - r.right }; });
  check('J14 it stays 12 px inside the column', box.l >= 11.5 && box.r >= 11.5, JSON.stringify(box));
  await page.setViewportSize(vp);
  /* t-home: the count cluster lists every item; the rest of the card still opens the request */
  await flow('t-home');
  await click('#screen .request-card .peek-cluster');
  p = await pop();
  check('J14 t-home: the cluster lists both items', p.id === 'garment-pop' && ['Suit Pant', 'Hem pants', 'Suit Jacket', 'Shorten sleeves', 'Take in jacket sides'].every((t) => p.text.includes(t)), JSON.stringify(p));
  await at('J14 t-home: the cluster does not open the request', 't-home', { has: 'NEW REQUESTS' });
  await page.keyboard.press('Escape');
  await click('#screen .request-card');
  await at('J14 t-home: the card still opens the request', 't-request', { has: 'Sarah' });
});

console.log(`\n${R.passes} journey checks passed, ${R.failures} failed.`);
await h.close();
process.exit(R.failures ? 1 : 0);
