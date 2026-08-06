"use client";

import React from "react";
import { SessionContext } from "next-auth/react";

export function useSafeSession() {
    const context = React.useContext(SessionContext);
    if (!context) {
        return { data: null, status: "unauthenticated" as const, update: async () => null };
    }
    return context;
}
