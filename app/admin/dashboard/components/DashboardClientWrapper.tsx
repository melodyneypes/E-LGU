"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useBarangay } from "@/components/providers/BarangayProvider";
import DashboardLoading from "../loading";

interface DashboardClientWrapperProps {
  children: React.ReactNode;
}

export function DashboardClientWrapper({ children }: DashboardClientWrapperProps) {
  const searchParams = useSearchParams();
  const barangay = searchParams.get("barangay") || "";
  const [isPending, startTransition] = useTransition();
  const [activeBarangay, setActiveBarangay] = useState(barangay);
  const [localLoading, setLocalLoading] = useState(false);
  useBarangay(); // Access BarangayContext trigger

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

  return <>{children}</>;
}
