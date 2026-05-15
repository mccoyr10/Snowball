"use client";

import AuthGuard from "@/components/AuthGuard";
import SnowballApp from "@/components/SnowballApp";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <SnowballApp />
    </AuthGuard>
  );
}
