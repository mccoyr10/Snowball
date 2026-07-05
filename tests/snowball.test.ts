// Unit tests for the pure debt-snowball engine.
// Run with: npm test   (node --test --experimental-strip-types)

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  r2,
  nextMonth,
  prevMonth,
  isValidYYYYMM,
  buildSnowballSchedule,
  calculateSummary,
  allocatePaymentsToDebts,
  allocateToBalances,
  type UIDebt,
  type UISettings,
} from "../src/lib/snowball.ts";

// ── Utilities ───────────────────────────────────────────────────────────────

test("r2 rounds to two decimal places", () => {
  assert.equal(r2(1.006), 1.01);
  assert.equal(r2(1.004), 1.0);
  assert.equal(r2(166.9911), 166.99);
  assert.equal(r2(166.9911 + 0), 166.99);
  assert.equal(r2(0), 0);
});

test("nextMonth / prevMonth handle year boundaries", () => {
  assert.equal(nextMonth("2026-01"), "2026-02");
  assert.equal(nextMonth("2026-12"), "2027-01");
  assert.equal(prevMonth("2026-01"), "2025-12");
  assert.equal(prevMonth("2026-03"), "2026-02");
});

test("isValidYYYYMM validates format", () => {
  assert.equal(isValidYYYYMM("2026-06"), true);
  assert.equal(isValidYYYYMM("2026-6"), false);
  assert.equal(isValidYYYYMM("June"), false);
  assert.equal(isValidYYYYMM(202606), false);
  assert.equal(isValidYYYYMM(null), false);
});

// ── buildSnowballSchedule ─────────────────────────────────────────────────────

const settings = (over: Partial<UISettings> = {}): UISettings => ({
  monthlyBudget: 100,
  startDate: "2026-01",
  ...over,
});

test("single 0% debt pays off in exactly balance/payment months", () => {
  const debts: UIDebt[] = [
    { id: "a", name: "A", balance: 1000, apr: 0, minPayment: 100, startingBalance: 1000 },
  ];
  const sched = buildSnowballSchedule(debts, settings({ monthlyBudget: 100 }));
  assert.equal(sched.length, 10);
  assert.equal(sched[0].month, "2026-01");
  assert.equal(sched[0].debtSnapshots[0].closingBalance, 900);
  assert.equal(sched[9].debtSnapshots[0].closingBalance, 0);
});

test("monthly interest is APR/12 on the opening balance", () => {
  const debts: UIDebt[] = [
    { id: "t", name: "Truck", balance: 21805, apr: 9.19, minPayment: 706.77, startingBalance: 43500 },
  ];
  const sched = buildSnowballSchedule(debts, settings({ monthlyBudget: 706.77 }));
  // 21805 * (9.19/100/12) = 166.9911... -> 166.99
  assert.equal(sched[0].debtSnapshots[0].interestCharge, 166.99);
});

test("returns empty schedule when budget cannot cover minimum payments", () => {
  const debts: UIDebt[] = [
    { id: "a", name: "A", balance: 1000, apr: 10, minPayment: 100, startingBalance: 1000 },
  ];
  assert.deepEqual(buildSnowballSchedule(debts, settings({ monthlyBudget: 50 })), []);
  assert.deepEqual(buildSnowballSchedule(debts, settings({ monthlyBudget: 0 })), []);
});

test("snowball targets the lowest balance and applies extra to it first", () => {
  const debts: UIDebt[] = [
    { id: "small", name: "Small", balance: 200, apr: 0, minPayment: 50, startingBalance: 200 },
    { id: "big", name: "Big", balance: 1000, apr: 0, minPayment: 50, startingBalance: 1000 },
  ];
  // budget 200, minimums 100, so 100 extra to the smallest debt
  const sched = buildSnowballSchedule(debts, settings({ monthlyBudget: 200 }));
  const m1 = sched[0];
  assert.equal(m1.snowballTarget, "small");
  const small = m1.debtSnapshots.find(s => s.debtId === "small")!;
  const big = m1.debtSnapshots.find(s => s.debtId === "big")!;
  assert.equal(small.payment, 150); // 50 min + 100 extra
  assert.equal(small.closingBalance, 50);
  assert.equal(big.payment, 50);
  assert.equal(big.closingBalance, 950);
});

