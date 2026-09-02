"use client";

import React from "react";
import { useStallTypes } from "./StallTypesProvider";
import { StallTypesCardsGrid } from "./StallTypesCardsGrid";
import { StallTypesTable } from "./StallTypesTable";

export function StallTypesMainView() {
    const { viewMode } = useStallTypes();
    return viewMode === "grid" ? <StallTypesCardsGrid /> : <StallTypesTable />;
}
