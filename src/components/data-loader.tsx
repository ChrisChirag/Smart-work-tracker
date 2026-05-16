"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw } from "lucide-react";

export function DataLoader() {
  const { status } = useSession();
  const { setData, isLoaded } = useStore();
  const fetching = useRef(false);
  const [hasError, setHasError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const load = async () => {
    if (fetching.current) return;
    fetching.current = true;
    setRetrying(true);
    setHasError(false);
    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setData(data);
    } catch {
      setHasError(true);
    } finally {
      fetching.current = false;
      setRetrying(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated" || isLoaded) return;
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isLoaded]);

  if (!hasError) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 p-4">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border bg-card shadow-xl max-w-sm w-full text-center">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-1">Unable to load your data</h3>
          <p className="text-sm text-muted-foreground">
            Could not reach the server. Check your connection and try again.
          </p>
        </div>
        <Button onClick={load} disabled={retrying} className="w-full gap-2">
          <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} />
          {retrying ? "Retrying…" : "Try again"}
        </Button>
      </div>
    </div>
  );
}
