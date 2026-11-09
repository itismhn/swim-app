"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the current page's server data on an interval while the tab is visible
 * (and once when it becomes visible again). Lightweight substitute for push updates.
 */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}
