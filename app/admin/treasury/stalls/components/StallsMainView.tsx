"use client";

import React from "react";
import { useStalls } from "./StallsProvider";
import { StallsCardsGrid } from "./StallsCardsGrid";
import { StallsTable } from "./StallsTable";

export function StallsMainView() {
    const { viewMode } = useStalls();
    return viewMode === "grid" ? <StallsCardsGrid /> : <StallsTable />;
}
