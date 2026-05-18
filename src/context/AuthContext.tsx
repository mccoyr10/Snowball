"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth, db, googleProvider } from "@/lib/firebase";
import {
  getUserDoc,
  createUserDoc,
  createHousehold,
} from "@/lib/firestore";
import { doc, onSnapshot } from "firebase/firestore";
import type { UserDoc } from "@/types";

interface AuthContextValue {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureUserDoc(user: User): Promise<UserDoc> {
  const existing = await getUserDoc(user.uid);
  if (existing) return existing;
  // First time signing in with Google — create user doc + household
  const householdId = await createHousehold(user.uid, "My Household");
  await createUserDoc(
    user.uid,
    user.email ?? "",
    user.displayName ?? "",
    householdId
  );
  return (await getUserDoc(user.uid))!;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let docUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (docUnsub) { docUnsub(); docUnsub = null; }
      setUser(firebaseUser);
      if (firebaseUser) {
        await ensureUserDoc(firebaseUser);
        docUnsub = onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
          if (snap.exists()) setUserDoc(snap.data() as UserDoc);
          setLoading(false);
        });
      } else {
        setUserDoc(null);
        setLoading(false);
      }
    });

    return () => { authUnsub(); if (docUnsub) docUnsub(); };
  }, []);

  async function signUp(email: string, password: string, displayName: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    const householdId = await createHousehold(credential.user.uid, "My Household");
    await createUserDoc(credential.user.uid, email, displayName, householdId);
    const doc = await getUserDoc(credential.user.uid);
    setUserDoc(doc);
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signInWithGoogle() {
    const credential = await signInWithPopup(auth, googleProvider);
    const doc = await ensureUserDoc(credential.user);
    setUserDoc(doc);
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setUserDoc(null);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function refreshUserDoc() {
    if (!user) return;
    const doc = await getUserDoc(user.uid);
    setUserDoc(doc);
  }

  return (
    <AuthContext.Provider
      value={{ user, userDoc, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword, refreshUserDoc }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
