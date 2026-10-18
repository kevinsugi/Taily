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
import { driveTo, TARGETS, addRequest, documentFitting, FITTING_COMMENTS } from '../../js/fixtures/common.js';
import { SCENARIOS, SEED_SLOT } from './money.mjs';
import { SUGGESTED_SLOT, SECOND_SLOT_AFTER, PAYOUT_DAYS } from '../../js/fixtures/money-scenarios.js';
import * as EARN from '../../js/fixtures/common.js';
import { setFocus, focusAppt, redirectIfMoved, statusWord, returnStep } from '../../js/focus.js';
import * as C from '../../js/components.js';
import * as A from '../../js/account.js';
import { withLatency, LATENCY_MS } from '../../js/sim.js';

const { state, T } = S;
const CHAT_COPY = EARN.CHAT;
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
eq([MONEY.TAILY_FEE_RATE, MONEY.DEPOSIT_RATE, MONEY.COURIER_MARKUP, MONEY.COURIER_BASE, MONEY.COURIER_PER_MILE, MONEY.COURIER_PEAK, MONEY.COURIER_PEAK_FROM_H, MONEY.COURIER_PEAK_TO_H, MONEY.NO_SHOW_COMP],
  [0.10, 0.10, 0.10, 8, 2.5, 3.5, 17, 19, 25], 'MONEY table matches the fee settings (K-43: the simulated Uber quote has an evening peak)');
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
eq([amara().id, amara().shop.zip, amara().home.zips, amara().home.fee, amara().rush], ['amara', '11211', ['11211', '11249', '11222', '11206', '11237'], 35, [{ days: 1, fee: 40 }, { days: 2, fee: 25 }, { days: 3, fee: 15 }]], 'Amara: Brooklyn shop + home zips + $35 + rush ladder');
eq(Object.keys(amara().prices).length, 10, 'Amara prices all 10 catalog services');
ok(!('bridal' in amara().prices) && !('bridal' in DATA.SERVICES) && !Object.values(DATA.SERVICES).some((s) => /bridal/i.test(s.label)), 'K-33: no bridal service in the catalog');
eq(Object.keys(DATA.SERVICES).length, 10, 'catalog has 10 services (K-33: no bridal)');
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
  guard(T.setServices('g3', ['sleeves']), 'service-not-for-type', 'setServices rejects a service the type cannot have');
  guard(T.setServices('g3', ['bridal']), 'service-not-for-type', 'K-33: setServices rejects bridal (not in the catalog)');
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
  const { 'dress-take-in': _unpriced, ...fewer } = amara().prices;
  const miss = M.linesFor({ ...amara(), prices: fewer }, [{ id: 'g1', type: 'Formal Dress', services: ['dress-take-in', 'dress-hem'] }]);
  eq([miss.length, miss.missing], [1, [{ garmentId: 'g1', serviceId: 'dress-take-in' }]], 'linesFor skips an unpriced service and reports it in .missing');
  goldenRow(M.estimate(amara(), state.job, '2026-10-15T17:00'), [12500, 3500, 0, 0, 16000, 1600, 14400, 1250, 14750], 'seed, home, need-by Fri Oct 23');
  goldenRow(M.estimate(amara(), { ...state.job, needBy: '2026-10-16' }, '2026-10-15T17:00'), [12500, 3500, 4000, 0, 20000, 1600, 18400, 1250, 18750], 'rush: need-by Fri Oct 16, visit Thu Oct 15 (1 day)');
  goldenRow(M.estimate(amara(), { ...state.job, visitType: 'shop' }, '2026-10-13T13:00'), [12500, 0, 0, 0, 12500, 1250, 11250, 1250, 11250], 'shop visit');
  goldenRow(M.quote({ lines, homeFee: 3500, courier: M.courierQuote(0.6).cents }), [12500, 3500, 0, 1045, 17045, 1600, 15445, 1250, 14750], 'seed + courier 0.6 mi');
  eq(M.courierQuote(0.6), { miles: 0.6, start: null, peak: false, quote: 950, markup: 95, cents: 1045 }, 'courierQuote(0.6) = ($8.00 + $2.50 x 0.6) plus markup = $10.45 (no window: off-peak)');
  eq(M.courierQuote(0).cents, 880, 'courierQuote(0) = $8.00 plus markup = $8.80');
  // K-43 (D-299): a simulated Uber quote PER WINDOW — the evening peak (windows starting 5:00–6:59 PM) adds $3.50 before the Taily fee
  eq([M.courierQuote(0.6, '2026-10-16T10:30').cents, M.courierQuote(0.6, '2026-10-16T16:30').cents, M.courierQuote(0.6, '2026-10-16T17:00').cents, M.courierQuote(0.6, '2026-10-16T18:30').cents, M.courierQuote(0.6, '2026-10-16T19:00').cents],
    [1045, 1045, 1430, 1430, 1045], 'K-43: quotes differ by window — 10:30 AM / 4:30 PM $10.45, 5:00 / 6:30 PM (peak) $14.30, 7:00 PM $10.45');
  eq(M.courierQuote(0.6, '2026-10-16T17:00'), { miles: 0.6, start: '2026-10-16T17:00', peak: true, quote: 1300, markup: 130, cents: 1430 }, 'K-43: the peak quote = ($8.00 + $1.50 + $3.50) + the Taily fee');
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
  eq(row(SCENARIOS.courier), [12500, 3500, 0, 1430, 17430, 1600, 15830, 1250, 14750], 'money.mjs: courier scenario matches the golden row (K-43: the fixtures’ 5:00 PM peak window)');
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
  /* D-158: sending spends the draft — empty, but the place (zip, address, visit type) and the who-said-no lists stay */
  eq([state.job.garments.length, state.job.zip, state.job.visitType, state.job.address?.street, state.job.declinedBy, state.job.hiddenTailors], [0, a.job.zip, a.job.visitType, a.job.address.street, [], []], 'D-158: requestBooking resets the draft to an empty job, keeping zip / address / visit type');
  state.job = { ...structuredClone(a.job), declinedBy: [], hiddenTailors: [] };
  guard(T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:30' }), 'slot-unavailable', 'an overlapping slot is no longer open (60-minute visit)');
  T.newJob();
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
  S.advanceClock(60 * 23);
  eq(getStatus(a.id), 'suggested', 'a suggestion stays open inside its window (D-154)');
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
  eq(M.cancelTerms(a, startMs - 24 * 3600000).window, 'early', 'exactly 24 h ahead -> early (the "until" is inclusive, M6-M-11)');
  eq(M.cancelTerms(a, startMs - 24 * 3600000 + 60000).window, 'late', '23 h 59 m ahead -> late');
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
  eq(state.payouts.map(({ createdAt, ...p }) => p), [{ apptId: a.id, cents: 1600, state: 'pending', date: '2026-10-16', kind: 'kept-deposit' }], 'the kept deposit becomes a pending payout, paid the following Friday (D-24)');
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
  eq((({ createdAt, ...p }) => p)(state.payouts[0]), { apptId: a.id, cents: 2500, state: 'pending', date: '2026-10-16', kind: 'no-show' }, 'no-show pay is a pending payout');
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
  documentFitting(a.id);                                              // K-02: Before and Pinned photos are required before the send
  const st = T.sendPriceChange(a.id, a.lines);
  eq([st.ok, st.appt.priceChange.changed, st.appt.status, st.appt.priceChange.marks], [true, false, 'price-change', []], 'sendPriceChange accepts the unchanged order (changed false)');
  const ap0 = T.approvePriceChange(a.id).appt;
  eq([ap0.status, ap0.money.total, ap0.money.payout], ['in-progress', SCENARIOS.seed.total, SCENARIOS.seed.payout], 'approve the unchanged order -> in-progress, money = SCENARIOS.seed');
}
// the final order: validation (K-01, D-121)
{
  S.reset(); const a = driveTo('fitting');
  documentFitting(a.id);                                              // K-02: every guard below fails earlier in the order than photos-missing
  const line = (o) => ({ garmentId: 'n1', garmentType: 'Pants / Jeans', serviceId: 'hem-pants', label: 'Hem pants', cents: 3000, ...o });
  const withNew = (o) => [...a.lines, line(o)];
  guard(T.sendPriceChange(a.id, []), 'no-items', 'sendPriceChange: no lines -> no-items');
  guard(T.sendPriceChange(a.id, a.lines.map((l, i) => ({ ...l, cents: i === 0 ? 2550 : l.cents }))), 'price-invalid', 'sendPriceChange: cents not whole dollars -> price-invalid');
  guard(T.sendPriceChange(a.id, a.lines.map((l, i) => ({ ...l, cents: i === 0 ? 0 : l.cents }))), 'price-invalid', 'sendPriceChange: a $0 line -> price-invalid');
  guard(T.sendPriceChange(a.id, withNew({ garmentType: 'Skirt', serviceId: 'sleeves' })), 'service-type', 'sendPriceChange: service not for the item type');
  { const keep = amara().prices['dress-take-in']; delete amara().prices['dress-take-in'];   // K-33: Amara prices the whole catalog, so take one away
    guard(T.sendPriceChange(a.id, withNew({ garmentType: 'Formal Dress', serviceId: 'dress-take-in' })), 'service-not-offered', 'sendPriceChange: a service Amara does not price');
    amara().prices['dress-take-in'] = keep; }
  guard(T.sendPriceChange(a.id, withNew({ garmentType: 'Spaceship' })), 'garment-type', 'sendPriceChange: unknown item type');
  guard(T.sendPriceChange(a.id, withNew({ garmentId: 'g1', garmentType: 'Skirt', serviceId: 'dress-hem' })), 'garment-type', 'sendPriceChange: a booked item keeps its type');
  guard(T.sendPriceChange(a.id, [...a.lines, a.lines[0]]), 'duplicate-line', 'sendPriceChange: duplicate line');
  const many = Array.from({ length: 11 }, (_, i) => line({ garmentId: `n${i + 1}`, serviceId: 'repair', garmentType: 'Skirt' }));
  guard(T.sendPriceChange(a.id, many), 'max-items', 'sendPriceChange: 11 items -> max-items');
  const noted = T.sendPriceChange(a.id, a.lines, { note: 'Text me at amara@example.com' });
  ok(noted.ok && !('note' in noted.appt.priceChange), 'K-31 (Study-1 B2): no note travels with the final order (a passed note is ignored)');
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
  S.reset(); const a = driveTo('ready'); T.chooseReturn(a.id, 'pickup'); EARN.pickHandoff(a.id);
  state.sim.card = 'declined';
  guard(T.holdBalance(a.id, 'visa-4242'), 'card-declined', 'declined balance');
  eq([a.payments.balance.state, a.payments.balance.failedCardId], ['failed', 'visa-4242'], 'the declined card is recorded');
  state.sim.card = 'ok';
  const paid = T.holdBalance(a.id, 'apple-pay');
  eq([paid.ok, a.payments.balance.state, a.payments.balance.failedCardId], [true, 'held', undefined], 'holding with another way clears it');
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
// a suggested time lapses or is withdrawn (D-154)
{
  const open = (id) => S.openSlots('amara', 'home', { until: S.getAppt(id).job.needBy }).includes(SUGGESTED_SLOT);
  const seedSuggested = () => { S.reset(); const x = driveTo('suggested'); return x; };
  let a = seedSuggested();
  const lapse = S.suggestLapseAt(a);
  eq(lapse, D.toDate('2026-10-14T10:00').getTime(), 'suggestLapseAt: min(start − MIN_LEAD_H, suggested-at + SUGGEST_EXPIRY_H) = 24 h after it was suggested');
  ok(!open(a.id), 'a suggested time is held while it is open');
  /* a lapse through the clock */
  S.advanceClock(24 * 60 - 1);
  eq(getStatus(a.id), 'suggested', 'one minute before the lapse it is still open');
  eq(S.advanceClock(1).expired, [a.id], 'advanceClock reports the lapsed suggestion');
  a = S.getAppt(a.id);
  eq([a.status, a.retries, a.payments.deposit.state], ['expired', POLICY.MAX_RETRIES, 'released'], 'a lapsed suggestion is a final expiry with the deposit hold released (D-154)');
  guard(T.acceptSuggestion(a.id), 'not-suggested', 'accept after the lapse has ticked: not suggested');
  ok(open(a.id), 'the suggested time is back in openSlots');
  eq(S.threadFor('amara').messages.slice(-1).map((m) => [m.text, m.tailorText])[0], ['Amara’s suggested time passed', 'Your suggested time passed'], 'the lapse writes the thread line from each side');
  eq(S.activeAppt(), null, 'a lapsed suggestion is no longer the active appointment');
  /* accept racing the tick */
  a = seedSuggested();
  state.clock.now = S.suggestLapseAt(a);                          // lapse reached, tick not run
  guard(T.acceptSuggestion(a.id), 'slot-passed', 'acceptSuggestion at the lapse fails: slot-passed (D-154)');
  /* the start-minus-lead edge: a time suggested for later today lapses MIN_LEAD_H before it starts, not 24 h after */
  S.reset(); S.setClock('2026-10-15T12:00');
  const near = T.requestBooking({ tailorId: 'amara', slotStart: SEED_SLOT, cardId: 'visa-4242' }).appt;
  const sgn = T.tailorSuggest(near.id, SUGGESTED_SLOT);
  eq([sgn.ok, S.suggestLapseAt(near)], [true, D.toDate('2026-10-15T15:00').getTime()], 'suggestLapseAt: start − MIN_LEAD_H when that comes first');
  S.advanceClock(3 * 60);
  eq(getStatus(near.id), 'expired', 'it lapsed MIN_LEAD_H before the suggested start');
  /* withdraw */
  a = seedSuggested();
  guard(T.withdrawSuggestion(driveTo('requested').id), 'not-suggested', 'withdrawSuggestion only from suggested');
  a = seedSuggested();
  const w = T.withdrawSuggestion(a.id);
  eq([w.ok, w.appt.status, w.appt.retries, w.appt.payments.deposit.state], [true, 'expired', POLICY.MAX_RETRIES, 'released'], 'withdrawSuggestion: final expiry, deposit released (D-154)');
  guard(T.acceptSuggestion(a.id), 'not-suggested', 'accept after a withdraw fails');
  ok(open(a.id), 'the withdrawn time is back in openSlots');
  eq(S.threadFor('amara').messages.slice(-1).map((m) => [m.text, m.tailorText])[0], ['Amara withdrew the suggested time', 'You withdrew your suggested time'], 'the withdraw line from each side');
  eq(state.job.garments.length, 2, 'withdraw/lapse bring the job back into the empty draft (D-158)');
}
// rush follows the new slot, never up (D-155)
{
  S.reset(); let a = driveTo('requested');
  eq(a.money.rush, 0, 'seed request: no rush');
  const sg = T.tailorSuggest(a.id, '2026-10-22T19:00');
  eq([sg.ok, sg.appt.suggested.rush], [true, 0], 'D-155: the suggestion stores min(booked rush, rush for the new slot)');
  const acc = T.acceptSuggestion(a.id).appt;
  eq([acc.money.rush, acc.money.total, acc.money.deposit, acc.payments.balance.cents], [0, SCENARIOS.seed.total, SCENARIOS.seed.deposit, SCENARIOS.seed.balance], 'D-155: a later (rush-tier) slot does not add rush; total, deposit and balance are as booked');
  /* an Oct 22 request is rush-priced; an earlier slot drops it */
  S.reset(); T.setJob({ visitType: 'home' });
  const late = T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-22T19:00', cardId: 'visa-4242' }).appt;
  ok(late.money.rush > 0, 'a request the day before the need-by carries rush');
  const bookedRush = late.money.rush; const bookedTotal = late.money.total; const bookedBalance = late.money.balance; const dep = late.money.deposit;
  const sg2 = T.tailorSuggest(late.id, SEED_SLOT);
  eq([sg2.ok, sg2.appt.suggested.rush], [true, 0], 'D-155: the suggested earlier slot has no rush');
  const acc2 = T.acceptSuggestion(late.id).appt;
  eq([acc2.money.rush, acc2.money.total, acc2.money.balance, acc2.money.deposit, acc2.payments.balance.cents], [0, bookedTotal - bookedRush, bookedBalance - bookedRush, dep, bookedBalance - bookedRush], 'D-155: the rush is dropped, total and balance are lower by it, the deposit is unchanged');
  eq(acc2.money.payout, SCENARIOS.seed.payout, 'D-155: the tailor payout follows (no rush fee)');
  /* reschedule applies the same rule */
  S.reset(); T.setJob({ visitType: 'home' });
  const l2 = T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-22T19:00', cardId: 'visa-4242' }).appt;
  T.tailorAccept(l2.id);
  const rs = T.rescheduleBooking(l2.id, SEED_SLOT);
  eq([rs.ok, rs.appt.money.rush, rs.appt.money.total], [true, 0, bookedTotal - bookedRush], 'D-155: rescheduleBooking to an earlier slot drops the rush');
  S.reset(); a = driveTo('confirmed');
  const rs2 = T.rescheduleBooking(a.id, '2026-10-22T19:00');
  eq([rs2.ok, rs2.appt.money.rush, rs2.appt.money.total], [true, 0, SCENARIOS.seed.total], 'D-155: rescheduleBooking to a later slot never adds rush');
}
// the spent draft comes back on a decline, an expiry and a customer cancel (D-158)
{
  for (const kind of ['declined', 'expired', 'cancelled-early', 'cant-make-it']) {
    const x = driveTo(kind);
    eq([state.job.garments.length, state.job.visitType, state.job.zip], [x.job.garments.length, x.job.visitType, x.job.zip], `D-158: after "${kind}" the job is back in the draft`);
  }
  /* but a new job she started in the meantime is left alone */
  S.reset(); const x = driveTo('requested');
  T.addGarment('Skirt');
  S.advanceClock(2 * 60);
  eq(state.job.garments.map((g) => g.type), ['Skirt'], 'D-158: an expiry never overwrites a new job already in the draft');
  ok(x.job.garments.length === 2, 'the expired request keeps its own job');
}
// the customer's name once ANY appointment was accepted (D-159)
{
  S.reset(); const a = driveTo('requested');
  eq(TD.customerName(a), 'Sarah C.', 'D-159: a first request is "Sarah C."');
  T.tailorDecline(a.id, 'x');
  eq(TD.customerName(a), 'Sarah C.', 'D-159: still "Sarah C." after a decline');
  S.reset(); driveTo('confirmed');
  const second = addRequest({ after: SECOND_SLOT_AFTER });
  eq([second.status, TD.customerName(second), TD.requestView(second).customer.name], ['requested', 'Sarah Chen', 'Sarah Chen'], 'D-159: a new request from a customer she has already accepted shows the full name');
  ok(!TD.jobAddress(second).includes('145 N 7th St') || second.history.some((h) => h.status === 'confirmed'), 'D-159: the address still waits for THIS appointment’s accept (D-88)');
}
// profile bio and shop name hide contact info (D-162)
{
  S.reset();
  const v = S.validateSection('profile', { name: 'Amara', bio: 'Call me on 718-555-0199', shopName: 'Reyes — a@b.com', cardLine: 'Suits.', photo: true });
  eq([v.ok, v.soft], [true, { bio: 'contact-hidden', shopName: 'contact-hidden' }], 'D-162: validateSection returns the soft code per field and stays ok');
  const sv = T.setTailorSection('profile', { bio: 'Call me on 718-555-0199 or a@b.com', shopName: 'Reyes 718-555-0199' });
  eq([sv.soft, amara().bio, amara().shopName], [{ bio: 'contact-hidden', shopName: 'contact-hidden' }, 'Call me on [phone hidden] or [email hidden]', 'Reyes [phone hidden]'], 'D-162: setTailorSection stores the masked text');
  eq(T.setTailorSection('profile', { bio: 'Twelve years of suits.', shopName: 'Reyes Tailoring' }).soft, {}, 'D-162: clean text raises no soft code');
}
// K-19: the card line (required, <= CARD_LINE_MAX, trimmed, contact details masked) and the required profile photo
{
  S.reset();
  const MAX = DATA.TAILOR_LIMITS.CARD_LINE_MAX;
  eq(MAX, 110, 'K-19: CARD_LINE_MAX is 110');
  const base = { name: 'Amara', bio: 'Suits.', cardLine: 'Suits and dresses.', photo: true };
  const errs = (patch) => S.validateSection('profile', { ...base, ...patch }).errors;
  eq(errs({}), {}, 'K-19: a complete profile is valid');
  eq(errs({ cardLine: '' }), { cardLine: 'cardline-required' }, 'K-19: card line required');
  eq(errs({ cardLine: '   \n ' }), { cardLine: 'cardline-required' }, 'K-19: a blank card line is required (trimmed)');
  eq(errs({ cardLine: undefined }), { cardLine: 'cardline-required' }, 'K-19: a missing card line is required');
  eq(errs({ cardLine: 'x'.repeat(MAX) }), {}, 'K-19: exactly CARD_LINE_MAX characters is fine');
  eq(errs({ cardLine: `  ${'x'.repeat(MAX)}  ` }), {}, 'K-19: the limit counts the trimmed text');
  eq(errs({ cardLine: 'x'.repeat(MAX + 1) }), { cardLine: 'cardline-long' }, 'K-19: one over CARD_LINE_MAX is long');
  eq(errs({ photo: false }), { photo: 'photo-required' }, 'K-19: the profile photo is required');
  eq(errs({ photo: null }), { photo: 'photo-required' }, 'K-19: a null photo is required');
  eq(S.validateSection('profile', { ...base, cardLine: 'Call 718-555-0199' }).soft, { cardLine: 'contact-hidden' }, 'K-19: a phone number in the card line is a soft note (masked on save)');
  // the seed's line is within the limit, and the seed tailor stays bookable
  ok([...DATA.TAILORS[0].cardLine].length <= MAX && [...DATA.TAILORS[0].cardLine].length > 0, 'K-19: the seed card line fits CARD_LINE_MAX');
  eq(S.validateSection('profile', DATA.TAILORS[0]).errors, {}, 'K-19: the seed tailor profile is valid');
  // setTailorSection: the flag follows the rules, contact details are masked on save
  S.reset();
  T.setTailorSection('profile', { name: 'A', bio: 'B', photo: true, cardLine: '' });
  eq(amara().onboarding.profile, false, 'K-19: no card line -> the Profile section is not done');
  T.setTailorSection('profile', { cardLine: 'Text me on 718-555-0199 or a@b.com' });
  eq([amara().onboarding.profile, amara().cardLine], [true, 'Text me on [phone hidden] or [email hidden]'], 'K-19: card line saved masked; the Profile section is done');
  T.setTailorSection('profile', { photo: null });
  eq(amara().onboarding.profile, false, 'K-19: no photo -> the Profile section is not done');
  // a tailor missing either cannot be bookable
  S.reset();
  ok(S.bookable(amara()), 'K-19: the seed tailor is bookable');
  T.setTailorSection('profile', { cardLine: '' });
  ok(!S.bookable(amara()), 'K-19: without a card line she is not bookable');
  S.reset();
  T.setTailorSection('profile', { photo: null });
  ok(!S.bookable(amara()), 'K-19: without a photo she is not bookable');
}
// the return step word (M6-M-14)
{
  const a = driveTo('awaiting-handoff', { returnOption: 'pickup' });
  eq([returnStep(a, 'tailor'), returnStep(a, 'customer')], ['Ready for pickup', 'Ready for pickup'], 'returnStep: pickup');
  const c = driveTo('awaiting-handoff', { returnOption: 'courier' });
  eq([returnStep(c, 'tailor'), returnStep(c, 'customer')], ['Courier booked', 'Courier booked'], 'returnStep: courier (K-40: booked for her window, both sides)');
  throws(() => driveTo('awaiting-handoff', { returnOption: 'dropoff' }), 'K-37: Home drop-off is not a way back any more');
}
// price change below the deposit -> refund (D-23, D-156)
{
  const P = SCENARIOS.priceBelowDeposit;
  ok(P.total < P.deposit && P.refund === P.deposit - P.total && P.balance === 0, 'scenario priceBelowDeposit: total below the deposit, nothing to pay, the difference comes back');
  S.reset(); const b = driveTo('fitting', { visitType: 'shop' });
  documentFitting(b.id, { lines: P.lines });
  T.sendPriceChange(b.id, P.lines);
  const bp = T.approvePriceChange(b.id).appt;
  eq([bp.money.total, bp.money.deposit, bp.money.balance, bp.money.refund], [P.total, P.deposit, 0, P.refund], 'total below the deposit: balance $0.00, the difference is refunded (D-23)');
  T.markReady(b.id);
  eq(S.getAppt(b.id).payments.refund, { cents: P.refund, state: 'pending' }, 'markReady records the refund as pending (D-156)');
  ok(/After you choose/.test(C.customerBreakdown(S.getAppt(b.id).money, { stage: 'ready' })), 'D-156: the refund row reads "After you choose" while pending');
  T.chooseReturn(b.id, 'pickup');
  eq(S.getAppt(b.id).payments.refund, { cents: P.refund, state: 'pending' }, 'chooseReturn keeps the pending refund (D-156)');
  EARN.pickHandoff(b.id);
  const paid = T.holdBalance(b.id, 'visa-4242');
  eq([paid.ok, S.getAppt(b.id).payments.refund], [true, { cents: P.refund, state: 'refunded' }], 'holdBalance settles the refund (D-156)');
  ok(/Refunded/.test(C.customerBreakdown(S.getAppt(b.id).money, { stage: 'paid' })), 'D-156: the refund row reads "Refunded" once settled');
}
// refund + courier: the courier eats into the refund; the money still nets to the total (D-156)
{
  const P = SCENARIOS.priceBelowDeposit;
  S.reset(); const b = driveTo('fitting', { visitType: 'shop' });
  documentFitting(b.id, { lines: P.lines });
  T.sendPriceChange(b.id, P.lines); T.approvePriceChange(b.id); T.markReady(b.id);
  T.chooseReturn(b.id, 'courier');
  T.setHandoffSlot(b.id, '2026-10-16T17:00');   // K-43: the courier is priced with the window
  const c = S.getAppt(b.id);
  ok(c.money.courier > 0 && c.money.total === P.total + c.money.courier, 'courier is added to the total');
  eq(c.payments.refund?.cents ?? 0, c.money.refund, 'chooseReturn re-prices the pending refund with the courier (D-156)');
  ok(c.money.refund === 0 ? c.payments.refund === undefined : c.payments.refund.state === 'pending', 'a refund the courier wipes out has no entry left (D-156)');
  eq(c.payments.deposit.cents + c.money.balance - c.money.refund, c.money.total, 'deposit + balance − refund === total (D-156)');
  T.chooseReturn(b.id, 'pickup');
  eq(S.getAppt(b.id).payments.refund, { cents: P.refund, state: 'pending' }, 'back to pickup: the full refund again');
}
// ready -> return -> pay -> complete -> review (no price change)
{
  S.reset(); const a = driveTo('in-progress');
  guard(T.chooseReturn(a.id, 'pickup'), 'not-ready', 'chooseReturn needs ready');
  guard(T.holdBalance(a.id, 'visa-4242'), 'not-ready', 'holdBalance needs ready');
  const r = T.markReady(a.id);
  eq([r.appt.status, r.appt.payments.balance], ['ready', { cents: 14400, state: 'due' }], 'markReady: balance $144.00 due');
  guard(T.markReady(a.id), 'not-in-progress', 'markReady twice fails');
  guard(T.holdBalance(a.id, 'visa-4242'), 'return-required', 'holdBalance needs a return choice');
  guard(T.chooseReturn(a.id, 'carrier-pigeon'), 'not-offered', 'chooseReturn: unknown option');
  guard(T.chooseReturn(a.id, 'dropoff'), 'not-offered', 'K-37: Home drop-off is not offered');
  amara().returns.courier = false;
  guard(T.chooseReturn(a.id, 'courier'), 'not-offered', 'chooseReturn: an option the tailor does not offer');
  amara().returns.courier = true;
  // courier
  state.sim.courier = 'fail';
  const f = T.chooseReturn(a.id, 'courier');
  eq([f.appt.courier.state, f.appt.money.total], ['failed', 16000], 'sim.courier fail -> courier failed, not charged');
  guard(T.holdBalance(a.id, 'visa-4242'), 'courier-unavailable', 'holdBalance blocked while the courier quote failed');
  state.sim.courier = 'loading';
  eq(T.chooseReturn(a.id, 'courier').appt.courier.state, 'loading', 'sim.courier loading -> courier loading');
  state.sim.courier = 'ok';
  const c = T.chooseReturn(a.id, 'courier');
  eq([c.appt.courier.miles, c.appt.courier.cents, c.appt.courier.state, c.appt.money.total], [0.6, 0, 'ready', 16000], 'K-43: courier chosen, no window yet — priced per window, so nothing added yet');
  T.setHandoffSlot(a.id, '2026-10-16T12:00');
  eq([c.appt.courier.cents, c.appt.money.total], [1045, 17045], 'K-43: an off-peak window (noon) — its quote $10.45');
  T.setHandoffSlot(a.id, '2026-10-16T17:00');
  eq([c.appt.courier.miles, c.appt.courier.cents, c.appt.courier.state], [0.6, 1430, 'ready'], 'K-43: the 5:00 PM window (peak) — 0.6 mi quote $14.30');
  goldenRow(c.appt.money, [12500, 3500, 0, 1430, 17430, 1600, 15830, 1250, 14750], 'courier window picked: total $174.30, balance $158.30, payout unchanged $147.50');
  eq(c.appt.payments.balance.cents, 15830, 'balance payment follows the picked window’s courier charge');
  const p0 = T.chooseReturn(a.id, 'pickup');
  eq([p0.appt.courier, p0.appt.money.total, p0.appt.payments.balance.cents], [null, 16000, 14400], 'switching back to pickup drops the courier charge');
  guard(T.holdBalance(a.id, 'visa-4242'), 'slot-required', 'K-40: holdBalance needs the pickup time');
  EARN.pickHandoff(a.id);
  state.sim.card = 'declined';
  guard(T.holdBalance(a.id, 'visa-4242'), 'card-declined', 'holdBalance with a declined card fails');
  eq([S.getAppt(a.id).status, S.getAppt(a.id).payments.balance.state], ['ready', 'failed'], 'a declined card leaves it ready, balance failed');
  state.sim.card = '3ds';
  guard(T.holdBalance(a.id, 'visa-4242'), 'needs-3ds', 'holdBalance with 3-D Secure needs the challenge');
  state.sim.card = 'ok';
  const pay = T.holdBalance(a.id, 'visa-4242');
  eq([pay.appt.status, pay.appt.payments.balance.cents, pay.appt.payments.balance.state], ['awaiting-handoff', 14400, 'held'], 'holdBalance: awaiting-handoff, balance held (K-27)');
  guard(T.holdBalance(a.id, 'visa-4242'), 'not-ready', 'hold twice fails');
  guard(T.leaveReview(a.id, { stars: 5 }), 'not-completed', 'leaveReview needs completed');
  eq(state.payouts.length, 0, 'nothing is paid out while the order waits for the handoff');
  const done = T.confirmPickup(a.id, S.handoffCode(a));
  eq(done.appt.status, 'completed', 'the pickup code completes it');
  eq(state.payouts.map(({ createdAt, ...p }) => p), [{ apptId: a.id, cents: 14750, state: 'pending', date: '2026-10-16', kind: 'job' }], 'completion creates a pending payout of $147.50 (not the courier)');
  guard(T.confirmPickup(a.id, S.handoffCode(a)), 'not-awaiting-handoff', 'confirming twice fails');
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
  const pre = T.sendMessage('amara', 'customer', { text: 'Do you do hems? my number is 718-555-0199' });
  eq([pre.ok, pre.masked, pre.message.text], [true, true, 'Do you do hems? my number is [phone hidden]'], 'sendMessage before booking works and masks');
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
  const CUSTOMER_MAP = { requested: 'c-request', suggested: 'c-request', declined: 'c-request', expired: 'c-request', confirmed: 'c-booking', fitting: 'c-booking', 'price-change': 'c-price-change', 'in-progress': 'c-booking', ready: 'c-ready', 'awaiting-handoff': 'c-booking', completed: 'c-complete', cancelled: 'c-booking' };
  const TAILOR_MAP = { requested: 't-request', suggested: 't-request', declined: 't-request', expired: 't-request', confirmed: 't-job', fitting: 't-job', 'price-change': 't-job', 'in-progress': 't-job', ready: 't-job', 'awaiting-handoff': 't-job', completed: 't-job', cancelled: 't-job' };
  eq(S.STATUSES.length, 12, '12 statuses');
  eq(S.TERMINAL, ['declined', 'cancelled', 'completed'], 'TERMINAL');
  S.reset();
  for (const status of S.STATUSES) {
    const fake = { status, review: null, payments: { balance: { state: 'due' } } };
    eq(S.statusScreen(fake, 'customer'), CUSTOMER_MAP[status], `statusScreen customer ${status}`);
    eq(S.statusScreen(fake, 'tailor'), TAILOR_MAP[status], `statusScreen tailor ${status}`);
  }
  eq(S.statusScreen({ status: 'ready', payments: { balance: { state: 'held' } } }, 'customer'), 'c-ready', 'ready is always c-ready (holding moves it on, K-27)');
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
  eq(S.validateSection('profile', amara()).errors, { name: 'name-required', bio: 'bio-required', cardLine: 'cardline-required', photo: 'photo-required' }, 'profile rules (K-19: card line and photo are required)');
  eq(T.setTailorSection('profile', { name: 'Amara Reyes', initials: 'AR', bio: 'Hi.', cardLine: 'Hi.', photo: true }).valid, true, 'setTailorSection profile -> valid');
  eq(T.setTailorSection('services', { prices: { 'hem-pants': 25 } }).valid, true, 'services valid with one priced service');
  eq(T.setTailorSection('services', { prices: { 'hem-pants': undefined } }).valid, false, 'undefined deletes a key; no services -> invalid');
  T.setTailorSection('services', { prices: { 'hem-pants': 25, taper: 40, waist: 35, sleeves: 45, 'jacket-sides': 55 } });
  eq(T.setTailorSection('where', { shop: { enabled: false } }).valid, false, 'where: neither shop nor home -> invalid');
  eq(T.setTailorSection('where', { home: { enabled: true, hoods: ['williamsburg'], fee: 35 } }).valid, true, 'where: home visits with a neighborhood + fee -> valid (Study-1 C5)');
  eq(T.setTailorSection('where', { home: { hoods: [] } }).errors, { hoods: 'hoods-required' }, 'where: home visits need a neighborhood');
  T.setTailorSection('where', { home: { hoods: ['williamsburg'] } });
  eq(T.setTailorSection('returns', { returns: { courier: true } }).valid, true, 'returns: one option is enough');
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
  ok(bar.includes('stepper--compact') && (bar.match(/stepper__seg--/g) ?? []).length === 5 && bar.includes('Step 2 of 5 · Where and when') && (bar.match(/aria-current="step"/g) ?? []).length === 1, 'bookingSteps: 5 segments, "Step 2 of 5 · Where and when", one aria-current');
  eq(C.BOOKING_STEPS.length, 5, 'BOOKING_STEPS has 5 steps');
  ok(/disabled aria-disabled="true"/.test(C.cta('X', { disabled: true })), 'cta: disabled emits disabled + aria-disabled');
  const busy = C.cta('X', { busy: true, busyLabel: 'Working…' });
  ok(busy.includes('aria-busy="true"') && busy.includes('aria-disabled="true"') && !/\sdisabled[\s>]/.test(busy) && busy.includes('Working…') && busy.includes('cta__spinner'), 'cta: busy = spinner + busyLabel + aria-busy + aria-disabled, never the disabled attribute (it keeps focus, AU-P1-2c)');
  const off = C.actionBar({ ctaLabel: 'Next', ctaAct: 'next', disabled: true, note: 'Why not' });
  ok(off.includes('aria-describedby="action-bar-note-next"') && off.includes('id="action-bar-note-next"') && off.includes('aria-disabled="true"'), 'actionBar: a disabled CTA is described by its note');
  ok(!C.actionBar({ ctaLabel: 'Next', ctaAct: 'next', note: 'hi' }).includes('aria-describedby'), 'actionBar: no describedby when enabled');
  const full = C.actionBar({ ctaLabel: 'Go', ctaAct: 'go', lead: 'Est. <b data-money>$1</b>', secondaryLabel: 'Other', secondaryAct: 'other' });
  ok(full.includes('action-bar__lead') && full.includes('data-act="other"') && full.includes('text-link') && !full.includes('cta--secondary'), 'actionBar: lead + secondary (M7: a text link, not an outline button)');
  const soft = C.cta('Send', { softDisabled: true, attrs: 'data-act="send"' });
  ok(soft.includes('cta--disabled') && soft.includes('aria-disabled="true"') && !/\sdisabled[\s>]/.test(soft), 'cta: softDisabled looks disabled and has no disabled attribute (D-196)');
  const stitched = C.moneyRows([{ label: 'A', cents: 100 }, { label: 'Total', cents: 100, kind: 'total' }]);
  ok((stitched.match(/class="stitch"/g) || []).length === 1 && stitched.indexOf('stitch') < stitched.indexOf('money-row--total'), 'moneyRows: one stitched dash, directly above the total (D-197)');
  ok(C.statusPill('confirmed').includes('status--progress') && C.statusPill('suggested').includes('status--action') && C.statusPill('completed').includes('status--done'), 'statusPill: a dot + a word, warm tones (D-188)');
  ok(C.topNav('home').includes('aria-label="Bookings"') && !C.topNav('home').includes('top-nav__label'), 'topNav: icon links with aria-labels (D-187)');
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
  eq(T.setTailorSection('profile', { name: 'A', bio: 'x'.repeat(301), cardLine: 'Hi.', photo: true }).errors, { bio: 'bio-long' }, 'profile: bio too long');
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
  guard(T.markReady(a.id, { returns: ['dropoff'] }), 'return-required', 'K-37: drop-off is not a way back (an unknown key)');
  amara().returns.courier = false;
  guard(T.markReady(a.id, { returns: ['courier'] }), 'not-offered', 'markReady: a way the shop does not offer fails');
  amara().returns.courier = true;
  const r = T.markReady(a.id, { returns: ['pickup'] });
  eq([r.ok, S.returnOffer(r.appt)], [true, ['pickup']], 'markReady({ returns: [pickup] }) -> returnOffer = [pickup]');
  guard(T.chooseReturn(a.id, 'courier'), 'not-offered', 'chooseReturn: a way not in the offer fails');
  const b = driveTo('in-progress'); T.markReady(b.id);
  eq(S.returnOffer(S.getAppt(b.id)), ['pickup', 'courier'], 'markReady default offers every Shop return, in RETURN_LABEL order (K-37: no drop-off)');
  const cq = M.courierQuote(0.6, '2026-10-16T17:00');
  eq([cq.quote + cq.markup, cq.cents, SCENARIOS.courierQuote.cents, SCENARIOS.courierOffPeak.cents], [1430, 1430, 1430, 1045], 'courierQuote: quote + markup = total (SCENARIOS.courierQuote = the fixtures’ 5:00 PM window; courierOffPeak)');
  const c = driveTo('ready', { returnOption: 'courier' }); T.chooseReturn(c.id, 'courier'); T.setHandoffSlot(c.id, '2026-10-16T17:00');
  eq([S.getAppt(c.id).courier.quote, S.getAppt(c.id).courier.markup, S.getAppt(c.id).courier.cents], [SCENARIOS.courierQuote.quote, SCENARIOS.courierQuote.markup, SCENARIOS.courierQuote.cents], 'a.courier stores quote + markup + total');
}
{
  S.reset(); const a = driveTo('price-change', { priceChange: 'added' });
  const v = S.priceChangeView(a);
  const rows = v.garments.flatMap((g) => g.rows);
  eq([rows.filter((r) => r.kind === 'added').map((r) => r.label), rows.filter((r) => r.kind === 'repriced').map((r) => r.label)], [['Taper legs'], ['Shorten sleeves']], 'priceChangeView added: taper added, sleeves repriced');
  eq([v.after.total, v.after.deposit, v.delta, v.before.total, v.state], [SCENARIOS.priceAdded.total, SCENARIOS.seed.deposit, SCENARIOS.priceAdded.total - SCENARIOS.seed.total, SCENARIOS.seed.total, 'pending'], 'priceChangeView added: total, deposit unchanged, delta');
  eq(v.garments.map((g) => g.rows.map((r) => r.kind)), [['same', 'added'], ['repriced', 'same']], 'priceChangeView: booked order, added rows last in their garment');
  ok(!('note' in v) && v.revisions === 0 && a.notes[0]?.text.startsWith('The sleeve lining'), 'K-31: driveTo keeps its note as a private General note, not on the order');
  // revise
  T.messageAboutPriceChange(a.id);
  const removedLines = a.lines.filter((l) => l.serviceId !== 'jacket-sides');
  const rv = T.sendPriceChange(a.id, removedLines);
  eq([rv.ok, rv.appt.status, rv.appt.priceChange.state, rv.appt.priceChange.revisions], [true, 'price-change', 'pending', 1], 'revise: status unchanged, pending, revisions + 1');
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


/* ================= M5 §A10: messaging, payouts, accounts ================= */
section('M5 messaging');
{
  S.reset();
  const first = T.sendMessage('amara', 'customer', { text: 'Call me: (718) 555-0199 or me@x.com' });
  eq([first.message.text, first.masked], ['Call me: [phone hidden] or [email hidden]', true], 'both patterns are masked for the customer');
  eq(T.sendMessage('amara', 'tailor', { text: 'Or (347) 555-0118, amara@x.com' }).message.text, 'Or [phone hidden], [email hidden]', 'both patterns are masked for the tailor');
  S.reset();
  state.sim.send = 'fail';
  guard(T.sendMessage('amara', 'customer', { text: 'hi' }), 'send-failed', 'send-failed: the next send fails');
  ok(T.sendMessage('amara', 'customer', { text: 'hi again' }).ok && state.sim.send === 'ok', 'send-failed is one-shot');
  state.sim.network = 'offline';
  guard(T.sendMessage('amara', 'customer', { text: 'hi' }), 'offline', 'offline: sends fail');
  guard(T.sendMessage('amara', 'customer', { text: 'hi' }), 'offline', 'offline fails until the network is back');
  state.sim.network = 'online';
  guard(T.sendMessage('amara', 'customer', { text: 'x', photos: DATA.CHAT_LIMITS.PHOTOS_MAX + 1 }), 'too-many-photos', 'too-many-photos at 4');
  ok(T.sendMessage('amara', 'customer', { text: 'x', photos: DATA.CHAT_LIMITS.PHOTOS_MAX }).ok, 'three photos are allowed');
  S.reset();
  T.sendMessage('amara', 'customer', { text: 'q' });
  eq([S.unreadCount('amara', 'customer'), S.unreadCount('amara', 'tailor')], [0, 1], 'unread counts only the other person; your own send is never unread');
  T.sendMessage('amara', 'tailor', { text: 'a' });
  eq([S.unreadCount('amara', 'customer'), S.unreadCount('amara', 'tailor')], [1, 0], 'an answer is unread for the asker; answering marks the thread read for the answerer');
  T.markThreadRead('amara', 'customer');
  eq([S.unreadCount('amara', 'customer'), S.unreadCount('amara', 'tailor')], [0, 0], 'markThreadRead resets the reader only');
  T.sendMessage('amara', 'customer', { text: 'and another' });
  eq([S.unreadCount('amara', 'customer'), S.unreadCount('amara', 'tailor')], [0, 1], 'a new message is unread for the other side');
  eq(T.markThreadRead('nobody', 'customer').ok, true, 'markThreadRead is a no-op without a thread');
  driveTo('confirmed', { ask: true });
  eq(S.unreadCount('amara', 'customer'), 1, 'system lines never count as unread (only the reply does)');
  const msgs = S.threadFor('amara').messages;
  eq([msgs[0].text, msgs[1].text, msgs[1].at, msgs[2].at], [CHAT_COPY.ask, CHAT_COPY.reply, '2026-10-13T09:42', '2026-10-13T10:00'], 'askAmara: question 9:30, reply 9:42, then the booking at the demo clock');
  /* threadAppt */
  S.reset();
  eq(S.threadAppt('amara'), null, 'threadAppt: null for a question before any booking');
  const r1 = driveTo('requested');
  eq(S.threadAppt('amara').id, r1.id, 'threadAppt: the active appointment');
  T.withdrawRequest(r1.id);
  eq(S.threadAppt('amara'), null, 'threadAppt skips a withdrawn request');
  const dec = driveTo('declined');
  eq(S.threadAppt('amara').id, dec.id, 'threadAppt: a declined request is still the newest that was not withdrawn');
  /* preview */
  S.reset();
  const sys = T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:00' });
  const tm = S.threadFor('amara').messages;
  eq([S.threadPreview(tm[0], 'customer'), S.threadPreview(tm[0], 'tailor')], ['You sent a request', 'Sarah sent a request'], 'threadPreview: system lines read from the reader side');
  const own = T.sendMessage('amara', 'customer', { text: 'See my number 718-555-0199' }).message;
  eq([S.threadPreview(own, 'customer'), S.threadPreview(own, 'tailor')], ['You: See my number (phone hidden)', 'See my number (phone hidden)'], 'threadPreview: You: prefix, masked tokens in parentheses, no brackets (M6-P-17)');
  const ph = T.sendMessage('amara', 'customer', { text: '', photos: 2 }).message;
  const ph1 = T.sendMessage('amara', 'tailor', { text: '', photos: 1 }).message;
  const pt = T.sendMessage('amara', 'tailor', { text: 'Here', photos: 1 }).message;
  eq([S.threadPreview(ph, 'tailor'), S.threadPreview(ph1, 'customer'), S.threadPreview(pt, 'customer')], ['2 photos', 'Photo', 'Photo · Here'], 'threadPreview: photos');
  void sys;
  /* threadsFor */
  S.reset();
  eq([S.threadsFor('customer').length, S.threadsFor('tailor').length], [0, 0], 'threadsFor: none before any message');
  driveTo('requested', { ask: true });
  const rows = S.threadsFor('tailor');
  eq([rows.length, rows[0].tailorId, rows[0].unread, rows[0].readOnly, rows[0].appt.status, rows[0].last.from], [1, 'amara', 0, false, 'requested', 'system'], 'threadsFor(tailor): the thread, unread, appt');
  /* server error */
  S.reset();
  state.sim.server = 'error';
  guard(T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:00' }), 'server-error', 'server-error fails the request');
  eq([state.appts.length, state.sim.server], [0, 'ok'], 'server-error authorizes nothing and is one-shot');
  ok(T.requestBooking({ tailorId: 'amara', slotStart: '2026-10-15T17:00' }).ok, 'the request after a server error goes through');
  eq(S.threadFor('amara').read, { customer: 0, tailor: 0 }, 'a fresh thread starts unread-neutral');
}
section('M5 payouts');
{
  S.reset();
  eq([D.payoutDay('2026-10-15'), D.payoutDay('2026-10-16'), D.payoutDay('2026-10-17T00:00'), D.payoutDay('2026-10-18')], ['2026-10-16', '2026-10-23', '2026-10-23', '2026-10-23'], 'payoutDay: the Friday strictly after');
  const a = driveTo('completed');
  state.payouts[0].cents += 0;
  eq(T.settlePayouts().paid.length, 0, 'settlePayouts pays nothing before the Friday');
  S.setClock('2026-10-16T18:00');
  const run = T.settlePayouts();
  eq([run.paid.length, state.payouts[0].state, state.payouts[0].bank, state.payouts[0].last4], [1, 'paid', 'Chase', '6789'], 'settlePayouts pays due pending payouts and snapshots the bank');
  eq(T.settlePayouts().paid.length, 0, 'settlePayouts does not pay twice');
  void a;
  const pv = TD.payoutsView();
  eq([pv.next, pv.failed, pv.history.length, pv.paidTotal, pv.history[0].date], [null, null, 1, SCENARIOS.seed.payout, '2026-10-16'], 'payoutsView: paid history and paidTotal');
  /* failed -> fix bank details -> pending again */
  driveTo('completed');
  S.setClock('2026-10-16T18:00');
  state.sim.payout = 'failed';
  eq(T.settlePayouts().failed.length, 1, 'sim.payout = failed sends it back');
  const fv = TD.payoutsView();
  eq([fv.next, fv.failed.cents, fv.failed.retryDate, fv.failed.items.length], [null, SCENARIOS.seed.payout, '2026-10-23', 1], 'payoutsView: failed with the retry Friday');
  const fixed = T.setPayouts({ holder: 'Amara Reyes', routing: '021000021', account: '' });
  eq([fixed.ok, fixed.requeued, fixed.requeuedCents], [true, 1, SCENARIOS.seed.payout], 'setPayouts re-queues failed payouts');
  const nv = TD.payoutsView();
  eq([nv.failed, nv.next.date, nv.next.cents, nv.next.items[0].retried], [null, '2026-10-23', SCENARIOS.seed.payout, true], 'payoutsView: re-queued payout is next, retried');
  eq(TD.payoutDetail(state.appts[0].id).payout.state, 'pending', 'payoutDetail returns the payout, appt and request view');
  eq(TD.payoutDetail('nope'), null, 'payoutDetail: null for an unknown id');
  /* grouping */
  EARN.earningsTo('paid');
  const g = TD.payoutsView();
  eq([g.next.cents, g.next.date, g.history[0].cents, g.history[0].date, g.paidTotal], [SCENARIOS.shop.payout, PAYOUT_DAYS.second, SCENARIOS.seed.payout, PAYOUT_DAYS.first, SCENARIOS.seed.payout], "earningsTo('paid'): next payout and history");
  EARN.earningsTo('kept');
  eq([TD.payoutsView().next.cents, TD.payoutsView().next.items[0].sub], [SCENARIOS.lateCancel.tailorPaid, 'Late cancellation · deposit kept'], "earningsTo('kept')");
  eq(TD.threadCustomerName(), 'Sarah Chen', 'threadCustomerName: full name after any accept');
  S.reset(); driveTo('requested');
  eq(TD.threadCustomerName(), 'Sarah C.', 'threadCustomerName: initial before any accept');
}
section('M5 accounts');
{
  S.reset();
  eq([state.customer.addresses.length, state.customer.addresses[0].default, state.customer.address.zip], [1, true, '11211'], 'seed: one default address, customer.address mirrors it');
  eq(A.addAddress({ label: '', street: '', zip: '112' }).errors, { label: 'label-required', street: 'street-required', zip: 'zip-invalid' }, 'addAddress: errors');
  const w = A.addAddress({ label: 'Work', street: '200 Kent Ave', unit: '', zip: '11249' });
  eq([w.ok, w.address.id, w.address.city, w.address.default, state.customer.address.street], [true, 'addr-1', 'Brooklyn', false, '145 N 7th St'], 'addAddress adds a non-default; customer.address unchanged');
  A.setDefaultAddress(w.address.id);
  eq([state.customer.address.street, state.customer.addresses.map((a) => a.default)], ['200 Kent Ave', [false, true]], 'setDefaultAddress moves the default and customer.address');
  const rm = A.removeAddress(w.address.id);
  eq([rm.ok, rm.index, rm.newDefault, state.customer.address.street], [true, 1, 'home', '145 N 7th St'], 'removeAddress of the default promotes the first remaining');
  A.restoreAddress(rm.removed, rm.index);
  eq([state.customer.addresses.map((a) => a.id), state.customer.addresses.map((a) => a.default), state.customer.address.street], [['home', 'addr-1'], [false, true], '200 Kent Ave'], 'restoreAddress restores order and default');
  A.removeAddress('home'); A.removeAddress('addr-1');
  eq(state.customer.address, null, 'removing the last address sets customer.address to null');
  ok(T.newJob().ok && state.job.address === null, 'newJob still works with no saved address');
  /* cards */
  S.reset();
  const mc = A.addCard({ number: '5555555555554444', exp: '11/29', cvc: '123', zip: '11211' }).card;
  eq(A.setDefaultCard(mc.id).ok, true, 'setDefaultCard');
  eq(state.customer.cards.map((c) => c.default), [false, true], 'setDefaultCard moves the default flag');
  S.reset();
  driveTo('confirmed');
  eq(A.cardInUse('visa-4242')?.status, 'confirmed', 'cardInUse: the open booking');
  guard(A.removeCard('visa-4242'), 'in-use', 'removeCard: the only card of an open booking is in use');
  A.addCard({ number: '5555555555554444', exp: '11/29', cvc: '123', zip: '11211' });
  const rc = A.removeCard('visa-4242');
  eq([rc.ok, rc.movedTo, rc.appts.length, S.getAppt(state.appts[0].id).cardId, state.customer.cards[0].default], [true, 'card-4444', 1, 'card-4444', true], 'removeCard with another card moves the booking to the new default');
  guard(A.removeCard('nope'), 'unknown-card', 'removeCard: unknown card');
  S.reset();
  eq(A.removeCard('visa-4242').ok, true, 'removeCard: a card paying for nothing goes');
  eq(state.customer.cards.length, 0, 'no cards left');
  A.expireSession();
  eq(state.sim.session, 'expired', 'expireSession marks the session expired');
  A.sendCode('(718) 555-0142'); A.reauth('123456');
  eq(state.sim.session, 'valid', 'reauth with a good code marks the session valid');
  S.reset();
}

/* ================= M6 Batch 4: taking requests (D-161), payout words (D-172), suggested price (D-155) ================= */
section('M6 batch 4');
{
  S.reset();
  state.job = { ...state.job, garments: DATA.SEED_JOB.garments, visitType: 'home' };
  eq([amara().takingRequests, S.eligible(amara(), state.job).ok], [true, true], 'D-161: taking requests defaults on and she is eligible');
  T.setTakingRequests(false);
  eq([S.eligible(amara(), state.job).reason, S.tailorsFor(state.job).empty], ['nothing-open', 'nothing-open'], 'D-161: paused -> eligible says nothing-open and she is off the list');
  T.setTakingRequests(true);
  eq(S.eligible(amara(), state.job).ok, true, 'D-161: turning it back on restores her');
  S.reset();
  const booked = driveTo('confirmed');
  T.setTakingRequests(false);
  eq(S.getAppt(booked.id).status, 'confirmed', 'D-161: a job already booked is untouched');
  S.reset();
  const done = EARN.earningsTo('pending');
  const po = TD.payoutOf(S.getAppt(done.id));
  eq(TD.payoutLine(po, amara().payouts).text, `Arrives ${D.fmtDay(po.date)} · to Chase •••• 6789`, 'D-172: a pending payout reads Arrives <Fri> · to <bank>');
  S.reset();
  const paidFirst = EARN.earningsTo('paid');
  void paidFirst;
  eq(TD.payoutLine(TD.payoutOf(S.getAppt(state.appts[0].id)), amara().payouts).short, `Paid ${D.fmtDay(PAYOUT_DAYS.first)}`, 'D-172: a paid payout reads Paid <Fri>');
  S.reset();
  const failedFirst = EARN.earningsTo('failed');
  const fl = TD.payoutLine(TD.payoutOf(S.getAppt(failedFirst.id)), amara().payouts);
  eq([fl.tone, fl.text], ['error', 'Sends again once you update your bank details.'], 'D-172: a failed payout reads Didn’t go through in error tone');
  S.reset();
  const sug = driveTo('suggested');
  eq(TD.suggestPrice(S.getAppt(sug.id), SUGGESTED_SLOT).less, 0, 'D-155: a suggested time inside a rush window on a non-rush request costs Sarah no rush');
  S.reset();
}

// fitting documentation (K-02, D-175…D-183): Before and Pinned photos are REQUIRED, a comment is optional
{
  const MAXP = DATA.FITTING_LIMITS.PHOTOS_MAX;
  const MAXC = DATA.FITTING_LIMITS.COMMENT_MAX;
  S.reset(); let a = driveTo('fitting');
  eq(S.docsMissing(a, ['g1', 'g2']), [{ garmentId: 'g1', before: true, pinned: true }, { garmentId: 'g2', before: true, pinned: true }], 'K-02: an undocumented fitting is missing both kinds on both garments');
  const noPhotos = T.sendPriceChange(a.id, a.lines);
  eq([noPhotos.ok, noPhotos.error, noPhotos.missing], [false, 'photos-missing', [{ garmentId: 'g1', before: true, pinned: true }, { garmentId: 'g2', before: true, pinned: true }]], 'K-02: sendPriceChange without photos -> photos-missing with the gaps');
  eq([S.getAppt(a.id).status, S.getAppt(a.id).priceChange], ['fitting', null], 'K-02: a refused send changes nothing');
  const p1 = T.addFittingPhoto(a.id, 'g1', 'before');
  eq([p1.ok, p1.photo.id, p1.photo.tone, p1.photo.kind], [true, 'p1', 0, 'before'], 'K-02: addFittingPhoto -> p1, tone 0, kind before');
  guard(T.addFittingPhoto(a.id, 'g1', 'selfie'), 'photo-kind', 'K-02: an unknown kind -> photo-kind');
  guard(T.addFittingPhoto(a.id, 'g9', 'before'), 'unknown-garment', 'K-02: an unknown garment -> unknown-garment');
  ok(T.addFittingPhoto(a.id, 'n1', 'before').ok, 'K-02: a draft new item (n1) can be photographed');
  for (let i = 0; i < MAXP; i += 1) T.addFittingPhoto(a.id, 'g2', 'before');
  guard(T.addFittingPhoto(a.id, 'g2', 'before'), 'too-many-photos', `K-02: a fifth Before photo -> too-many-photos (PHOTOS_MAX ${MAXP})`);
  // g1 Before only, g2 fully documented
  S.reset(); a = driveTo('fitting');
  T.addFittingPhoto(a.id, 'g1', 'before');
  T.addFittingPhoto(a.id, 'g2', 'before'); T.addFittingPhoto(a.id, 'g2', 'pinned');
  eq(S.docsMissing(a, ['g1', 'g2']), [{ garmentId: 'g1', before: false, pinned: true }], 'K-02: docsMissing names only the kind that is missing');
  eq(T.sendPriceChange(a.id, a.lines).missing, [{ garmentId: 'g1', before: false, pinned: true }], 'K-02: photos-missing carries the same gap');
  // a removed garment is exempt, a new item is not
  const without1 = a.lines.filter((l) => l.garmentId !== 'g1');
  ok(T.sendPriceChange(a.id, without1).ok, 'K-02: removing a garment from the order exempts it from the photo rule');
  S.reset(); a = driveTo('fitting');
  const itemLines = [...a.lines.filter((l) => l.serviceId !== 'jacket-sides'), { garmentId: 'n1', garmentType: 'Pants / Jeans', serviceId: 'hem-pants', label: 'Hem pants', cents: 3000 }];
  documentFitting(a.id, { lines: a.lines });
  const newItem = T.sendPriceChange(a.id, itemLines);
  eq([newItem.error, newItem.missing.map((m) => m.garmentId)], ['photos-missing', ['n1']], 'K-02: a new item without photos blocks the send, naming n1');
  // remove / restore
  S.reset(); a = driveTo('fitting');
  T.addFittingPhoto(a.id, 'g1', 'before'); const second = T.addFittingPhoto(a.id, 'g1', 'before').photo; T.addFittingPhoto(a.id, 'g1', 'before');
  const gone = T.removeFittingPhoto(a.id, 'g1', second.id);
  eq([gone.ok, gone.photo.id, gone.index, S.docsOf(a, 'g1').before.length], [true, second.id, 1, 2], 'K-02: removeFittingPhoto -> the photo and where it was');
  ok(T.restoreFittingPhoto(a.id, 'g1', gone.photo, gone.index).ok && S.docsOf(a, 'g1').before[1].id === second.id, 'K-02: restoreFittingPhoto puts it back at its index');
  guard(T.restoreFittingPhoto(a.id, 'g1', gone.photo, gone.index), 'duplicate', 'K-02: restoring twice -> duplicate');
  guard(T.removeFittingPhoto(a.id, 'g1', 'p99'), 'not-found', 'K-02: an unknown photo id -> not-found');
  // comments
  const mc = T.setFittingComment(a.id, 'g2', FITTING_COMMENTS.masked);
  ok(mc.ok && mc.masked && S.docsOf(a, 'g2').comment.includes('[phone hidden]') && !S.docsOf(a, 'g2').comment.includes('555') && S.docsOf(a, 'g2').commentMasked, 'K-02: a comment with a phone number is stored masked');
  guard(T.setFittingComment(a.id, 'g2', 'x'.repeat(MAXC + 1)), 'comment-long', `K-02: a comment over ${MAXC} characters -> comment-long`);
  ok(T.setFittingComment(a.id, 'g2', '').ok && S.docsOf(a, 'g2').comment === '', 'K-02: an empty comment clears it');
  ok(T.setFittingComment(a.id, 'g2', `  ${FITTING_COMMENTS.g2}  `).ok && S.docsOf(a, 'g2').comment === FITTING_COMMENTS.g2, 'K-02: a comment is trimmed');
  // the sent snapshot
  S.reset(); a = driveTo('fitting');
  documentFitting(a.id, { lines: a.lines });
  ok(T.sendPriceChange(a.id, a.lines).ok, 'K-02: documented, the send goes through');
  eq(Object.keys(S.getAppt(a.id).priceChange.docs), ['g1', 'g2'], 'K-02: priceChange.docs has exactly the sent garments');
  T.addFittingPhoto(a.id, 'g1', 'before');
  eq([S.docsOf(a, 'g1').before.length, S.docsOf(a, 'g1', { sent: true }).before.length, S.docsDiffer(a, ['g1', 'g2'])], [2, 1, true], 'K-02: a photo added while pending changes the working docs, not the snapshot');
  eq([S.docsFor(a, 'customer').g1.before.length, S.docsFor(a, 'tailor').g1.before.length], [1, 1], 'K-02: after the send both readers see the snapshot');
  ok(T.sendPriceChange(a.id, a.lines).ok && !S.docsDiffer(S.getAppt(a.id), ['g1', 'g2']), 'K-02: the revise send copies the working docs');
  // lock
  T.approvePriceChange(a.id);
  guard(T.addFittingPhoto(a.id, 'g1', 'before'), 'not-editable', 'K-02: after approval a photo cannot be added');
  guard(T.removeFittingPhoto(a.id, 'g1', 'p1'), 'not-editable', 'K-02: after approval a photo cannot be removed');
  guard(T.restoreFittingPhoto(a.id, 'g1', { id: 'p1', kind: 'before', at: a.slot.start, tone: 0 }, 0), 'not-editable', 'K-02: after approval a photo cannot be restored');
  guard(T.setFittingComment(a.id, 'g1', 'late'), 'not-editable', 'K-02: after approval the comment is locked');
  eq(S.docsFor(S.getAppt(a.id), 'customer'), S.getAppt(a.id).priceChange.docs, 'K-02: the customer reads priceChange.docs');
  eq(S.docsFor(driveTo('fitting', { docs: 'min' }), 'customer'), {}, 'K-02: Sarah never sees the working docs');
  // nextItemId
  S.reset(); a = driveTo('fitting');
  eq(S.nextItemId(a), 'n1', 'K-02: nextItemId starts at n1');
  T.addFittingPhoto(a.id, 'n1', 'before');
  eq(S.nextItemId(a), 'n2', 'K-02: nextItemId looks past a discarded draft item that has photos (D-182)');
  // the fixtures
  S.reset(); a = driveTo('in-progress');
  ok(a.lines.every((l) => S.docsOf(a, l.garmentId, { sent: true }).before.length >= 1 && S.docsOf(a, l.garmentId, { sent: true }).pinned.length >= 1), 'K-02: driveTo past the fitting documents every garment');
  S.reset(); a = driveTo('price-change', { priceChange: 'item' });
  ok(a.priceChange.docs.n1 && a.priceChange.docs.n1.before.length >= 1, 'K-02: the item recipe documents the new item too');
  S.reset(); a = driveTo('in-progress', { docs: 'full' });
  eq([a.priceChange.docs.g2.comment, a.priceChange.docs.g2.before.length, a.priceChange.docs.g2.pinned.length], [FITTING_COMMENTS.g2, 2, 2], 'K-02: docs full -> two photos per kind and the comment');
  eq(TD.requestView(a).garments.find((g) => g.id === 'g2').docs.comment, FITTING_COMMENTS.g2, 'K-02: requestView garments carry docs');
  throws(() => driveTo('in-progress', { docs: 'none' }), 'K-02: driveTo past the fitting with docs none throws');
  // icons + docs components
  ok(/garment-icon--card/.test(C.garmentIcon('Suit Jacket')) && /aria-hidden="true"/.test(C.garmentIcon('Suit Jacket')) && !/aria-hidden/.test(C.garmentIcon('Suit Jacket', { alt: 'Suit Jacket' })), 'K-02: garmentIcon is decorative unless given alt');
  ok(/garment-icon--fallback/.test(C.garmentIcon('Spaceship')) && !/<img/.test(C.garmentIcon('Spaceship')), 'K-02: an unknown type gets the hanger, never a broken image');
  eq(C.garmentDocs({ garmentId: 'g1', type: 'Suit Pant', docs: { before: [], pinned: [], comment: '', commentMasked: false } }), '', 'K-02: garmentDocs renders nothing for an empty entry');
}

/* ===== Study-1 phase 0: shared constants and seed ===== */
{
  S.reset();
  ok(S.STATUSES.includes('awaiting-handoff') && !S.STATUSES.includes('returning'), 'S1-0: awaiting-handoff replaces returning');
  eq([POLICY.HANDOFF_AUTO_H, POLICY.UNCLAIMED_CAPTURE_D, POLICY.REVIEW_REMINDER_D, MONEY.PRICE_RANGE_SPREAD, MONEY.PRICE_ROUND], [48, 7, 7, 0.20, 5], 'S1-0: Study-1 timers and price-range settings');
  eq([DATA.HANDOFF_CODE_LEN, DATA.NOTES_LIMITS], [4, { TEXT_MAX: 500, PHOTOS_MAX: 4 }], 'S1-0: handoff code length and private-note limits');
  ok(Object.values(DATA.SERVICES).every((s) => Number.isInteger(s.base) && s.base > 0), 'S1-0: every service has a whole-dollar base price');
  ok(Object.entries(amara().prices).every(([id, p]) => DATA.SERVICES[id].base === p) , 'S1-0: base = Amara’s seed price');
  eq(DATA.BOROUGHS.map((b) => b.name), ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'], 'S1-0: five boroughs in picker order');
  const ids = DATA.NEIGHBORHOODS.map((n) => n.id), zips = DATA.NEIGHBORHOODS.flatMap((n) => n.zips);
  ok(new Set(ids).size === ids.length && new Set(zips).size === zips.length, 'S1-0: neighborhood ids and zips are unique');
  ok(DATA.NEIGHBORHOODS.every((n) => DATA.BOROUGHS.some((b) => b.id === n.borough) && n.zips.every((z) => /^\d{5}$/.test(z)) && Number.isInteger(n.tile?.x) && Number.isInteger(n.tile?.y)), 'S1-0: every neighborhood has a borough, 5-digit zips and a tile');
  const byId = new Map(DATA.NEIGHBORHOODS.map((n) => [n.id, n]));
  eq(amara().home.hoods, ['williamsburg', 'greenpoint', 'east-williamsburg', 'bushwick'], 'S1-0: Amara visits four neighborhoods');
  ok(amara().home.zips.every((z) => amara().home.hoods.some((h) => byId.get(h).zips.includes(z))), 'S1-0: Amara’s zips all fall inside her neighborhoods');
}

/* ===== S1-A ===== */
section('Study-1 WS-A: hold, handoff, Job Done, no-shows');
{
  const H = 60, DAY = 24 * 60;
  const hours = (ms) => Math.round(ms / 3600000);
  // A2 hold: the balance (services + rush + courier − deposit) is HELD at the return choice, nothing captured, nothing paid out
  S.reset(); let a = driveTo('awaiting-handoff');
  eq([a.status, a.payments.balance.cents, a.payments.balance.state, a.payments.deposit.state, state.payouts.length], ['awaiting-handoff', SCENARIOS.seed.balance, 'held', 'captured', 0], 'S1-A2: picking pickup holds $144.00; the deposit stays captured; no payout yet');
  eq([a.handoff.code, a.handoff.code.length, S.handoffCode(a)], ['8153', DATA.HANDOFF_CODE_LEN, '8153'], 'S1-A3: the pickup code is 4 digits derived from the id (A-1001 → 8153)');
  ok(/charged \$[\d,]+\.\d\d at handoff/.test(S.threadFor('amara').messages.at(-1).text) && !/%/.test(S.threadFor('amara').messages.at(-1).text), 'S1-A2 + K-44: the thread says what is charged at handoff, in dollars');
  const c = driveTo('awaiting-handoff', { returnOption: 'courier' });
  eq([c.payments.balance.cents, c.payments.balance.state], [SCENARIOS.courier.balance, 'held'], 'S1-A2: the courier is part of the hold ($158.30 with the 5:00 PM window)');
  S.reset();
  {
    const r = driveTo('fitting', { visitType: 'shop' });
    documentFitting(r.id, { lines: SCENARIOS.priceBelowDeposit.lines });
    T.sendPriceChange(r.id, SCENARIOS.priceBelowDeposit.lines); T.approvePriceChange(r.id); T.markReady(r.id); T.chooseReturn(r.id, 'pickup');
    EARN.pickHandoff(r.id);
    const z = T.holdBalance(r.id, 'visa-4242');
    eq([z.ok, z.appt.payments.balance.cents, z.appt.payments.balance.state, z.appt.payments.refund.state], [true, 0, 'none', 'refunded'], 'S1-A2 (D-156): a total below the deposit holds nothing and refunds at the choice');
  }
  // A3 pickup code
  S.reset(); a = driveTo('awaiting-handoff');
  guard(T.confirmPickup(a.id, '81'), 'code-format', 'S1-A3: a short code is a format error');
  guard(T.confirmPickup(a.id, '0000'), 'code-wrong', 'S1-A3: a wrong code does not match');
  eq([a.status, a.payments.balance.state], ['awaiting-handoff', 'held'], 'S1-A3: a wrong code changes nothing');
  guard(T.courierDelivered(a.id), 'not-courier', 'S1-A3: only a courier return is delivered by the courier');
  const done = T.confirmPickup(a.id, ' 8153 ');
  eq([done.ok, a.status, a.payments.balance.state, a.payments.balance.captureReason, a.handoff.completedBy], [true, 'completed', 'captured', 'handoff', 'code'], 'S1-A3: the right code completes it right away and captures the hold');
  eq(state.payouts.map((p) => [p.cents, p.date, p.kind]), [[SCENARIOS.seed.payout, PAYOUT_DAYS.first, 'job']], 'S1-A3: the payout is queued for the Friday after the handoff');
  // A3 pickup without the code (K-37: the drop-off is gone): 48 h countdown; "I didn't get it" pauses; "I got it" completes
  S.reset(); a = driveTo('awaiting-handoff');
  guard(T.reportNotReceived(a.id), 'not-marked', 'S1-A3: nothing to object to before Amara marks it');
  T.markHandedOver(a.id);
  eq([hours(S.autoCompleteLeft(a)), a.handoff.markedBy, 'photo' in a.handoff], [POLICY.HANDOFF_AUTO_H, 'tailor', false], 'S1-A3: picked up without the code starts the 48 h countdown (no photo)');
  guard(T.markHandedOver(a.id), 'already-marked', 'S1-A3: marking twice without a problem fails');
  T.advanceClock(H);
  ok(/in 46h unless you report a problem/.test(C.autoCompleteLine(S.autoCompleteLeft(a))) && /unless Sarah reports a problem/.test(C.autoCompleteLine(S.autoCompleteLeft(a), { who: 'Sarah' })), 'S1-A3: an hour later the line reads 46h (whole hours still ahead), worded per side');
  eq([C.autoCompleteLine(48 * 3600000).includes('in 47h'), C.autoCompleteLine(3600000).includes('less than 1h'), C.autoCompleteLine(null)], [true, true, ''], 'S1-A3 (default 3): 47h right after the mark, less than 1h in the last hour, nothing while paused');
  T.reportNotReceived(a.id);
  guard(T.reportNotReceived(a.id), 'already-reported', 'S1-A3: one report at a time');
  eq(S.autoCompleteLeft(a), null, 'S1-A3: a reported problem stops the countdown');
  T.advanceClock(8 * DAY);
  eq([a.status, a.payments.balance.state], ['awaiting-handoff', 'held'], 'S1-A3 (default 2): a problem pauses BOTH the 48 h and the 7-day timers');
  const re = T.markHandedOver(a.id);
  eq([re.ok, a.handoff.problemAt, a.handoff.marks, hours(S.autoCompleteLeft(a))], [true, null, 2, POLICY.HANDOFF_AUTO_H], 'S1-A3 (default 5): marked picked up again clears the problem and restarts 48 h');
  ok(S.unclaimedAt(a) > S.unclaimedAt({ handoff: { ...a.handoff, pausedMs: 0 } }), 'S1-A3: the 7-day capture moves out by the paused time');
  T.reportNotReceived(a.id);
  const got = T.confirmReceived(a.id);
  eq([got.ok, a.status, a.handoff.completedBy, a.payments.balance.captureReason], [true, 'completed', 'customer', 'handoff'], 'S1-A3: "I got it" completes it even after a reported problem');
  // A3 48 h auto-complete, stamped at autoAt
  S.reset(); a = driveTo('handed-over');
  const autoAt = a.handoff.autoAt;
  T.advanceClock(POLICY.HANDOFF_AUTO_H * H - 1);
  eq(a.status, 'awaiting-handoff', 'S1-A3: one minute before the 48 h it is still open');
  const moved = T.advanceClock(1 + 3 * H).expired;
  eq([moved.includes(a.id), a.status, a.handoff.completedBy, a.handoff.completedAt, a.history.at(-1).at, a.payments.balance.captureReason], [true, 'completed', 'auto', autoAt, autoAt, 'handoff'], 'S1-A3: tick completes it at autoAt (stamped then, not at the late tick)');
  eq(state.payouts.map((p) => p.date), [D.payoutDay(autoAt)], 'S1-A3: the auto payout is for the Friday after autoAt');
  eq(driveTo('auto-completed', { returnOption: 'pickup' }).handoff.completedBy, 'auto', 'S1-A3: a pickup marked without the code auto-completes too');
  // A3 courier
  S.reset(); a = driveTo('awaiting-handoff', { returnOption: 'courier' });
  guard(T.markHandedOver(a.id), 'courier', 'S1-A3 (default 6): no tailor mark on a courier return');
  guard(T.confirmPickup(a.id, '8153'), 'not-pickup', 'S1-A3: no pickup code on a courier return');
  T.courierDelivered(a.id);
  eq([a.status, a.handoff.completedBy, a.payments.balance.state, state.payouts[0].cents], ['completed', 'courier', 'captured', SCENARIOS.seed.payout], 'S1-A3: courier delivery completes it; the payout never includes the courier');
  // A2 unclaimed: 7 days after the hold → captured, the job stays open, the payout waits for the handoff
  S.reset(); a = driveTo('awaiting-handoff');
  const heldAt = a.handoff.heldAt;
  T.advanceClock(POLICY.UNCLAIMED_CAPTURE_D * DAY - 1);
  eq(a.payments.balance.state, 'held', 'S1-A2: still held a minute before 7 days');
  T.advanceClock(1);
  eq([a.status, a.payments.balance.state, a.payments.balance.captureReason, a.payments.balance.capturedAt, state.payouts.length], ['awaiting-handoff', 'captured', 'unclaimed', D.isoMinute(D.addMinutes(heldAt, POLICY.UNCLAIMED_CAPTURE_D * DAY)), 0], 'S1-A2: 7 days after the hold it is captured (unclaimed); the job stays open; no payout yet');
  ok(S.threadFor('amara').messages.some((m) => m.text === `We charged your ${M.fmtExact(SCENARIOS.seed.balance)} balance after 7 days`), 'S1-A2: the thread says it was charged');
  T.confirmPickup(a.id, a.handoff.code);
  eq([a.status, a.payments.balance.captureReason, state.payouts.length], ['completed', 'unclaimed', 1], 'S1-A2: the handoff later completes it without a second charge; the payout is queued then');
  // A4 review reminder (K-28: a selector, no status)
  S.reset(); a = driveTo('completed');
  ok(!S.reviewReminderDue(a) && !S.reviewReminder(), 'S1-A4: no reminder at completion');
  T.advanceClock(POLICY.REVIEW_REMINDER_D * DAY - 1);
  ok(!S.reviewReminderDue(a), 'S1-A4: none a minute before 7 days');
  T.advanceClock(1);
  ok(S.reviewReminderDue(a) && S.reviewReminder() === a, 'S1-A4: the reminder is due 7 days after completion');
  T.leaveReview(a.id, { stars: 5 });
  ok(!S.reviewReminderDue(a), 'S1-A4: a review clears it');
  eq(driveTo('review-reminder').status, 'completed', 'S1-A4: driveTo review-reminder stays completed');
  // A4 Book again
  S.reset(); a = driveTo('completed', { visitType: 'shop' });
  const again = T.bookAgain(a.id);
  eq([again.ok, state.job.garments.length, state.job.visitType, state.job.zip], [true, 0, 'shop', a.job.zip], 'S1-A4: Book again = same visit type and ZIP, no garments');
  // A5 tailor cancels (late flag) and the tailor no-show
  S.reset(); a = driveTo('cant-make-it-late');
  eq([a.cancel.late, a.cancel.refund, a.payments.deposit.state, state.payouts.length], [true, SCENARIOS.seed.deposit, 'refunded', 0], 'S1-A5: a tailor cancel inside 24 h is late, the deposit still refunded in full, nothing paid out');
  eq(driveTo('cant-make-it').cancel.late, false, 'S1-A5: a tailor cancel 24 h or more ahead is not late');
  S.reset(); a = driveTo('confirmed');
  S.setClock(D.isoMinute(D.addMinutes(a.slot.start, POLICY.NO_SHOW_WAIT_MIN - 1)));
  guard(T.reportTailorNoShow(a.id), 'too-early', 'S1-A5: the no-show report opens 15 min after the start');
  T.advanceClock(1);
  const ns = T.reportTailorNoShow(a.id);
  eq([ns.ok, a.status, a.cancel.reason, a.cancel.by, a.cancel.refund, a.payments.deposit.state, state.payouts.length, state.job.garments.length], [true, 'cancelled', 'tailor-no-show', 'customer', SCENARIOS.seed.deposit, 'refunded', 0, 2], 'S1-A5: a tailor no-show cancels, refunds the deposit in full, pays nothing out, restores the order');
  guard(T.markNoShow(a.id), 'not-confirmed', 'S1-A5 (default 8): first report wins');
  eq([S.statusScreen(a, 'customer'), S.statusScreen(a, 'tailor')], ['c-booking', 't-job'], 'S1-A5: both sides land on the booking / job');
  S.reset(); a = driveTo('no-show');
  eq([a.cancel.reason, a.payments.deposit.state, state.payouts[0].cents], ['no-show', 'kept', M.noShowPayout(SCENARIOS.seed.deposit)], 'S1-A5: the customer no-show is unchanged');
  ok(S.threadFor('amara').messages.every((m) => !/%/.test(m.text)), 'S1-A: no system line carries a percent sign');
}

/* ===== S1-B ===== */
{
  section('Study-1 B1: edit the job after the fitting');
  const { jobEdit, EDIT_REASON } = EARN;
  let a = driveTo('in-progress');
  const before = { lines: structuredClone(a.lines), money: structuredClone(a.money), needBy: a.job.needBy };
  const draft = jobEdit(a);
  /* guards */
  guard(T.sendJobEdit(driveTo('fitting', { docs: 'min' }).id, draft), 'not-in-progress', 'S1-B1: no edit at the fitting (that is the final order)');
  a = driveTo('in-progress');
  guard(T.sendJobEdit(a.id, { ...draft, lines: [] }), 'no-items', 'S1-B1: an edit keeps at least one line');
  guard(T.sendJobEdit(a.id, { ...draft, lines: draft.lines.map((l, i) => (i ? l : { ...l, cents: 2550 })) }), 'price-invalid', 'S1-B1: whole-dollar prices only');
  guard(T.sendJobEdit(a.id, { ...draft, needBy: '2026-10-01' }), 'due-invalid', 'S1-B1: the due date cannot be in the past');
  guard(T.sendJobEdit(a.id, { ...draft, lines: a.lines.map((l) => ({ ...l })), needBy: a.job.needBy }), 'no-change', 'S1-B1: nothing changed → nothing to send');
  guard(T.sendJobEdit(a.id, { ...draft, reason: '   ' }), 'reason-required', 'S1-B1: the reason is required');
  guard(T.sendJobEdit(a.id, { ...draft, reason: 'x'.repeat(DATA.TAILOR_LIMITS.NOTE_MAX + 1) }), 'reason-long', 'S1-B1: the reason has a limit');
  /* send */
  const sent = T.sendJobEdit(a.id, { ...draft, reason: 'Call me at 718 555 0100', workDone: M.cents(40) });
  eq([sent.ok, a.status, a.edit.state, a.edit.changed, a.edit.reasonMasked, 'workDone' in a.edit, !!a.edit.photo], [true, 'in-progress', 'pending', true, true, false, true], 'S1-B1: the edit is pending, the job stays in progress, the reason masked; no work-done amount (K-30 overruled)');
  eq([S.statusScreen(a, 'customer'), S.statusScreen(a, 'tailor')], ['c-price-change', 't-job'], 'S1-B1: Sarah lands on the edit (c-price-change), Amara on the job');
  eq([statusWord(a, 'customer').label, statusWord(a, 'tailor', { short: true }).label], ['Approve changes', 'Waiting'], 'S1-B1: whose move it is, both sides');
  guard(T.markReady(a.id), 'edit-pending', 'S1-B1 (default 13): Mark ready waits for Sarah’s answer');
  const v = S.jobEditView(a);
  eq([v.after.total, v.after.payout, v.delta, v.dueChanged, 'ifDeclined' in v, 'workDone' in v], [SCENARIOS.edit.total, SCENARIOS.edit.payout, SCENARIOS.edit.total - SCENARIOS.seed.total, true, false, false], 'S1-B1: jobEditView — new total and payout, due moved, no decline amounts');
  /* K-30 overruled: a post-fitting edit can't be declined — no transition, no partial price, no partial outcome */
  ok(!('declineJobEdit' in T) && !('declineJobEdit' in S) && !('partialQuote' in M), 'S1-B1 (K-30 overruled): there is no declineJobEdit and no partialQuote');
  ok(!('outcome' in a), 'S1-B1 (K-30 overruled): no partial outcome on the appointment');
  /* Sarah disagrees → she messages; Amara revises (the due date only, the price back to the approved one) and the revision replaces the pending edit */
  ok(T.sendMessage('amara', 'customer', { text: 'Please keep the sleeves at the price we agreed.' }).ok, 'S1-B1: Sarah messages about the edit');
  eq([a.status, a.edit.state], ['in-progress', 'pending'], 'S1-B1: messaging leaves the edit pending (it is never declined)');
  const revised = jobEdit(a, 'due');
  const re = T.sendJobEdit(a.id, revised);
  eq([re.ok, a.edit.revisions, a.edit.changed, S.jobEditView(a).delta, a.edit.state], [true, 1, false, 0, 'pending'], 'S1-B1 (default 13): the revised edit replaces the pending one (price back to the approved one)');
  ok(T.approveJobEdit(a.id).ok && a.money.total === before.money.total && a.job.needBy === revised.needBy, 'S1-B1: approving the revision applies it — same price, the later due date');
  /* approve */
  a = driveTo('in-progress');
  T.sendJobEdit(a.id, draft);
  const ap = T.approveJobEdit(a.id);
  eq([ap.ok, a.status, a.edit.state, a.money.total, a.money.balance, a.money.payout, a.payments.deposit.cents, a.job.needBy, a.edit.needByWas], [true, 'in-progress', 'approved', SCENARIOS.edit.total, SCENARIOS.edit.balance, SCENARIOS.edit.payout, SCENARIOS.seed.deposit, draft.needBy, before.needBy], 'S1-B1: approve — the new price and date replace the old, the deposit stays');
  guard(T.approveJobEdit(a.id), 'not-pending', 'S1-B1: nothing left to approve');
  ok(T.markReady(a.id).ok && a.payments.balance.cents === SCENARIOS.edit.balance, 'S1-B1: approved → Mark ready works, the balance is the new one');
  /* due only */
  a = driveTo('edit-pending', { edit: 'due' });
  eq([a.edit.changed, S.jobEditView(a).delta, S.jobEditView(a).dueChanged], [false, 0, true], 'S1-B1: a due-date-only edit changes no price');
  guard(T.approveJobEdit(driveTo('in-progress').id), 'not-pending', 'S1-B1: nothing to approve without an edit');
  eq(TARGETS.filter((t) => /partial|declined/.test(t) && t !== 'declined'), [], 'S1-B1 (K-30 overruled): no edit-declined / partial-completed driveTo targets');
  ok(EDIT_REASON && !/%/.test(S.threadFor('amara').messages.map((m) => m.text).join(' ')), 'S1-B1: no system line carries a percent sign');

  section('Study-1 B2: private General notes');
  a = driveTo('fitting');
  guard(T.addNote(a.id, { text: '  ' }), 'note-empty', 'S1-B2: an empty note is refused');
  guard(T.addNote(a.id, { text: 'x'.repeat(DATA.NOTES_LIMITS.TEXT_MAX + 1) }), 'note-long', 'S1-B2: up to 500 characters');
  guard(T.addNote(a.id, { text: 'x', photos: DATA.NOTES_LIMITS.PHOTOS_MAX + 1 }), 'too-many-photos', 'S1-B2: up to 4 photos');
  const n1 = T.addNote(a.id, { text: ' Sleeve 24 1/2 in. ' });
  const n2 = T.addNote(a.id, { photos: 2 });
  eq([n1.ok, n1.note.text, n2.ok, n2.note.photos.map((p) => p.id), a.notes.length], [true, 'Sleeve 24 1/2 in.', true, ['np1', 'np2'], 2], 'S1-B2: a text note and a photo-only note');
  const up = T.updateNote(a.id, n1.note.id, { text: 'Sleeve 24 3/4 in.', photos: [...n1.note.photos, {}] });
  eq([up.ok, a.notes[0].text, a.notes[0].photos.length, !!a.notes[0].updatedAt], [true, 'Sleeve 24 3/4 in.', 1, true], 'S1-B2: update text and add a photo');
  ok(T.addNotePhoto(a.id, n2.note.id).ok && a.notes[1].photos.length === 3, 'S1-B2: add a photo to a note');
  ok(T.removeNotePhoto(a.id, n2.note.id, 'np1').ok && a.notes[1].photos.length === 2, 'S1-B2: remove a photo');
  const rm = T.removeNote(a.id, n1.note.id);
  eq([rm.ok, rm.index, a.notes.length], [true, 0, 1], 'S1-B2: remove a note');
  ok(T.restoreNote(a.id, rm.note, rm.index).ok && a.notes[0].id === n1.note.id, 'S1-B2: undo puts it back where it was');
  guard(T.restoreNote(a.id, rm.note, 0), 'duplicate', 'S1-B2: restore twice fails');
  ok(S.threadFor('amara').messages.every((m) => !m.text.includes('Sleeve 24')), 'S1-B2: notes never reach the thread');
  guard(T.addNote(driveTo('confirmed').id, { text: 'x' }), 'notes-closed', 'S1-B2: notes open at the fitting');
  a = driveTo('completed');
  ok(!S.notesEditable(a), 'S1-B2 (default 14): read-only once completed');
  guard(T.addNote(a.id, { text: 'x' }), 'notes-closed', 'S1-B2: no new note on a completed job');
  ok(S.notesEditable(driveTo('awaiting-handoff')) && S.notesEditable(driveTo('ready')), 'S1-B2: editable until the handoff');
  a = driveTo('price-change');
  ok(a.notes.length === 1 && !('note' in a.priceChange) && !('note' in S.priceChangeView(a)), 'S1-B2 (K-31): the whole-order note is private; the order Sarah sees has none');

  section('Study-1 B1–B2: components');
  const pn = C.privateNotes({ notes: a.notes, type: 'Suit Pant' });
  ok(pn.includes('General notes') && pn.includes('Only you can see these notes.') && pn.includes('data-act="note-add"') && !/share/i.test(pn), 'S1-B2: privateNotes — label, lock line, Add a note, no sharing');
  ok(C.privateNotes({ notes: [] }).includes(C.NOTE_EMPTY), 'S1-B2: privateNotes empty line');
  const ro = C.privateNotes({ notes: a.notes, readOnly: true });
  ok(!ro.includes('data-act="note-add"') && !ro.includes('data-act="note-edit"'), 'S1-B2: read-only notes have no controls');
  const ed = C.privateNotes({ notes: [], draft: { id: null, text: 'x', photos: [{ tone: 0 }, { tone: 1 }] } });
  ok(ed.includes('id="note-text"') && (ed.match(/data-act="note-remove-photo"/g) ?? []).length === 2 && ed.includes('data-act="note-add-photo"') && ed.includes('data-act="note-save"'), 'S1-B2: the editor — text, two photos to remove, Add photo, Save');
  ok(C.privateNotes({ notes: [], draft: { id: null, text: '', photos: [{}, {}, {}, {}] } }).includes('Up to 4 photos per note.'), 'S1-B2: at 4 photos Add photo gives way to the limit line');
  ok(!('partial' in SCENARIOS) && !C.customerBreakdown(SCENARIOS.edit, { stage: 'ready' }).includes('Work done so far'), 'S1-B1 (K-30 overruled): no partial scenario, no Work done so far row');
  ok(/New due date Mon, Oct 26 · was Fri, Oct 23/.test(C.dueChange({ needBy: '2026-10-26', was: '2026-10-23' }).replace(/<[^>]+>/g, '')), 'S1-B1: dueChange');
}

/* ===== S1-C ===== */
{
  /* C3: price ranges = base ± PRICE_RANGE_SPREAD, ends rounded to PRICE_ROUND; mid = rounded midpoint (STUDY-1-spec §6) */
  const R = (id) => { const r = M.priceRange(id); return [r.low, r.high, r.mid].map((c) => c / 100); };
  eq([R('hem-pants'), R('taper'), R('waist'), R('sleeves'), R('jacket-sides'), R('shirt-take-in'), R('dress-hem'), R('dress-take-in'), R('zipper'), R('repair')],
    [[20, 30, 25], [30, 50, 40], [30, 40, 35], [35, 55, 45], [45, 65, 55], [25, 35, 30], [40, 60, 50], [50, 80, 65], [25, 35, 30], [15, 25, 20]], 'S1-C: priceRange table (§6)');
  eq(M.priceRange('bridal'), null, 'K-33: no bridal price range');
  eq(M.priceRange('nope'), null, 'S1-C: priceRange of an unknown service is null');
  /* C5: neighborhoods are the source of truth; zips are derived (picked order, each once) */
  S.reset();
  eq(DATA.zipsForHoods(amara().home.hoods), amara().home.zips, 'S1-C: Amara’s seed zips = the zips of her neighborhoods');
  eq(DATA.ZIP_INFO['11249'], { hood: 'Williamsburg', miles: 0.9 }, 'S1-C: 11249 is Williamsburg, 0.9 mi');
  let r = T.setTailorSection('where', { home: { hoods: ['soho', 'williamsburg'] } });
  eq([r.valid, amara().home.zips], [true, ['10012', '10013', '11211', '11249']], 'S1-C: setTailorSection derives home.zips from home.hoods');
  T.setJob({ visitType: 'home', zip: '11222' });
  eq(S.eligible(amara(), state.job).reason, 'zip', 'S1-C: a zip outside her neighborhoods is not eligible');
  T.setJob({ zip: '11249' });
  eq(S.eligible(amara(), state.job).ok, true, 'S1-C: a zip inside a picked neighborhood is eligible');
  r = T.setTailorSection('where', { home: { hoods: [] } });
  eq([r.valid, r.errors, amara().home.zips], [false, { hoods: 'hoods-required' }, []], 'S1-C: no neighborhood -> hoods-required, no zips');
  eq(T.setTailorSection('where', { home: { hoods: ['atlantis'] } }).errors, { hoods: 'hood-unknown' }, 'S1-C: an unknown neighborhood id is refused');
  eq(S.validateSection('where', { home: { enabled: false, hoods: [] }, shop: { enabled: true, street: 'x', zip: '11211' } }).ok, true, 'S1-C: shop only needs no neighborhood');
  S.reset();
  /* C2 / C4: components */
  const ta = C.textArea({ id: 'x', label: 'L', maxlength: 110, value: 'a'.repeat(110), placeholder: 'Example: hi' });
  ok(ta.includes('maxlength="110"') && ta.includes('text-area--full') && ta.includes('110 / 110') && ta.includes('placeholder="Example: hi"') && !ta.includes('aria-invalid'), 'S1-C: textArea at the hard stop is full, not invalid');
  ok(!C.textArea({ id: 'y', label: 'L', maxlength: 110, value: 'abc' }).includes('text-area--full'), 'S1-C: textArea under the limit is not full');
  const bd = C.customerBreakdown(SCENARIOS.seed, { stage: 'estimate' });
  ok(bd.includes('Home visit fee') && bd.includes('Flat, per visit') && !bd.includes('Home-visit'), 'S1-C: customer breakdown says "Home visit fee" + "Flat, per visit"');
  ok(C.tailorBreakdown(SCENARIOS.seed).includes('Home visit fee'), 'S1-C: tailor breakdown says "Home visit fee"');
  const hp = C.hoodPicker({ selected: ['williamsburg'], open: ['brooklyn'] });
  ok(hp.includes('aria-pressed="true"') && hp.includes('1 selected') && (hp.match(/data-act="borough"/g) ?? []).length === 5, 'S1-C: hoodPicker = five borough groups, picks pressed');
  ok((C.hoodMap({ selected: ['williamsburg', 'soho'] }).match(/hood-map__tile is-on/g) ?? []).length === 2, 'S1-C: hoodMap lights one tile per pick');
}


/* ===== K-40 ===== */
section('K-40 (T1): the handoff time');
{
  const DAY_MS = 24 * 3600000;
  const last = () => S.threadFor('amara').messages.at(-1);
  S.reset(); let a = driveTo('ready');                                    // Thu, Oct 15 · 5:00 PM — the shop closed at 4:00 PM
  const picks = S.handoffSlots(a, 'pickup');
  eq(picks[0], { start: '2026-10-16T10:00' }, 'K-40: pickup times start at the next opening (nothing left today)');
  eq([...new Set(picks.map((x) => x.start.slice(0, 10)))], ['2026-10-16', '2026-10-17', '2026-10-20', '2026-10-21', '2026-10-22'], 'K-40: the shop’s open days in the next 7 days (D-295)');
  const fri = picks.filter((x) => x.start.startsWith('2026-10-16'));
  eq([fri.length, fri.at(-1).start], [16, '2026-10-16T17:30'], 'K-40: Fri pickups every 30 min; the last one ends at closing');
  ok(picks.every((x) => D.toDate(x.start).getTime() <= S.now() + POLICY.HANDOFF_PICK_DAYS * DAY_MS), 'K-40: never more than HANDOFF_PICK_DAYS ahead');
  const wins = S.handoffSlots(a, 'courier').filter((x) => x.start.startsWith('2026-10-16'));
  eq([wins[0], wins.at(-1).start, wins.length], [{ start: '2026-10-16T10:30', end: '2026-10-16T11:00', collectAt: '2026-10-16T10:15' }, '2026-10-16T18:00', 16], 'K-40: courier windows — collected 15 min before, inside her open hours; the last starts at closing');
  eq(S.handoffSlots(a, 'dropoff'), [], 'K-37: no times for a way back that does not exist');
  guard(T.setHandoffSlot(a.id, '2026-10-16T17:30'), 'return-required', 'K-40: the time needs a way back first');
  T.chooseReturn(a.id, 'pickup');
  guard(T.holdBalance(a.id, 'visa-4242'), 'slot-required', 'K-40: Hold needs a picked time');
  guard(T.setHandoffSlot(a.id, '2026-10-16T18:00'), 'slot-invalid', 'K-40: a pickup ending after closing is not open');
  guard(T.setHandoffSlot(a.id, '2026-10-19T12:00'), 'slot-invalid', 'K-40: a closed day (Mon) is not open');
  guard(T.setHandoffSlot(a.id, '2026-10-23T12:00'), 'slot-invalid', 'K-40: more than 7 days ahead is not open');
  const msgs = S.threadFor('amara').messages.length;
  const p = T.setHandoffSlot(a.id, '2026-10-16T17:30');
  eq([p.ok, a.handoff.slot, a.status, S.threadFor('amara').messages.length], [true, { start: '2026-10-16T17:30' }, 'ready', msgs], 'K-40: picked on the ready order, confirmed at once; no thread line before the hold');
  eq(S.slotText(a.handoff.slot), 'Fri, Oct 16 · 5:30 PM', 'K-40: slotText for a pickup');
  T.chooseReturn(a.id, 'courier');
  eq(a.handoff, null, 'K-40: switching the way back clears the time (a pickup time is not a courier window)');
  guard(T.holdBalance(a.id, 'visa-4242'), 'slot-required', 'K-40: Hold needs a courier window too');
  guard(T.setHandoffSlot(a.id, '2026-10-16T10:00'), 'slot-invalid', 'K-40: no courier window before the collection fits her open hours (10:00 opens, the first window is 10:30)');
  T.setHandoffSlot(a.id, { start: '2026-10-16T17:00' });
  eq(S.courierWindow(a), { from: '2026-10-16T17:00', to: '2026-10-16T17:30', collectAt: '2026-10-16T16:45' }, 'K-40: the window and its collection time');
  eq(S.slotText(a.handoff.slot), 'Fri, Oct 16 · 5:00–5:30 PM', 'K-40: slotText for a window');
  const h = T.holdBalance(a.id, 'visa-4242');
  eq([h.ok, a.handoff.slot.start, a.handoff.heldAt, a.payments.balance.cents], [true, '2026-10-16T17:00', '2026-10-15T17:00', SCENARIOS.courier.balance], 'K-40: the hold keeps the window; the 7-day clock starts at the hold (D-295)');
  guard(T.setHandoffSlot(a.id, '2026-10-16T17:00'), 'no-change', 'K-40: moving to the same window is no change');
  const mv = T.setHandoffSlot(a.id, '2026-10-16T18:00');
  eq([mv.ok, a.handoff.moved.from.start, a.handoff.slot.collectAt, a.payments.balance.cents], [true, '2026-10-16T17:00', '2026-10-16T17:45', SCENARIOS.courier.balance], 'K-40: Sarah moves the window — the old one is kept; 6:00 PM is also peak, so the same quote');
  eq([last().text, last().tailorText], ['You moved your delivery to Fri, Oct 16 · 6:00–6:30 PM', 'Sarah moved her delivery to Fri, Oct 16 · 6:00–6:30 PM'], 'K-40: Amara is told in the thread');
  const off = SCENARIOS.courierQuote.cents - SCENARIOS.courierOffPeak.cents;
  T.setHandoffSlot(a.id, '2026-10-16T12:00');
  eq([a.courier.cents, a.payments.balance.cents, a.payments.balance.state, a.money.payout], [SCENARIOS.courierOffPeak.cents, SCENARIOS.courier.balance - off, 'held', SCENARIOS.seed.payout], 'K-43 (D-299): moving to an off-peak window re-quotes it — the hold drops by the difference; the payout never moves');
  T.setHandoffSlot(a.id, '2026-10-16T18:00');
  eq([a.courier.cents, a.payments.balance.cents], [SCENARIOS.courierQuote.cents, SCENARIOS.courier.balance], 'K-43: back to a peak window — the peak quote again');
  S.setClock('2026-10-16T16:44');
  ok(S.handoffChangeable(a), 'K-40: movable until 60 min before the collection');
  S.setClock('2026-10-16T16:45');
  ok(!S.handoffChangeable(a), 'K-40 (D-295): fixed from 60 min before the collection');
  guard(T.setHandoffSlot(a.id, '2026-10-16T18:30'), 'too-late', 'K-40: too late to move the courier');
  // pickup: before the slot, not during it, again once it was missed (no fee, the clock keeps running)
  S.reset(); a = driveTo('awaiting-handoff');
  eq([a.handoff.slot.start, a.handoff.moved], ['2026-10-16T17:30', null], 'K-40: driveTo picks Fri 5:30 PM through setHandoffSlot');
  ok(S.handoffChangeable(a) && !S.handoffMissed(a), 'K-40: before the slot she can move it');
  ok(S.openSlots('amara', 'shop').includes('2026-10-16T17:30'), 'K-40 (D-295): a pickup does not block the tailor’s calendar');
  S.setClock('2026-10-16T17:40');
  ok(!S.handoffChangeable(a) && !S.handoffMissed(a), 'K-40: during the slot it is neither movable nor missed');
  guard(T.setHandoffSlot(a.id, '2026-10-17T14:00'), 'too-late', 'K-40: no move once the slot started');
  S.setClock('2026-10-16T18:00');
  ok(S.handoffMissed(a) && S.handoffChangeable(a), 'K-40 (D-295): a missed pickup — she picks a new time');
  eq([a.payments.balance.state, a.status], ['held', 'awaiting-handoff'], 'K-40 (D-295): a missed pickup costs nothing');
  const unclaimed = S.unclaimedAt(a);
  const np = T.setHandoffSlot(a.id, '2026-10-17T14:00');
  eq([np.ok, S.handoffMissed(a), a.handoff.moved.from.start, S.unclaimedAt(a)], [true, false, '2026-10-16T17:30', unclaimed], 'K-40: the new time; the 7-day clock still runs from the hold');
  T.markHandedOver(a.id);
  guard(T.setHandoffSlot(a.id, '2026-10-20T12:00'), 'already-marked', 'K-40: nothing to move once Amara marked it picked up');
  guard(T.setHandoffSlot(driveTo('in-progress').id, '2026-10-16T17:30'), 'not-ready', 'K-40: no handoff time before Ready');
  // a tailor without a shop: no pickup; the courier collects from her home in her home-visit hours
  S.reset(); a = driveTo('ready'); amara().shop.enabled = false;
  eq(S.handoffSlots(a, 'pickup'), [], 'K-37 / D-295: no pickup without a shop');
  const hw = S.handoffSlots(a, 'courier');
  eq([hw[0].start, hw[0].collectAt], ['2026-10-15T18:30', '2026-10-15T18:15'], 'D-295: home-only — courier windows from her home-visit hours (same day while she is open)');
  amara().shop.enabled = true;
}

section('K-41 (R3): the 24-hour reminder');
{
  const H = 3600000;
  eq([POLICY.REMINDER_LEAD_H, POLICY.REMINDER_NUDGE_H, POLICY.REMINDER_AUTOCANCEL_H], [2, 6, 3], 'K-41 + K-43: the reminder goes out 2 h before the free window closes; one nudge 6 h before the visit; unconfirmed 3 h before → cancelled');
  S.reset();
  let a = driveTo('confirmed');
  eq([a.reminder, S.reminderState(a), S.reminderEligible(a)], [{ sentAt: null, confirmedAt: null, nudgedAt: null }, null, true], 'K-41: a fresh booking — nothing sent, eligible (booked 55 h ahead)');
  eq(D.isoMinute(new Date(S.reminderAt(a))), '2026-10-14T15:00', 'K-41: the reminder time = 26 h before Thu 5:00 PM');
  guard(T.confirmVisit(a.id), 'not-asked', 'K-41: nothing to confirm before the reminder');
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000) - 1);
  eq(a.reminder.sentAt, null, 'K-41: not sent a minute early');
  const moved = S.advanceClock(1).expired;
  eq([a.reminder.sentAt, moved, S.reminderState(a), S.reminderDue(a), S.visitReminder()?.id], ['2026-10-14T15:00', [a.id], 'asked', true, a.id], 'K-41: tick() sends it at 26 h — her move');
  eq([statusWord(a, 'customer').label, statusWord(a, 'tailor').label], ['Your move', 'Not confirmed yet'], 'K-41: the words while asked');
  eq(M.cancelTerms(a, S.now()), { window: 'early', refund: 1600, kept: 0 }, 'K-41: still free at the reminder (26 h ahead)');
  S.advanceClock(12);
  const c = T.confirmVisit(a.id);
  eq([c.ok, a.reminder.confirmedAt, S.reminderState(a), S.reminderDue(a), a.status], [true, '2026-10-14T15:12', 'confirmed', false, 'confirmed'], 'K-41: confirmVisit stamps confirmedAt, no new status');
  guard(T.confirmVisit(a.id), 'already-confirmed', 'K-41: confirm once');
  eq(M.cancelTerms(a, S.now()), { window: 'late', refund: 0, kept: 1600, confirmed: true }, 'K-41: confirming closes the free window early (25 h ahead → the deposit is kept)');
  eq(M.cancelTerms({ ...a, reminder: { ...a.reminder } }, D.toDate('2026-10-14T15:11').getTime()).window, 'early', 'K-41: before the confirm it was still early');
  guard(T.rescheduleBooking(a.id, S.openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id })[0]), 'too-late', 'K-41: no free reschedule once confirmed');
  eq([statusWord(a, 'customer').label, statusWord(a, 'tailor').label, statusWord(a, 'tailor').pill], ['All set', 'Sarah confirmed', 'completed'], 'K-41: the words once confirmed');
  S.advanceClock(23 * 60);
  eq(a.reminder.nudgedAt, null, 'K-41: no nudge for a confirmed visit');
  // a cancel after confirming keeps the deposit (paid to the tailor, D-05)
  S.reset(); a = driveTo('confirmed');
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000) + 12);
  T.confirmVisit(a.id);
  const cx = T.cancelBooking(a.id);
  eq([cx.ok, a.cancel.reason, a.cancel.kept, a.cancel.tailorPaid, a.payments.deposit.state], [true, 'customer-late', 1600, 1600, 'kept'], 'K-41: cancelled after confirming, 25 h ahead — Amara keeps the $16.00 deposit');
  // the tailor cancelling a confirmed visit 25 h ahead is not "late" (that is the 24 h, not Sarah's confirm)
  S.reset(); a = driveTo('confirmed');
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000) + 12);
  T.confirmVisit(a.id);
  T.tailorCantMakeIt(a.id, 'x');
  eq([a.cancel.late, a.cancel.refund], [false, 1600], 'K-41: a tailor cancel after Sarah confirmed, 25 h ahead, is not late; refunded in full');
  // no answer: the visit stays booked, one nudge 6 h before (K-43), the 24 h rule
  S.reset(); a = driveTo('confirmed');
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000));
  S.advanceClock(2 * 60);
  eq([S.reminderState(a), M.cancelTerms(a, S.now()).window], ['asked', 'early'], 'K-41: exactly 24 h ahead is still free (inclusive, M6-M-11)');
  S.advanceClock(1);
  eq([S.reminderState(a), a.status, M.cancelTerms(a, S.now()).window, 'confirmed' in M.cancelTerms(a, S.now())], ['missed', 'confirmed', 'late', false], 'K-41: unanswered at 24 h — still booked, the plain 24 h rule');
  eq([statusWord(a, 'customer').label, statusWord(a, 'tailor').label], ['Your move', 'Not confirmed'], 'K-41: the words when missed');
  S.advanceClock(18 * 60 - 2);
  eq(a.reminder.nudgedAt, null, 'K-43: no nudge before 6 h');
  S.advanceClock(1);
  eq(a.reminder.nudgedAt, '2026-10-15T11:00', 'K-43: one nudge 6 h before the visit (was 3 h)');
  ok(T.confirmVisit(a.id).ok && S.reminderState(a) === 'confirmed', 'K-41: Confirm still works after 24 h (it keeps the visit)');
  S.advanceClock(4 * 60);
  eq([a.status, a.cancel], ['confirmed', null], 'K-43: a visit confirmed after the nudge is not cancelled at 3 h');
  S.setClock('2026-10-15T17:15');
  eq([S.reminderState(a), T.markNoShow(a.id).ok, a.cancel.tailorPaid], [null, true, 2500], 'K-41: at the visit the reminder is over; the no-show rule is unchanged ($25.00)');
  S.reset(); a = driveTo('confirmed');
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000) + 30);
  S.setClock('2026-10-15T17:00');
  guard(T.confirmVisit(a.id), 'visit-started', 'K-41: no confirm once the visit started');
  guard(T.confirmVisit(driveTo('in-progress').id), 'not-confirmed', 'K-41: only a confirmed visit');
  // K-43 (D-300): asked, never confirmed, 3 h before → cancelled by tick(); the customer late-cancel money (the deposit is kept, paid to Amara)
  S.reset(); a = driveTo('confirmed');
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000));
  const garments = state.job.garments.length;
  S.advanceClock(Math.round((S.autoCancelAt(a) - S.now()) / 60000) - 1);
  eq([a.status, S.reminderState(a), a.reminder.nudgedAt], ['confirmed', 'missed', '2026-10-15T11:00'], 'K-43: a minute before 3 h — still booked, nudged at 6 h');
  const ac = S.advanceClock(1).expired;
  eq([ac, a.status, a.cancel], [[a.id], 'cancelled', { by: 'system', reason: 'unconfirmed', at: '2026-10-15T14:00', refund: 0, kept: 1600, tailorPaid: 1600 }], 'K-43: at 3 h tick() cancels it — reason unconfirmed, stamped 2:00 PM, Amara keeps the $16.00 deposit');
  eq([a.payments.deposit.state, state.payouts.map(({ createdAt, ...p }) => p)], ['kept', [{ apptId: a.id, cents: 1600, state: 'pending', date: '2026-10-16', kind: 'kept-deposit' }]], 'K-43: the kept deposit is a pending payout (D-05: no Taily fee), the Friday after');
  eq([garments, state.job.garments.length], [0, 2], 'K-43: the draft order comes back so she can rebook');
  const lastMsg = S.threadFor('amara').messages.at(-1);
  eq([lastMsg.text, lastMsg.tailorText].map((x) => x.replace(/\s/g, ' ')), ['We cancelled the visit because you didn’t confirm by 2:00 PM', 'We cancelled the visit because Sarah didn’t confirm by 2:00 PM'], 'K-43: both threads say why');
  eq([statusWord(a, 'customer').label, statusWord(a, 'tailor').label, S.reminderState(a)], ['Cancelled', 'Cancelled', null], 'K-43: both sides read Cancelled');
  eq(S.advanceClock(60).expired, [], 'K-43: cancelled once');
  // a confirmed visit is untouched at 3 h; a visit never asked (booked < 26 h ahead) is never auto-cancelled
  S.reset(); a = driveTo('confirmed');
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000) + 12);
  T.confirmVisit(a.id);
  S.advanceClock(Math.round((S.autoCancelAt(a) - S.now()) / 60000) + 30);
  eq([a.status, a.reminder.nudgedAt, a.cancel], ['confirmed', null, null], 'K-43: a confirmed visit is untouched at 3 h (no nudge either)');
  // a jump from the reminder past the visit still cancels it at its own time (and stamps the nudge at its time)
  S.reset(); a = driveTo('confirmed');
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000));
  S.advanceClock(48 * 60);
  eq([a.status, a.cancel.reason, a.cancel.at, a.reminder.nudgedAt], ['cancelled', 'unconfirmed', '2026-10-15T14:00', '2026-10-15T11:00'], 'K-43: +48 h from the reminder — cancelled at 2:00 PM, nudged at 11:00 AM');
  // a clock jump past the visit sends nothing
  S.reset(); a = driveTo('confirmed');
  S.advanceClock(56 * 60);
  eq([a.reminder.sentAt, a.reminder.nudgedAt], [null, null], 'K-41: a jump past the start sends nothing');
  // booked less than 26 h ahead: no prompt, the plain 24 h rule
  S.reset(); S.setClock('2026-10-14T16:00');
  const slot = S.nextOpening('amara', 'home', { until: state.job.needBy });
  const late = T.requestBooking({ tailorId: 'amara', slotStart: slot, cardId: 'visa-4242' }).appt;
  T.tailorAccept(late.id);
  ok((D.toDate(slot).getTime() - S.now()) < 26 * H && !S.reminderEligible(late), 'K-41: booked < 26 h ahead — no reminder');
  S.advanceClock(Math.round((D.toDate(slot).getTime() - S.now()) / 60000) - 60);
  eq([late.reminder.sentAt, late.reminder.nudgedAt, S.reminderState(late), late.status], [null, null, null, 'confirmed'], 'K-41: … and no nudge either; K-43: never asked, so never auto-cancelled');
  // rescheduling from the prompt: the new time gets its own reminder, or none when < 26 h out
  S.reset(); a = driveTo('confirmed');
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000));
  const open = S.openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id });
  const far = open.find((x) => D.toDate(x).getTime() - S.now() > 48 * H);
  ok(T.rescheduleBooking(a.id, far).ok, 'K-41: Reschedule from the prompt (inside the free window)');
  eq([a.reminder, S.reminderEligible(a)], [{ sentAt: null, confirmedAt: null, nudgedAt: null }, true], 'K-41: the new time starts a fresh reminder');
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000));
  eq(a.reminder.sentAt, D.isoMinute(new Date(S.reminderAt(a))), 'K-41: its reminder goes out 26 h before the new time');
  S.reset(); a = driveTo('confirmed');
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000) + 60);   // Wed 4:00 PM, still free
  const near = S.openSlots(a.tailorId, a.job.visitType, { until: a.job.needBy, exclude: a.id }).find((x) => x !== a.slot.start && D.toDate(x).getTime() - S.now() < 26 * H);
  ok(near && T.rescheduleBooking(a.id, near).ok, 'K-41: moved to a time < 26 h out');
  S.advanceClock(Math.round((D.toDate(near).getTime() - S.now()) / 60000) - 30);
  eq([a.reminder.sentAt, S.reminderState(a), M.cancelTerms(a, S.now()).window], [null, null, 'late'], 'K-41: no second prompt; the plain 24 h rule');
  // a shop visit gets the same prompt and rule
  S.reset(); T.setJob({ visitType: 'shop' });
  const shopSlot = S.openSlots('amara', 'shop', { until: state.job.needBy }).find((x) => D.toDate(x).getTime() - S.now() > 30 * H);
  a = T.requestBooking({ tailorId: 'amara', slotStart: shopSlot, cardId: 'visa-4242' }).appt; T.tailorAccept(a.id);
  S.advanceClock(Math.round((S.reminderAt(a) - S.now()) / 60000));
  eq([S.reminderState(a), a.job.visitType], ['asked', 'shop'], 'K-41: a shop visit gets the prompt too');
}

console.log(`\n${failed ? 'FAIL' : 'PASS'}  model test: ${pass} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
