"use client";

import { useEffect, useState } from "react";
import { subscribeActuals } from "@/lib/firestore";
import type { UIActual } from "@/lib/snowball";

export function useActuals(householdId: string | null) {
  const [actuals, setActuals] = useState<UIActual[]>([]);
  const [loading, setLoading] = useState(householdId !== null);

  useEffect(() => {
    if (!householdId) return;
    const unsub = subscribeActuals(householdId, (data) => {
      setActuals(
        data
          .filter((a) => a.debtId) // only per-debt actuals
          .map((a) => ({
            id: a.id,
            month: a.month,
            debtId: a.debtId as string,
            amount: a.amount,
          }))
      );
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  return { actuals, loading };
}
