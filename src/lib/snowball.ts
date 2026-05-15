// Pure utility and algorithm functions — no React, no Firebase dependencies.

export interface UIDebt {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minPayment: number;
}

export interface UISettings {
  monthlyBudget: number;
  startDate: string;
}

export interface UIActual {
  id: string;
  month: string;
  debtId: string;
  amount: number;
}

export interface DebtSnapshot {
  debtId: string;
  openingBalance: number;
  interestCharge: number;
  payment: number;
  closingBalance: number;
}

export interface ScheduleEntry {
  month: string;
  snowballTarget: string;
  debtSnapshots: DebtSnapshot[];
}

export interface Summary {
  totalBalance: number;
  totalMinPayments: number;
  snowballExtra: number;
  projectedPayoffDate: string | null;
  monthsRemaining: number;
  totalInterestPlanned: number;
  interestIfMinOnly: number;
  savingsVsMinOnly: number;
  debtPayoffDates: Record<string, string>;
  debtInterestTotals: Record<string, number>;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatCurrency(n: number | undefined): string {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function todayYYYYMM(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

export function nextMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return m === 12 ? y + 1 + "-01" : y + "-" + String(m + 1).padStart(2, "0");
}

export function prevMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return m === 1 ? y - 1 + "-12" : y + "-" + String(m - 1).padStart(2, "0");
}

export function formatMonth(yyyymm: string | null | undefined): string {
  if (!yyyymm) return "—";
  const [y, m] = yyyymm.split("-").map(Number);
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[m - 1] + " " + y;
}

export function isValidYYYYMM(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}$/.test(s);
}

// ── Core Algorithm ─────────────────────────────────────────────────────────────

// monthlyOverrides: extra amounts on top of base budget for specific months, keyed by YYYY-MM
export function buildSnowballSchedule(
  debts: UIDebt[],
  settings: UISettings,
  monthlyOverrides?: Record<string, number>
): ScheduleEntry[] {
  if (!debts || debts.length === 0) return [];
  const baseBudget = Number(settings.monthlyBudget) || 0;
  if (baseBudget === 0) return [];
  const totalMin = debts.reduce((s, d) => s + Number(d.minPayment), 0);
  if (baseBudget < totalMin) return [];

  let working = debts.map(d => ({ ...d, balance: Number(d.balance) }))
                     .sort((a, b) => a.balance - b.balance);

  const schedule: ScheduleEntry[] = [];
  let month = settings.startDate || todayYYYYMM();
  const MAX = 600;

  for (let i = 0; i < MAX; i++) {
    const active = working.filter(d => d.balance > 0);
    if (active.length === 0) break;

    const snapshots: DebtSnapshot[] = [];
    const budget = r2(baseBudget + (monthlyOverrides?.[month] ?? 0));
    let remaining = budget;
    const snowballId = active[0].id;

    for (const debt of working) {
      if (debt.balance <= 0) {
        snapshots.push({ debtId: debt.id, openingBalance: 0, interestCharge: 0, payment: 0, closingBalance: 0 });
        continue;
      }
      const rate = Number(debt.apr) / 100 / 12;
      const interest = r2(debt.balance * rate);
      const balAfterInterest = r2(debt.balance + interest);
      const minPay = r2(Math.min(Number(debt.minPayment), balAfterInterest));
      debt.balance = r2(balAfterInterest - minPay);
      remaining = r2(remaining - minPay);
      snapshots.push({ debtId: debt.id, openingBalance: r2(debt.balance + minPay - interest), interestCharge: interest, payment: minPay, closingBalance: debt.balance });
    }

    const target = working.find(d => d.id === snowballId);
    if (target && remaining > 0 && target.balance > 0) {
      const extra = r2(Math.min(remaining, target.balance));
      target.balance = r2(target.balance - extra);
      const snap = snapshots.find(s => s.debtId === snowballId);
      if (snap) { snap.payment = r2(snap.payment + extra); snap.closingBalance = target.balance; }
    }

    working.forEach(d => { if (d.balance < 0.005) d.balance = 0; });
    snapshots.forEach(s => { if (s.closingBalance < 0.005) s.closingBalance = 0; });

    schedule.push({ month, snowballTarget: snowballId, debtSnapshots: snapshots });
    month = nextMonth(month);
  }
  return schedule;
}

