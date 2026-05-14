"use client";

import { useEffect, useState } from "react";
import { subscribeStrategy } from "@/lib/firestore";
import type { Strategy } from "@/types";

export function useStrategy(householdId: string | null) {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(householdId !== null);

  useEffect(() => {
    if (!householdId) return;
    const unsub = subscribeStrategy(householdId, (data) => {
      setStrategy(data);
      setLoading(false);
    });
    return unsub;
  }, [householdId]);

  return { strategy, loading };
}
