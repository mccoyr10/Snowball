import { Timestamp } from "firebase/firestore";

export type SubscriptionStatus = "incomplete" | "trialing" | "active" | "past_due" | "canceled";

export interface UserDoc {
  email: string;
  displayName: string;
  householdId: string;
  createdAt: Timestamp;
  subscriptionStatus?: SubscriptionStatus;
  trialStartedAt?: Timestamp;
  stripeCustomerId?: string;
  lifetimeAccess?: boolean;
  extendedTrialEndsAt?: Timestamp;
  accessGrantedVia?: string;
}

export interface DiscountCode {
  type: "lifetime" | "extended_trial";
  trialDays?: number;
  maxUses: number | null;
  currentUses: number;
  expiresAt: Timestamp | null;
  isActive: boolean;
  purpose: string;
  createdAt: Timestamp;
}

export interface Household {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  inviteCode?: string;
  createdAt: Timestamp;
}

export interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  startingBalance: number;
  createdAt: Timestamp;
}

export interface Strategy {
  monthlyBudget: number;
  method: "snowball" | "avalanche";
  startDate: string;
  updatedAt: Timestamp;
}

export interface Actual {
  id: string;
  month: string;
  amount: number;
  debtId?: string;
  createdAt: Timestamp;
}

export interface Payment {
  id: string;
  month: string;
  amount: number;
  createdAt: Timestamp;
}

export interface LegacyData {
  debts: { id: string; name: string; balance: number; apr: number; minPayment: number }[];
  settings: { monthlyBudget: number; startDate: string };
  actuals: { id: string; month: string; amount: number }[];
}
