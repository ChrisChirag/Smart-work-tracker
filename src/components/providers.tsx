"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
    </SessionProvider>
  );
}
