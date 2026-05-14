import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserDoc, Household, Debt, Strategy, Actual, LegacyData } from "@/types";

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
    createdAt: serverTimestamp(),
  });
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

export async function addActual(
  householdId: string,
  data: Omit<Actual, "id" | "createdAt">
): Promise<void> {
  await addDoc(collection(db, "households", householdId, "actuals"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

// ─── Legacy migration ─────────────────────────────────────────────────────────

export async function readLegacyData(): Promise<LegacyData | null> {
  const snap = await getDoc(doc(db, "snowball", "appdata"));
  if (!snap.exists()) return null;
  const raw = snap.data();
  // The old app stored everything as a JSON string in a "data" field
  if (typeof raw.data === "string") {
    try {
      return JSON.parse(raw.data) as LegacyData;
    } catch {
      return null;
    }
  }
  // Or it may have been stored as a map directly
  if (raw.debts) return raw as LegacyData;
  return null;
}

export async function migrateLegacyData(
  householdId: string,
  legacy: LegacyData
): Promise<void> {
  // Migrate debts
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

  // Migrate strategy / settings
  await setDoc(doc(db, "households", householdId, "settings", "strategy"), {
    monthlyBudget: legacy.settings.monthlyBudget,
    method: "snowball",
    startDate: legacy.settings.startDate,
    updatedAt: serverTimestamp(),
  });

  // Migrate actuals
  for (const a of legacy.actuals) {
    await addDoc(collection(db, "households", householdId, "actuals"), {
      month: a.month,
      amount: a.amount,
      createdAt: serverTimestamp(),
    });
  }
}
