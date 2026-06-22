"use client";

import * as React from "react";
import { SidebarProvider } from "./SidebarContext";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { useRouter, usePathname } from "next/navigation";

interface AdminShellProps {
    children: React.ReactNode;
    session: {
        user?: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
            managedBarangay?: string | null;
            department?: string | null;
        };
    };
    logoUrl?: string;
    brandWord1?: string;
    brandWord2?: string;
    themeColor?: string;
    pendingReportsCount?: number;
    pendingResidentsCount?: number;
    pendingTransactionsCount?: number;
    unviewedLcrCounts?: Record<string, number>;
}

export function AdminShell({
    children,
    session,
    logoUrl,
    brandWord1,
    brandWord2,
    themeColor,
    pendingReportsCount,
    pendingResidentsCount,
    pendingTransactionsCount,
    unviewedLcrCounts = {},
}: AdminShellProps) {
    const router = useRouter();
    const pathname = usePathname();

    const role = session.user?.role || "ADMIN";
    const department = session.user?.department || "";
    const deptUpper = department.toUpperCase();

    // Route Protection Logic
    let isRestricted = false;
    let isRedirecting = false;

    // Guard: USER role is never allowed in admin
    if (role === "USER") {
        isRestricted = true;
    }

    // Special Rule: ONLY ADMIN with department LGU OR BARANGAY_ADMIN can access the admin dashboard
    if (pathname === "/admin/dashboard" || pathname === "/admin") {
        const isLguAdmin = role === "ADMIN" && deptUpper === "LGU";
        const isBrgyAdmin = role === "BARANGAY_ADMIN";

        if (!isLguAdmin && !isBrgyAdmin) {
            if (
                role === "TREASURY_STAFF" ||
                role === "ADMIN_AIDE" ||
                role === "ENGINEER" ||
                (role === "ADMIN" && (deptUpper === "TREASURY" || deptUpper === "BPLO" || deptUpper === "REGISTRAR" || deptUpper === "CIVIL_REGISTRY"))
            ) {
                isRedirecting = true;
            } else {
                isRestricted = true;
            }
        }
    }

    if (!isRestricted && !isRedirecting && pathname) {
        if (role === "ADMIN") {
            if (deptUpper === "BPLO" && !pathname.startsWith("/admin/bplo")) {
                isRestricted = true;
            } else if ((deptUpper === "REGISTRAR" || deptUpper === "CIVIL_REGISTRY") && !pathname.startsWith("/admin/registrar")) {
                isRestricted = true;
            } else if (deptUpper === "TREASURY" && !pathname.startsWith("/admin/treasury") && !pathname.startsWith("/admin/treasury/payments") && !pathname.startsWith("/admin/treasury/payment-settings")) {
                isRestricted = true;
            } else if (deptUpper === "LGU") {
                // LGU admins are restricted from specialized sub-sections
                if (
                    pathname.startsWith("/admin/registrar") ||
                    pathname.startsWith("/admin/treasury") ||
                    pathname.startsWith("/admin/bplo")
                ) {
                    isRestricted = true;
                }
            }
        } else if (role === "TREASURY_STAFF") {
            if (!pathname.startsWith("/admin/treasury")) {
                isRestricted = true;
            }
        } else if (role === "ADMIN_AIDE") {
            if (!pathname.startsWith("/admin/bplo")) {
                isRestricted = true;
            }
        } else if (role === "ENGINEER") {
            if (!pathname.startsWith("/admin/engineer")) {
                isRestricted = true;
            }
        }
    }

    // Trigger client-side redirection immediately for specialized admins
    React.useEffect(() => {
        if (!pathname) return;
        if (role === "USER") {
            const timer = setTimeout(() => {
                router.push("/");
            }, 100);
            return () => clearTimeout(timer);
        }
        if (pathname === "/admin/dashboard" || pathname === "/admin") {
            const isLguAdmin = role === "ADMIN" && deptUpper === "LGU";
            const isBrgyAdmin = role === "BARANGAY_ADMIN";

            if (!isLguAdmin && !isBrgyAdmin) {
                const timer = setTimeout(() => {
                    if (role === "ADMIN") {
                        if (deptUpper === "TREASURY") {
                            router.push("/admin/treasury?category=CEDULA");
                        } else if (deptUpper === "REGISTRAR" || deptUpper === "CIVIL_REGISTRY") {
                            router.push("/admin/registrar");
                        } else if (deptUpper === "BPLO") {
                            router.push("/admin/bplo");
                        }
                    } else if (role === "TREASURY_STAFF") {
                        router.push("/admin/treasury?category=CEDULA");
                    } else if (role === "ADMIN_AIDE") {
                        router.push("/admin/bplo");
                    } else if (role === "ENGINEER") {
                        router.push("/admin/engineer");
                    }
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [pathname, role, deptUpper, router]);

    return (
        <SidebarProvider>
            <Sidebar
                session={session}
                logoUrl={logoUrl}
                brandWord1={brandWord1}
                brandWord2={brandWord2}
                themeColor={themeColor}
                pendingReportsCount={pendingReportsCount}
                pendingResidentsCount={pendingResidentsCount}
                pendingTransactionsCount={pendingTransactionsCount}
                unviewedLcrCounts={unviewedLcrCounts}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopNav
                    session={session}
                    themeColor={themeColor}
                    brandWord1={brandWord1}
                    brandWord2={brandWord2}
                    logoUrl={logoUrl}
                />
                <main className="flex-1 overflow-y-auto">
                    {isRedirecting ? (
                        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#0c111d] transition-colors duration-300">
                            <div className="max-w-md w-full bg-white dark:bg-[#151b28] rounded-[2rem] p-10 text-center shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-white/5 space-y-6 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/5">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 animate-spin">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">
                                        Redirecting
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 italic leading-relaxed">
                                        Redirecting you to your department portal...
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : isRestricted ? (
                        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#0c111d] transition-colors duration-300">
                            <div className="max-w-md w-full bg-white dark:bg-[#151b28] rounded-[2rem] p-10 text-center shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-white/5 space-y-6">
                                <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/5">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                    </svg>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">
                                        Access Restricted
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 italic leading-relaxed">
                                        Sorry, your account does not have the required department clearances to access this portal page.
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
                                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        Clearance Level: {role} {department ? `(${department})` : ""}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        children
                    )}
                </main>
            </div>
        </SidebarProvider>
    );
}
