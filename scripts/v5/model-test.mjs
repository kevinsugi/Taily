/* Taily v5 — model test. Plain node asserts, no browser.
   Run: node scripts/v5/model-test.mjs   (prints PASS / FAIL lines, exits 1 on any failure)
   Covers: golden money numbers, formatting, rush ladder, every transition + guard, cancellation windows,
   expiry + retries, decline, price change, slots + the tailor list, messaging, statusScreen, tailor adapters. */
import { MONEY, POLICY } from '../../js/money-config.js';
import * as M from '../../js/money.js';
import * as D from '../../js/dates.js';
import * as DATA from '../../js/data.js';
import * as S from '../../js/state.js';
import * as TD from '../../js/tailor-data.js';
import { driveTo, TARGETS, addRequest } from '../../js/fixtures/common.js';
import { SCENARIOS, SEED_SLOT } from './money.mjs';
import { SUGGESTED_SLOT, SECOND_SLOT_AFTER } from '../../js/fixtures/money-scenarios.js';
import { setFocus, focusAppt, redirectIfMoved, statusWord } from '../../js/focus.js';
import * as C from '../../js/components.js';
import * as A from '../../js/account.js';
import { withLatency, LATENCY_MS } from '../../js/sim.js';

const { state, T } = S;
let pass = 0;
let failed = 0;
const failures = [];
function report(ok, desc, detail = '') {
  if (ok) { pass += 1; if (process.argv.includes('--verbose')) console.log(`PASS  ${desc}`); return; }
  failed += 1; failures.push(desc);
  console.log(`FAIL  ${desc}${detail ? `  ${detail}` : ''}`);
}
const eq = (actual, expected, desc) => report(JSON.stringify(actual) === JSON.stringify(expected), desc, `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
const ok = (cond, desc) => report(!!cond, desc);
const guard = (res, error, desc) => report(res && res.ok === false && res.error === error, desc, `got ${JSON.stringify(res && { ok: res.ok, error: res.error })}, want error "${error}"`);
const throws = (fn, desc) => { let t = false; try { fn(); } catch { t = true; } report(t, desc); };
const section = (name) => { if (process.argv.includes('--verbose')) console.log(`\n# ${name}`); };
const amara = () => state.tailors[0];
const $ = (dollars) => M.cents(dollars);

/* ================= config + formatting ================= */
section('config + formatting');
ok(Object.isFrozen(MONEY) && Object.isFrozen(POLICY), 'MONEY and POLICY are frozen');
eq([MONEY.TAILY_FEE_RATE, MONEY.DEPOSIT_RATE, MONEY.COURIER_MARKUP, MONEY.COURIER_BASE, MONEY.COURIER_PER_MILE, MONEY.NO_SHOW_COMP],
  [0.10, 0.10, 0.10, 8, 2.5, 25], 'MONEY table matches the fee settings');
eq([POLICY.CANCEL_WINDOW_H, POLICY.REQUEST_EXPIRY_H, POLICY.MAX_RETRIES, POLICY.EXPIRING_SOON_MIN, POLICY.NO_SHOW_WAIT_MIN, POLICY.MIN_LEAD_H],
  [24, 2, 2, 15, 15, 3], 'POLICY table matches');
eq([M.fmt(2500), M.fmt(450), M.fmt(0), M.fmt(12345600)], ['$25', '$4.50', '$0', '$123,456'], 'fmt: whole dollars bare, else cents');
eq([M.fmtExact(1600), M.fmtExact(5), M.fmtExact(14750), M.fmtExact(0), M.fmtExact(100000)], ['$16.00', '$0.05', '$147.50', '$0.00', '$1,000.00'], 'fmtExact: always two decimals');
eq([M.fmtNeg(1250), M.fmtNeg(-1250)], ['−$12.50', '−$12.50'], 'fmtNeg: U+2212 minus, dollars');
ok(!/%/.test([M.fmt(1), M.fmtExact(1), M.fmtNeg(1)].join('')), 'fmt* never print a percent sign');
eq([[1800, 2700].map(M.fmtColumn([1800, 2700])), [1800, 2250, 3600].map(M.fmtColumn([1800, 2250, 3600]))], [['$18', '$27'], ['$18.00', '$22.50', '$36.00']], 'fmtColumn (D-70): one precision per list, cents for all if any has cents');
eq(M.fmtColumn([null, 4050])(4050), '$40.50', 'fmtColumn ignores nulls');
eq([M.cents(12.5), M.cents(0.07), M.cents(19.99), M.cents(25)], [1250, 7, 1999, 2500], 'cents() rounds to integer cents');

/* ================= dates ================= */
section('dates');
ok(!/\d [AP]M/.test(D.fmtWhen('2026-10-15T17:30')), 'R3-2-C-03: time and AM/PM are joined by a no-break space');
eq(D.fmtWhen('2026-10-15T17:00'), 'Thu, Oct 15 · 5:00\u00a0PM', 'fmtWhen');
eq([D.fmtDay('2026-10-23'), D.fmtTime('2026-10-15T09:30'), D.fmtShort('2026-10-15'), D.fmtMdy('2026-10-15'), D.fmtTime('2026-10-15T00:05'), D.fmtTime('2026-10-15T12:00')],
  ['Fri, Oct 23', '9:30\u00a0AM', 'Oct 15', '10/15/26', '12:05\u00a0AM', '12:00\u00a0PM'], 'fmtDay / fmtTime / fmtShort / fmtMdy');
eq(D.fmtDay('2026-09-03'), 'Thu, Sep 3', 'September is the three-letter "Sep"');
eq([D.fmtCountdown(2 * 3600000), D.fmtCountdown(52 * 60000), D.fmtCountdown(0), D.fmtCountdown(-5), D.fmtCountdown(61 * 60000)], ['2h', '52m', 'Expired', 'Expired', '1h 1m'], 'fmtCountdown');
eq([D.dayDiff('2026-10-15T17:00', '2026-10-16'), D.dayDiff('2026-10-15T23:59', '2026-10-15'), D.dayDiff('2026-10-31', '2026-11-02'), D.dayDiff('2026-03-07', '2026-03-09')], [1, 0, 2, 2], 'dayDiff counts calendar days (DST-safe)');
eq([D.weekdayKey('2026-10-13'), D.weekdayKey('2026-10-18'), D.minutesOf('17:30'), D.isoMinute(D.addMinutes('2026-10-15T23:30', 60)), D.isoDay(D.addDays('2026-10-31', 1))],
  ['tue', 'sun', 1050, '2026-10-16T00:30', '2026-11-01'], 'weekdayKey / minutesOf / addMinutes / addDays');

/* ================= seed + clock ================= */
section('seed');
S.reset();
eq(D.fmtWhen(D.isoMinute(new Date(S.now()))), 'Tue, Oct 13 · 10:00\u00a0AM', 'frozen demo clock: Tue Oct 13, 10:00 AM');
eq([state.persona, state.tailors.length, state.appts.length, state.job.garments.length], ['customer', 1, 0, 2], 'seed: customer persona, 1 tailor, no appts, 2 garments');
eq([amara().id, amara().shop.zip, amara().home.zips, amara().home.fee, amara().rush], ['amara', '11211', ['11211', '11222', '11206', '11237'], 35, [{ days: 1, fee: 40 }, { days: 2, fee: 25 }, { days: 3, fee: 15 }]], 'Amara: Brooklyn shop + home zips + $35 + rush ladder');
eq(Object.keys(amara().prices).length, 10, 'Amara prices 10 of the 11 catalog services');
ok(!('bridal' in amara().prices) && 'bridal' in DATA.SERVICES, 'bridal is in the catalog but not offered');
eq(Object.keys(DATA.SERVICES).length, 11, 'catalog has 11 services');
ok(Object.values(DATA.SERVICES).every((s) => s.garments.every((g) => g in DATA.GARMENT_TYPES)), 'every service garment type exists in GARMENT_TYPES');
eq([state.customer.address.zip, state.customer.cards[0].last4], ['11211', '4242'], 'Sarah: 11211, Visa 4242');
ok(S.bookable(amara()), 'Amara is bookable (all six onboarding flags)');
for (const sec of S.SECTIONS) ok(S.validateSection(sec, amara()).ok, `seed tailor passes the "${sec}" section rules`);
ok(Object.values(DATA.TAILORS[0].onboarding).every(Boolean), 'seed onboarding flags all true');
eq(DATA.itemsLabel(1) + '|' + DATA.itemsLabel(2), '1 Item|2 Items', 'itemsLabel');
ok(Array.isArray(DATA.TRUST_BADGES) && DATA.TRUST_BADGES.length === 3, 'TRUST_BADGES kept');
// the clock moves only when told to
const t0 = S.now();
S.advanceClock(30);
eq(S.now() - t0, 30 * 60000, 'advanceClock moves the frozen clock');
S.setClock('2026-10-13T10:00');
eq(S.now(), t0, 'setClock sets it exactly');

/* ================= slots + the list ================= */
section('slots + list');
S.reset();
eq(S.nextOpening('amara', 'home'), '2026-10-15T17:00', 'first home opening: Thu Oct 15 5:00 PM');
eq(S.nextOpening('amara', 'shop'), '2026-10-13T13:00', 'first shop opening: Tue Oct 13 1:00 PM (3 h lead)');
{
  const home = S.openSlots('amara', 'home', { until: '2026-10-23' });
  eq(home.slice(0, 6), ['2026-10-15T17:00', '2026-10-15T17:30', '2026-10-15T18:00', '2026-10-15T18:30', '2026-10-15T19:00', '2026-10-17T09:00'], 'home slots: 60-minute visits on :00 / :30, inside the tailor\'s own hours');
  ok(home.every((s) => s < '2026-10-23'), 'no slot on or after the need-by (D-18)');
  ok(!home.includes('2026-10-15T19:30'), 'a 60-minute home visit cannot start where it would end after the window');
  const shop = S.openSlots('amara', 'shop', { until: '2026-10-23' });
  ok(shop.includes('2026-10-13T17:30') && !shop.includes('2026-10-13T18:00'), 'shop slots: 30-minute visits fit up to the window end');
  ok(!shop.includes('2026-10-13T12:30'), 'nothing earlier than now + the lead time');
  ok([...home, ...shop].every((s) => /T\d\d:(00|30)$/.test(s)), 'every slot starts on :00 or :30');
  ok([...home, ...shop].every((s) => { const m = D.minutesOf(s.slice(11)); return m >= 540 && m + 30 <= 1260; }), 'every slot is between 9 AM and 9 PM');
}
{
  const r = S.tailorsFor(state.job);
  eq([r.rows.length, r.empty, r.rows[0].tailor.id, r.rows[0].nextOpening, r.rows[0].declined, r.rows[0].distanceMi], [1, null, 'amara', '2026-10-15T17:00', false, 0.6], 'seed list: one row, Amara, next opening Thu 5 PM, 0.6 mi');
  eq([r.rows[0].quote.total, r.rows[0].quote.homeFee, r.rows[0].quote.rush], [16000, 3500, 0], 'list-row estimate includes the home-visit fee');
}
// DST: slots are wall-clock times, so a changeover day keeps its hours (TZ switched for this block only)
{
  const prevTZ = process.env.TZ;
  const probe = (tz) => {
    process.env.TZ = tz;
    S.reset();
    amara().availability.home.sun = [['17:00', '20:00']];
    S.setClock('2026-10-28T10:00');
    return S.openSlots('amara', 'home').filter((x) => x.startsWith('2026-11-01'));
  };
  const us = probe('America/New_York');                          // US changeover: Sun Nov 1 2026
  eq(us.slice(0, 3), ['2026-11-01T17:00', '2026-11-01T17:30', '2026-11-01T18:00'], 'openSlots on the US fall-back Sunday starts at 17:00, not 16:00');
  eq(us.at(-1), '2026-11-01T19:00', 'openSlots on the fall-back Sunday ends with the 19:00 start (a 60-minute visit in a 17:00–20:00 window)');
  const eu = (() => {
    process.env.TZ = 'Europe/Berlin';
    S.reset();
    amara().availability.home.sun = [['17:00', '20:00']];
    S.setClock('2026-10-22T10:00');
    return S.openSlots('amara', 'home').filter((x) => x.startsWith('2026-10-25'));
  })();
  eq(eu[0], '2026-10-25T17:00', 'openSlots on the EU fall-back Sunday starts at 17:00');
  const spring = (() => {
    process.env.TZ = 'America/New_York';
    S.reset();
    amara().availability.home.sun = [['17:00', '20:00']];
    S.setClock('2026-03-05T10:00');
    return S.openSlots('amara', 'home').filter((x) => x.startsWith('2026-03-08'));
  })();
  eq(spring[0], '2026-03-08T17:00', 'openSlots on the US spring-forward Sunday starts at 17:00');
  if (prevTZ === undefined) delete process.env.TZ; else process.env.TZ = prevTZ;
  S.reset();
}
// A8 toggles
S.reset(); T.setJob({ zip: '11201', address: null });
eq(S.tailorsFor(state.job).empty, 'zip', 'toggle: zip outside the list -> empty "zip"');
{ const r = T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:00' });
  eq([r.ok, r.error, r.errors?.address], [false, 'job-invalid', 'address-required'], 'home job without an address cannot book (validation first)'); }
S.reset(); T.setTailorSection('where', { shop: { enabled: false } }); T.setJob({ visitType: 'shop' });
eq(S.tailorsFor(state.job).empty, 'shop', 'toggle: shop off + "At the shop" -> empty "shop"');
S.reset(); T.setJob({ needBy: '2026-10-15' });
eq(S.tailorsFor(state.job).empty, 'nothing-open', 'toggle: need-by earlier than the first opening -> empty "nothing-open"');
S.reset(); T.setJob({ visitType: 'shop', zip: '11201' });
eq(S.tailorsFor(state.job).rows.length, 1, 'shop visit from 11201 (3.9 mi) is inside the 5-mile radius');
S.reset(); T.setJob({ visitType: 'shop', zip: '99999' });
eq(S.tailorsFor(state.job).empty, 'zip', 'shop visit from a zip beyond the shop radius -> empty "zip"');
S.reset(); T.setJob({ visitType: 'shop' });
eq(S.tailorsFor(state.job).rows[0].quote.total, 12500, 'shop job list estimate has no home-visit fee');
S.reset(); T.setJob({ needBy: '2026-10-16' });
{
  const q = S.tailorsFor(state.job).rows[0].quote;
  eq([q.rush, q.rushDays, q.total], [4000, 1, 20000], 'toggle: rush -> rushDays 1, +$40.00 in the list estimate');
}
S.reset(); { const a = driveTo('declined'); const r = S.tailorsFor(state.job);
  eq([r.rows.length, r.rows[0].declined, r.empty, S.eligible(amara(), state.job).reason], [1, true, null, 'declined'], 'toggle: previously declined -> row stays, declined: true'); void a; }
S.reset(); T.setJob({ needBy: '2026-10-15', visitType: 'home' }); T.setJob({ hiddenTailors: ['amara'] });
eq(S.tailorsFor(state.job).empty, 'none-left', 'hidden tailor -> empty "none-left" (precedence over slots)');
// validateJob
S.reset();
eq(S.validateJob(state.job).ok, true, 'seed job validates');
{
  const v = S.validateJob({ garments: [], visitType: 'home', zip: '1121', address: { street: ' ' }, needBy: '2026-10-13' });
  eq([v.ok, v.errors.garments, v.errors.zip, v.errors.address, v.errors.needBy], [false, 'no-garments', 'zip-invalid', 'address-required', 'needby-past'], 'validateJob codes: no-garments, zip-invalid, address-required, needby-past');
  const v2 = S.validateJob({ garments: [{ id: 'g9', type: 'Skirt', services: [] }], visitType: 'shop', zip: '11211', needBy: '2026-10-14' });
  eq([v2.ok, v2.errors['service:g9']], [false, 'no-service:g9'], 'validateJob: no-service:<gid>');
  eq([S.validateJob(state.job, 'what').ok, S.validateJob({ ...state.job, zip: 'x' }, 'what').ok, S.validateJob({ ...state.job, zip: 'x' }, 'where').errors.zip], [true, true, 'zip-invalid'], 'validateJob steps are independent');
  eq(S.validateJob({ ...state.job, needBy: '2026-10-14' }).ok, true, 'need-by tomorrow is the earliest valid');
}
// job edits
S.reset();
{
  eq(T.addGarment('Skirt').garment.id, 'g3', 'addGarment gives the next id');
  ok(T.setServices('g3', ['dress-hem', 'zipper']).ok, 'setServices accepts services valid for the type');
  guard(T.setServices('g3', ['bridal']), 'service-not-for-type', 'setServices rejects a service the type cannot have');
  guard(T.addGarment('Hat'), 'unknown-type', 'addGarment rejects an unknown type');
  while (state.job.garments.length < DATA.MAX_ITEMS) T.addGarment('Skirt');
  guard(T.addGarment('Skirt'), 'max-items', `addGarment stops at MAX_ITEMS (${DATA.MAX_ITEMS})`);
  ok(T.removeGarment('g3').ok && !state.job.garments.some((g) => g.id === 'g3'), 'removeGarment');
  guard(T.removeGarment('nope'), 'unknown-garment', 'removeGarment unknown id');
  T.newJob();
  eq([state.job.garments.length, state.job.declinedBy, state.job.hiddenTailors], [0, [], []], 'newJob: empty draft, empty declined / hidden lists');
}

/* ================= golden money numbers ================= */
section('money: golden numbers');
const goldenRow = (q, [services, home, rush, courier, total, deposit, balance, fee, payout], desc) =>
  eq([q.services, q.homeFee, q.rush, q.courier, q.total, q.deposit, q.balance, q.tailyFee, q.payout], [services, home, rush, courier, total, deposit, balance, fee, payout], desc);
{
  S.reset();
  const lines = M.linesFor(amara(), state.job.garments);
  eq([lines.length, lines.missing.length, M.servicesTotal(lines)], [3, 0, 12500], 'linesFor: 3 lines, $125.00, none missing');
  eq(lines.map((l) => [l.garmentId, l.serviceId, l.cents]), [['g1', 'hem-pants', 2500], ['g2', 'sleeves', 4500], ['g2', 'jacket-sides', 5500]], 'linesFor snapshot (garment, service, cents)');
  const miss = M.linesFor(amara(), [{ id: 'g1', type: 'Formal Dress', services: ['bridal', 'dress-hem'] }]);
  eq([miss.length, miss.missing], [1, [{ garmentId: 'g1', serviceId: 'bridal' }]], 'linesFor skips an unpriced service and reports it in .missing');
  goldenRow(M.estimate(amara(), state.job, '2026-10-15T17:00'), [12500, 3500, 0, 0, 16000, 1600, 14400, 1250, 14750], 'seed, home, need-by Fri Oct 23');
  goldenRow(M.estimate(amara(), { ...state.job, needBy: '2026-10-16' }, '2026-10-15T17:00'), [12500, 3500, 4000, 0, 20000, 1600, 18400, 1250, 18750], 'rush: need-by Fri Oct 16, visit Thu Oct 15 (1 day)');
  goldenRow(M.estimate(amara(), { ...state.job, visitType: 'shop' }, '2026-10-13T13:00'), [12500, 0, 0, 0, 12500, 1250, 11250, 1250, 11250], 'shop visit');
  goldenRow(M.quote({ lines, homeFee: 3500, courier: M.courierQuote(0.6).cents }), [12500, 3500, 0, 1045, 17045, 1600, 15445, 1250, 14750], 'seed + courier 0.6 mi');
  eq(M.courierQuote(0.6), { miles: 0.6, quote: 950, markup: 95, cents: 1045 }, 'courierQuote(0.6) = ($8.00 + $2.50 x 0.6) plus markup = $10.45');
  eq(M.courierQuote(0).cents, 880, 'courierQuote(0) = $8.00 plus markup = $8.80');
  const dep = 1600;
  const add = [...lines.map((l) => ({ ...l, cents: l.serviceId === 'sleeves' ? $(50) : l.cents })), { garmentId: 'g1', garmentType: 'Suit Pant', serviceId: 'taper', label: 'Taper legs', cents: $(40) }];
  goldenRow(M.quote({ lines: add, homeFee: 3500, deposit: dep }), [17000, 3500, 0, 0, 20500, 1600, 18900, 1700, 18800], 'price change: + Taper $40, Sleeves $45 -> $50 (deposit unchanged)');
  goldenRow(M.quote({ lines: lines.filter((l) => l.serviceId !== 'jacket-sides'), homeFee: 3500, deposit: dep }), [7000, 3500, 0, 0, 10500, 1600, 8900, 700, 9800], 'price change: - Take in jacket sides');
  eq([M.depositFor(12500, 3500), M.depositFor(12500, 0), M.tailyFeeFor(12500), M.tailyFeeFor(17000), M.payoutFor({ services: 12500, homeFee: 3500, rush: 0 })], [1600, 1250, 1250, 1700, 14750], 'depositFor / tailyFeeFor / payoutFor');
  eq([M.tailyFeeFor(4500), M.depositFor(4550, 0), M.depositFor(4450, 0)], [450, 455, 445], 'half-up rounding to the cent, once per order');
  eq([M.tailyFeeFor(12505), M.tailyFeeFor(12495)], [1251, 1250], 'tailyFeeFor rounds half-up (1250.5 -> 1251)');
  eq([M.quote({ lines }).refund, M.quote({ lines, homeFee: 0, deposit: 99999 }).refund, M.quote({ lines, deposit: 99999 }).balance], [0, 87499, 0], 'quote: refund = deposit above total, balance never negative (D-23)');
  eq(M.noShowPayout(1600), 2500, 'no-show -> tailor paid max(deposit $16.00, $25.00) = $25.00');
  eq(M.noShowPayout(3100), 3100, 'no-show -> a deposit above $25.00 is paid in full');
  ok(M.payoutFor({ services: 12500, homeFee: 3500, rush: 0 }) === M.quote({ lines, homeFee: 3500, courier: 5000 }).payout, 'the courier charge never reaches the tailor payout (D-04)');
  ok(!('missing' in M.quote({ lines })), 'quote has no stray fields');
}

/* scripts/v5/money.mjs computes the same scenarios from js/money.js + the seed; the literals above are the oracle */
{
  const row = (q) => [q.services, q.homeFee, q.rush, q.courier, q.total, q.deposit, q.balance, q.tailyFee, q.payout];
  eq(SEED_SLOT, '2026-10-15T17:00', 'money.mjs: seed slot is Thu Oct 15 5 PM');
  eq(row(SCENARIOS.seed), [12500, 3500, 0, 0, 16000, 1600, 14400, 1250, 14750], 'money.mjs: seed scenario matches the golden row');
  eq(row(SCENARIOS.rush), [12500, 3500, 4000, 0, 20000, 1600, 18400, 1250, 18750], 'money.mjs: rush scenario matches the golden row');
  eq(row(SCENARIOS.shop), [12500, 0, 0, 0, 12500, 1250, 11250, 1250, 11250], 'money.mjs: shop scenario matches the golden row');
  eq(row(SCENARIOS.courier), [12500, 3500, 0, 1045, 17045, 1600, 15445, 1250, 14750], 'money.mjs: courier scenario matches the golden row');
  eq(row(SCENARIOS.priceAdded), [17000, 3500, 0, 0, 20500, 1600, 18900, 1700, 18800], 'money.mjs: price-added scenario matches the golden row');
  eq(row(SCENARIOS.priceRemoved), [7000, 3500, 0, 0, 10500, 1600, 8900, 700, 9800], 'money.mjs: price-removed scenario matches the golden row');
  eq([SCENARIOS.lateCancel.kept, SCENARIOS.lateCancel.tailorPaid, SCENARIOS.earlyCancel.refund, SCENARIOS.noShow.paid], [1600, 1600, 1600, 2500], 'money.mjs: late cancel keeps $16.00, early refunds it, no-show pays $25.00');
}

/* ================= rush ladder ================= */
section('rush ladder');
S.reset();
{
  const t = amara();
  const days = (n) => M.rushFor(t, '2026-10-15T17:00', D.isoDay(D.addDays('2026-10-15', n)));
  eq([0, 1, 2, 3, 4, 5, 9].map((n) => days(n).cents), [4000, 4000, 2500, 1500, 0, 0, 0], 'rush tiers for 0..9 days: $40 / $40 / $25 / $15 / free (Amara\'s ladder)');
  eq([days(1).days, days(4).days], [1, 4], 'rushFor reports the calendar-day gap');
  const custom = { rush: [{ days: 2, fee: 60 }, { days: 1, fee: 90 }] };
  eq([1, 2, 3].map((n) => M.rushFor(custom, '2026-10-15T09:00', D.isoDay(D.addDays('2026-10-15', n))).cents), [9000, 6000, 0], 'rush comes from the tailor\'s own ladder (unsorted input, other amounts)');
  eq(M.rushFor({ rush: [] }, '2026-10-15T09:00', '2026-10-16').cents, 0, 'empty ladder -> no rush');
  eq(M.rushFor({}, '2026-10-15T09:00', '2026-10-16').cents, 0, 'missing ladder -> no rush');
  // a tailor with a different ladder changes the booked job
  S.reset(); amara().rush = [{ days: 1, fee: 99 }];
  T.setJob({ needBy: '2026-10-16' });
  eq(M.estimate(amara(), state.job, '2026-10-15T17:00').rush, 9900, 'estimate reads the edited ladder');
  const a = T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:00', cardId: 'visa-4242' }).appt;
  eq([a.money.rush, a.money.rushDays, a.money.total], [9900, 1, 25900], 'a booking snapshots the rush fee at the visit time');
}
{
  S.reset(); const a = driveTo('requested', { rush: true });
  goldenRow(a.money, [12500, 3500, 4000, 0, 20000, 1600, 18400, 1250, 18750], 'driveTo rush: booked quote matches the rush golden row');
  eq(a.payments.deposit.cents, 1600, 'rush does not change the deposit (services + home visit only)');
  eq(M.tailyFeeFor(a.money.services), 1250, 'rush is outside the Taily fee base');
}

/* ================= request / accept / suggest / decline / expire ================= */
section('requests');
S.reset();
{
  throws(() => T.tailorAccept('A-9999'), 'unknown appointment id throws');
  guard(T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T20:00' }), 'slot-unavailable', 'requestBooking: slot outside the tailor\'s hours');
  guard(T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-13T13:00' }), 'slot-unavailable', 'requestBooking: a shop slot for a home job is not open');
  guard(T.requestBooking({ tailorId: 'nobody', slotStart: '2026-10-15T17:00' }), 'unknown-tailor', 'requestBooking: unknown tailor');
  state.sim.card = 'declined';
  guard(T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:00' }), 'card-declined', 'sim.card declined -> card-declined');
  state.sim.card = '3ds';
  guard(T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:00' }), 'needs-3ds', 'sim.card 3ds -> needs-3ds');
  const r = T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:00', cardId: 'visa-4242', threeDS: true });
  ok(r.ok, 'requestBooking with threeDS: true succeeds');
  state.sim.card = 'ok';
  const a = r.appt;
  eq([a.id, a.status, a.retries, a.slot.start, a.slot.end, a.expiresAt, a.payments.deposit], ['A-1001', 'requested', 0, '2026-10-15T17:00', '2026-10-15T18:00', '2026-10-13T12:00', { cents: 1600, state: 'authorized' }], 'new request: id, 60-minute slot, 2 h expiry, $16.00 hold authorized');
  eq(a.history.map((h) => h.status), ['requested'], 'history starts with requested');
  eq(S.threadFor('amara').messages.map((m) => m.text), ['You sent a request'], 'system message "You sent a request" (customer reader)');
  eq(S.threadFor('amara').messages.map((m) => m.tailorText), ['Sarah sent a request'], 'system message read by the tailor: "Sarah sent a request" (D-98)');
  eq(S.msLeft(a), 2 * 3600000, 'two hours left on the clock');
  guard(T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:30' }), 'slot-unavailable', 'an overlapping slot is no longer open (60-minute visit)');
  ok(!S.openSlots('amara', 'home', { until: '2026-10-23' }).includes('2026-10-15T17:30') && !S.openSlots('amara', 'shop').includes('2026-10-15T17:00'), 'a pending request blocks that tailor\'s overlapping slots, for both visit types');
  ok(S.openSlots('amara', 'home', { until: '2026-10-23', exclude: a.id }).includes('2026-10-15T17:00'), 'openSlots(exclude) frees the appointment\'s own slot');
  eq(S.activeAppt()?.id, a.id, 'activeAppt is the newest non-terminal appointment');
  eq(S.apptsFor('tailor').map((x) => x.id), [a.id], 'the tailor sees the same appointment');
  // withdraw
  const w = T.withdrawRequest(a.id);
  eq([w.appt.status, w.appt.cancel.reason, w.appt.payments.deposit.state, state.job.garments.length], ['cancelled', 'withdrawn', 'released', 2], 'withdrawRequest: cancelled(withdrawn), hold released, job back to draft (D-22)');
  guard(T.withdrawRequest(a.id), 'not-pending', 'withdrawRequest only from requested / suggested');
  ok(S.openSlots('amara', 'home', { until: '2026-10-23' }).includes('2026-10-15T17:00'), 'a withdrawn request frees the slot');
}
// accept
{
  const a = driveTo('requested');
  const acc = T.tailorAccept(a.id);
  eq([acc.appt.status, acc.appt.payments.deposit.state], ['confirmed', 'captured'], 'tailorAccept: confirmed, deposit captured');
  eq(S.threadFor('amara').messages.map((m) => m.text), ['You sent a request', 'Amara accepted'], 'system message "Amara accepted"');
  eq(S.threadFor('amara').messages.map((m) => m.tailorText), ['Sarah sent a request', 'You accepted'], 'system message read by the tailor: "You accepted" (D-98)');
  guard(T.tailorAccept(a.id), 'not-requested', 'tailorAccept twice fails');
  guard(T.tailorSuggest(a.id, '2026-10-15T18:00'), 'not-requested', 'tailorSuggest needs requested');
  guard(T.tailorDecline(a.id), 'not-requested', 'tailorDecline needs requested');
}
// accept after expiry
{
  const a = driveTo('requested');
  state.clock.now += 121 * 60000;                                  // past expiresAt, tick not run
  guard(T.tailorAccept(a.id), 'expired', 'accept after the window (status still requested) fails: expired');
  S.tick();
  eq(getStatus(a.id), 'expired', 'tick() expires it');
  guard(T.tailorAccept(a.id), 'expired', 'accept on an expired request fails: expired');
  guard(T.tailorSuggest(a.id, '2026-10-15T18:00'), 'not-requested', 'suggest on an expired request fails');
}
function getStatus(id) { return S.getAppt(id).status; }
// suggest
{
  const a = driveTo('requested');
  guard(T.tailorSuggest(a.id, '2026-10-16T09:00'), 'slot-unavailable', 'tailorSuggest: slot must be open');
  const s = T.tailorSuggest(a.id, '2026-10-15T18:00');
  eq([s.appt.status, s.appt.suggested.start, s.appt.slot.start, s.appt.payments.deposit.state], ['suggested', '2026-10-15T18:00', '2026-10-15T17:00', 'authorized'], 'tailorSuggest: suggested, hold stays authorized, no expiry (D-14)');
  S.advanceClock(60 * 24);
  eq(getStatus(a.id), 'suggested', 'a suggestion does not expire');
  S.setClock('2026-10-13T10:00');
  const acc = T.acceptSuggestion(a.id);
  eq([acc.appt.status, acc.appt.slot.start, acc.appt.slot.end, acc.appt.payments.deposit.state], ['confirmed', '2026-10-15T18:00', '2026-10-15T19:00', 'captured'], 'acceptSuggestion: confirmed at the suggested time, deposit captured');
  eq(acc.appt.confirmedVia, 'suggestion', 'acceptSuggestion stamps confirmedVia (R3-1-C-08)');
  guard(T.acceptSuggestion(a.id), 'not-suggested', 'acceptSuggestion needs suggested');
}
{
  const a = driveTo('suggested');
  const f = T.findAnotherTailor(a.id);
  eq([f.appt.status, f.appt.cancel.reason, f.appt.payments.deposit.state], ['cancelled', 'switched', 'released'], 'findAnotherTailor from suggested: cancelled(switched), hold released');
  eq(state.job.garments.length, 2, 'findAnotherTailor keeps the job in the draft');
  guard(T.findAnotherTailor(a.id), 'not-allowed', 'findAnotherTailor not from cancelled');
  const b = driveTo('suggested');
  ok(T.withdrawRequest(b.id).ok, 'a suggested request can be withdrawn');
}
// decline -> declinedBy
{
  const a = driveTo('declined');
  eq([a.status, a.declineReason, a.payments.deposit.state, state.job.declinedBy, state.job.garments.length], ['declined', 'Fully booked that week', 'released', ['amara'], 2], 'decline: declined, reason kept, hold released, tailor in job.declinedBy, job kept');
  ok(S.threadReadOnly('amara'), 'thread is read-only after a decline');
  guard(T.sendMessage('amara', 'customer', { text: 'hello?' }), 'read-only', 'sendMessage on a declined thread fails');
  guard(T.sendMessage('amara', 'tailor', { text: 'sorry' }), 'read-only', 'read-only for the tailor too');
  guard(T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:00' }), 'declined', 'cannot re-request the declined tailor for the same job');
  eq(S.eligible(amara(), state.job).reason, 'declined', 'eligible -> declined');
  ok(T.findAnotherTailor(a.id).ok, 'findAnotherTailor from declined');
  // a different job can book the tailor again
  T.newJob(); T.addGarment('Pants / Jeans'); T.setServices('g1', ['hem-pants']);
  const slot = S.nextOpening('amara', 'home', { until: state.job.needBy });
  const b = T.requestBooking({ tailorId: 'amara', slotStart: slot, cardId: 'visa-4242' });
  ok(b.ok, 'a different job can request the declined tailor again');
  ok(!S.threadReadOnly('amara'), 'a newer request re-opens the thread');
  guard(T.tailorDecline('A-1001'), 'not-requested', 'decline twice fails');
}
// expiry + 2 retries
{
  const a = driveTo('requested');
  const id = a.id;
  const adv = S.advanceClock(119);
  eq([adv.expired, getStatus(id)], [[], 'requested'], 'at 1h 59m the request is still open');
  eq(S.advanceClock(2).expired, [id], 'at 2h the clock tick expires it');
  let x = S.getAppt(id);
  eq([x.status, x.retries, x.payments.deposit.state, state.job.hiddenTailors], ['expired', 0, 'released', []], 'expiry releases the hold; not hidden yet');
  ok(!S.activeAppt() || S.activeAppt().id === id, 'an expired request with retries left is still active');
  const t1 = T.tryAgain(id);
  eq([t1.appt.status, t1.appt.retries, t1.appt.payments.deposit.state, t1.appt.expiresAt], ['requested', 1, 'authorized', '2026-10-13T14:01'], 'tryAgain 1: requested again, retries 1, hold re-authorized, new 2 h window');
  eq([t1.appt.sentAt, t1.appt.requestedAt === t1.appt.sentAt], ['2026-10-13T12:01', false], 'tryAgain stamps sentAt (the resend time) and keeps requestedAt (R3-1-C-02)');
  S.advanceClock(121);
  const t2 = T.tryAgain(id);
  eq([t2.appt.status, t2.appt.retries], ['requested', 2], 'tryAgain 2: retries 2');
  eq(state.job.hiddenTailors, [], 'not hidden while a retry is in flight');
  S.advanceClock(121);
  x = S.getAppt(id);
  eq([x.status, x.retries, state.job.hiddenTailors], ['expired', 2, ['amara']], 'second retry expires: final, tailor hidden for this job (D-07)');
  guard(T.tryAgain(id), 'no-retries', 'tryAgain after 2 retries fails');
  eq(S.tailorsFor(state.job).empty, 'none-left', 'the list now shows "none-left"');
  eq(S.activeAppt(), null, 'an expired-for-good request is no longer active');
  ok(T.findAnotherTailor(id).ok, 'findAnotherTailor works from expired-final');
  eq(S.eligible(amara(), state.job).reason, 'hidden', 'eligible -> hidden');
  guard(T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:00' }), 'hidden', 'a hidden tailor cannot be requested for this job');
  // expiry thread message + findAnotherTailor not allowed with retries left
  const b = driveTo('expired');
  guard(T.findAnotherTailor(b.id), 'not-allowed', 'findAnotherTailor not from an expired request that can still retry');
  guard(T.tryAgain(driveTo('confirmed').id), 'not-expired', 'tryAgain needs expired');
  guard(T.expireRequest(driveTo('confirmed').id), 'not-requested', 'expireRequest needs requested');
  for (const [target, retries, hidden] of [['expired', 0, 0], ['expired-2', 1, 0], ['expired-final', 2, 1]]) {
    const d = driveTo(target);
    eq([d.status, d.retries, state.job.hiddenTailors.length], ['expired', retries, hidden], `driveTo ${target}`);
  }
  // tryAgain with the visit already passed
  const e = driveTo('expired');
  S.setClock('2026-10-15T17:30');
  guard(T.tryAgain(e.id), 'slot-passed', 'tryAgain after the visit time has passed fails');
}
// tryAgain must not double-book a slot another request took while this one was expired
{
  const e = driveTo('expired');
  const slot = e.slot.start;
  const b = T.requestBooking({ tailorId: 'amara', slotStart: slot, cardId: 'visa-4242' });
  ok(b.ok, 'an expired request does not block its slot: the same tailor and slot can be booked again');
  guard(T.tryAgain(e.id), 'slot-unavailable', 'tryAgain fails when the slot was re-booked meanwhile');
  eq(state.appts.filter((x) => x.status === 'requested' && x.slot.start === slot).length, 1, 'only one requested appointment holds the slot');
  T.withdrawRequest(b.appt.id);
  ok(T.tryAgain(e.id).ok, 'tryAgain works again once the slot is free');
}

/* ================= cancellation ================= */
section('cancellation');
{
  S.reset(); const a = driveTo('confirmed');
  const nowMs = S.now();
  eq(M.cancelTerms(a, nowMs), { window: 'early', refund: 1600, kept: 0 }, 'cancelTerms: 55 h ahead -> early, full refund');
  const startMs = D.toDate(a.slot.start).getTime();
  eq(M.cancelTerms(a, startMs - 25 * 3600000).window, 'early', '25 h ahead -> early');
  eq(M.cancelTerms(a, startMs - 24 * 3600000).window, 'late', 'exactly 24 h ahead -> late (must be MORE than 24 h)');
  eq(M.cancelTerms(a, startMs - 24 * 3600000 - 60000).window, 'early', '24 h 1 m ahead -> early');
  eq(M.cancelTerms(a, startMs - 23 * 3600000), { window: 'late', refund: 0, kept: 1600 }, '23 h ahead -> late, deposit $16.00 kept');
  const c = T.cancelBooking(a.id);
  eq([c.appt.status, c.appt.cancel.reason, c.appt.cancel.refund, c.appt.cancel.kept, c.appt.cancel.tailorPaid, c.appt.payments.deposit.state, state.payouts.length],
    ['cancelled', 'customer-early', 1600, 0, 0, 'refunded', 0], 'cancelBooking > 24 h: refunded in full, nothing to the tailor');
  guard(T.cancelBooking(a.id), 'not-confirmed', 'cancelBooking twice fails');
}
{
  S.reset(); const a = driveTo('cancelled-late');
  eq([a.status, a.cancel.reason, a.cancel.refund, a.cancel.kept, a.cancel.tailorPaid, a.payments.deposit.state], ['cancelled', 'customer-late', 0, 1600, 1600, 'kept'], 'cancelBooking < 24 h: deposit $16.00 kept and paid to the tailor, no Taily fee (D-05)');
  eq(state.payouts, [{ apptId: a.id, cents: 1600, state: 'pending', date: '2026-10-16', kind: 'kept-deposit' }], 'the kept deposit becomes a pending payout, paid the following Friday (D-24)');
  eq(state.job.garments.length, 2, 'the draft job is still there after a cancel');
}
{
  S.reset(); const a = driveTo('cant-make-it');
  eq([a.status, a.cancel.reason, a.cancel.by, a.payments.deposit.state, a.cancel.refund, state.payouts.length], ['cancelled', 'tailor-cant-make-it', 'tailor', 'refunded', 1600, 0], 'tailorCantMakeIt: deposit refunded, no payout');
  eq(state.job.garments.length, 2, 'tailorCantMakeIt puts the job back to draft');
}
{
  S.reset(); const a = driveTo('confirmed');
  guard(T.markNoShow(a.id), 'too-early', 'markNoShow before start + 15 min fails');
  S.setClock('2026-10-15T17:14');
  guard(T.markNoShow(a.id), 'too-early', 'markNoShow at 14 minutes after the start fails');
  S.setClock('2026-10-15T17:15');
  const n = T.markNoShow(a.id);
  eq([n.appt.status, n.appt.cancel.reason, n.appt.cancel.tailorPaid, n.appt.payments.deposit.state], ['cancelled', 'no-show', 2500, 'kept'], 'markNoShow at 15 min: deposit kept, tailor paid $25.00 (D-06)');
  eq(state.payouts[0], { apptId: a.id, cents: 2500, state: 'pending', date: '2026-10-16', kind: 'no-show' }, 'no-show pay is a pending payout');
  const b = driveTo('no-show');
  eq(b.cancel.tailorPaid, 2500, 'driveTo no-show');
}
// reschedule
{
  S.reset(); const a = driveTo('confirmed');
  guard(T.rescheduleBooking(a.id, '2026-10-15T19:30'), 'slot-unavailable', 'reschedule to a closed slot fails');
  const r = T.rescheduleBooking(a.id, '2026-10-15T18:00');
  eq([r.ok, r.appt.status, r.appt.slot.start, r.appt.slot.end, r.appt.money.total], [true, 'confirmed', '2026-10-15T18:00', '2026-10-15T19:00', 16000], 'reschedule > 24 h ahead stays confirmed, same price (D-12, D-25)');
  S.setClock('2026-10-14T17:30');                                  // 24 h 30 m before 18:00 -> still early
  ok(T.rescheduleBooking(a.id, '2026-10-17T09:00').ok, 'reschedule 24.5 h before the visit still works');
  S.setClock('2026-10-16T08:00');                                  // 25 h before Sat 09:00 -> early again; move into the window
  S.setClock('2026-10-17T00:00');
  guard(T.rescheduleBooking(a.id, '2026-10-17T10:00'), 'too-late', 'reschedule inside 24 h fails');
  const b = driveTo('requested');
  guard(T.rescheduleBooking(b.id, '2026-10-15T18:00'), 'not-confirmed', 'reschedule needs confirmed');
}

/* ================= fitting, price change, ready, return, pay, complete, review ================= */
section('fitting -> completed');
{
  S.reset(); const a = driveTo('confirmed');
  guard(T.startFitting(a.id), 'too-early', 'startFitting before the visit fails');
  S.setClock(a.slot.start);
  ok(T.startFitting(a.id).ok, 'startFitting at the visit time');
  guard(T.startFitting(a.id), 'not-confirmed', 'startFitting twice fails');
  guard(T.sendPriceChange(driveTo('confirmed').id, []), 'not-fitting', 'sendPriceChange needs fitting');
}
{
  S.reset(); const a = driveTo('fitting');
  eq(T.confirmNoChange, undefined, 'confirmNoChange is retired (D-120)');
  guard(T.markReady(a.id), 'not-in-progress', 'no shortcut from the fitting to the work');
  const st = T.sendPriceChange(a.id, a.lines);
  eq([st.ok, st.appt.priceChange.changed, st.appt.status, st.appt.priceChange.marks], [true, false, 'price-change', []], 'sendPriceChange accepts the unchanged order (changed false)');
  const ap0 = T.approvePriceChange(a.id).appt;
  eq([ap0.status, ap0.money.total, ap0.money.payout], ['in-progress', SCENARIOS.seed.total, SCENARIOS.seed.payout], 'approve the unchanged order -> in-progress, money = SCENARIOS.seed');
}
// the final order: validation (K-01, D-121)
{
  S.reset(); const a = driveTo('fitting');
  const line = (o) => ({ garmentId: 'n1', garmentType: 'Pants / Jeans', serviceId: 'hem-pants', label: 'Hem pants', cents: 3000, ...o });
  const withNew = (o) => [...a.lines, line(o)];
  guard(T.sendPriceChange(a.id, []), 'no-items', 'sendPriceChange: no lines -> no-items');
  guard(T.sendPriceChange(a.id, a.lines.map((l, i) => ({ ...l, cents: i === 0 ? 2550 : l.cents }))), 'price-invalid', 'sendPriceChange: cents not whole dollars -> price-invalid');
  guard(T.sendPriceChange(a.id, a.lines.map((l, i) => ({ ...l, cents: i === 0 ? 0 : l.cents }))), 'price-invalid', 'sendPriceChange: a $0 line -> price-invalid');
  guard(T.sendPriceChange(a.id, withNew({ garmentType: 'Skirt', serviceId: 'sleeves' })), 'service-type', 'sendPriceChange: service not for the item type');
  guard(T.sendPriceChange(a.id, withNew({ garmentType: 'Formal Dress', serviceId: 'bridal' })), 'service-not-offered', 'sendPriceChange: a service Amara does not price');
  guard(T.sendPriceChange(a.id, withNew({ garmentType: 'Spaceship' })), 'garment-type', 'sendPriceChange: unknown item type');
  guard(T.sendPriceChange(a.id, withNew({ garmentId: 'g1', garmentType: 'Skirt', serviceId: 'dress-hem' })), 'garment-type', 'sendPriceChange: a booked item keeps its type');
  guard(T.sendPriceChange(a.id, [...a.lines, a.lines[0]]), 'duplicate-line', 'sendPriceChange: duplicate line');
  const many = Array.from({ length: 11 }, (_, i) => line({ garmentId: `n${i + 1}`, serviceId: 'repair', garmentType: 'Skirt' }));
  guard(T.sendPriceChange(a.id, many), 'max-items', 'sendPriceChange: 11 items -> max-items');
  const noted = T.sendPriceChange(a.id, a.lines, { note: 'Text me at amara@example.com' });
  ok(noted.ok && noted.appt.priceChange.noteMasked && !noted.appt.priceChange.note.includes('@'), 'an unchanged order carries a masked note too');
}
// K-01: a new item and a removed service
{
  S.reset(); const a = driveTo('price-change', { priceChange: 'item' });
  const v = S.priceChangeView(a);
  eq(v.garments.map((g) => [g.id, g.kind]), [['g1', 'same'], ['g2', 'changed'], ['n1', 'added']], 'priceChangeView garment kinds');
  eq(v.counts, { itemsAdded: 1, itemsRemoved: 0, servicesAdded: 0, servicesRemoved: 1, repriced: 0 }, 'priceChangeView counts');
  eq([v.changed, v.after.total, v.after.deposit], [true, SCENARIOS.priceItem.total, SCENARIOS.seed.deposit], 'item recipe: total = SCENARIOS.priceItem, deposit as captured');
  eq(a.priceChange.changed, true, 'priceChange.changed');
  const ap = T.approvePriceChange(a.id).appt;
  eq(ap.job.garments.map((g) => g.type), ['Suit Pant', 'Suit Jacket', 'Pants / Jeans'], 'approve rebuilds job.garments (new item last)');
  eq(ap.job.garments.map((g) => g.services), [['hem-pants'], ['sleeves'], ['hem-pants']], 'job.garments services follow the approved lines');
  eq(ap.job.garments[1].photos, 1, 'a booked garment keeps its photos');
  eq(ap.money.payout, SCENARIOS.priceItem.payout, 'payout = SCENARIOS.priceItem');
  const b = driveTo('price-change', { priceChange: 'item-removed' });
  const vb = S.priceChangeView(b);
  eq([vb.garments[0].kind, vb.counts.itemsRemoved, vb.after.total], ['removed', 1, SCENARIOS.priceItemRemoved.total], 'item-removed: g1 removed');
  eq(T.approvePriceChange(b.id).appt.job.garments.length, 1, 'item-removed approve: one garment left');
}
// price change: added + repriced
{
  S.reset(); const a = driveTo('price-change', { priceChange: 'added' });
  eq(a.priceChange.marks, [
    { garmentId: 'g2', serviceId: 'sleeves', kind: 'repriced', from: 4500, to: 5000 },
    { garmentId: 'g1', serviceId: 'taper', kind: 'added', from: null, to: 4000 },
  ], 'price change marks: repriced + added');
  eq([a.priceChange.state, a.money.total, a.payments.deposit.cents], ['pending', 16000, 1600], 'until approved the booked price and deposit stand');
  const m = T.messageAboutPriceChange(a.id);
  eq([m.appt.priceChange.state, m.appt.status], ['messaged', 'price-change'], 'messageAboutPriceChange keeps the status, marks messaged');
  guard(T.messageAboutPriceChange(a.id), 'not-pending', 'messaging twice is a guard failure');
  const ap = T.approvePriceChange(a.id);
  goldenRow(ap.appt.money, [17000, 3500, 0, 0, 20500, 1600, 18900, 1700, 18800], 'approvePriceChange (after messaging): deposit $16.00 kept, balance $189.00, Taily fee $17.00, payout $188.00');
  eq([ap.appt.status, ap.appt.payments.deposit.cents, ap.appt.payments.balance.cents, ap.appt.lines.length, ap.appt.priceChange.state], ['in-progress', 1600, 18900, 4, 'approved'], 'approve: lines replaced, balance updated, status in-progress');
  guard(T.approvePriceChange(a.id), 'not-pending', 'approve twice fails');
}
// R4-2-C-02 / D-118: a pending price change becomes "messaged" only on Sarah's first real message
{
  S.reset(); const a = driveTo('price-change');
  T.sendMessage(a.tailorId, 'tailor', { text: 'Let me know if you have questions.' });
  eq(a.priceChange.state, 'pending', 'a tailor message leaves the price change pending');
  T.sendMessage(a.tailorId, 'customer', { text: 'Could we keep the sleeves at the old price?' });
  eq(a.priceChange.state, 'messaged', 'Sarah\'s first message marks the price change messaged');
  eq(S.lastSpeakerSince(a)?.from, 'customer', 'and the thread backs it up');
}
// R4-2-C-04 / D-118: a declined balance remembers the card that was declined
{
  S.reset(); const a = driveTo('ready'); T.chooseReturn(a.id, 'pickup');
  state.sim.card = 'declined';
  guard(T.payBalance(a.id, 'visa-4242'), 'card-declined', 'declined balance');
  eq([a.payments.balance.state, a.payments.balance.failedCardId], ['failed', 'visa-4242'], 'the declined card is recorded');
  state.sim.card = 'ok';
  const paid = T.payBalance(a.id, 'apple-pay');
  eq([paid.ok, a.payments.balance.state, a.payments.balance.failedCardId], [true, 'paid', undefined], 'paying another way clears it');
  // refund line: payments untouched until Ready
}
// price change: removed
{
  S.reset(); const a = driveTo('price-change', { priceChange: 'removed' });
  eq(a.priceChange.marks, [{ garmentId: 'g2', serviceId: 'jacket-sides', kind: 'removed', from: 5500, to: null }], 'price change marks: removed');
  const ap = T.approvePriceChange(a.id);
  goldenRow(ap.appt.money, [7000, 3500, 0, 0, 10500, 1600, 8900, 700, 9800], 'removing a service: deposit kept, balance $89.00, payout $98.00');
  eq(ap.appt.money.refund, 0, 'no refund while the total is above the deposit');
}
{
  S.reset(); const a = driveTo('price-change', { priceChange: 'repriced' });
  eq(a.priceChange.marks.map((m) => m.kind), ['repriced'], 'repriced mark');
  goldenRow(T.approvePriceChange(a.id).appt.money, [12500 + 500, 3500, 0, 0, 16500, 1600, 14900, 1300, 15200], 'repriced: Sleeves $45 -> $50');
}
// price change below the deposit -> refund (D-23)
{
  S.reset(); const b = driveTo('fitting', { visitType: 'shop' });
  T.sendPriceChange(b.id, b.lines.slice(0, 1).map((l) => ({ ...l, cents: 500 })));
  const bp = T.approvePriceChange(b.id).appt;
  eq([bp.money.total, bp.money.deposit, bp.money.balance, bp.money.refund], [500, 1250, 0, 750], 'total below the deposit: balance $0.00, $7.50 refunded at Ready (D-23)');
  T.markReady(b.id);
  eq(S.getAppt(b.id).payments.refund, { cents: 750, state: 'refunded' }, 'markReady records the refund');
}
// ready -> return -> pay -> complete -> review (no price change)
{
  S.reset(); const a = driveTo('in-progress');
  guard(T.chooseReturn(a.id, 'pickup'), 'not-ready', 'chooseReturn needs ready');
  guard(T.payBalance(a.id, 'visa-4242'), 'not-ready', 'payBalance needs ready');
  const r = T.markReady(a.id);
  eq([r.appt.status, r.appt.payments.balance], ['ready', { cents: 14400, state: 'due' }], 'markReady: balance $144.00 due');
  guard(T.markReady(a.id), 'not-in-progress', 'markReady twice fails');
  guard(T.payBalance(a.id, 'visa-4242'), 'return-required', 'payBalance needs a return choice');
  guard(T.chooseReturn(a.id, 'carrier-pigeon'), 'not-offered', 'chooseReturn: unknown option');
  amara().returns.dropoff = false;
  guard(T.chooseReturn(a.id, 'dropoff'), 'not-offered', 'chooseReturn: an option the tailor does not offer');
  amara().returns.dropoff = true;
  // courier
  state.sim.courier = 'fail';
  const f = T.chooseReturn(a.id, 'courier');
  eq([f.appt.courier.state, f.appt.money.total], ['failed', 16000], 'sim.courier fail -> courier failed, not charged');
  guard(T.payBalance(a.id, 'visa-4242'), 'courier-unavailable', 'payBalance blocked while the courier quote failed');
  state.sim.courier = 'loading';
  eq(T.chooseReturn(a.id, 'courier').appt.courier.state, 'loading', 'sim.courier loading -> courier loading');
  state.sim.courier = 'ok';
  const c = T.chooseReturn(a.id, 'courier');
  eq([c.appt.courier.miles, c.appt.courier.cents, c.appt.courier.state], [0.6, 1045, 'ready'], 'courier: 0.6 mi quote $10.45');
  goldenRow(c.appt.money, [12500, 3500, 0, 1045, 17045, 1600, 15445, 1250, 14750], 'courier chosen: total $170.45, balance $154.45, payout unchanged $147.50');
  eq(c.appt.payments.balance.cents, 15445, 'balance payment follows the courier charge');
  const p0 = T.chooseReturn(a.id, 'pickup');
  eq([p0.appt.courier, p0.appt.money.total, p0.appt.payments.balance.cents], [null, 16000, 14400], 'switching back to pickup drops the courier charge');
  state.sim.card = 'declined';
  guard(T.payBalance(a.id, 'visa-4242'), 'card-declined', 'payBalance with a declined card fails');
  eq([S.getAppt(a.id).status, S.getAppt(a.id).payments.balance.state], ['ready', 'failed'], 'a declined card leaves it ready, balance failed');
  state.sim.card = '3ds';
  guard(T.payBalance(a.id, 'visa-4242'), 'needs-3ds', 'payBalance with 3-D Secure needs the challenge');
  state.sim.card = 'ok';
  const pay = T.payBalance(a.id, 'visa-4242');
  eq([pay.appt.status, pay.appt.payments.balance], ['returning', { cents: 14400, state: 'paid' }], 'payBalance: returning, balance paid');
  guard(T.payBalance(a.id, 'visa-4242'), 'not-ready', 'pay twice fails');
  guard(T.leaveReview(a.id, { stars: 5 }), 'not-completed', 'leaveReview needs completed');
  const done = T.markCompleted(a.id);
  eq(done.appt.status, 'completed', 'markCompleted');
  eq(state.payouts, [{ apptId: a.id, cents: 14750, state: 'pending', date: '2026-10-16', kind: 'job' }], 'completion creates a pending payout of $147.50 (not the courier)');
  guard(T.markCompleted(a.id), 'not-returning', 'markCompleted twice fails');
  guard(T.leaveReview(a.id, { stars: 0 }), 'stars-required', 'leaveReview: 0 stars');
  guard(T.leaveReview(a.id, { stars: 6 }), 'stars-required', 'leaveReview: 6 stars');
  guard(T.leaveReview(a.id, { stars: 4.5 }), 'stars-required', 'leaveReview: fractional stars');
  guard(T.leaveReview(a.id, { stars: 5, photos: 4 }), 'too-many-photos', 'leaveReview: more than 3 photos');
  const rv = T.leaveReview(a.id, { stars: 5, text: 'Great.', photos: 3 });
  eq([rv.appt.review.stars, rv.appt.review.photos, amara().rating, amara().reviews.length, amara().reviews[0].name], [5, 3, { avg: 4.9, count: 38 }, 5, 'Sarah C.'], 'leaveReview: saved, rating recomputed (avg to 1 decimal, count + 1), shown first on the profile');
  guard(T.leaveReview(a.id, { stars: 1 }), 'already-reviewed', 'one review per job');
}
{
  S.reset();
  const a = driveTo('completed'); amara().rating = { avg: 4, count: 1 };
  T.leaveReview(a.id, { stars: 1 });
  eq(amara().rating, { avg: 2.5, count: 2 }, 'rating recompute: (4 + 1) / 2 = 2.5');
}
// shop job money end to end
{
  S.reset(); const a = driveTo('completed', { visitType: 'shop' });
  goldenRow(a.money, [12500, 0, 0, 0, 12500, 1250, 11250, 1250, 11250], 'shop job through completion keeps the shop golden row');
  eq(state.payouts[0].cents, 11250, 'shop job payout $112.50');
  eq(a.slot.end, D.isoMinute(D.addMinutes(a.slot.start, 30)), 'shop visits are 30 minutes');
}
{
  S.reset(); const a = driveTo('completed');
  goldenRow(a.money, [12500, 3500, 0, 0, 16000, 1600, 14400, 1250, 14750], 'home job through completion keeps the home golden row');
  eq(state.payouts[0].cents, 14750, 'home job payout $147.50');
  ok(a.money.payout === a.money.services - a.money.tailyFee + a.money.homeFee + a.money.rush, 'payout = services - Taily fee + home-visit fee + rush');
  ok(a.money.tailyFee === M.tailyFeeFor(a.money.services), 'Taily fee is computed on services only');
}

/* ================= messaging ================= */
section('messaging');
{
  S.reset();
  eq(S.maskContact('call me at 718-555-0199 or sarah@x.com'), { text: 'call me at [phone hidden] or [email hidden]', masked: true }, 'maskContact: phone + email');
  eq(S.maskContact('Text (718) 555 0199 / +1 718.555.0199 / 7185550199'), { text: 'Text [phone hidden] / [phone hidden] / [phone hidden]', masked: true }, 'maskContact: phone formats');
  eq(S.maskContact('The hem is 2.5 in and it costs $125'), { text: 'The hem is 2.5 in and it costs $125', masked: false }, 'maskContact leaves ordinary text alone');
  eq(S.maskContact('mail a.b+c@mail.example.co.uk now').text, 'mail [email hidden] now', 'maskContact: plus-addressed email');
  eq(S.maskContact('').masked, false, 'maskContact: empty');
  const pre = T.sendMessage('amara', 'customer', { text: 'Do you do bridal? my number is 718-555-0199' });
  eq([pre.ok, pre.masked, pre.message.text], [true, true, 'Do you do bridal? my number is [phone hidden]'], 'sendMessage before booking works and masks');
  ok(S.threadFor('amara').messages[0].masked === true, 'the message is stored masked');
  eq(T.sendMessage('amara', 'tailor', { text: 'Email me sarah@x.com' }).message.text, 'Email me [email hidden]', 'masked for the tailor too');
  guard(T.sendMessage('amara', 'customer', { text: '   ' }), 'empty', 'empty message fails');
  ok(T.sendMessage('amara', 'customer', { text: '', photos: 2 }).ok, 'a photo-only message is allowed');
  state.sim.send = 'fail';
  guard(T.sendMessage('amara', 'customer', { text: 'hi' }), 'send-failed', 'sim.send fail -> send-failed');
  state.sim.send = 'ok';
  guard(T.sendMessage('nobody', 'customer', { text: 'hi' }), 'unknown-tailor', 'unknown tailor');
  const a = driveTo('completed');
  ok(T.sendMessage('amara', 'customer', { text: 'thanks!' }).ok, 'the thread stays open from the first question through completion');
  ok(S.threadFor('amara').messages.length > 3 && S.threadFor('amara').messages.every((m) => m.id && m.at && m.from), 'every message has id, at, from');
  ok(S.threadFor('amara').messages.every((m) => !/%/.test(m.text)), 'no system message carries a percent sign');
  void a;
}

/* ================= statusScreen ================= */
section('statusScreen');
{
  const CUSTOMER_MAP = { requested: 'c-request', suggested: 'c-request', declined: 'c-request', expired: 'c-request', confirmed: 'c-booking', fitting: 'c-booking', 'price-change': 'c-price-change', 'in-progress': 'c-booking', ready: 'c-ready', returning: 'c-booking', completed: 'c-complete', cancelled: 'c-booking' };
  const TAILOR_MAP = { requested: 't-request', suggested: 't-request', declined: 't-request', expired: 't-request', confirmed: 't-job', fitting: 't-job', 'price-change': 't-job', 'in-progress': 't-job', ready: 't-job', returning: 't-job', completed: 't-job', cancelled: 't-job' };
  eq(S.STATUSES.length, 12, '12 statuses');
  eq(S.TERMINAL, ['declined', 'cancelled', 'completed'], 'TERMINAL');
  S.reset();
  for (const status of S.STATUSES) {
    const fake = { status, review: null, payments: { balance: { state: 'due' } } };
    eq(S.statusScreen(fake, 'customer'), CUSTOMER_MAP[status], `statusScreen customer ${status}`);
    eq(S.statusScreen(fake, 'tailor'), TAILOR_MAP[status], `statusScreen tailor ${status}`);
  }
  eq(S.statusScreen({ status: 'ready', payments: { balance: { state: 'paid' } } }, 'customer'), 'c-booking', 'ready with the balance paid -> c-booking');
  eq(S.statusScreen({ status: 'completed', review: { stars: 5 }, payments: { balance: { state: 'paid' } } }, 'customer'), 'c-booking', 'completed and reviewed -> c-booking');
  state.persona = 'tailor';
  eq(S.statusScreen({ status: 'requested' }), 't-request', 'statusScreen defaults to state.persona');
  state.persona = 'customer';
  eq(S.statusScreen(null), null, 'statusScreen(null) -> null');
  // every driveTo target lands on its own status and on a real screen
  const seen = new Set();
  for (const target of TARGETS) {
    const a = driveTo(target);
    seen.add(a.status);
    ok(S.STATUSES.includes(a.status), `driveTo ${target} -> status ${a.status}`);
    ok(/^c-/.test(S.statusScreen(a, 'customer')) && /^t-/.test(S.statusScreen(a, 'tailor')), `driveTo ${target} maps to a customer and a tailor screen`);
  }
  eq([...seen].sort(), [...S.STATUSES].sort(), 'driveTo reaches all 12 statuses');
  throws(() => driveTo('nonsense'), 'driveTo rejects an unknown target');
}

/* ================= tailor sections + onboarding ================= */
section('tailor sections');
{
  S.reset();
  T.blankTailor();
  ok(!S.bookable(amara()), 'a blank tailor is not bookable');
  eq(S.tailorsFor(state.job).empty, 'zip', 'blank tailor -> the list is empty (home)');
  T.setJob({ visitType: 'shop' });
  eq(S.tailorsFor(state.job).empty, 'shop', 'blank tailor -> the list is empty (shop)');
  T.setJob({ visitType: 'home' });
  eq(S.validateSection('profile', amara()).errors, { name: 'name-required', bio: 'bio-required' }, 'profile rules');
  eq(T.setTailorSection('profile', { name: 'Amara Reyes', initials: 'AR', bio: 'Hi.' }).valid, true, 'setTailorSection profile -> valid');
  eq(T.setTailorSection('services', { prices: { 'hem-pants': 25 } }).valid, true, 'services valid with one priced service');
  eq(T.setTailorSection('services', { prices: { 'hem-pants': undefined } }).valid, false, 'undefined deletes a key; no services -> invalid');
  T.setTailorSection('services', { prices: { 'hem-pants': 25, taper: 40, waist: 35, sleeves: 45, 'jacket-sides': 55 } });
  eq(T.setTailorSection('where', { shop: { enabled: false } }).valid, false, 'where: neither shop nor home -> invalid');
  eq(T.setTailorSection('where', { home: { enabled: true, zips: ['11211'], fee: 35 } }).valid, true, 'where: home visits with zips + fee -> valid');
  eq(T.setTailorSection('where', { home: { zips: [] } }).errors, { zips: 'zips-required' }, 'where: home visits need a zip');
  T.setTailorSection('where', { home: { zips: ['11211'] } });
  eq(T.setTailorSection('returns', { returns: { dropoff: true } }).valid, true, 'returns: one option is enough');
  eq(T.setTailorSection('returns', { returns: { pickup: true } }).errors, { pickup: 'pickup-needs-shop' }, 'returns: pickup needs a shop (D-61)');
  T.setTailorSection('returns', { returns: { pickup: false } });
  eq(T.setTailorSection('availability', {}).errors, { home: 'hours-required' }, 'availability: home visits need hours');
  eq(T.setTailorSection('availability', { availability: { home: { mon: [['17:00', '20:00']] } } }).valid, true, 'availability valid');
  eq(T.setTailorSection('payouts', { payouts: { bank: 'Chase', last4: '12', holder: 'A', routing: '021000021' } }).errors, { last4: 'account-invalid' }, 'payouts: last4 must be 4 digits');
  eq(T.setPayouts({ holder: 'A', routing: '12', account: '123' }).errors, { routing: 'routing-invalid', account: 'account-invalid' }, 'setPayouts: routing + account rules');
  const last = T.setPayouts({ holder: 'Amara Reyes', routing: '021000021', account: '000123456789' });
  eq([last.ok, last.tailor.payouts.bank, last.tailor.payouts.last4, last.live], [true, 'Chase', '6789', true], 'setPayouts: bank from the routing table, only last4 stored, live');
  eq(T.setPayouts({ holder: 'Amara Reyes', routing: '021000021', account: '' }).tailor.payouts.last4, '6789', 'setPayouts: blank account keeps the stored last4');
  eq(T.setPayouts({ holder: 'Amara Reyes', routing: '026009593', account: '' }).errors, { account: 'account-invalid' }, 'setPayouts: a new routing number with a blank account asks for the new account (R2-2-T-01)');
  eq(S.state.tailors[0].payouts.routing, '021000021', 'setPayouts: a refused change keeps the saved bank');
  eq([last.ok, last.bookable, S.bookable(amara())], [true, true, true], 'six valid sections -> bookable');
  guard(T.setTailorSection('nonsense', {}), 'unknown-section', 'unknown section');
  const row = S.tailorsFor(state.job);
  eq([row.rows.length, row.empty], [1, null], 'the onboarded tailor shows up in the list');
  eq(row.rows[0].quote.total, 16000, 'the list estimate uses the prices the tailor entered');
  T.setTailorSection('services', { prices: { 'hem-pants': 30, taper: 40, waist: 35, sleeves: 45, 'jacket-sides': 55 } });
  eq(S.tailorsFor(state.job).rows[0].quote.total, 16500, 'editing a price changes the list estimate');
}

/* ================= tailor-data adapters ================= */
section('tailor-data');
{
  S.reset();
  eq(TD.MY_TAILOR_ID, 'amara', 'MY_TAILOR_ID');
  eq(TD.myTailor().id, 'amara', 'myTailor()');
  eq(TD.inbox(), { requests: [], upcoming: [] }, 'empty inbox');
  const a = driveTo('requested');
  eq([TD.inbox().requests.map((x) => x.id), TD.inbox().upcoming.length], [[a.id], 0], 'inbox: a pending request is in requests');
  eq(TD.jobAddress(a), 'Williamsburg · 11211', 'jobAddress before accepting: neighborhood + zip');
  const v = TD.requestView(a);
  eq([v.visitLabel, v.place, v.when, v.needBy, v.estimate, v.tailyFee, v.payout, v.expiresAt], ['Home visit', 'Williamsburg · 11211', 'Thu, Oct 15 · 5:00\u00a0PM', 'Fri, Oct 23', 12500, 1250, 14750, '2026-10-13T12:00'], 'requestView: visit label, place, when, need-by, estimate, Taily fee, payout, expiry');
  eq(v.garments.map((g) => [g.type, g.services.map((s) => s.label)]), [['Suit Pant', ['Hem pants']], ['Suit Jacket', ['Shorten sleeves', 'Take in jacket sides']]], 'requestView: garments with their service labels');
  T.tailorAccept(a.id);
  eq(TD.jobAddress(S.getAppt(a.id)), '145 N 7th St, 2R, Brooklyn, NY 11211', 'jobAddress after accepting: full street + unit');
  eq([TD.inbox().requests.length, TD.inbox().upcoming.map((x) => x.id)], [0, [a.id]], 'inbox: accepted -> upcoming');
  const s = driveTo('requested', { visitType: 'shop' });
  eq(TD.jobAddress(s), '312 Metropolitan Ave, Brooklyn, NY 11211', 'jobAddress for a shop visit is the shop');
  eq(TD.requestView(s).visitLabel, 'Shop visit', 'shop visit label');
  const sug = driveTo('suggested');
  ok(TD.inbox().requests.some((x) => x.id === sug.id), 'a suggested time still shows in requests');
}

/* ================= components (pure strings) ================= */
section('components');
{
  const seedQ = SCENARIOS.seed;
  const deposit = (opts) => (C.customerBreakdown(seedQ, opts).match(/Deposit<\/span>[\s\S]*?money-row__status">([^<]*)</) ?? [])[1];
  eq(deposit({ stage: 'estimate' }), 'Due today', 'customerBreakdown: estimate deposit is "Due today"');
  eq(deposit({ stage: 'booked' }), 'Paid', 'customerBreakdown: booked stage without a deposit state reads "Paid"');
  eq(['authorized', 'captured', 'released', 'refunded', 'kept'].map((d) => deposit({ stage: 'booked', depositState: d })), ['On hold', 'Paid', 'Released', 'Refunded', 'Kept'], 'customerBreakdown: depositState drives the deposit word (a pending request is "On hold")');
  eq(deposit({ stage: 'estimate', depositState: 'to-hold' }), 'Held today', 'customerBreakdown: to-hold reads "Held today" (D-38)');
  ok(!/%/.test(C.customerBreakdown(seedQ, { stage: 'booked', depositState: 'authorized' })), 'customerBreakdown: no percent sign');
}

/* ================= account (sign-in model, D-33) + sim + M1 components ================= */
section('account + sim');
{
  S.reset();
  eq([POLICY.CODE_TTL_MIN, POLICY.CODE_RESEND_S], [10, 30], 'POLICY: code TTL 10 min, resend 30 s');
  eq([A.phoneDigits('+1 (718) 555-0142'), A.phoneDigits('718.555.0142'), A.phoneDigits('17185550142')], ['7185550142', '7185550142', '7185550142'], 'phoneDigits strips +1 and punctuation');
  eq(['', '7', '718', '71855', '7185550', '7185550142'].map(A.formatPhone), ['', '(7', '(718', '(718) 55', '(718) 555-0', '(718) 555-0142'], 'formatPhone formats progressively');
  eq([A.validatePhone('7185550142').ok, A.validatePhone('718555').error, A.validatePhone('0185550142').error, A.validatePhone('1185550142').error], [true, 'phone-invalid', 'phone-invalid', 'phone-invalid'], 'validatePhone: 10 digits, area code not 0/1');
  A.signOut();
  eq(state.session.customer, { signedIn: false, pending: null }, 'signOut clears the session');
  guard(A.sendCode('718555'), 'phone-invalid', 'sendCode validates the number');
  eq(A.codeStatus(), null, 'codeStatus is null without a code');
  guard(A.verifyCode('123456'), 'no-code', 'verifyCode without a code');
  eq(A.sendCode('(718) 555-0142').isNew, false, 'sendCode: Sarah is an existing account');
  eq(A.codeStatus(), { phone: '(718) 555-0142', isNew: false, msToResend: POLICY.CODE_RESEND_S * 1000, expired: false }, 'codeStatus: resend countdown at 30 s');
  guard(A.resendCode(), 'too-soon', 'resendCode too soon');
  S.advanceClock(1);
  eq([A.codeStatus().msToResend, A.resendCode().ok], [0, true], 'resend unlocks after 30 s');
  guard(A.verifyCode('12345'), 'code-format', 'verifyCode: 5 digits');
  guard(A.verifyCode('000000'), 'code-wrong', 'verifyCode: 000000 is the wrong code');
  S.advanceClock(11);
  eq(A.codeStatus().expired, true, 'a code expires after 10 min');
  guard(A.verifyCode('123456'), 'code-expired', 'verifyCode: expired');
  A.resendCode();
  eq([A.verifyCode('123456'), state.session.customer.signedIn], [{ ok: true, isNew: false }, true], 'verifyCode: existing account signs in');
  S.reset(); A.signOut();
  eq(A.sendCode('(917) 555-0186').isNew, true, 'sendCode: another number is a new account');
  eq([A.verifyCode('123456'), state.session.customer.signedIn], [{ ok: true, isNew: true }, false], 'verifyCode: a new account waits for the name');
  eq(A.saveName({ first: ' ', last: '' }).errors, { first: 'first-required', last: 'last-required' }, 'saveName: both names required');
  A.saveName({ first: 'Jo', last: 'Park' });
  eq([state.customer.first, state.customer.last, state.customer.initials, state.customer.phone, state.session.customer.signedIn, state.customer.cards.length], ['Jo', 'Park', 'JP', '(917) 555-0186', true, 1], 'saveName: names the customer, keeps the seed card');
  S.reset(); A.signOut();
  eq([A.signInWith('apple').ok, state.session.customer.signedIn, A.signInWith('x').ok], [true, true, false], 'signInWith: apple / google only');
  eq(A.addCard({ number: '4242', exp: '13/28', cvc: '1', zip: '1121' }).errors, { number: 'card-number', exp: 'card-exp', cvc: 'card-cvc', zip: 'card-zip' }, 'addCard: per-field errors');
  eq(A.addCard({ number: '4000 0000 0000 0002', exp: '09/26', cvc: '123', zip: '11211' }).errors, { exp: 'card-exp' }, 'addCard: expiry before Oct 2026 is invalid');
  state.sim.card = 'declined';
  const added = A.addCard({ number: '5555 5555 5555 4444', exp: '10/26', cvc: '123', zip: '11211' });
  eq([added.ok, added.card, state.customer.cards.length, state.sim.card], [true, { id: 'card-4444', brand: 'Mastercard', last4: '4444', exp: '10/26', default: false }, 2, 'ok'], 'addCard: saves the card and clears a decline');
  state.sim.card = 'declined'; A.useOtherMethod();
  eq(state.sim.card, 'ok', 'useOtherMethod clears a decline');
  S.reset();
  let ran = 0;
  state.sim.latency = 'instant'; withLatency(() => { ran += 1; });
  eq(ran, 1, 'withLatency: instant runs synchronously');
  state.sim.latency = 'hold'; withLatency(() => { ran += 1; })();
  eq([ran, LATENCY_MS], [1, 700], 'withLatency: hold never runs');
  state.sim.latency = 'normal'; const cancel = withLatency(() => { ran += 1; }); cancel();
  eq(ran, 1, 'withLatency: normal can be cancelled');
  S.reset();
}

section('M1 components');
{
  const bar = C.bookingSteps(1);
  ok(bar.includes('stepper--compact') && (bar.match(/stepper__seg--/g) ?? []).length === 5 && bar.includes('2 of 5') && (bar.match(/aria-current="step"/g) ?? []).length === 1, 'bookingSteps: 5 segments, "2 of 5", one aria-current');
  eq(C.BOOKING_STEPS.length, 5, 'BOOKING_STEPS has 5 steps');
  ok(/disabled aria-disabled="true"/.test(C.cta('X', { disabled: true })), 'cta: disabled emits disabled + aria-disabled');
  const busy = C.cta('X', { busy: true, busyLabel: 'Working…' });
  ok(busy.includes('aria-busy="true"') && busy.includes('disabled') && busy.includes('Working…') && busy.includes('cta__spinner'), 'cta: busy = spinner + busyLabel + aria-busy + disabled');
  const off = C.actionBar({ ctaLabel: 'Next', ctaAct: 'next', disabled: true, note: 'Why not' });
  ok(off.includes('aria-describedby="action-bar-note-next"') && off.includes('id="action-bar-note-next"') && off.includes('aria-disabled="true"'), 'actionBar: a disabled CTA is described by its note');
  ok(!C.actionBar({ ctaLabel: 'Next', ctaAct: 'next', note: 'hi' }).includes('aria-describedby'), 'actionBar: no describedby when enabled');
  const full = C.actionBar({ ctaLabel: 'Go', ctaAct: 'go', lead: 'Est. <b data-money>$1</b>', secondaryLabel: 'Other', secondaryAct: 'other' });
  ok(full.includes('action-bar__lead') && full.includes('data-act="other"') && full.includes('cta--secondary'), 'actionBar: lead + secondary');
  const opt = C.optionRow({ name: 'sort', value: 'near', title: 'Nearest', sub: 'Closest first', checked: true, lead: 'L' });
  ok(opt.includes('role="radio"') && opt.includes('aria-checked="true"') && opt.includes('data-name="sort"') && opt.includes('data-value="near"') && opt.includes('✓'), 'optionRow: radio, checked, data hooks');
  ok(C.optionRow({ title: 'A' }).includes('aria-checked="false"'), 'optionRow: unchecked');
}

/* ================= reset ================= */
section('M2 tailor onboarding');
{
  const r = (draft) => T.validateRush(draft);
  eq(r({ on: false }).ok, true, 'rush off is always valid');
  eq(r({ on: true, fees: { 1: '40', 2: '25', 3: '15' } }).ok, true, 'rush ladder valid');
  eq(r({ on: true, fees: { 1: '10', 2: '25', 3: '' } }).errors, { d2: 'fee-order', d3: 'fee-missing' }, 'rush: order + missing');
  eq(r({ on: true, fees: { 1: '4.5', 2: '0', 3: '0' } }).errors, { d1: 'fee-invalid' }, 'rush: whole dollars');
  eq(T.setRush({ on: true, fees: { 1: '40', 2: '25', 3: '0' } }).tailor.rush, [{ days: 1, fee: 40 }, { days: 2, fee: 25 }], 'setRush drops a $0 tier');
  eq(T.setRush({ on: false, fees: {} }).tailor.rush, [], 'setRush off empties the ladder');
  const A = await import('../../js/account.js');
  const { onboardTo, NEW_TAILOR_PHONE } = await import('../../js/fixtures/common.js');
  onboardTo('services');
  eq([T.nextSection(), S.bookable(state.tailors[0]), !!state.tailors[0].live], ['services', false, false], 'onboardTo(services): profile saved, not live');
  eq(S.tailorsFor(state.job).empty, 'zip', 'a half-onboarded tailor is not listed (D-27)');
  A.signOut('tailor'); A.sendCode(NEW_TAILOR_PHONE, 'tailor');
  eq(A.verifyCode('123456', 'tailor').next, 'services', 'an existing half-onboarded tailor resumes at the first open step');
  onboardTo('done');
  eq([state.tailors[0].live, T.nextSection()], [true, null], 'onboardTo(done) -> live');
  eq(S.tailorsFor(state.job).rows.length, 1, 'the onboarded tailor is listed');
  const { SCENARIOS } = await import('../../js/fixtures/money-scenarios.js');
  eq(S.tailorsFor(state.job).rows[0].quote.total, SCENARIOS.seed.total, 'journey: an onboarded tailor quotes the seed total (D-65)');
  A.signOut('tailor'); A.sendCode('(718) 555-0100', 'tailor');
  const v = A.verifyCode('123456', 'tailor');
  eq([v.isNew, v.next, state.tailors[0].phone, state.tailors[0].name], [true, 'profile', '(718) 555-0100', ''], 'a new tailor number starts a blank tailor');
  eq(T.setTailorSection('services', { prices: { a: '', b: 5.5, c: 1000, d: 20 } }).errors, { 'price-a': 'price-missing', 'price-b': 'price-invalid', 'price-c': 'price-invalid' }, 'services rules');
  eq(T.setTailorSection('profile', { name: 'A', bio: 'x'.repeat(301) }).errors, { bio: 'bio-long' }, 'profile: bio too long');
  eq(T.setTailorSection('availability', { shop: { enabled: true }, home: { enabled: true }, availability: { shop: { tue: [['10:00', '18:00']] }, home: { tue: [['17:00', '20:00']], mon: [['18:00', '17:00']] } } }).errors, { 'home-mon': 'hours-range', 'overlap-tue': 'hours-overlap' }, 'availability: range + overlap');
}

section('reset');
{
  S.reset(); state.sim.latency = 'hold'; state.sim.card = 'declined';
  driveTo('completed');
  state.sim.latency = 'hold';
  S.reset();
  eq([state.appts.length, state.payouts.length, state.sim.latency, state.sim.card, state.job.garments.length, S.now()], [0, 0, 'hold', 'ok', 2, D.toDate(DATA.DEMO_NOW).getTime()], 'reset(): restores everything, keeps sim.latency');
  eq(T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:00' }).appt.id, 'A-1001', 'reset() restarts the appointment ids');
  S.reset();
}
section('M3 request loop helpers (D-72…D-88)');
{
  eq(POLICY.JUST_BOOKED_MIN, 60, 'POLICY.JUST_BOOKED_MIN is 60 (D-73)');
  eq([DATA.DECLINE_REASONS[0], DATA.CANT_MAKE_IT_REASONS[0]], ['Fully booked that week', 'Family emergency'], 'reason lists lead with what driveTo passes (D-76)');
  let a = driveTo('confirmed');
  ok(S.justConfirmed(a), 'justConfirmed is true right after the accept');
  S.advanceClock(POLICY.JUST_BOOKED_MIN);
  ok(!S.justConfirmed(S.getAppt(a.id)), 'justConfirmed is false once JUST_BOOKED_MIN has passed');
  ok(!S.justConfirmed(driveTo('requested')), 'justConfirmed is false for a request');
  a = driveTo('suggested');
  eq([a.suggested.start, SUGGESTED_SLOT], [SUGGESTED_SLOT, '2026-10-15T18:00'], "driveTo('suggested') suggests SUGGESTED_SLOT");
  const slots = TD.suggestSlots(a);
  ok(slots.length > 0 && slots[0] === SUGGESTED_SLOT, 'suggestSlots: the first offer is SUGGESTED_SLOT');
  ok(slots.every((s) => s >= a.slot.end || D.addMinutes(s, DATA.VISIT_MINUTES.home).getTime() <= D.toDate(a.slot.start).getTime()), 'suggestSlots never overlaps the requested visit');
  eq(TD.suggestSlots(a, { limit: 2 }).length, 2, 'suggestSlots honours limit');
  a = driveTo('requested');
  eq([TD.customerName(a), TD.customerInitials(), TD.requestView(a).customer.name], ['Sarah C.', 'SC', 'Sarah C.'], 'customerName hides the surname before the accept (D-74)');
  ok(TD.jobAddress(a).startsWith('Williamsburg'), 'jobAddress: neighborhood + zip before the accept');
  a = driveTo('confirmed');
  eq(TD.customerName(a), 'Sarah Chen', 'customerName after the accept');
  ok(TD.jobAddress(a).includes('145 N 7th St'), 'jobAddress: the full address once confirmed');
  const v = TD.requestView(a);
  eq([v.items, v.serviceCount, v.minutes, v.whenEnd, v.retries, v.suggested, v.needByDays], [2, 3, 60, '6:00\u00a0PM', 0, null, 8], 'requestView carries the M3 fields');
  ok(!TD.jobAddress(driveTo('cant-make-it')).includes('145 N 7th St'), 'jobAddress hides the street on a cancelled home visit (D-88)');
  ok(!TD.jobAddress(driveTo('cancelled-early')).includes('145 N 7th St'), 'jobAddress hides the street after a customer cancel (D-88)');
  ok(TD.jobAddress(driveTo('confirmed', { visitType: 'shop' })).includes('312 Metropolitan'), 'a shop visit keeps the shop address');
  eq(TD.payoutOf(driveTo('no-show')).cents, SCENARIOS.noShow.paid, 'payoutOf(no-show) is the no-show comp');
  eq(TD.payoutOf(driveTo('confirmed')), null, 'payoutOf is null before anything is paid out');
  driveTo('confirmed');
  const second = addRequest({ after: SECOND_SLOT_AFTER });
  eq([state.appts.length, second.status, second.slot.start], [2, 'requested', '2026-10-17T09:00'], 'addRequest({ after }) adds a second request at SECOND_SLOT_AFTER');
  eq(addRequest({ accept: true, after: SECOND_SLOT_AFTER }).status, 'confirmed', 'addRequest({ accept }) confirms it');
  throws(() => addRequest({ after: '2099-01-01T00:00' }), 'addRequest throws when nothing is open');
  /* focus (D-72) */
  driveTo('declined'); const dec = state.appts[0];
  setFocus(dec.id);
  eq([focusAppt('t-request', 'tailor')?.id, focusAppt('c-request', 'customer')?.id, focusAppt('c-booking', 'customer')], [dec.id, dec.id, null], 'focusAppt: a declined request lands on its request screens, not c-booking');
  const wentTo = [];
  ok(redirectIfMoved('c-booking', (id, o) => wentTo.push([id, o])) && wentTo[0][0] === 'c-request' && wentTo[0][1].replace, 'redirectIfMoved forwards a screen whose appointment moved on');
  ok(!redirectIfMoved('c-request', () => { throw new Error('should not go'); }), 'redirectIfMoved is quiet on the right screen');
  driveTo('requested'); const req = state.appts[0];
  state.ui.apptId = null;
  eq(focusAppt('c-request')?.id, req.id, 'focusAppt falls back to the newest appointment for that screen');
  T.tailorAccept(req.id); setFocus(req.id);
  eq([focusAppt('c-request'), focusAppt('c-booking')?.id], [null, req.id], 'after the accept the focus resolves to c-booking');
  S.reset();
}


/* ================= M4 §A9: return offer, courier, price-change view, revise, review masking, status words ================= */
section('M4 model');
{
  S.reset(); const a = driveTo('in-progress');
  guard(T.markReady(a.id, { returns: [] }), 'return-required', 'markReady with no way back fails');
  guard(T.markReady(a.id, { returns: ['carrier-pigeon'] }), 'return-required', 'markReady: an unknown key is not an offer');
  amara().returns.dropoff = false;
  guard(T.markReady(a.id, { returns: ['dropoff'] }), 'not-offered', 'markReady: a way the shop does not offer fails');
  amara().returns.dropoff = true;
  const r = T.markReady(a.id, { returns: ['pickup'] });
  eq([r.ok, S.returnOffer(r.appt)], [true, ['pickup']], 'markReady({ returns: [pickup] }) -> returnOffer = [pickup]');
  guard(T.chooseReturn(a.id, 'courier'), 'not-offered', 'chooseReturn: a way not in the offer fails');
  const b = driveTo('in-progress'); T.markReady(b.id);
  eq(S.returnOffer(S.getAppt(b.id)), ['pickup', 'dropoff', 'courier'].filter((k) => amara().returns[k]), 'markReady default offers every Shop return, in RETURN_LABEL order');
  const cq = M.courierQuote(0.6);
  eq([cq.quote + cq.markup, cq.cents, SCENARIOS.courierQuote.cents], [1045, 1045, 1045], 'courierQuote: quote + markup = total (SCENARIOS.courierQuote)');
  const c = driveTo('ready', { returnOption: 'courier' }); T.chooseReturn(c.id, 'courier');
  eq([S.getAppt(c.id).courier.quote, S.getAppt(c.id).courier.markup, S.getAppt(c.id).courier.cents], [SCENARIOS.courierQuote.quote, SCENARIOS.courierQuote.markup, SCENARIOS.courierQuote.cents], 'a.courier stores quote + markup + total');
}
{
  S.reset(); const a = driveTo('price-change', { priceChange: 'added' });
  const v = S.priceChangeView(a);
  const rows = v.garments.flatMap((g) => g.rows);
  eq([rows.filter((r) => r.kind === 'added').map((r) => r.label), rows.filter((r) => r.kind === 'repriced').map((r) => r.label)], [['Taper legs'], ['Shorten sleeves']], 'priceChangeView added: taper added, sleeves repriced');
  eq([v.after.total, v.after.deposit, v.delta, v.before.total, v.state], [SCENARIOS.priceAdded.total, SCENARIOS.seed.deposit, SCENARIOS.priceAdded.total - SCENARIOS.seed.total, SCENARIOS.seed.total, 'pending'], 'priceChangeView added: total, deposit unchanged, delta');
  eq(v.garments.map((g) => g.rows.map((r) => r.kind)), [['same', 'added'], ['repriced', 'same']], 'priceChangeView: booked order, added rows last in their garment');
  ok(v.note.startsWith('The sleeve lining') && !v.noteMasked && v.revisions === 0, 'priceChangeView carries the note from driveTo');
  // revise
  T.messageAboutPriceChange(a.id);
  const removedLines = a.lines.filter((l) => l.serviceId !== 'jacket-sides');
  guard(T.sendPriceChange(a.id, removedLines, { note: 'x'.repeat(DATA.TAILOR_LIMITS.NOTE_MAX + 1) }), 'note-long', 'sendPriceChange: note over NOTE_MAX fails');
  const rv = T.sendPriceChange(a.id, removedLines, { note: ' call 718 555 0100 ' });
  eq([rv.ok, rv.appt.status, rv.appt.priceChange.state, rv.appt.priceChange.revisions, rv.appt.priceChange.noteMasked], [true, 'price-change', 'pending', 1, true], 'revise: status unchanged, pending, revisions + 1, note masked');
  ok(!rv.appt.priceChange.note.includes('555'), 'revise: the phone number in the note is hidden');
  eq(rv.appt.priceChange.marks.map((m) => m.kind), ['removed'], 'revise: marks are vs the booked lines');
  const w = S.priceChangeView(S.getAppt(a.id));
  eq([w.after.balance, w.garments.flatMap((g) => g.rows).filter((r) => r.kind === 'removed').length], [SCENARIOS.priceRemoved.balance, 1], 'priceChangeView removed: balance + one removed row');
  eq(statusWord(S.getAppt(a.id), 'customer'), { pill: 'action', label: 'Approve order' }, 'statusWord: customer on price-change');
  eq(statusWord(S.getAppt(a.id), 'customer', { short: true }).label, 'Approve', 'statusWord short: Approve');
  eq(statusWord(S.getAppt(a.id), 'tailor'), { pill: 'waiting', label: 'Waiting on Sarah' }, 'statusWord: tailor waiting on Sarah');
  T.approvePriceChange(a.id);
  eq(S.getAppt(a.id).money.balance, SCENARIOS.priceRemoved.balance, 'approve applies the revised price');
}
{
  S.reset(); const a = driveTo('in-progress');
  guard(T.sendPriceChange(a.id, a.lines), 'not-fitting', 'sendPriceChange from in-progress -> not-fitting');
  const rep = driveTo('price-change', { priceChange: 'repriced' });
  eq(S.priceChangeView(rep).after.total, SCENARIOS.priceRepriced.total, 'priceChangeView repriced: SCENARIOS.priceRepriced');
  T.messageAboutPriceChange(rep.id);
  eq(statusWord(S.getAppt(rep.id), 'tailor', { short: true }), { pill: 'action', label: 'Reply' }, 'statusWord: messaged -> tailor Reply');
}
{
  S.reset(); const a = driveTo('completed');
  guard(T.leaveReview(a.id, { stars: 5, text: 'x'.repeat(DATA.REVIEW_LIMITS.TEXT_MAX + 1) }), 'text-long', 'leaveReview: text over TEXT_MAX fails');
  T.leaveReview(a.id, { stars: 5, text: 'Great, mail me at sarah@example.com' });
  ok(!S.getAppt(a.id).review.text.includes('@') && !amara().reviews[0].text.includes('@'), 'leaveReview masks contact details (D-107)');
  const po = TD.payoutOf(driveTo('completed'));
  eq({ cents: po.cents, state: po.state, date: po.date }, { cents: SCENARIOS.seed.payout, state: 'pending', date: '2026-10-16' }, 'payoutOf(completed) = seed payout, pending, Fri Oct 16');
  eq([DATA.STAR_WORDS[5], DATA.STAR_WORDS.length], ['Excellent', 6], 'STAR_WORDS indexed by stars');
}

console.log(`\n${failed ? 'FAIL' : 'PASS'}  model test: ${pass} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
