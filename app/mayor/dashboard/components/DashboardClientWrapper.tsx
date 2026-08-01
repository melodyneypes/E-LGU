"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useBarangay } from "@/components/providers/BarangayProvider";
import DashboardLoading from "../loading";
import { LayoutGrid, Shield, BarChart3, Users2 } from "lucide-react";



const SECTION_META: Record<string, { title: string; description: string; icon: React.ElementType }> = {
  top_metrics: {
    title: "Executive Summary",
    description: "Municipal key performance indicators and governance metrics",
    icon: LayoutGrid,
  },
  strategic_ops: {
    title: "Operations Command",
    description: "Administrative services, audit compliance, and operational oversight",
    icon: Shield,
  },
  analytics: {
    title: "Intelligence & Fiscal Reports",
    description: "Revenue trends, service demand analytics, and demographic intelligence",
    icon: BarChart3,
  },
  community: {
    title: "Public Affairs & Engagement",
    description: "Official communications, civic events, and infrastructure program tracking",
    icon: Users2,
  },
};

import { MayorDashboardHeader } from "../MayorDashboardHeader";

interface DashboardClientWrapperProps {
  themeColor: string;
  session: any;
  activeBarangays: string[];
  selectedBarangay: string;
  children: React.ReactNode;
}

export function DashboardClientWrapper({
  themeColor,
  session,
  activeBarangays,
  selectedBarangay,
  children,
}: DashboardClientWrapperProps) {
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

  // Community Cards Visibility State
  const [communityVisibilityMap, setCommunityVisibilityMap] = useState<Record<string, boolean>>({
    recent_announcements: true,
    latest_news: true,
    upcoming_events: true,
    lgu_projects: true,
  });

  // Main Section Order State (Default: ["top_metrics", "strategic_ops", "analytics", "community"])
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    "top_metrics",
    "strategic_ops",
    "analytics",
    "community",
  ]);

  useEffect(() => {
    try {
      const savedAnalytics = localStorage.getItem("mayor_analytics_visibility_v1");
      if (savedAnalytics) {
        setAnalyticsVisibilityMap((prev) => ({ ...prev, ...JSON.parse(savedAnalytics) }));
      }
      const savedCommunity = localStorage.getItem("mayor_community_visibility_v1");
      if (savedCommunity) {
        setCommunityVisibilityMap((prev) => ({ ...prev, ...JSON.parse(savedCommunity) }));
      }
      const savedSectionOrder = localStorage.getItem("mayor_dashboard_section_order_v1");
      if (savedSectionOrder) {
        const parsed: string[] = JSON.parse(savedSectionOrder);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setSectionOrder(parsed);
        }
      }
    } catch {
      /* Fallback */
    }
  }, []);

  const handleReorderSections = (newOrder: string[]) => {
    setSectionOrder(newOrder);
    try {
      localStorage.setItem("mayor_dashboard_section_order_v1", JSON.stringify(newOrder));
    } catch {
      /* Fail gracefully */
    }
  };

  const toggleAnalyticsVisibility = (key: string) => {
    setAnalyticsVisibilityMap((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("mayor_analytics_visibility_v1", JSON.stringify(updated));
      } catch {
        /* Fail gracefully */
      }
      return updated;
    });
  };

  const toggleCommunityVisibility = (key: string) => {
    setCommunityVisibilityMap((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("mayor_community_visibility_v1", JSON.stringify(updated));
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

  const mergedVisibilityMap: Record<string, boolean> = {
    ...analyticsVisibilityMap,
    ...communityVisibilityMap,
  };

  const handleToggleCommunityOrAnalytics = (key: string) => {
    if (["recent_announcements", "latest_news", "upcoming_events", "lgu_projects"].includes(key)) {
      toggleCommunityVisibility(key);
    } else {
      toggleAnalyticsVisibility(key);
    }
  };

  const childrenArray = React.Children.toArray(children);

  const sectionComponentMap: Record<string, React.ReactNode> = {
    top_metrics: childrenArray[0],
    strategic_ops: childrenArray[1],
    analytics: childrenArray[2],
    community: childrenArray[3],
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] text-slate-900 dark:text-white transition-colors duration-300">
      <MayorDashboardHeader
        session={session}
        themeColor={themeColor}
        activeBarangays={activeBarangays}
        selectedBarangay={selectedBarangay}
        cardVisibility={mergedVisibilityMap}
        onToggleVisibility={handleToggleCommunityOrAnalytics}
        onResetAll={() => {
          localStorage.removeItem("mayor_analytics_visibility_v1");
          localStorage.removeItem("mayor_community_visibility_v1");
          localStorage.removeItem("mayor_dashboard_section_order_v1");
          localStorage.removeItem("mayor_metric_cards_individual_grid_v5");
          localStorage.removeItem("mayor_metric_cards_order_v5");
          localStorage.removeItem("mayor_strategic_ops_individual_grid_v5");
          localStorage.removeItem("mayor_strategic_ops_order_v5");
          localStorage.removeItem("mayor_analytics_cards_individual_grid_v5");
          localStorage.removeItem("mayor_analytics_cards_order_v5");
          localStorage.removeItem("mayor_community_cards_individual_grid_v5");
          localStorage.removeItem("mayor_community_cards_order_v5");
          window.location.reload();
        }}
        sectionOrder={sectionOrder}
        onReorderSections={handleReorderSections}
      />

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">

      {sectionOrder.map((sectionKey) => {
        const child = sectionComponentMap[sectionKey];
        const meta = SECTION_META[sectionKey];
        if (React.isValidElement(child)) {
          const Icon = meta?.icon;
          return (
            <section key={sectionKey} className="mt-8">
              {meta && (
                <div className="flex items-center gap-3 mb-5">
                  {Icon && (
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#1e2330] dark:to-[#252b3b] border border-slate-200 dark:border-[#2a3040] shadow-sm">
                      <Icon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white italic leading-none">
                      {meta.title}
                    </h2>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic tracking-wide mt-0.5">
                      {meta.description}
                    </p>
                  </div>
                </div>
              )}
              {React.cloneElement(child as React.ReactElement<any>, {
                analyticsVisibilityMap,
                onToggleAnalyticsVisibility: handleToggleCommunityOrAnalytics,
                communityVisibilityMap,
                onToggleCommunityVisibility: toggleCommunityVisibility,
                cardVisibility: mergedVisibilityMap,
                sectionOrder,
                onReorderSections: handleReorderSections,
              })}
            </section>
          );
        }
        return child;
      })}
      </main>
    </div>
  );
}
