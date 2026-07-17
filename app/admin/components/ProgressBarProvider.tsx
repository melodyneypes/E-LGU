"use client";

import React from "react";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

interface ProgressBarProviderProps {
  children: React.ReactNode;
  color?: string;
}

export function ProgressBarProvider({ children, color = "#2563eb" }: ProgressBarProviderProps) {
  return (
    <>
      {children}
      <ProgressBar
        height="3px"
        color={color}
        options={{ showSpinner: false }}
        shallowRouting
      />
    </>
  );
}