// ── calculateSummary ──────────────────────────────────────────────────────────

test("summary reports totals, payoff dates, and non-negative interest savings", () => {
  const debts: UIDebt[] = [
    { id: "small", name: "Small", balance: 200, apr: 12, minPayment: 50, startingBalance: 200 },
    { id: "big", name: "Big", balance: 1000, apr: 12, minPayment: 50, startingBalance: 1000 },
  ];
  const s = settings({ monthlyBudget: 300 });
  const sched = buildSnowballSchedule(debts, s);
  const summary = calculateSummary(debts, sched, s);

  assert.equal(summary.totalBalance, 1200);
  assert.equal(summary.totalMinPayments, 100);
  assert.equal(summary.snowballExtra, 200);
  assert.equal(summary.monthsRemaining, sched.length);
  assert.equal(summary.projectedPayoffDate, sched[sched.length - 1].month);
  // Smallest debt is cleared no later than the largest.
  assert.ok(summary.debtPayoffDates["small"] <= summary.debtPayoffDates["big"]);
  // Paying more than the minimum never costs more interest than minimum-only.
  assert.ok(summary.savingsVsMinOnly >= 0);
});

// ── allocatePaymentsToDebts ───────────────────────────────────────────────────

test("extra payments are allocated to the lowest opening balance first", () => {
  const debts: UIDebt[] = [
    { id: "small", name: "Small", balance: 200, apr: 0, minPayment: 50, startingBalance: 200 },
    { id: "big", name: "Big", balance: 1000, apr: 0, minPayment: 50, startingBalance: 1000 },
  ];
  const s = settings({ monthlyBudget: 100 });
  const sched = buildSnowballSchedule(debts, s);
  const allocations = allocatePaymentsToDebts(
    [{ id: "p1", month: "2026-01", amount: 75 }],
    sched,
    debts,
  );
  // All $75 of extra should land on the smallest debt for that month.
  const total = allocations.reduce((sum, a) => sum + a.amount, 0);
  assert.equal(total, 75);
  assert.equal(allocations[0].debtId, "small");
});

test("no payments produces no allocations", () => {
  const debts: UIDebt[] = [
    { id: "a", name: "A", balance: 1000, apr: 0, minPayment: 100, startingBalance: 1000 },
  ];
  const sched = buildSnowballSchedule(debts, settings());
  assert.deepEqual(allocatePaymentsToDebts([], sched, debts), []);
});

// ── allocateToBalances (running-ledger payment split) ─────────────────────────

test("allocateToBalances fills the smallest balance first", () => {
  const debts = [
    { id: "big", balance: 1000 },
    { id: "small", balance: 200 },
  ];
  assert.deepEqual(allocateToBalances(150, debts), { small: 150 });
});

test("allocateToBalances spills into the next debt once the smallest is cleared", () => {
  const debts = [
    { id: "small", balance: 200 },
    { id: "big", balance: 1000 },
  ];
  // 200 clears "small" exactly, remaining 50 lands on "big"
  assert.deepEqual(allocateToBalances(250, debts), { small: 200, big: 50 });
});

test("allocateToBalances never allocates more than the total owed", () => {
  const debts = [
    { id: "a", balance: 100 },
    { id: "b", balance: 50 },
  ];
  const alloc = allocateToBalances(500, debts);
  assert.deepEqual(alloc, { a: 100, b: 50 });
  const total = Object.values(alloc).reduce((s, x) => s + x, 0);
  assert.equal(total, 150); // overpayment beyond total debt is dropped
});

test("allocateToBalances ignores debts that are already paid off", () => {
  const debts = [
    { id: "paid", balance: 0 },
    { id: "open", balance: 300 },
  ];
  assert.deepEqual(allocateToBalances(100, debts), { open: 100 });
});
