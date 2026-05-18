"use client";

import { useEffect, useState } from "react";
import { subscribeDebts } from "@/lib/firestore";
import type { Debt } from "@/types";

export function useDebts(householdId: string | null) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(householdId !== null);

  useEffect(() => {
    if (!householdId) return;
    const unsub = subscribeDebts(householdId, (data) => {
      setDebts(data);
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  return { debts, loading };
}
