import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserDoc, Household, Debt, Strategy, Actual, Payment, LegacyData } from "@/types";

// ─── User documents ───────────────────────────────────────────────────────────

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function createUserDoc(
  uid: string,
  email: string,
  displayName: string,
  householdId: string
): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    email,
    displayName,
    householdId,
    subscriptionStatus: "incomplete",
    createdAt: serverTimestamp(),
  });
}

export async function setSubscriptionStatus(
  uid: string,
  status: import("@/types").SubscriptionStatus,
  stripeCustomerId?: string
): Promise<void> {
  const data: Record<string, unknown> = { subscriptionStatus: status };
  if (stripeCustomerId) data.stripeCustomerId = stripeCustomerId;
  await updateDoc(doc(db, "users", uid), data);
}

// ─── Households ───────────────────────────────────────────────────────────────

export async function createHousehold(
  ownerId: string,
  name: string
): Promise<string> {
  const ref = await addDoc(collection(db, "households"), {
    name,
    ownerId,
    memberIds: [ownerId],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const snap = await getDoc(doc(db, "households", householdId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Household) : null;
}

// ─── Debts ────────────────────────────────────────────────────────────────────

export function subscribeDebts(
  householdId: string,
  cb: (debts: Debt[]) => void
): () => void {
  const q = query(
    collection(db, "households", householdId, "debts"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Debt)));
  });
}

export async function addDebt(
  householdId: string,
  data: Omit<Debt, "id" | "createdAt">
): Promise<void> {
  await addDoc(collection(db, "households", householdId, "debts"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateDebt(
  householdId: string,
  debtId: string,
  data: Partial<Omit<Debt, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "households", householdId, "debts", debtId), data);
}

export async function deleteDebt(householdId: string, debtId: string): Promise<void> {
  await deleteDoc(doc(db, "households", householdId, "debts", debtId));
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

export function subscribeStrategy(
  householdId: string,
  cb: (strategy: Strategy | null) => void
): () => void {
  return onSnapshot(
    doc(db, "households", householdId, "settings", "strategy"),
    (snap) => {
      cb(snap.exists() ? (snap.data() as Strategy) : null);
    }
  );
}

export async function setStrategy(
  householdId: string,
  data: Omit<Strategy, "updatedAt">
): Promise<void> {
  await setDoc(doc(db, "households", householdId, "settings", "strategy"), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ─── Actuals ──────────────────────────────────────────────────────────────────

export function subscribeActuals(
  householdId: string,
  cb: (actuals: Actual[]) => void
): () => void {
  const q = query(
    collection(db, "households", householdId, "actuals"),
    orderBy("month", "asc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Actual)));
  });
}

export async function setActual(
  householdId: string,
  month: string,
  debtId: string,
  amount: number
): Promise<void> {
  await setDoc(
    doc(db, "households", householdId, "actuals", `${month}_${debtId}`),
    { month, debtId, amount, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteActual(
  householdId: string,
  month: string,
  debtId: string
): Promise<void> {
  await deleteDoc(doc(db, "households", householdId, "actuals", `${month}_${debtId}`));
}

// ─── Payments (auto-allocated to snowball order) ──────────────────────────────

export function subscribePayments(
  householdId: string,
  cb: (payments: Payment[]) => void
): () => void {
  const q = query(
    collection(db, "households", householdId, "payments"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)));
  });
}

export async function addPayment(
  householdId: string,
  month: string,
  amount: number
): Promise<string> {
  const ref = await addDoc(collection(db, "households", householdId, "payments"), {
    month,
    amount,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePayment(
  householdId: string,
  id: string,
  amount: number
): Promise<void> {
  await updateDoc(doc(db, "households", householdId, "payments", id), { amount });
}

export async function deletePayment(householdId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, "households", householdId, "payments", id));
}

// ─── Household invite / join ──────────────────────────────────────────────────

function randomInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function generateInviteCode(householdId: string, uid: string): Promise<string> {
  const code = randomInviteCode();
  await setDoc(doc(db, "inviteCodes", code), {
    householdId,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "households", householdId), { inviteCode: code });
  return code;
}

export async function lookupInviteCode(code: string): Promise<{ householdId: string } | null> {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 8 || !/^[A-Z2-9]{8}$/.test(normalized)) return null;
  const snap = await getDoc(doc(db, "inviteCodes", normalized));
  if (!snap.exists()) return null;
  return { householdId: snap.data().householdId as string };
}

export async function joinHousehold(uid: string, householdId: string): Promise<void> {
  await updateDoc(doc(db, "households", householdId), {
    memberIds: arrayUnion(uid),
  });
  await updateDoc(doc(db, "users", uid), { householdId });
}

// ─── Legacy migration ─────────────────────────────────────────────────────────

export async function readLegacyData(): Promise<LegacyData | null> {
  const snap = await getDoc(doc(db, "snowball", "appdata"));
  if (!snap.exists()) return null;
  const raw = snap.data();
  if (typeof raw.data === "string") {
    try {
      return JSON.parse(raw.data) as LegacyData;
    } catch {
      return null;
    }
  }
  if (raw.debts) return raw as LegacyData;
  return null;
}

export async function migrateLegacyData(
  householdId: string,
  legacy: LegacyData
): Promise<void> {
  for (const d of legacy.debts) {
    await addDoc(collection(db, "households", householdId, "debts"), {
      name: d.name,
      balance: d.balance,
      interestRate: d.apr,
      minimumPayment: d.minPayment,
      startingBalance: d.balance,
      createdAt: serverTimestamp(),
    });
  }
  await setDoc(doc(db, "households", householdId, "settings", "strategy"), {
    monthlyBudget: legacy.settings.monthlyBudget,
    method: "snowball",
    startDate: legacy.settings.startDate,
    updatedAt: serverTimestamp(),
  });
  for (const a of legacy.actuals) {
    await addDoc(collection(db, "households", householdId, "actuals"), {
      month: a.month,
      amount: a.amount,
      createdAt: serverTimestamp(),
    });
  }
}
