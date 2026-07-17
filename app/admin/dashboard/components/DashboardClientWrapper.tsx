"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
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
