import { Timestamp } from "firebase/firestore";

export interface UserDoc {
  email: string;
  displayName: string;
  householdId: string;
  createdAt: Timestamp;
}

export interface Household {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt: Timestamp;
}

export interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number;   // APR as a percentage e.g. 4.69
  minimumPayment: number;
  startingBalance: number;
  createdAt: Timestamp;
}

export interface Strategy {
  monthlyBudget: number;
  method: "snowball" | "avalanche";
  startDate: string; // "YYYY-MM"
  updatedAt: Timestamp;
}

export interface Actual {
  id: string;
  month: string; // "YYYY-MM"
  amount: number;
  debtId?: string; // undefined for legacy total-only actuals
  createdAt: Timestamp;
}

// Shape of data inside the legacy snowball/appdata document
export interface LegacyData {
  debts: { id: string; name: string; balance: number; apr: number; minPayment: number }[];
  settings: { monthlyBudget: number; startDate: string };
  actuals: { id: string; month: string; amount: number }[];
}
