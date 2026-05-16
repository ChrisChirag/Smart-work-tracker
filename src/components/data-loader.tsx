"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useStore } from "@/store";

export function DataLoader() {
  const { status } = useSession();
  const { setData, isLoaded } = useStore();
  const fetching = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || isLoaded || fetching.current) return;
    fetching.current = true;

    fetch("/api/data")
      .then((r) => r.json())
      .then((data) => setData(data))
      .catch(console.error)
      .finally(() => { fetching.current = false; });
  }, [status, isLoaded, setData]);

  return null;
}
