import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export interface AdvisorMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 50;

export async function loadAdvisorHistory(uid: string): Promise<AdvisorMessage[]> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "advisorMemory", "session"));
    if (!snap.exists()) return [];
    const data = snap.data();
    return Array.isArray(data.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

export async function saveAdvisorMessages(uid: string, messages: AdvisorMessage[]): Promise<void> {
  const trimmed = messages.slice(-MAX_HISTORY);
  await setDoc(
    doc(db, "users", uid, "advisorMemory", "session"),
    { messages: trimmed, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function clearAdvisorHistory(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", uid, "advisorMemory", "session"));
  } catch {
    // ignore if already deleted
  }
}
