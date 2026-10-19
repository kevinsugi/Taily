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
     J15 pickup with the code (Study-1 A2–A4, K-40): pick the time (Pay waits for it), Pay (K-44: still a hold underneath), move the time (Amara sees it), Sarah's code, a wrong code,
         the right code completes both sides, Job Done
     J16 pickup without the code (Study-1 A3, K-37 — was the drop-off): Amara marks it picked up -> the 47h countdown on both sides -> "I didn't get it"
         pauses it -> "I got it" completes
     J17 the clock (Study-1 A2–A3): +48 hours (Demo actions) auto-completes a marked pickup; +7 days captures an unclaimed hold, the job stays open
     J18 edit after the fitting (Study-1 B1–B2, K-30 overruled): a private note; Amara edits the job (price, reason) -> Mark ready waits ->
         Sarah sees "Amara edited your order" (Approve / Message, no decline) and messages -> Amara revises (price back, later date) ->
         Sarah approves -> Mark ready
     J19 the visit reminder (K-41, R3 → K-51): Demo "To the reminder" (48 h before) -> the text (C7) -> the Home card -> the nudge at 26 h (C8)
         -> Confirm -> Amara sees "Sarah confirmed" on t-home and t-job -> Sarah cancels 25 h ahead -> K-53: still free (confirming no
         longer closes the free window)
     J20 no reply (K-43 → K-51): the reminder at 48 h -> the nudge at 26 h ("Confirm by 5:00 PM today or cancel it without penalty") -> both
         sides warn -> at 3 h the visit is cancelled (cancel text, c-booking cancelled, t-job "Sarah didn't confirm · visit cancelled")
     J21 design-director review (D-304): Finish later on Payouts never goes live (SF-02); the withdraw / accept races (SF-17)
     J22 a final order nobody answers (pre-MVP A1, D-03): texts at 24 h / 72 h, Taily review at 7 days, the admin told (openReviews)
     J23 nothing recorded at the visit (D-11, K-48.5 → K-51): the tailor's start texts (1 h before, then "Your fitting has started" at the start),
         "Did the visit happen?" to both at 2 h, the admin at 4 h, at 24 h "Not confirmed" with the deposit on hold, kept by the tailor 72 h later
     J33 a "Not confirmed" visit disputed (K-51): That's not right → the hold stays past 72 h → the admin refunds and closes
     J24 the courier's trip (S-35): Handed to courier → out for delivery → can't deliver → a new window at no charge → delivered (proof, 24 h to report)
     J27 a no-show dispute through Taily Help (pre-MVP A2, DG-1 B, D-14, K-48.1): Get help → "I was there" → That's not right → the admin's inbox →
         refund the deposit → close with outcome → both see the decision in dollars, both texted
     J28 the tailor's ⋯ Get help (DG-1 B): her topic + a message → the admin replies to her side → "Taily replied" on her thread, texted
     J29 change phone (DG-3 A, pre-MVP B2): Account → Personal info → Change → a code to the new number → texts go to the new number
     J30 delete account (DG-3 A): blocked while a visit is open (See the booking) → cancel it → Delete → signed out, the old number signs up fresh
     J31 Apple, then a required phone + code (D-07 / B-09) → the names from the provider → Home; the K-49 deposit button V3 on the way
     J32 the tracks meet (merge A2 + B2, D-380): Account → Help, Shop → Help, the one policy page from Account / c-pay / Help / signed out,
         and Unblock on c-tailor
     J34 the balance held at Ready (K-53, d2): Amara marks it ready -> Sarah's card is held at once -> every pickup time ends inside the hold
         -> Pay confirms against it -> the code captures it -> the Ledger shows the hold and the capture
     J35 never chosen (K-53, Q5): the ready texts -> the hold's last day: charged anyway, set to in-store pickup, both texted, the tailor paid
     J36 the courier at Pay (K-53, Q6): re-quoted — a small rise is absorbed by Taily (she pays what she saw); a pricier window after Pay is
         its own charge (toast, booking, receipt, Ledger)
     J37 Log in as a returning customer (K-52): Welcome → Log in → her number → the same code step → Home
     J38 Log in with an unknown number: no account, no code, no sign-up; Create one → c-phone with the number; the tailor’s Log in → Join
     J39 the admin gate (K-52, K-53 a8): no Test flows on a plain visit; a-* → a-login; email → code → second factor → inbox + Test flows; Sign out
     J40 time off + notice (K-53 a4, S-34): Thu–Sat off and 24 h notice in to-availability → Shop summary → the customer’s next opening is Monday
     J14 the anchored popover (K-25): a garment thumb toggles it, another thumb moves it, Escape returns focus, it flips above near the
         window bottom, the Verified check shares its one slot; t-home's count cluster lists every item and the card still opens the request

   node scripts/v5/journeys.mjs [J1 J2 ...]
   ============================================================ */

import { open, reporter, settle } from './lib/browser.mjs';
import { SCENARIOS, SEED_SLOT, fmt, fmtExact, fmtNeg } from './money.mjs';
import { SUGGESTED_SLOT, AMARA, JOB_EDIT } from '../../js/fixtures/money-scenarios.js';
import { CHAT, FITTING_COMMENTS, EDIT_REASON, NOTE_TEXT } from '../../js/fixtures/common.js';
import { CUSTOMER } from '../../js/data.js';
import { fmtWhen, fmtDay, isoDay, addDays } from '../../js/dates.js';
import { PAYOUT_DAYS } from '../../js/fixtures/money-scenarios.js';
import { POLICY } from '../../js/money-config.js';
import { HOLD_DAYS, courierQuote } from '../../js/money.js';

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
  const extra = [...document.querySelectorAll(sel)].filter((o) => !screen?.contains(o) && !o.closest('#flow-menu')).map((o) => o.innerText);   // the Test-flows panel is not the app (its flow titles name every state)
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
  await at('J6 Start fitting lands on the editor', 't-adjust', { has: ['Final order', 'No changes'] });
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
  await at('J6b editor, nothing touched', 't-adjust', { has: ['Final order', 'No changes', 'Add before and pinned photos for 2 items'] });
  await press('[data-act="send"]');
  await at('J6b Send is off until every item has photos', 't-adjust', { has: ['Final order', 'Add before and pinned photos for 2 items'] });
  for (const g of ['g1', 'g2']) {
    await click(`[data-garment="${g}"] [data-act="add-doc"][data-kind="before"]`);
    await click(`[data-garment="${g}"] [data-act="add-doc"][data-kind="pinned"]`);
  }
  await press('[data-act="send"]');
  await at('J6b tailor: waiting on Sarah', 't-job', { has: ['Waiting on Sarah', 'No changes'] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J6b customer: no changes', 'c-price-change', { has: ['nothing changed', 'Same as booked', fmtExact(S.seed.total), 'Approve and start'] });   // was matched in the Test-flows panel's titles
  await click('[data-act="approve"]');
  await at('J6b customer: in progress', 'c-booking', { has: ['working on it'] });
  await flip();
  await click('.appt-row');
  await at('J6b tailor: work in progress, as booked', 't-job', { has: ['In progress', 'Mark ready'], not: ['Sarah approved', 'Work in progress'] });
});

