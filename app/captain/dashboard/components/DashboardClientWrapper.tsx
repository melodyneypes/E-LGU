"use client";

import React, { useEffect, useState } from "react";
import { LayoutGrid, Shield, BarChart3, Users2 } from "lucide-react";
import { CaptainDashboardHeader } from "../CaptainDashboardHeader";

const SECTION_META: Record<string, { title: string; description: string; icon: React.ElementType }> = {
  top_metrics: {
    title: "Barangay Executive Summary",
    description: "Key performance indicators and localized governance metrics",
    icon: LayoutGrid,
  },
  strategic_ops: {
    title: "Barangay Operations Command",
    description: "Administrative services, audit compliance, and operational oversight",
    icon: Shield,
  },
  analytics: {
    title: "Intelligence & Community Demographics",
    description: "Citizen demographic reports, sector intelligence, and local request trends",
    icon: BarChart3,
  },
  community: {
    title: "Public Affairs & Barangay Engagement",
    description: "Official bulletins, civic events, and community infrastructure programs",
    icon: Users2,
  },
};

interface DashboardClientWrapperProps {
  themeColor: string;
  session: any;
  managedBarangay?: string;
  children: React.ReactNode;
}

export function DashboardClientWrapper({
  themeColor,
  session,
  managedBarangay,
  children,
}: DashboardClientWrapperProps) {

  // Unified Card Visibility State for All Sections
  const [cardVisibility, setCardVisibility] = useState<Record<string, boolean>>({
    // Top metric cards
    residents: true,
    jobs: true,
    reports: true,
    projects: true,
    // Strategic ops cards
    admin_services: true,
    resident_activity: true,
    staff_audit: true,
    // Analytics cards
    daily_requests: true,
    collections_ledger: true,
    resident_analytics: true,
    citizen_reports: true,
    // Community cards
    recent_announcements: true,
    latest_news: true,
    upcoming_events: true,
    lgu_projects: true,
  });

  // Main Section Order State
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    "top_metrics",
    "strategic_ops",
    "analytics",
    "community",
  ]);

  useEffect(() => {
    try {
      const savedVisibility = localStorage.getItem("captain_dashboard_card_visibility_v1");
      if (savedVisibility) {
        setCardVisibility((prev) => ({ ...prev, ...JSON.parse(savedVisibility) }));
      }
      const savedSectionOrder = localStorage.getItem("captain_dashboard_section_order_v1");
      if (savedSectionOrder) {
        const parsed: string[] = JSON.parse(savedSectionOrder);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setSectionOrder(parsed);
        }
      }
    } catch {
      // Ignore errors
    }
  }, []);

  const handleReorderSections = (newOrder: string[]) => {
    setSectionOrder(newOrder);
    try {
      localStorage.setItem("captain_dashboard_section_order_v1", JSON.stringify(newOrder));
    } catch {}
  };

  const handleToggleVisibility = (key: string) => {
    setCardVisibility((prev) => {
      const updated = { ...prev, [key]: prev[key] === false ? true : false };
      try {
        localStorage.setItem("captain_dashboard_card_visibility_v1", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleResetAll = () => {
    try {
      localStorage.removeItem("captain_dashboard_card_visibility_v1");
      localStorage.removeItem("captain_dashboard_section_order_v1");
      localStorage.removeItem("captain_metric_cards_individual_grid_v5");
      localStorage.removeItem("captain_metric_cards_order_v5");
      localStorage.removeItem("captain_strategic_ops_individual_grid_v5");
      localStorage.removeItem("captain_strategic_ops_order_v5");
      localStorage.removeItem("captain_analytics_cards_individual_grid_v5");
      localStorage.removeItem("captain_analytics_cards_order_v5");
      localStorage.removeItem("captain_community_cards_individual_grid_v5");
      localStorage.removeItem("captain_community_cards_order_v5");
      window.location.reload();
    } catch {}
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
      <CaptainDashboardHeader
        session={session}
        themeColor={themeColor}
        managedBarangay={managedBarangay}
        cardVisibility={cardVisibility}
        onToggleVisibility={handleToggleVisibility}
        onResetAll={handleResetAll}
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
                        <Icon className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
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
                  cardVisibility,
                  visibilityMap: cardVisibility,
                  analyticsVisibilityMap: cardVisibility,
                  communityVisibilityMap: cardVisibility,
                  onToggleVisibility: handleToggleVisibility,
                  onToggleAnalyticsVisibility: handleToggleVisibility,
                  onToggleCommunityVisibility: handleToggleVisibility,
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
