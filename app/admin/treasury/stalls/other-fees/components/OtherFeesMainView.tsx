"use client";

import React from "react";
import { useOtherFees } from "./OtherFeesProvider";
import { OtherFeesCardsGrid } from "./OtherFeesCardsGrid";
import { OtherFeesTable } from "./OtherFeesTable";

export function OtherFeesMainView() {
    const { viewMode } = useOtherFees();
    return viewMode === "grid" ? <OtherFeesCardsGrid /> : <OtherFeesTable />;
}