/* ---------- J7 (D-143) ---------- */
await journey('J7', 'courier return: the three courier amounts match on both sides and stay out of the payout', async () => {
  const cq = S.courierOffPeak;                          // K-43 (D-299): the sheet opens on the first window (10:30 AM, off-peak) — its own quote
  const held = S.seed.balance + cq.cents;
  await flow('t-job--in-progress');
  await click('[data-act="mark-ready"]');
  await click('[data-act="ready-ok"]');
  await at('J7 tailor: waiting on Sarah', 't-job', { has: ['Ready · Sarah is choosing how to get it back'] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J7 customer: ready', 'c-ready');
  await click('[data-act="return"][data-value="courier"]');
  await at('J7 customer: courier chosen, the window first (K-40)', 'c-ready', { has: ['Pick a delivery window', 'that plus the courier', 'Pick a delivery window first.'], not: ['Uber quote', `Pay ${fmtExact(held)}`, 'Hold $'] });
  await click('[data-act="pick-time"]');
  await at('J7 customer: the window sheet prices the courier per window, and says a missed delivery is left in the lobby', 'c-ready', { has: ['Pick a delivery window', `Courier ${fmtExact(cq.cents)} · collects from Amara at`, 'Each window has its own Uber price, checked again when you pay.', 'If you’re not home, the courier leaves it in your building’s lobby.', 'Use this window'] });
  await click('[data-act="ht-ok"]');
  await at('J7 customer: courier quote', 'c-ready', { has: ['Fri, Oct 16 · 10:30–11:00 AM', fmtExact(cq.quote), fmtExact(cq.markup), fmtExact(cq.cents), `Pay ${fmtExact(held)}`, 'Charged on delivery'] });
  await click('.action-bar [data-act="pay"]');   // K-54 F9: one tap — Pay confirms on the held card
  await at('J7 customer: courier booked', 'c-booking', { has: ['Courier booked · arrives Fri, Oct 16 · 10:30–11:00 AM', 'The courier collects from Amara at 10:15 AM', fmtExact(cq.cents), 'If you’re not home, the courier leaves it in your building’s lobby.'] });
  await flip();
  await click('.appt-row');
  await at('J7 tailor: courier booked, not her money', 't-job', {
    has: ['Courier collects 10:15 AM · arrives 10:30–11:00 AM', 'Only she can change it.', 'Paid by Sarah · nothing comes out of your payout', 'If Sarah isn’t home, the courier leaves it in her building’s lobby.', fmtExact(S.seed.payout)],
    not: [fmtExact(cq.quote), fmtExact(cq.markup), fmtExact(cq.cents)],   // S-35 (pre-MVP A1): "Handed to courier" is hers to tap now
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
  await at('J15 customer: when she is charged; the time first (K-40)', 'c-ready', { has: [`Pay ${bal}`, `We’re holding ${bal} on your Visa •••• 4242. You’re charged when you get your garments.`, `Choose by Mon, Oct 19 · 5:00 PM. If you haven’t by then, we charge the ${bal} and set it to in-store pickup.`, 'Pick a time', 'Pick a pickup time first.', 'Charged at pickup'], not: [`Hold ${bal}`, 'Charged at handoff'] });   // D-303: the Balance row follows the chosen way back; K-46: the reason is Pay's second line
  await click('[data-act="pick-time"]');
  await at('J15 customer: the Scheduler sheet', 'c-ready', { has: ['Pick a pickup time', 'Fri, Oct 16 · 10:00 AM', 'Use this time'] });
  await click('[data-act="ht-ok"]');
  await at('J15 customer: the time picked, Pay is on', 'c-ready', { has: ['Fri, Oct 16 · 10:00 AM', 'Charged at pickup', `Pay ${bal}`], not: 'Pick a pickup time first.' });
  await at('J15 customer: K-54 F9 — the card Pay confirms on, said above the bar', 'c-ready', { has: ['Pay with', 'Visa •••• 4242', 'Change'] });
  await click('.action-bar [data-act="pay"]');   // one tap, no second Pay in a sheet
  await at('J15 customer: pending, the pickup code', 'c-booking', { has: ['Pickup Fri, Oct 16 · 10:00 AM · show your code at the shop', `Payment ${bal} · Charged at pickup`, 'Charged at pickup', 'YOUR PICKUP CODE', PICKUP_CODE, 'Change time'], not: ['Paid in full', 'Confirm received', 'I got it'] });   // D-09: not before the pickup time
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
  await at('J15 customer: Job Done', 'c-complete', { has: ['ORDER COMPLETE', `Paid ${fmtExact(S.seed.total)}`, 'Leave a review', 'Book Amara again', 'Message Amara'] });
  await click('[data-act="book-again"]');
  await at('J15 customer: Book again starts on Home with Amara named', 'c-job', { has: ['Booking again with Amara', 'What needs work?'] });
});

/* ---------- J16 (Study-1 A3) ---------- */
await journey('J16', 'pickup without the code: Amara marks it, the countdown both sides, a reported problem pauses it, Confirm received completes (K-48.3)', async () => {
  await flow('t-job--handoff-pickup');
  await click('[data-act="picked-up"]');
  await press('[data-act="no-code"]');
  await at('J16 tailor: marked picked up, the countdown', 't-job', { has: ['Marked as picked up', 'Completes automatically in 47h unless Sarah reports a problem'], not: ['Enter Sarah’s pickup code', 'Only Sarah can change the time'] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J16 customer: marked, the countdown', 'c-booking', { has: ['Amara marked it picked up', 'Completes automatically in 47h unless you report a problem', 'Confirm received', 'I didn’t get it'], not: ['Change time', 'I got it'] });
  await click('[data-act="not-got-it"]');
  await at('J16 customer: the report sheet', 'c-booking', { has: ['Didn’t get it?', 'We’ll stop the automatic completion and tell Amara. Nothing is charged while you sort it out in chat.', 'Report a problem', 'Keep waiting'] });
  await click('[data-act="nr-ok"]');
  await at('J16 customer: problem reported, the countdown stopped', 'c-booking', { has: ['You reported a problem. We’ve stopped the automatic completion and told Amara.', 'Confirm received'], not: ['Completes automatically', 'I didn’t get it'] });
  await advance(3 * 24 * 60);
  await paint('c-booking');
  await at('J16 customer: three days on, still open (paused)', 'c-booking', { has: ['You reported a problem', 'Charged at pickup'], not: 'Charged at handoff' });
  await flip();
  await click('.appt-row');
  await at('J16 tailor: Sarah didn’t get it', 't-job', { has: ['Sarah says she didn’t get it. Sort it out in chat.', 'Message Sarah'], not: 'Completes automatically' });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await click('[data-act="got-it"]');
  await at('J16 customer: confirm you received it?', 'c-booking', { has: ['Confirm you received it?', `We’ll charge your ${fmtExact(S.seed.balance)} balance and close the order.`, 'Yes, I have it', 'Not yet'] });
  await click('[data-act="got-ok"]');
  await at('J16 customer: Job Done', 'c-complete', { has: ['ORDER COMPLETE', `Paid ${fmtExact(S.seed.total)}`, 'Leave a review'] });
  await flip();
  await click('.appt-row');
  await at('J16 tailor: completed', 't-job', { has: ['Nice work, Amara.', 'Picked up at your shop', fmtExact(S.seed.payout)] });
});

/* ---------- J17 (Study-1 A2–A3) ---------- */
/** A Demo action from the real Test-flows menu (moves the demo clock or delivers the courier on the live state). */
const demo = async (id) => { await page.mouse.move(5, 5); await page.mouse.move(10, 10); await click('#flow-trigger'); await click(`[data-demo="${id}"]`); };   // the first input reveals the pinned control
await journey('J17', 'the clock: +48 hours auto-completes a marked pickup; +7 days passes the capture on the ready hold’s last day (K-53, was D-04’s day 6), the job stays open and the tailor is paid (D-03)', async () => {
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
  await at('J17 customer: completed automatically, charged', 'c-complete', { has: ['COMPLETED AUTOMATICALLY · SAT, OCT 17', `Paid ${fmtExact(S.seed.total)}`, 'Leave a review'] });
  await demo('d7');
  await at('J17 customer: the review reminder arrives as a text', 'c-complete', { has: ['TEXT MESSAGE', 'Taily: How did Amara do? Leave a review:', 'taily.app/r/'] });
  await press('[data-nav="home"]');
  await at('J17 customer: a week later, the review reminder on Home', 'c-job', { has: ['How did Amara do?', 'Your order came back on Sat, Oct 17. Your review helps other customers.', 'Leave a review'] });
  await flow('c-booking--handoff-pickup');
  await demo('d7');
  await at('J17 customer: charged on the hold’s last day, still open', 'c-booking', { has: [`Taily: We charged your ${bal} balance because your order has been ready for ${HOLD_DAYS} days.`, `We charged your ${bal} balance ${HOLD_DAYS} days after your order was ready. Amara still keeps it for you until you pick it up.`, 'Charged', 'YOUR PICKUP CODE', `Ready · ${bal} charged`], not: 'On hold' });
  await flip();
  await click('.appt-row');
  await at('J17 tailor: charged — her payout is on its way (D-03)', 't-job', { has: [`Sarah’s ${bal} was charged ${HOLD_DAYS} days after it was ready, so your payout is on its way`, 'Keep her order until', 'Picked up'] });
  await click('[data-nav="earnings"]');
  await at('J17 tailor: the payout is scheduled (D-03: paid at the unclaimed charge)', 't-earnings', { has: fmtExact(S.seed.payout) });
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
  await at('J18 tailor: change the order after the fitting', 't-adjust', { has: ['AFTER THE FITTING', 'Edit order', 'Change the price, the due date or the work to send it.'], not: 'Work done so far' });
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

/* ---------- J19 (K-41, R3 → K-51) ---------- */
await journey('J19', 'the visit reminder: the 48 h text and the Home card, the 26 h nudge, Confirm, Amara sees it, a cancel after confirming is still free (K-53)', async () => {
  const dep = fmtExact(S.seed.deposit);
  await flow('c-booking--confirmed');
  await demo('reminder');                                                // Tue 5:00 PM: 48 h before (K-51)
  await at('J19 customer: the reminder text (C7) and the prompt on the booking', 'c-booking', { has: ['TEXT MESSAGE', 'Taily', 'Taily: Please confirm your appointment: Amara · Thu, Oct 15 · 5:00 PM at your place. Free to change until Wed, Oct 14 · 5:00 PM. Confirm or change:', 'taily.app/r/', 'Confirm by Thu 2:00 PM', 'Free until 5:00 PM tomorrow', 'Free to change or cancel until Wed, Oct 14 · 5:00 PM.'] });   // K-54 P10: the real cut-off leads
  await click('.text-banner');
  await at('J19 customer: the text’s link opens Home — the prompt card', 'c-job', { has: ['Please confirm your visit', 'Free until 5:00 PM tomorrow', 'Your move', `After that, Amara keeps your ${fmt(S.seed.deposit)} deposit if you cancel or aren’t home.`, 'Change or cancel'] });
  await flip();
  await at('J19 tailor: not confirmed yet', 't-home', { has: ['Not confirmed yet'] });
  await flip();
  await click('[data-nav="home"]');
  await demo('reminder');                                                // Wed 3:00 PM: 26 h before, still unconfirmed → the nudge (C8)
  await at('J19 customer: the nudge (C8) — confirm by the free window’s end or cancel without penalty', 'c-job', { has: ['Taily: You haven’t confirmed your 5:00 PM visit with Amara tomorrow. Confirm by 5:00 PM today or cancel it without penalty:', 'Please confirm your visit', 'Free until 5:00 PM today'] });
  await click('[data-visit-prompt] [data-act="confirm-visit"]');
  await at('J19 customer: confirmed — Home says All set', 'c-job', { has: ['All set'], not: 'Please confirm your visit' });
  await flip();
  await at('J19 tailor: Upcoming says Sarah confirmed', 't-home', { has: ['Sarah confirmed'], not: 'Not confirmed' });
  await click('.appt-row');
  await at('J19 tailor: the job says it, with her side of the money', 't-job', { has: ['Sarah confirmed for tomorrow', 'Visit tomorrow', `She can still change for free until Wed, Oct 14 · 5:00 PM. After that, you keep her ${dep} deposit if she cancels or isn’t home.`] });
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J19 customer: confirmed for tomorrow — still free until 24 h before (K-53)', 'c-booking', { has: ['Confirmed for tomorrow · 5:00 PM', 'Still free to change or cancel until Wed, Oct 14 · 5:00 PM.', 'Reschedule'], not: 'To change the time now' });
  await click('[data-act="cancel"]');
  await at('J19 customer: cancelling 25 hours ahead after confirming is still free (K-53)', 'c-booking', { has: [`so your ${dep} deposit comes back in full`, `Cancel and get ${dep} back`], not: 'You confirmed this visit' });
  await click('[data-act="cancel-ok"]');
  await at('J19 customer: cancelled, refunded', 'c-booking', { has: ['Booking cancelled', 'Refunded'], not: 'Kept' });
  await flip();
  await page.evaluate(() => window.Taily.render('t-job'));
  await at('J19 tailor: Sarah cancelled more than 24 hours ahead — nothing owed', 't-job', { has: ['Sarah cancelled'], not: 'you keep her deposit' });
});

/* ---------- J20 (K-43, D-300 / D-301 → K-51) ---------- */
await journey('J20', 'no reply: the reminder at 48 h, the nudge at 26 h, then the visit is cancelled at 3 h — both sides, the deposit kept', async () => {
  const dep = fmtExact(S.seed.deposit);
  await flow('c-booking--reminder-48h');                               // Tue 5:00 PM: the reminder went out, no answer
  await advance(21 * 60);                                              // Wed 2:00 PM (the model clock; no text yet)
  await demo('h1');                                                    // Wed 3:00 PM: 26 h before → the nudge (K-51)
  await at('J20 customer: the nudge arrives as a text', 'c-booking', { has: ['TEXT MESSAGE', 'Taily: You haven’t confirmed your 5:00 PM visit with Amara tomorrow.', 'Confirm by 5:00 PM today or cancel it without penalty:', 'taily.app/r/'] });
  await click('.text-banner');
  await at('J20 customer: the booking says the free window and the real cut-off (K-54 P10)', 'c-booking', { has: ['Free until 5:00 PM today', 'Confirm by 2:00 PM tomorrow', 'Free to change or cancel until Wed, Oct 14 · 5:00 PM.'], not: 'TEXT MESSAGE' });
  await advance(20 * 60);                                              // Thu 11:00 AM: the free window closed unanswered
  await paint('c-booking');
  await at('J20 customer: the booking warns before it happens', 'c-booking', { has: ['Confirm by 2:00 PM or we’ll cancel the visit', 'Visit 5:00 PM', 'Confirm, I’ll be home'] });
  await flip();
  await page.evaluate(() => window.Taily.render('t-job'));
  await at('J20 tailor: Sarah hasn’t confirmed — the auto-cancel rule', 't-job', { has: ['Sarah hasn’t confirmed', `We reminded her Wed, Oct 14 · 3:00 PM. If she doesn’t confirm by 2:00 PM, we cancel the visit and you keep her ${dep} deposit.`] });
  await flip();
  await page.evaluate(() => window.Taily.render('c-booking'));
  await demo('h1');
  await demo('h1');
  await at('J20 customer: 1:00 PM — still booked', 'c-booking', { has: ['Confirm by 2:00 PM or we’ll cancel the visit'] });
  await demo('h1');                                                    // Thu 2:00 PM: 3 h before → cancelled
  await at('J20 customer: the cancel text and the cancelled booking', 'c-booking', { has: [`Taily: We cancelled your 5:00 PM visit with Amara because you didn’t confirm by 2:00 PM. Amara keeps your ${dep} deposit.`, 'Visit cancelled', `We cancelled your visit because you didn’t confirm by 2:00 PM. Amara keeps your ${dep} deposit for the time set aside.`, 'Kept', 'Book Amara again'], not: 'Confirm, I’ll be home' });
  await flip();
  await page.evaluate(() => window.Taily.render('t-job'));
  await at('J20 tailor: Sarah didn’t confirm · visit cancelled, the deposit is hers', 't-job', { has: ['Sarah didn’t confirm · visit cancelled', 'Visit cancelled', `you keep her ${dep} deposit`, 'Kept deposit', fmtExact(S.lateCancel.tailorPaid)], not: 'Mark as no-show' });
});

/* ---------- J22–J24 (pre-MVP A1, K-48: every waiting state ends; every notification is a text) ---------- */
const model = (fn) => page.evaluate(async (src) => { const S = await import('/js/state.js'); return new Function('S', `return (${src})(S);`)(S); }, fn.toString());
await journey('J22', 'a final order nobody answers: texts at 24 h and 72 h, then Taily review at 7 days (D-03) — both sides, the admin told', async () => {
  await flow('c-price-change');                                          // Thu 5:00 PM: Amara sent the final order
  await demo('h48');                                                     // Sat 5:00 PM: past 24 h
  await at('J22 customer: the 24-hour reminder text', 'c-price-change', { has: ['TEXT MESSAGE', 'Taily: Amara is waiting for you to approve your final order', 'Approve it so she can start:', 'taily.app/r/'] });
  await demo('h48');                                                     // Mon 5:00 PM: past 72 h
  await at('J22 customer: the 72-hour reminder text (K-51: C21)', 'c-price-change', { has: ['Taily: Your final order from Amara still needs your approval. Until you approve it, she can’t start, and your order will be ready later. Approve it here:'] });
  await flip();
  await page.evaluate(() => window.Taily.render('t-job'));
  await at('J22 tailor: she knows when it ends', 't-job', { has: ['Waiting on Sarah to approve', `We text Sarah after ${POLICY.WAIT_REMIND_1_H} and ${POLICY.WAIT_REMIND_2_H} hours if she hasn’t approved. After ${POLICY.FINAL_ORDER_REVIEW_D} days, Taily steps in to help you both.`] });
  await demo('d7');                                                      // past 7 days
  await at('J22 tailor: Taily steps in (text)', 't-job', { has: [`Taily: Sarah hasn’t approved your final order in ${POLICY.FINAL_ORDER_REVIEW_D} days, so Taily is stepping in to help you both.`] });
  const r = await model((S) => ({ reviews: S.openReviews().map((x) => x.reason), admin: S.state.admin.notifications.map((n) => n.kind), star: S.state.appts[0].review }));
  check('J22 openReviews() + the admin notification (A2 surfaces them); the star review is untouched', JSON.stringify(r) === JSON.stringify({ reviews: ['final-order-unanswered'], admin: ['review'], star: null }), JSON.stringify(r));
});

await journey('J23', 'nothing recorded at the visit: the tailor’s start texts, “Did the visit happen?” at 2 h (both), the admin at 4 h, “Not confirmed” with the deposit on hold at 24 h, the tailor keeps it 72 h later (D-11, K-48.5, K-51)', async () => {
  const dep = fmtExact(S.seed.deposit);
  await flow('t-job--reminder-confirmed');                               // Wed 3:12 PM, Sarah confirmed
  await advance(23 * 60 + 18);                                           // Thu 2:30 PM (the model clock)
  await paint('t-job');
  await demo('h1');                                                      // 3:30 PM: nothing yet
  await demo('h1');                                                      // 4:30 PM: an hour before → the start reminder
  await at('J23 tailor: the start reminder, 1 hour before', 't-job', { has: ['Taily: Your visit with Sarah starts at 5:00 PM at 145 N 7th St, 2R. Tap I’m here when you arrive:'] });
  await demo('h1');                                                      // 5:30 PM: one text at the start
  await at('J23 tailor: “Your fitting has started” at the start time', 't-job', { has: ['Taily: Your fitting has started. Please take all notes here:', 'Time for the fitting', 'Start fitting'] });
  await demo('h1'); await demo('h1');                                    // 7:30 PM: 2 h after the start, nothing recorded
  await at('J23 tailor: did the visit happen?', 't-job', { has: ['Taily: Did your 5:00 PM visit with Sarah happen? Tell us:', 'Did the visit happen?', 'Nothing was recorded.'] });
  await flip();
  await page.evaluate(() => window.Taily.render('c-booking'));
  await at('J23 customer: the same question', 'c-booking', { has: ['Did your visit happen?', 'Yes, it happened', 'No, Amara didn’t come'] });
  await advance(60);                                                     // 8:30 PM: 3 h 30 after the start
  const n0 = await model((S) => S.state.admin.notifications.length);
  check('J23 K-48.5 (Kevin, K-50): not yet 4 hours after the start → the admin isn’t told', n0 === 0, String(n0));
  await demo('h1');                                                      // 9:30 PM: past start + 4 h (9:00 PM)
  const n = await model((S) => ({ admin: S.state.admin.notifications.map((x) => [x.kind, x.at]), reviews: S.openReviews().map((x) => x.reason), text: S.state.outbox.filter((m) => m.to === 'admin').map((m) => [m.event, m.at]) }));
  check('J23 K-48.5 (Kevin, K-50): 4 hours after the START with no answer → the admin is notified and texted (a case A2 surfaces)', JSON.stringify(n) === JSON.stringify({ admin: [['review', '2026-10-15T21:00']], reviews: ['visit-unanswered'], text: [['admin-case', '2026-10-15T21:00']] }), JSON.stringify(n));
  await demo('h48');                                                     // past 24 h after asking (Fri 7:00 PM): decided by the evidence (K-51)
  await at('J23 customer: “Not confirmed”, the deposit on hold (text + booking)', 'c-booking', { has: [`Taily: Nobody confirmed your Thu, Oct 15 · 5:00 PM visit with Amara, so we closed it as not confirmed. Your ${dep} deposit is on hold. If neither of you disputes it by Mon, Oct 19 · 7:00 PM, Amara keeps it. Didn’t happen? Tell us:`, 'Not confirmed', 'On hold', 'That’s not right'], not: ['Refunded'] });
  await flip();
  await page.evaluate(() => window.Taily.render('t-job'));
  await at('J23 tailor: not confirmed, Sarah’s deposit on hold', 't-job', { has: ['Not confirmed', `Sarah’s ${dep} deposit is on hold. If neither of you disputes it by Mon, Oct 19 · 7:00 PM, you keep it.`] });
  const held = await model((S) => ({ dep: S.state.appts[0].payments.deposit.state, payouts: S.state.payouts.length, review: S.openReviews().map((x) => x.reason) }));
  check('J23 K-51: held, not refunded, not paid; the admin’s case stays open', JSON.stringify(held) === JSON.stringify({ dep: 'captured', payouts: 0, review: ['visit-unanswered'] }), JSON.stringify(held));
  await demo('d7');                                                      // past the 72-hour hold, nobody disputed
  await at('J23 tailor: nobody disputed — she keeps the deposit', 't-job', { has: ['Not confirmed', `nobody disputed it by Mon, Oct 19 · 7:00 PM, so you keep Sarah’s ${dep} deposit.`, 'Kept deposit'] });
  await flip();
  await page.evaluate(() => window.Taily.render('c-booking'));
  await at('J23 customer: Amara kept the deposit', 'c-booking', { has: [`so Amara kept your ${dep} deposit.`, 'Kept'], not: 'That’s not right' });
});

await journey('J24', 'the courier’s trip: Handed to courier → out for delivery → the courier can’t deliver → a new window at no charge → delivered (S-35)', async () => {
  await flow('t-job--handoff-courier');
  await click('.action-bar [data-act="courier-out"]');
  await at('J24 tailor: handed to the courier', 't-job', { has: ['With the courier · arrives 5:00–5:30 PM'], not: 'Handed to courier' });
  await flip();
  await page.evaluate(() => window.Taily.render('c-booking'));
  await at('J24 customer: out for delivery, the window locked', 'c-booking', { has: ['Out for delivery · arrives 5:00–5:30 PM'], not: ['Change window', 'Confirm received'] });
  const held = await model((S) => S.state.appts[0].payments.balance.cents);
  await demo('courier-fail');
  await at('J24 customer: the failed delivery text and the way forward', 'c-booking', { has: ['Taily: The courier couldn’t deliver your order, so it’s going back to Amara. Pick a new delivery window, no extra charge:', 'The courier couldn’t deliver it · pick a new window', 'Pick a new window'] });
  await press('[data-act="change-time"]');
  await at('J24 customer: a new window, no extra charge', 'c-booking', { has: ['Pick a new delivery window', 'No extra charge.'] });
  await click('[data-act="ht-ok"]');
  await at('J24 customer: booked again', 'c-booking', { has: ['Courier booked · arrives'] });
  const after = await model((S) => S.state.appts[0].payments.balance.cents);
  check('J24 the redelivery costs nothing more', after === held, `${held} → ${after}`);
  await flip();
  await page.evaluate(() => window.Taily.render('t-job'));
  await at('J24 tailor: hand it over again', 't-job', { has: ['Handed to courier'] });
  await flip();
  await page.evaluate(() => window.Taily.render('c-booking'));
  await demo('courier');
  await at('J24 customer: delivered — the text, the proof, 24 hours to report it', 'c-complete', { has: ['Taily: Delivered at', 'Didn’t get it? Tell us within 24 hours:', 'Left at your door', 'Didn’t get it? Tell us'] });
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

/* ---------- J21 (design-director review, D-304): the screen-side fixes a flow entry can't reach ---------- */
await journey('J21', 'Finish later never goes live; the withdraw / accept races say what happened', async () => {
  /* SF-02: on Payouts with every other step done, Finish later signs her out without taking her live */
  await page.evaluate(async () => {
    const C = await import('/js/fixtures/common.js');
    C.onboardTo('payouts');
    (await import('/js/state.js')).state.persona = 'tailor';
    window.Taily.render('to-payouts', { fresh: true });
  });
  await settle(page);
  await press('#bg-consent');   // DG-4 (D-351): step 6 is the consent + the partner's hosted step; Taily's bank form is retired
  await press('[data-act="finish-later"]');
  const live = await page.evaluate(async () => (await import('/js/state.js')).state.tailors[0].live);
  check('J21 SF-02: Finish later on Payouts leaves her not live', live === false, `live=${live}`);
  await at('J21 SF-02: signed out, progress saved', 't-phone', { has: 'Your progress is saved' });
  /* SF-17: Sarah withdraws while Amara is on the request — Accept says so and goes Home */
  await flow('t-request');
  await page.evaluate(async () => { const S = await import('/js/state.js'); S.T.withdrawRequest(S.state.appts[0].id); });
  await press('.action-bar [data-act="accept"]');
  await at('J21 SF-17: tailor told she withdrew, back Home', 't-home', { has: 'NEW REQUESTS' });
  const t1 = await page.evaluate(() => document.querySelector('#toast-live')?.textContent ?? '');
  check('J21 SF-17: the toast says Sarah withdrew it (live region)', t1.includes('Sarah withdrew this request.'), t1);
  /* SF-17: Amara accepts while Sarah is withdrawing — the sheet lands on the booking */
  await flow('c-request');
  await press('[data-act="withdraw"]');   // the sheet is open when Amara accepts
  await page.evaluate(async () => { const S = await import('/js/state.js'); S.T.tailorAccept(S.state.appts[0].id); });
  await click('[data-act="withdraw-ok"]');
  await at('J21 SF-17: customer lands on the booking', 'c-booking', { not: 'Request withdrawn' });
  const t2 = await page.evaluate(() => document.querySelector('#toast-live')?.textContent ?? '');
  check('J21 SF-17: the toast says Amara just accepted', t2.includes('Amara just accepted. You’re booked.'), t2);
});

/* ---------- J25 (pre-MVP B1, DG-4 option B / D-05 / D-06, K-48): onboarding → submitted → verified → live ---------- */
await journey('J25', 'Get verified: consent + the hosted payout step submit her; Shop says Under review; the review passes; she is listed with the Verified check', async () => {
  await page.evaluate(async () => {
    const C = await import('/js/fixtures/common.js');
    C.onboardTo('payouts');
    (await import('/js/state.js')).state.persona = 'tailor';
    window.Taily.render('to-payouts', { fresh: true });
  });
  await settle(page);
  await at('J25 step 6: background check and payouts', 'to-payouts', { has: ['Step 6 of 6', 'I agree to a background check', 'Continue to secure setup'], not: 'Routing number' });
  await press('[data-act="setup"]');
  await at('J25 no consent: the error sits under the box', 'to-payouts', { has: 'Agree to the background check to continue.' });
  await press('#bg-consent');
  await press('[data-act="setup"]');
  await at('J25 back from the partner: Submitted, the checks under review', 'to-done', { has: ['Submitted', 'Most reviews take 1 to 2 days', '1 of 4 checks passed', 'ONCE YOU’RE VERIFIED'] });
  const listedBefore = await page.evaluate(async () => (await import('/js/state.js')).tailorsFor().rows.length);
  check('J25 not listed while the checks run (POLICY.LIVE_REQUIRES_VERIFIED)', listedBefore === 0, `rows=${listedBefore}`);
  await press('[data-act="shop"]');
  await at('J25 Shop: Under review, Taking requests off, the checklist', 't-shop', { has: ['Under review · 1 of 4 checks', 'Turns on when your checks clear.', 'YOUR CHECKS', 'Verification'], not: 'Bookable' });
  const off = await page.evaluate(() => document.querySelector('#screen #taking-requests')?.disabled === true);
  check('J25 Taking requests stays off until the checks clear', off);
  await page.evaluate(async () => { (await import('/js/state.js')).T.reviewChecks(); });
  await paint('t-shop');
  await at('J25 the review passes: Bookable, all 4 checks passed', 't-shop', { has: ['Bookable', 'All 4 checks passed', 'WHAT CUSTOMERS SEE'], not: ['YOUR CHECKS', 'Under review'] });
  const after = await page.evaluate(async () => { const S = await import('/js/state.js'); return { rows: S.tailorsFor().rows.length, verified: S.isVerified(S.state.tailors[0]), live: !!S.state.tailors[0].live }; });
  check('J25 live, listed and Verified (derived from the checks)', after.rows === 1 && after.verified && after.live, JSON.stringify(after));
  const mark = await page.evaluate(() => !!document.querySelector('#screen .customer-preview [data-verified]'));
  check('J25 her preview row now carries the Verified check', mark);
});

/* ---------- J26 (D-18 waitlist, S-22 nav guard, K-48.2 listing) ---------- */
await journey('J26', 'Under 5 years goes to the waitlist; the nav asks before dropping Shop edits; a tailor who skips an item is never listed', async () => {
  await page.evaluate(async () => {
    const C = await import('/js/fixtures/common.js');
    const S = await import('/js/state.js');
    C.onboardTo('profile');
    S.state.persona = 'tailor';
    S.state.ui['to-profile'] = { draft: { name: 'Ana Ruiz', shopName: '', years: '3', cardLine: 'Hems and zippers, done right.', bio: 'Three years of hems.', photo: true, idDoc: true, workPhotos: 0 } };
    window.Taily.render('to-profile', { fresh: true });
  });
  await settle(page);
  await press('.action-bar [data-act="next"]');
  await at('J26 D-18: 3 years → the waitlist, nothing goes live', 'to-done', { has: ['You’re on the waitlist', 'and you told us 3 years'] });
  const wl = await page.evaluate(async () => { const S = await import('/js/state.js'); return { live: !!S.state.tailors[0].live, bookable: S.bookable(S.state.tailors[0]) }; });
  check('J26 D-18: the waitlisted tailor is never bookable', !wl.live && !wl.bookable, JSON.stringify(wl));
  /* S-22: a price changed on to-services (edit), then Home in the top nav */
  await flow('to-services--edit');
  await page.evaluate(() => { const el = document.querySelector('#screen #price-hem-pants'); el.value = '33'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await settle(page);
  await press('[data-nav="home"]');
  await at('J26 S-22: Leave without saving? before the nav drops the edit', 'to-services', { has: ['Leave without saving', 'Keep editing'] });
  await click('[data-act="keep-editing"]');
  const kept = await page.evaluate(() => document.querySelector('#screen #price-hem-pants')?.value);
  check('J26 S-22: Keep editing keeps the typed price', kept === '33', kept);
  await press('[data-nav="home"]');
  await click('[data-act="discard"]');
  await at('J26 S-22: Discard goes where she tapped', 't-home', { has: 'Hi, Amara' });
  /* K-48.2: she stops pricing a service Sarah's job needs → not listed, and c-tailors says why */
  await flow('c-tailors--services');
  await at('J26 K-48.2: no tailor who skips an item', 'c-tailors', { has: 'No tailor near you does all of this yet', not: 'Est.' });
});

/* ---------- J27–J28 (pre-MVP A2, K-48.1 + K-49 DG-1 option B: Taily Help, the admin) ---------- */
const asAdmin = async () => { await click('#flow-trigger'); await click('#persona-admin'); };
await journey('J27', 'a no-show dispute through Taily Help: Get help → I was there → the admin refunds and closes → both see the outcome in dollars, both texted', async () => {
  const dep = fmtExact(S.seed.deposit);
  const pay = fmtExact(S.noShow.paid);
  await flow('c-booking--no-show');                                     // Thu 5:20 PM: Amara marked a no-show (after her I'm here)
  await press('.person-block__actions [data-act="get-help"]');
  await at('J27 customer: Taily Help with the order attached', 'c-case', { has: ['Taily Help', 'Order with Amara', 'Hi Sarah. This is about your visit with Amara', 'I was there'] });
  await press('[data-act="topic"][data-topic="no-show"]');
  await at('J27 customer: her topic, Taily’s answer, the step', 'c-case', { has: ['I was there', 'Thanks, Sarah. Taily has your message', 'That’s not right'] });
  await press('[data-act="hs-dispute"]');
  await click('[data-s="help-dispute"] [data-act="cs-ok"]');
  await at('J27 customer: Taily is reviewing, her deposit on hold until Taily decides', 'c-case', { has: ['Taily is reviewing', `Your ${dep} deposit stays on hold until we decide`] });
  await page.evaluate(() => window.Taily.render('c-booking'));
  await at('J27 customer: the booking carries the case strip', 'c-booking', { has: ['Taily is reviewing', 'Open Taily Help'] });
  await asAdmin();
  await at('J27 admin: the inbox (and a text to Kevin)', 'a-inbox', { has: ['No-show disputed', 'Sarah Chen · Amara Reyes', 'Waiting on you'] });
  const t0 = await model((S) => S.state.outbox.filter((m) => m.to === 'admin').map((m) => m.event));
  check('J27 K-48.1: the admin was texted the new case', t0.includes('admin-case'), JSON.stringify(t0));
  await press('.admin-row[data-case]');
  await at('J27 admin: the case — money and actions in dollars', 'a-case', { has: ['No-show disputed', 'Kept by tailor', 'On hold', 'Refund Sarah’s deposit', 'Amara keeps the deposit'] });
  await press('[data-act="admin-act"][data-kind="refund-deposit"]');
  await at('J27 admin: refund — confirm in dollars', 'a-case', { has: [`Refund Sarah’s ${dep} deposit to her card. Amara’s ${pay} isn’t paid out.`] });
  await click('[data-s="a-case--act"] [data-act="cs-ok"]');
  await at('J27 admin: refunded', 'a-case', { has: ['Refunded', 'Close with outcome'] });
  await press('[data-act="close-case"]');
  await click('[data-s="a-case--close"] [data-act="cs-ok"]');
  await at('J27 admin: closed, both told', 'a-case', { has: ['Closed', 'OUTCOME', `We refunded your ${dep} deposit.`, 'Both were told the outcome.'] });
  const texts = await model((S) => S.state.outbox.filter((m) => ['case-decided', 'taily-replied-t'].includes(m.event)).map((m) => [m.event, m.to, m.status]));
  check('J27 both are texted the decision', JSON.stringify(texts) === JSON.stringify([['case-decided', 'customer', 'delivered'], ['taily-replied-t', 'tailor', 'delivered']]), JSON.stringify(texts));
  await flip();                                                          // admin → tailor
  await page.evaluate(() => window.Taily.render('t-job'));
  await at('J27 tailor: the decision on her job', 't-job', { has: ['Taily decided', `We refunded Sarah’s ${dep} deposit, so you aren’t paid the ${pay}.`] });
  await flip();                                                          // → customer
  await page.evaluate(() => window.Taily.render('c-booking'));
  await at('J27 customer: the decision on her booking', 'c-booking', { has: ['Taily decided', `We refunded your ${dep} deposit.`, 'Refunded'] });
  const rv = await model((S) => ({ open: S.openReviews().length, outcome: S.state.appts[0].tailyReview?.outcome }));
  check('J27 the order’s review is closed with the outcome', rv.open === 0 && rv.outcome === 'refund-deposit', JSON.stringify(rv));
});

await journey('J28', 'the tailor’s ⋯ Get help: her topic and a message → the admin replies to her side → Taily replied, texted', async () => {
  await flow('t-job--in-progress');
  await press('[data-act="more"]');
  await click('[data-s="more"] [data-act="get-help"]');
  await at('J28 tailor: Taily Help, the job attached', 't-case', { has: ['Taily Help', 'Job with Sarah', 'Hi Amara. This is about your job with Sarah', 'My payout'] });
  await press('[data-act="topic"][data-topic="charge"]');
  await page.fill('#composer-input', 'When does the payout for this job arrive?');
  await send();
  await at('J28 tailor: waiting on Taily', 't-case', { has: ['Taily is reviewing', 'My payout', 'When does the payout for this job arrive?'] });
  await asAdmin();
  await at('J28 admin: her case in the inbox', 'a-inbox', { has: ['Charge or payout question', 'Sarah Chen · Amara Reyes'] });
  await press('.admin-row[data-case]');
  await at('J28 admin: her side of the conversation', 'a-case', { has: ['When does the payout for this job arrive?'] });
  await page.fill('#composer-input', `The Friday after Sarah gets her order. Yours is ${fmtExact(S.seed.payout)}.`);
  await send();
  await at('J28 admin: replied', 'a-case', { has: [`The Friday after Sarah gets her order. Yours is ${fmtExact(S.seed.payout)}.`] });
  const tx = await model((S) => S.state.outbox.filter((m) => m.event === 'taily-replied-t').map((m) => [m.to, m.status, m.land]));
  check('J28 she is texted the reply (taily-replied-t → t-case)', JSON.stringify(tx) === JSON.stringify([['tailor', 'delivered', 't-case']]), JSON.stringify(tx));
  await flip();                                                          // admin → tailor
  await page.evaluate(() => window.Taily.render('t-case'));
  await at('J28 tailor: Taily replied', 't-case', { has: ['Taily replied', `The Friday after Sarah gets her order. Yours is ${fmtExact(S.seed.payout)}.`], not: 'Taily is reviewing' });
});

/* ---------- J29–J31 (pre-MVP B2, K-48 / K-49: Account v2, D-07 social sign-in + phone) ---------- */
const NEW_NUMBER = '(917) 555-0186';
await journey('J29', 'change phone: a code to the new number, then every text goes there (DG-3 A)', async () => {
  await flow('c-account');
  await at('J29 Account v2: three groups, Personal info first', 'c-account', { has: ['YOU', 'Personal info', 'BOOKINGS AND PAYMENT', 'HELP AND POLICIES', 'Delete account'] });
  await press('[data-act="info"]');
  await at('J29 Personal info: the number texts go to', 'c-profile', { has: ['Personal info', CUSTOMER.phone, 'Texts and sign-in codes go here'] });
  await press('[data-act="change-phone"]');
  await at('J29 change phone: the new number first', 'c-change-phone', { has: ['Change phone number', `Texts and sign-in codes go to ${CUSTOMER.phone} now.`] });
  await page.fill('#screen #new-phone', CUSTOMER.phone);
  await press('.action-bar [data-act="send-code"]');
  await at('J29 the same number is refused, under the field', 'c-change-phone', { has: 'That’s the number you have now. Enter a new one.' });
  await page.fill('#screen #new-phone', '9175550186');
  await press('.action-bar [data-act="send-code"]');
  await at('J29 a code went to the NEW number', 'c-change-phone', { has: ['Enter the code', `We texted a 6-digit code to ${NEW_NUMBER}.`] });
  await page.fill('#screen #change-code', '000000');
  await at('J29 a wrong code changes nothing', 'c-change-phone', { has: 'That code doesn’t match.' });
  await page.fill('#screen #change-code', '123456');
  await at('J29 verified: Personal info shows the new number', 'c-profile', { has: [NEW_NUMBER, 'Texts and sign-in codes go here'], not: CUSTOMER.phone });
  /* the next text Taily sends her goes to the new number: Texts off and on again sends the confirmation text */
  await page.evaluate(() => window.Taily.render('c-texts'));
  await settle(page);
  await press('#texts-booking');
  await press('#texts-booking');
  const last = await page.evaluate(async () => { const S = await import('/js/state.js'); const x = S.textsFor('customer').pop(); return { event: x?.event, phone: x?.phone }; });
  check('J29 the next text goes to the new number', last.event === 'texts-on' && last.phone === NEW_NUMBER, JSON.stringify(last));
  await at('J29 Texts names the new number', 'c-texts', { has: `We text ${NEW_NUMBER}.` });
});

await journey('J30', 'delete account: blocked while a visit is open, then allowed — what goes, what stays (DG-3 A)', async () => {
  await flow('c-account--delete-blocked');
  await at('J30 blocked with the reason', 'c-account', { has: [`Your visit with Amara on ${SEED_WHEN} is still open.`, 'See the booking'], not: 'This can’t be undone' });
  await click('[data-act="delete-see"]');
  await at('J30 See the booking opens it', 'c-booking', { has: 'Cancel booking' });
  await press('[data-act="cancel"]');
  await click('[data-act="cancel-ok"]');
  const st = await page.evaluate(async () => { const S = await import('/js/state.js'); return S.state.appts[0]?.status; });
  check('J30 the visit is cancelled', st === 'cancelled', st);
  await press('[data-nav="account"]');
  await press('[data-act="delete"]');
  await at('J30 now the confirm: what goes, what stays', 'c-account', { has: ['Delete your account?', 'We keep receipts and messages for past orders, as the law requires.', 'This can’t be undone.'] });
  await click('[data-act="delete-ok"]');
  await at('J30 signed out, it says so', 'c-welcome', { has: ['Your account is deleted', 'Continue with phone'] });
  const after = await page.evaluate(async () => { const S = await import('/js/state.js'); return { signedIn: S.state.session.customer.signedIn, first: S.state.customer.first, orders: S.apptsFor('customer').length, kept: S.state.appts.length }; });
  check('J30 the account is gone; the order record stays (receipts)', !after.signedIn && after.first === '' && after.orders === 0 && after.kept === 1, JSON.stringify(after));
  await press('[data-act="phone"]');
  await page.fill('#screen #phone', CUSTOMER.phone);
  await press('.action-bar [data-act="send-code"]');
  await page.fill('#screen #code', '123456');
  await at('J30 her old number signs up as a new account', 'c-name', { has: 'What should we call you?' });
});

await journey('J31', 'Continue with Apple, then a required phone + code; the names come from Apple (D-07 / B-09); the deposit button V3 (K-49)', async () => {
  /* K-53 Q9 (D-423): Apple / Google are off for the pilot — the kept code path, shown with the sim knob */
  await page.evaluate(async () => { (await import('/js/account.js')).signOut(); (await import('/js/state.js')).state.sim.social = 'on'; window.Taily.render('c-welcome', { fresh: true }); });
  await settle(page);
  await press('[data-act="apple"]');
  await at('J31 Apple no longer skips the phone', 'c-phone', { has: ['Add your mobile number', 'Almost done with Apple.'] });
  const mid = await page.evaluate(async () => (await import('/js/state.js')).state.session.customer.signedIn);
  check('J31 not signed in before the code', mid === false, String(mid));
  await page.fill('#screen #phone', '9175550186');
  await press('.action-bar [data-act="send-code"]');
  await page.fill('#screen #code', '123456');
  await at('J31 a new number: the names from Apple, the texts opt-in', 'c-name', { has: ['From your Apple account. Change it if you like.', 'Text me booking updates'] });
  await press('.action-bar [data-act="save-name"]');
  const done = await page.evaluate(async () => { const S = await import('/js/state.js'); return { signedIn: S.state.session.customer.signedIn, phone: S.state.customer.phone, agreed: !!S.state.customer.agreed?.at }; });
  check('J31 signed in with the checked number; the terms agreement logged (S-24)', done.signedIn && done.phone === NEW_NUMBER && done.agreed, JSON.stringify(done));
  await flow('c-pay');
  await at('J31 the deposit button V3', 'c-pay', { has: [`Reserve · ${fmtExact(S.seed.deposit)} deposit`, 'Charged only if Amara accepts'] });
});

/* ---------- J32 (merge A2 + B2, D-380): Help from Account, the one policy / legal page, Unblock ---------- */
await journey('J32', 'the tracks meet: Account → Help, Shop → Help, the one policy page everywhere, Unblock', async () => {
  await flow('c-account');
  await press('[data-act="help"]');
  await at('J32 Account → Help opens Taily Help (no "next build" guard)', 'c-help', { has: ['Message Taily', 'POLICIES', 'Terms of service'] });
  await press('[data-act="policy"][data-policy="privacy"]');
  await at('J32 Help → Privacy policy: the legal page on c-policy', 'c-policy', { has: ['Privacy policy', 'Draft — counsel review required', 'Draft of Oct 18, 2026', 'IN SHORT', 'WHO SEES WHAT', 'Get help'] });
  await flow('c-account');
  await press('[data-act="policy"][data-policy="cancellation"]');
  await at('J32 Account → Cancellation and refunds: A2’s policy and B2’s refunds page are one', 'c-policy', { has: ['Cancellation and refunds', 'Cancel for free until 24 hours before your visit.', 'If your tailor doesn’t accept within 2 hours, or declines, your deposit is released in full.', 'Draft — counsel review required'] });
  await flow('c-pay');
  await press('[data-act="refunds"]');
  await at('J32 c-pay → Cancellation and refunds', 'c-policy', { has: ['Cancellation and refunds'] });
  await flow('c-pay');
  await press('[data-act="garment-protection"]');
  await at('J32 c-pay → garment protection (A2) on the same page', 'c-policy', { has: ['Garment protection', 'Draft — counsel review required'] });
  await flow('c-welcome');
  await press('[data-act="terms"]');
  await at('J32 signed out: Terms from c-welcome, no tabs, no Get help', 'c-policy', { has: ['Terms of service', 'Draft — counsel review required', 'Taily Group LLC'], not: ['Get help'] });
  const tabs = await page.evaluate(() => document.querySelectorAll('#screen [data-nav]').length);
  check('J32 signed out: no tabs on the legal page', tabs === 0, String(tabs));
  await flow('t-shop');
  await press('[data-act="help"]');
  await at('J32 Shop → Help opens t-help', 't-help', { has: ['Message Taily'] });
  await flow('t-shop');
  await press('[data-act="policy"][data-policy="tailor-agreement"]');
  await at('J32 Shop → Tailor agreement on t-policy', 't-policy', { has: ['Tailor agreement', 'You work with Taily as an independent contractor, not an employee.'] });
  await flow('c-tailor--blocked');
  await at('J32 a tailor she blocked: the reason and Unblock', 'c-tailor', { has: ['You blocked Amara', 'Unblock Amara'] });
  await press('[data-blocked] [data-act="unblock"]');
  await click('[data-s="safety-unblock"] [data-act="cs-ok"]');
  await at('J32 unblocked: bookable again', 'c-tailor', { not: ['You blocked Amara'] });
  const said = await page.evaluate(() => document.querySelector('.toast')?.textContent ?? '');
  check('J32 the toast says so', said === 'Amara is unblocked.', said);
  const blocked = await model((S) => S.isBlocked('amara'));
  check('J32 the block is gone in the model (T.unblockPerson)', blocked === false, String(blocked));
});

/* ---------- J33 (K-51): a visit closed "Not confirmed" is disputed — the hold stays, the admin decides ---------- */
await journey('J33', 'a “Not confirmed” visit disputed: That’s not right → still on hold after 72 h → the admin refunds and closes', async () => {
  const dep = fmtExact(S.seed.deposit);
  await flow('c-booking--visit-closed');                                 // Fri 7:00 PM: closed "Not confirmed", the deposit on hold
  await press('.page-actions [data-act="dispute-hold"]');
  await click('[data-s="c-booking--dispute-hold"] [data-act="cs-ok"]');
  await at('J33 customer: disputed — on hold while Taily looks', 'c-booking', { has: ['Not confirmed', `Your ${dep} deposit stays on hold while Taily looks into it.`, 'On hold'], not: 'That’s not right' });
  await demo('d7');                                                      // well past the 72-hour hold
  const still = await model((S) => ({ dep: S.state.appts[0].payments.deposit.state, held: S.state.appts[0].cancel.held, by: S.state.appts[0].cancel.disputedBy, review: S.openReviews().map((x) => x.reason) }));
  check('J33 disputed: still on hold after 72 h, the review is the dispute', JSON.stringify(still) === JSON.stringify({ dep: 'captured', held: true, by: 'customer', review: ['unconfirmed-disputed'] }), JSON.stringify(still));
  await asAdmin();
  await press('.admin-row[data-case]');
  await at('J33 admin: the case — refund or keep the held deposit', 'a-case', { has: ['Refund Sarah’s deposit', 'Amara keeps the deposit'] });
  await press('[data-act="admin-act"][data-kind="refund-deposit"]');
  await click('[data-s="a-case--act"] [data-act="cs-ok"]');
  await press('[data-act="close-case"]');
  await click('[data-s="a-case--close"] [data-act="cs-ok"]');
  await at('J33 admin: closed, both told', 'a-case', { has: ['Closed', `We refunded your ${dep} deposit.`] });
  await flip();                                                          // admin → tailor
  await flip();                                                          // → customer
  await page.evaluate(() => window.Taily.render('c-booking'));
  await at('J33 customer: refunded by Taily', 'c-booking', { has: [`Taily refunded your ${dep} deposit`, 'Refunded'] });
});

/* ---------- J34–J36 (pre-MVP K-53, track M): the balance held at Ready, never chosen, the courier at Pay ---------- */
await journey('J34', 'the balance held at Ready: Amara marks it ready → Sarah’s card is held at once → every time ends inside the hold → Pay confirms against it → the code captures it → the Ledger', async () => {
  const bal = fmtExact(S.seed.balance);
  await flow('t-job--in-progress');                                      // Thu 5:00 PM, after the fitting
  await click('[data-act="mark-ready"]');
  await at('J34 tailor: the mark-ready sheet says the hold', 't-job', { has: [`we hold her ${bal} balance on her card`, `She has ${HOLD_DAYS} days to choose pickup or delivery from the options you tick.`] });   // K-54 P2
  await click('[data-act="ready-ok"]');
  await at('J34 tailor: ready — her balance is held', 't-job', { has: ['Ready · Sarah is choosing how to get it back', `We’re holding Sarah’s ${bal} balance on her card`, 'She chooses by Mon, Oct 19 · 5:00 PM.'] });
  const held = await model((S) => { const b = S.state.appts[0].payments.balance; return [b.state, b.by, b.cents, b.cardId]; });
  check('J34 the hold is placed at ready, on the booking card (merchant-initiated)', JSON.stringify(held) === JSON.stringify(['held', 'ready', S.seed.balance, 'visa-4242']), JSON.stringify(held));
  const txt = await model((S) => S.state.outbox.find((m) => m.event === 'ready')?.body ?? '');
  check('J34 the ready text says the hold and the day to choose by', txt.includes(`We’re holding ${bal} on your Visa`) && txt.includes('by Mon, Oct 19'), txt);
  await flip();
  await click('[data-nav="bookings"]');
  await click('.appt-row');
  await at('J34 customer: ready — held on her card, the last day to choose', 'c-ready', { has: [`We’re holding ${bal} on your Visa •••• 4242.`, 'Choose by Mon, Oct 19 · 5:00 PM.', `Pay ${bal}`] });
  await click('[data-act="return"][data-value="pickup"]');
  await click('[data-act="pick-time"]');
  await at('J34 customer: the times end inside the hold', 'c-ready', { has: ['Pick a pickup time', 'until Mon, Oct 19 · 5:00 PM'] });
  const inside = await model((S) => { const a = S.state.appts[0]; return S.handoffSlots(a, 'pickup').every((x) => new Date(x.start).getTime() + 30 * 60000 <= S.unclaimedAt(a)); });
  check('J34 every pickup time ends by the hold’s last day', inside === true, String(inside));
  await click('[data-act="ht-ok"]');
  await click('[data-act="pay-change"]');   // K-54 F9: Change opens the sheet — the balance is on hold already
  await at('J34 customer: Change — the sheet says the balance is on hold already', 'c-ready', { has: ['Pay the balance', 'The balance is on hold on your Visa •••• 4242', `Pay ${bal}`, 'Charged at pickup'] });
  await click('[data-act="pay-ok"]');
  await at('J34 customer: confirmed, charged at pickup', 'c-booking', { has: [`Payment ${bal} · Charged at pickup`, 'YOUR PICKUP CODE'] });
  const after = await model((S) => { const b = S.state.appts[0].payments.balance; return [b.state, b.by, (b.holds ?? []).length]; });
  check('J34 Pay confirmed against the ready hold (no second authorization)', JSON.stringify(after) === JSON.stringify(['held', 'ready', 1]), JSON.stringify(after));
  await flip();
  await click('.appt-row');
  await click('[data-act="picked-up"]');
  await page.fill('#handoff-code', PICKUP_CODE);
  await press('[data-act="pickup-ok"]');
  await at('J34 tailor: the code captures it — completed', 't-job', { has: ['JOB COMPLETED', fmtExact(S.seed.payout)] });
  await asAdmin();
  await click('[data-nav="ledger"]');
  await at('J34 admin: the Ledger — the hold at ready, the capture at the handoff, the fee, the payout', 'a-ledger', { has: ['Ledger', 'Balance hold', 'placed at ready', 'Balance captured', 'at the handoff', bal, 'Taily fee', fmtExact(S.seed.tailyFee), 'Payout queued', 'QuickBooks Online or Xero'] });
});

await journey('J35', 'never chosen: the ready texts, then the hold’s last day — charged anyway, set to in-store pickup, both texted, the tailor paid', async () => {
  const bal = fmtExact(S.seed.balance);
  await flow('c-ready');                                                  // Thu 5:00 PM: ready, the balance held
  await advance(24 * 60);                                                 // Fri 5:00 PM
  await advance(48 * 60);                                                 // Sun 5:00 PM
  const sent = await model((S) => S.state.outbox.filter((m) => m.event.startsWith('ready')).map((m) => m.event));
  check('J35 the ready texts: at ready, 24 h, 72 h', JSON.stringify(sent) === JSON.stringify(['ready', 'ready-24h', 'ready-72h']), JSON.stringify(sent));
  const t72 = await model((S) => S.state.outbox.find((m) => m.event === 'ready-72h')?.body ?? '');
  check('J35 the 72 h text says what happens on the last day', t72.includes(`or we’ll charge the ${bal} and set it to in-store pickup`), t72);
  await advance(48 * 60);                                                 // past Mon 5:00 PM, the hold’s last day
  await paint('c-booking');
  await at('J35 customer: charged anyway, set to in-store pickup', 'c-booking', { has: ['We set it to in-store pickup · pick a time', `We charged your ${bal} balance ${HOLD_DAYS} days after your order was ready.`, `Ready · ${bal} charged`, 'YOUR PICKUP CODE', 'Pick a time'] });
  const texts = await model((S) => ['ready-default', 'ready-default-t'].map((e) => S.state.outbox.find((m) => m.event === e)?.body ?? ''));
  check('J35 both are texted (she was charged; Amara is paid)', texts[0].includes(`so we charged your ${bal} balance and set it to in-store pickup`) && texts[1].includes(`Your ${fmtExact(S.seed.payout)} payout comes`), JSON.stringify(texts));
  await page.mouse.move(5, 5); await page.mouse.move(10, 10);            // the first input reveals the pinned Test-flows control
  await flip();
  await click('.appt-row');
  await at('J35 tailor: charged on the last day — the payout is on its way', 't-job', { has: [`Sarah didn’t choose in ${HOLD_DAYS} days, so we charged her ${bal} and set it to in-store pickup. Your payout is on its way`] });
  await click('[data-nav="earnings"]');
  await at('J35 tailor: the payout is scheduled', 't-earnings', { has: fmtExact(S.seed.payout) });
});

await journey('J36', 'the courier at Pay: re-quoted, a small rise absorbed by Taily (she pays what she saw); a pricier window after Pay is its own charge (toast, booking, receipt, Ledger)', async () => {
  const OFF = '2026-10-16T16:30';
  const seen = courierQuote(0.6, OFF).cents;
  const absorbed = courierQuote(0.6, OFF, { drift: 200 }).cents - seen;
  const extra = S.courierQuote.cents - seen;                              // the 5:00 PM peak window minus the 4:30 PM one
  await flow('c-ready--courier');                                         // courier chosen, no window yet
  await model((S) => S.T.setHandoffSlot(S.state.appts[0].id, '2026-10-16T16:30').ok);
  await model((S) => { S.state.sim.courierDrift = 200; return true; });  // Uber's live price at Pay moved by $2.00
  await paint('c-ready');
  await at('J36 customer: the window picked at its price', 'c-ready', { has: [`${fmtExact(seen)} · Uber to your door`, `Pay ${fmtExact(S.seed.balance + seen)}`] });
  await click('.action-bar [data-act="pay"]');   // K-54 F9: one tap
  await at('J36 customer: paid what she saw — booked', 'c-booking', { has: ['Courier booked · arrives Fri, Oct 16 · 4:30–5:00 PM', `Payment ${fmtExact(S.seed.balance + seen)} · Charged on delivery`] });
  const pay = await model((S) => S.state.appts[0].courier.pay?.absorbed ?? null);
  check('J36 Taily absorbed the rise at Pay (up to $3.00)', pay === absorbed && absorbed > 0, `${pay} vs ${absorbed}`);
  await model((S) => { S.state.sim.courierDrift = 0; return true; });
  await click('[data-act="change-time"]');
  await page.locator('[data-s="c-booking--change-window"] [role="listbox"]').nth(1).press('ArrowDown');   // from 4:00 PM (the nearest other) to 5:00 PM, the evening peak
  await settle(page);
  await click('[data-act="ht-ok"]');
  const moved = await model((S) => (S.state.appts[0].payments.courierCharges ?? []).map((x) => x.cents));
  check('J36 the pricier window is its own charge', JSON.stringify(moved) === JSON.stringify([extra]), JSON.stringify(moved));
  await at('J36 customer: moved — the difference charged now, on its own', 'c-booking', { has: [`Window change ${fmtExact(extra)} · charged Thu, Oct 15`, 'Arrives Fri, Oct 16 · 5:00–5:30 PM'] });
  await demo('courier');
  await at('J36 customer: delivered', 'c-complete', { has: ['ORDER COMPLETE'] });
  await press('[data-act="full-receipt"]');
  await at('J36 customer: the receipt lists the window change', 'c-receipt', { has: ['Courier window change', fmtExact(extra)] });
  await asAdmin();
  await click('[data-nav="ledger"]');
  await at('J36 admin: the Ledger — courier hold, the change, Uber and Taily’s fee', 'a-ledger', { has: ['Courier hold', 'Courier window change, charged on its own', 'Courier, paid to Uber', 'Taily courier fee'] });
});

/* ---------- J37–J40 (MVP readiness, track L: K-52 / K-53, D-420…D-428) ---------- */
await journey('J37', 'Log in as a returning customer: Welcome → Log in → her number → the same code step → Home (K-52)', async () => {
  await page.evaluate(async () => { (await import('/js/account.js')).signOut(); window.Taily.render('c-welcome', { fresh: true }); });
  await settle(page);
  await at('J37 the welcome: phone only, Log in for a returning customer (K-53 Q9)', 'c-welcome', { has: ['Continue with phone', 'Already have an account? Log in'], not: ['Continue with Apple'] });
  await press('[data-act="log-in"]');
  await at('J37 Welcome back', 'c-login', { has: ['Welcome back', 'Log in with your mobile number.'] });
  await page.fill('#screen #phone', CUSTOMER.phone);
  await press('.action-bar [data-act="send-code"]');
  await at('J37 the same code step', 'c-code', { has: ['Enter the code', `We texted a 6-digit code to ${CUSTOMER.phone}.`] });
  await page.fill('#screen #code', '123456');
  await settle(page);
  await at('J37 signed in: Home', 'c-job', {});
  const s = await model((S) => ({ in: S.state.session.customer.signedIn, first: S.state.customer.first }));
  check('J37 signed in as Sarah (no name step for an existing account)', s.in === true && s.first === CUSTOMER.first, JSON.stringify(s));
});

await journey('J38', 'Log in with an unknown number: no account, no code, no sign-up — Create one carries the number to sign-up (K-52)', async () => {
  await page.evaluate(async () => { (await import('/js/account.js')).signOut(); window.Taily.render('c-login', { fresh: true }); });
  await settle(page);
  await page.fill('#screen #phone', NEW_NUMBER);
  await press('.action-bar [data-act="send-code"]');
  await at('J38 said next to the field, one way on', 'c-login', { has: ['No account with this number.', 'Create one'] });
  const s = await model((S) => ({ pending: S.state.session.customer.pending ?? null, in: S.state.session.customer.signedIn, codes: S.state.outbox.length }));
  check('J38 no code sent, nobody signed up', s.pending === null && s.in === false, JSON.stringify(s));
  await press('[data-unknown] [data-act="create"]');
  await at('J38 Create one → the sign-up path', 'c-phone', { has: ['Your phone number', 'Send code'] });
  const carried = await page.evaluate(() => document.querySelector('#screen #phone')?.value);
  check('J38 the number came along', carried === NEW_NUMBER, carried);
  await press('.action-bar [data-act="send-code"]');
  await page.fill('#screen #code', '123456');
  await settle(page);
  await at('J38 a new account: the name step', 'c-name', { has: ['What should we call you?'] });
  /* the tailor's Log in, the same rule */
  await page.evaluate(async () => { (await import('/js/account.js')).signOut('tailor'); window.Taily.render('c-welcome', { fresh: true }); });
  await settle(page);
  await press('[data-act="tailor-login"]');
  await at('J38 tailor: Log in', 't-phone', { has: ['Welcome back', 'Log in to your shop with your mobile number.'] });
  await page.fill('#screen #phone', '(646) 555-0101');
  await press('.action-bar [data-act="send-code"]');
  await at('J38 tailor: no account with this number', 't-phone', { has: ['No account with this number.', 'Join Taily'] });
  await press('[data-unknown] [data-act="mode-join"]');
  await at('J38 tailor: Join with the same number', 't-phone', { has: ['Join Taily with your mobile number.', 'Already on Taily? Log in'] });
});

await journey('J39', 'The admin gate: no Test flows for a customer; every a-* screen needs his sign-in (email → code → second factor); then Test flows from the inbox; Sign out hides them (K-52, K-53 a8)', async () => {
  await h.goto('/');                                                    // a plain visit (not a test boot)
  await page.mouse.move(100, 300); await page.mouse.move(120, 320);
  await settle(page);
  const plain = await page.evaluate(() => ({ tools: document.documentElement.classList.contains('tools-on'), shown: !!document.querySelector('#flow-trigger') && getComputedStyle(document.querySelector('.stage-caption')).display !== 'none' }));
  check('J39 a plain visit: the Test-flows tools stay hidden after input', !plain.tools && !plain.shown, JSON.stringify(plain));
  await page.evaluate(() => window.Taily.render('a-case'));
  await page.waitForSelector('#screen[data-screen="a-login"]', { timeout: 3000 }).catch(() => {});
  await at('J39 a-case without the admin’s session → his sign-in', 'a-login', { has: ['TAILY ADMIN', 'Sign in', 'Email me a code'] });
  await h.goto('/?admin');
  await at('J39 ?admin is his own entry', 'a-login', { has: ['For the Taily team only.'] });
  await page.fill('#screen #admin-email', 'sarah.chen@example.com');
  await press('.action-bar [data-act="send"]');
  await page.waitForSelector('#screen #admin-email[aria-invalid="true"]', { timeout: 3000 }).catch(() => {});
  await at('J39 not an admin email', 'a-login', { has: ['This email isn’t a Taily admin account.'] });
  await page.fill('#screen #admin-email', 'kevin@taily.app');
  await press('.action-bar [data-act="send"]');
  await page.waitForSelector('#screen #admin-code', { timeout: 3000 });
  await at('J39 step 1: the code by email', 'a-login', { has: ['Check your email', 'kevin@taily.app'] });
  await page.fill('#screen #admin-code', '123456');
  await page.waitForSelector('#screen #admin-second', { timeout: 3000 });
  await at('J39 step 2: the authenticator code', 'a-login', { has: ['Two-step check'] });
  const half = await model((S) => S.state.session.admin.signedIn);
  check('J39 the emailed code alone does not sign him in', half === false, String(half));
  await page.fill('#screen #admin-second', '123456');
  await page.waitForSelector('#screen[data-screen="a-inbox"]', { timeout: 3000 });
  await at('J39 signed in: the inbox', 'a-inbox', { has: ['Inbox', 'Test flows', 'Sign out'] });
  const on = await page.evaluate(() => ({ tools: document.documentElement.classList.contains('tools-on'), shown: getComputedStyle(document.querySelector('.stage-caption')).display !== 'none' }));
  check('J39 the Test-flows tools come on for the admin', on.tools && on.shown, JSON.stringify(on));
  await press('[data-admin-tools] [data-act="test-flows"]');
  await page.waitForSelector('#flow-menu:not([hidden])', { timeout: 3000 }).catch(() => {});
  const open = await page.evaluate(() => document.querySelector('#flow-menu')?.hidden === false);
  check('J39 Test flows opens from the admin inbox', open, String(open));
  await page.keyboard.press('Escape');
  await press('[data-admin-tools] [data-act="admin-sign-out"]');
  await at('J39 Sign out → his sign-in', 'a-login', { has: ['Sign in'] });
  const off = await page.evaluate(() => ({ tools: document.documentElement.classList.contains('tools-on'), kept: sessionStorage.getItem('taily-admin') }));
  check('J39 signed out: the tools are gone and the tab forgets him', !off.tools && off.kept === null, JSON.stringify(off));
  await h.goto('/?test=1');                                              // the harness's boots stay an admin test session
  const test = await page.evaluate(() => ({ tools: document.documentElement.classList.contains('tools-on') }));
  check('J39 ?test=1 is an admin test session (the harness keeps the tools)', test.tools, JSON.stringify(test));
});

await journey('J40', 'Time off hides openings: Amara adds Thu–Sat off in her shop → customers’ next opening moves to Monday; 24 hours of notice (K-53 a4, S-34)', async () => {
  await flow('to-availability--edit');
  await at('J40 her availability', 'to-availability', { has: ['TIME OFF', 'No time off set.', 'MINIMUM NOTICE'] });
  await press('[data-act="add-off"]');
  await at('J40 the time-off sheet', 'to-availability', { has: ['Pick your first and last day off.'] });
  const cols = page.locator('[data-s="to-availability-off"] .wheel__col--scroll');
  await cols.nth(0).focus();
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowDown');   // Tue Oct 13 → Thu Oct 15
  await cols.nth(1).focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');   // → Sat Oct 17
  await click('[data-s="to-availability-off"] [data-act="off-done"]');
  await at('J40 the range is listed', 'to-availability', { has: ['Thu, Oct 15 to Sat, Oct 17', '3 days'] });
  await press('[data-chip-group="notice"] [data-value="24"]');
  await press('.action-bar [data-act="save"]');
  await at('J40 saved: Shop says it', 't-shop', { has: ['24 hours notice', 'Off Oct 15 to Oct 17'] });
  const m = await model((S) => ({ home: S.nextOpening('amara', 'home'), off: S.state.tailors[0].timeOff.map((o) => `${o.from}/${o.to}`), notice: S.state.tailors[0].notice }));
  check('J40 the model: Thu–Sat off, 24 h notice, next home opening Mon 5:00 PM', m.home === '2026-10-19T17:00' && m.off.join() === '2026-10-15/2026-10-17' && m.notice === 24, JSON.stringify(m));
  await flip();                                                          // tailor → customer
  await paint('c-tailors');
  await at('J40 the customer sees Monday as the next opening', 'c-tailors', { has: [`Next opening ${fmtWhen('2026-10-19T17:00')}`], not: [`Next opening ${fmtWhen('2026-10-15T17:00')}`] });
});

/* ---------- K-54 happy-path review fixes (D-450…D-464) ---------- */
await journey('J41', 'a second booking lands on the NEW request: open a booking → Home → book → Reserve (K-54 B1)', async () => {
  await flow('c-booking');
  await press('[data-nav="bookings"]');
  await press('.appt-row');                                                  // her first booking, opened from Bookings (state.ui.apptId = it)
  await at('J41 her booking, opened', 'c-booking', { has: ['Your visit with Amara'] });
  const first = await model((S) => S.state.ui.apptId);
  await press('[data-nav="home"]');
  await at('J41 Home leads with the booking; the draft is empty (no disabled Next bar, K-54 F1)', 'c-job', { has: ['What needs work?'], not: 'Add at least one garment to continue.' });
  await press('[data-act="add-garment"][data-type="Suit Pant"]');
  await press('[data-act="pick-services"]');
  await click('#svc-hem-pants');
  await click('[data-act="services-done"]');
  await press('.action-bar [data-act="next"]');
  await at('J41 where and when', 'c-where', { has: ['See tailors'] });
  await press('.action-bar [data-act="next"]');
  await at('J41 tailors near you', 'c-tailors', { has: ['Amara Reyes'] });
  await press('.tailor-row__link');
  await press('[data-act="book-now"]');
  await press('[data-act="slot-next"]');
  await at('J41 review and send', 'c-pay', { has: ['Review and send request', '1 item · 1 service'] });
  await press('.action-bar [data-act="pay"]');
  const ids = await model((S) => ({ newest: S.state.appts[S.state.appts.length - 1].id, focus: S.state.ui.apptId, n: S.state.appts.length }));
  check('J41 a new request was made and is the one in focus', ids.n === 2 && ids.newest !== first && ids.focus === ids.newest, JSON.stringify({ ...ids, first }));
  await at('J41 Reserve lands on the NEW request (one item), not the booking she had open', 'c-request', { has: ['Waiting for Amara', '1 item · 1 service'], not: '2 items' });
});

await journey('J42', 'the admin verifies a new tailor check by check → she is live and listed; the Demo action does it too (K-54 B2)', async () => {
  await flow('a-verifications');
  await at('J42 Verifications: four checks in order, the background check waits', 'a-verifications', { has: ['UNDER REVIEW', '1 of 4 passed', 'Runs last, once the other three pass'] });
  await press('[data-check-row="years"] [data-act="check-ask"]');
  await at('J42 Needs info quotes her text', 'a-verifications', { has: ['Ask Amara for more?', 'We need one more thing to verify you: your years tailoring.'] });
  await click('[data-act="cs-ok"]');
  const asked = await model((S) => ({ st: S.checkState(S.state.tailors[0], 'years'), text: S.state.outbox.filter((m) => m.event === 'check-action-needed').length }));
  check('J42 years → Needs info, and she was texted', asked.st === 'needs-info' && asked.text === 1, JSON.stringify(asked));
  await press('[data-check-row="years"] [data-act="check-pass"]');
  await press('[data-check-row="id"] [data-act="check-pass"]');
  await press('[data-check-row="payout"] [data-act="check-pass"]');
  await at('J42 approved: the background check is the one left', 'a-verifications', { has: ['3 of 4 passed'], not: 'Runs last' });
  await press('[data-check-row="background"] [data-act="check-pass"]');
  await at('J42 all four passed: she moves to Verified, listed', 'a-verifications', { has: ['No one waiting', 'VERIFIED', 'Listed'] });
  const live = await model((S) => ({ live: S.state.tailors[0].live, listed: S.listed(S.state.tailors[0]), verified: S.state.outbox.filter((m) => m.event === 'verified').length, rows: S.tailorsFor(S.state.job).rows.length }));
  check('J42 live, listed, the “verified” text once, and customers can find her', live.live && live.listed && live.verified === 1 && live.rows === 1, JSON.stringify(live));
  /* the Demo action on a fresh submission */
  await page.evaluate(async () => { const C = await import('/js/fixtures/common.js'); C.onboardTo('submitted'); window.Taily.render('t-shop', { fresh: true }); });
  await settle(page);
  await demo('checks');
  const one = await model((S) => [S.firstChecksPassed(S.state.tailors[0]), S.checksPassed(S.state.tailors[0])]);
  check('J42 Demo “Checks come back”, 1st tap: approved, background pending', JSON.stringify(one) === '[true,false]', JSON.stringify(one));
  await demo('checks');
  const two = await model((S) => [S.checksPassed(S.state.tailors[0]), S.listed(S.state.tailors[0])]);
  check('J42 … 2nd tap: the background check clears — verified and listed', JSON.stringify(two) === '[true,true]', JSON.stringify(two));
});

await journey('J43', 'the Friday payout run fires as the demo clock crosses it; Earnings and the text say so (K-54 F5)', async () => {
  await page.evaluate(async () => { const C = await import('/js/fixtures/common.js'); C.driveTo('completed'); window.Taily.render('t-earnings', { fresh: true }); });
  await settle(page);
  await at('J43 Earnings: the payout scheduled for Friday', 't-earnings', { has: ['NEXT PAYOUT', `Arrives ${fmtDay(PAYOUT_DAYS.first)}`, fmtExact(S.seed.payout)] });
  await demo('h48');                                                         // Thu 5:00 PM → Sat 5:00 PM: the Fri 9:00 AM run went out
  await at('J43 Earnings: paid on its Friday', 't-earnings', { has: ['PAID', fmtDay(PAYOUT_DAYS.first), 'Paid to Chase •••• 6789', fmtExact(S.seed.payout)], not: `Arrives ${fmtDay(PAYOUT_DAYS.first)}` });
  const t = await model((S) => S.state.outbox.filter((m) => m.event === 'payout-sent').map((m) => m.at));
  check('J43 T35 went out at the run (Fri 9:00 AM)', JSON.stringify(t) === JSON.stringify([`${PAYOUT_DAYS.first}T09:00`]), JSON.stringify(t));
});

await journey('J44', 'a tailor signs out → t-phone in Log in mode → her number → the code → Home (K-54 F8)', async () => {
  await flow('t-shop');
  await press('[data-act="sign-out"]');
  await click('[data-act="sign-out-ok"]');
  await at('J44 signed out: Log in, not the Join pitch', 't-phone', { has: ['Welcome back', 'Log in to your shop with your mobile number.'], not: 'Get booked by customers nearby' });
  const phone = await model((S) => S.state.tailors[0].phone);
  await page.fill('#screen #phone', phone);
  await press('.action-bar [data-act="send-code"]');
  await page.fill('#screen #code', '123456');
  await settle(page);
  await at('J44 back in', 't-home', {});
});

await journey('J45', 'Pay on the ready order: one tap on the card holding it; Change opens the sheet (K-54 F9)', async () => {
  await flow('c-ready--pay-direct');
  await at('J45 the card Pay confirms on, above the bar', 'c-ready', { has: ['Pay with', 'Visa •••• 4242', 'Change', `Pay ${fmtExact(S.seed.balance)}`] });
  await press('[data-act="pay-change"]');
  await at('J45 Change: the sheet with every way to pay', 'c-ready', { has: ['Pay the balance', 'Apple Pay'] });
  await click('.sheet__cancel');
  await click('.action-bar [data-act="pay"]');
  await at('J45 one tap: confirmed, the pickup code', 'c-booking', { has: [`Payment ${fmtExact(S.seed.balance)} · Charged at pickup`, 'YOUR PICKUP CODE'] });
  const b = await model((S) => { const x = S.state.appts[0].payments.balance; return [x.state, x.by, (x.holds ?? []).length]; });
  check('J45 confirmed against the ready hold — no second authorization', JSON.stringify(b) === JSON.stringify(['held', 'ready', 1]), JSON.stringify(b));
});

console.log(`\n${R.passes} journey checks passed, ${R.failures} failed.`);
await h.close();
process.exit(R.failures ? 1 : 0);
