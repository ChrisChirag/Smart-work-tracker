"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border bg-card p-8 shadow-lg space-y-4 text-center">
        <h2 className="text-xl font-semibold">Page error</h2>
        <p className="text-sm text-muted-foreground font-mono bg-muted rounded-lg p-3 text-left break-all">
          {error.message || "Unknown error"}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>
        )}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
