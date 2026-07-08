"use client";

import dynamicImport from "next/dynamic";
import * as React from "react";

const UserLayoutClient = dynamicImport(() => import("./UserLayoutClient"), { ssr: false });

export default function UserLayoutClientWrapper({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
    return <UserLayoutClient {...props}>{children}</UserLayoutClient>;
}
