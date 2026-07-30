"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useBarangay } from "@/components/providers/BarangayProvider";
import DashboardLoading from "../loading";

interface DashboardClientWrapperProps {
  children: React.ReactNode;
}

export function DashboardClientWrapper({ children }: DashboardClientWrapperProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const barangay = searchParams.get("barangay") || "";
  const [isPending, startTransition] = useTransition();
  const [activeBarangay, setActiveBarangay] = useState(barangay);
  const [localLoading, setLocalLoading] = useState(false);
  useBarangay(); // Access BarangayContext trigger

  // Analytics Cards Visibility State
  const [analyticsVisibilityMap, setAnalyticsVisibilityMap] = useState<Record<string, boolean>>({
    daily_requests: true,
    collections_ledger: true,
    resident_analytics: true,
    citizen_reports: true,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("emapandan_analytics_visibility_v1");
      if (saved) {
        setAnalyticsVisibilityMap((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      /* Fallback */
    }
  }, []);

  const toggleAnalyticsVisibility = (key: string) => {
    setAnalyticsVisibilityMap((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("emapandan_analytics_visibility_v1", JSON.stringify(updated));
      } catch {
        /* Fail gracefully */
      }
      return updated;
    });
  };

  // Real-time updates subscription using Server-Sent Events (SSE) for Dashboard (Daily Requests & Payments)
  useEffect(() => {
    const dailyRequestsStream = new EventSource("/api/admin/reports/daily-requests/stream");
    const paymentsStream = new EventSource("/api/admin/treasury/payments/stream");

    const refreshDashboard = (event: MessageEvent) => {
      if (event.data === "refresh") {
        console.log("[DashboardClientWrapper] Real-time event received, refreshing dashboard...");
        router.refresh();
      }
    };

    dailyRequestsStream.onmessage = refreshDashboard;
    paymentsStream.onmessage = refreshDashboard;

    dailyRequestsStream.onerror = () => {
      console.warn("Daily requests SSE stream connection lost. Reconnecting...");
    };
    paymentsStream.onerror = () => {
      console.warn("Payments ledger SSE stream connection lost. Reconnecting...");
    };

    return () => {
      dailyRequestsStream.close();
      paymentsStream.close();
    };
  }, [router]);

  // Effect to listen to link clicks inside this container and trigger global preloader
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor && anchor.href) {
        const url = new URL(anchor.href);
        // Only trigger for same domain/origin and different pathname (actual page change)
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          // Find target elements in BarangayProvider context state to set isLoading: true
          // Under the hood, setting context state triggers the GlobalLoading preloader overlay
          const barangayProvider = (window as any).__barangayProviderSetLoading;
          if (barangayProvider) {
            barangayProvider(true);
          } else {
            // Fallback via document custom event or direct DOM loading trigger
            const event = new CustomEvent("trigger-global-loading", { detail: true });
            window.dispatchEvent(event);
          }
        }
      }
    };

    document.addEventListener("click", handleLinkClick);
    return () => document.removeEventListener("click", handleLinkClick);
  }, []);

  useEffect(() => {
    if (barangay !== activeBarangay) {
      setLocalLoading(true);
      startTransition(() => {
        setActiveBarangay(barangay);
      });
    }
  }, [barangay, activeBarangay]);

  useEffect(() => {
    if (!isPending) {
      setLocalLoading(false);
    }
  }, [isPending]);

  if (localLoading || isPending) {
    return <DashboardLoading />;
  }

  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            analyticsVisibilityMap,
            onToggleAnalyticsVisibility: toggleAnalyticsVisibility,
            cardVisibility: analyticsVisibilityMap,
          });
        }
        return child;
      })}
    </>
  );
}
