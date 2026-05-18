"use client";

import { useEffect, useState } from "react";
import { subscribePayments } from "@/lib/firestore";
import type { UIPayment } from "@/lib/snowball";

export function usePayments(householdId: string | null) {
  const [payments, setPayments] = useState<UIPayment[]>([]);
  const [loading, setLoading] = useState(householdId !== null);

  useEffect(() => {
    if (!householdId) return;
    const unsub = subscribePayments(householdId, (data) => {
      setPayments(
        data.map((p) => ({
          id: p.id,
          month: p.month,
          amount: p.amount,
        }))
      );
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  return { payments, loading };
}