export function runMinOnlySchedule(debts: UIDebt[], settings: UISettings): ScheduleEntry[] {
  if (!debts || debts.length === 0) return [];
  const totalMin = debts.reduce((s, d) => s + Number(d.minPayment), 0);
  return buildSnowballSchedule(debts, { ...settings, monthlyBudget: totalMin });
}

export function computeActualAdjustedDebts(
  debts: UIDebt[],
  schedule: ScheduleEntry[],
  actualPayments: UIActual[]
): { adjustedDebts: UIDebt[]; lastActualMonth: string | null } {
  if (!actualPayments || !actualPayments.length) return { adjustedDebts: debts, lastActualMonth: null };

  const validActuals = actualPayments.filter(a => isValidYYYYMM(a.month));
  if (!validActuals.length) return { adjustedDebts: debts, lastActualMonth: null };

  const monthsWithActuals = [...new Set(validActuals.map(a => a.month))].sort();
  const lastActualMonth = monthsWithActuals[monthsWithActuals.length - 1];
  if (!isValidYYYYMM(lastActualMonth)) return { adjustedDebts: debts, lastActualMonth: null };

  const working = debts.map(d => ({ ...d, balance: Number(d.balance) }));

  for (const snap of schedule) {
    if (!isValidYYYYMM(snap.month)) continue;
    if (snap.month > lastActualMonth) break;
    for (const debt of working) {
      if (debt.balance <= 0) continue;
      const rate = Number(debt.apr) / 100 / 12;
      debt.balance = r2(debt.balance + debt.balance * rate);
      const actual = validActuals.find(a => a.month === snap.month && a.debtId === debt.id);
      const ds = snap.debtSnapshots.find(s => s.debtId === debt.id);
      const payment = actual != null ? Number(actual.amount) : (ds ? ds.payment : 0);
      debt.balance = r2(Math.max(0, debt.balance - payment));
      if (debt.balance < 0.005) debt.balance = 0;
    }
  }

  const adjustedDebts = working.map(w => ({
    ...debts.find(d => d.id === w.id)!,
    balance: w.balance,
  }));
  return { adjustedDebts, lastActualMonth };
}

export function calculateSummary(
  debts: UIDebt[],
  schedule: ScheduleEntry[],
  settings: UISettings
): Summary {
  const totalBalance = r2(debts.reduce((s, d) => s + Number(d.balance), 0));
  const totalMinPayments = r2(debts.reduce((s, d) => s + Number(d.minPayment), 0));
  const monthlyBudget = Number(settings.monthlyBudget) || 0;
  const snowballExtra = r2(monthlyBudget - totalMinPayments);
  const projectedPayoffDate = schedule.length > 0 ? schedule[schedule.length - 1].month : null;
  const monthsRemaining = schedule.length;

  let totalInterestPlanned = 0;
  const debtPayoffDates: Record<string, string> = {};
  const debtInterestTotals: Record<string, number> = {};
  debts.forEach(d => { debtInterestTotals[d.id] = 0; });

  schedule.forEach(snap => {
    snap.debtSnapshots.forEach(ds => {
      totalInterestPlanned += ds.interestCharge;
      debtInterestTotals[ds.debtId] = r2((debtInterestTotals[ds.debtId] || 0) + ds.interestCharge);
      if (ds.closingBalance === 0 && !debtPayoffDates[ds.debtId] && ds.openingBalance > 0) {
        debtPayoffDates[ds.debtId] = snap.month;
      }
    });
  });

  const minOnlySched = runMinOnlySchedule(debts, settings);
  let interestIfMinOnly = 0;
  minOnlySched.forEach(snap => snap.debtSnapshots.forEach(ds => { interestIfMinOnly += ds.interestCharge; }));
  interestIfMinOnly = r2(interestIfMinOnly);
  const savingsVsMinOnly = r2(interestIfMinOnly - totalInterestPlanned);

  return {
    totalBalance, totalMinPayments, snowballExtra, projectedPayoffDate,
    monthsRemaining, totalInterestPlanned: r2(totalInterestPlanned),
    interestIfMinOnly, savingsVsMinOnly, debtPayoffDates, debtInterestTotals,
  };
}
