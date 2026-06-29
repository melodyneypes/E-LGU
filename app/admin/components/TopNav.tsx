"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    ChevronRight,
    LogOut,
    Moon,
    Sun,
    User,
    Settings,
    ChevronDown,
    Map,
    Menu,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";
import { motion } from "framer-motion";
import { getTransactionById } from "@/app/admin/transactions/actions";

interface TopNavProps {
    session: {
        user?: {
            name?: string | null;
            email?: string | null;
            role?: string;
            managedBarangay?: string | null;
            accessiblePages?: string[];
            department?: string | null;
        };
    };
    themeColor?: string;
    brandWord1?: string;
    brandWord2?: string;
    logoUrl?: string;
}

const SEGMENT_LABELS: Record<string, string> = {
    admin: "Admin",
    dashboard: "Dashboard",
    treasury: "Treasury Hub",
    engineer: "Engineer Hub",
    residents: "Resident Registry",
    "resident-approvals": "Resident Approvals",
    transactions: "Transactions",
    users: "User Accounts",
    settings: "Settings",
    announcements: "Announcements",
    news: "News & Updates",
    events: "Events",
    projects: "LGU Projects",
    reports: "Public Reports",
    logistics: "Logistics",
    jobs: "Job Postings",
    officials: "Council Members",
    hotlines: "Hotlines",
    households: "Household Map",
    barangays: "Barangays",
    about: "About Us",
    dining: "Kainan (Dining)",
    accommodation: "Tuluyan (Stay)",
    tourism: "Gallery",
    church: "Church Management",
    services: "Barangay Services",
    content: "Content",
    payments: "Payments Ledger",
    registrar: "Civil Registry",
};

function formatSegment(seg: string): string {
    return SEGMENT_LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TopNav({ session, themeColor = "#2563eb", brandWord1 = "E", brandWord2 = "", logoUrl }: TopNavProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { theme, setTheme } = useTheme();
    const { isOpen, toggle: toggleSidebar } = useSidebar();
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [txData, setTxData] = React.useState<any>(null);

    // Build breadcrumbs from pathname segments
    const segments = (pathname || "").split("/").filter(Boolean);

    // Identify dynamic IDs (such as UUIDs, purely numeric IDs, or CUIDs/other long database keys)
    const isId = (s: string) => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || 
               /^\d+$/.test(s) ||
               (s.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(s));
    };

    // Dynamically fetch transaction details if we are on a detail page
    React.useEffect(() => {
        const hasId = segments.length === 3 && (segments[1] === "treasury" || segments[1] === "registrar") && isId(segments[2]);
        if (hasId) {
            const transactionId = segments[2];
            getTransactionById(transactionId).then((res) => {
                if (res.success && res.data) {
                    setTxData(res.data);
                } else {
                    setTxData(null);
                }
            }).catch(() => {
                setTxData(null);
            });
        } else {
            setTxData(null);
        }
    }, [pathname, segments]);

    // Check route type
    const isTreasuryDetail = segments.length === 3 && segments[0] === "admin" && segments[1] === "treasury" && isId(segments[2]);
    const isRegistrarDetail = segments.length === 3 && segments[0] === "admin" && segments[1] === "registrar" && isId(segments[2]);

    let crumbsToRender;

    if (isTreasuryDetail) {
        const category = searchParams.get("category") || "CEDULA";
        const categoryLabel = category === "ALL" ? "All Categories" : category;
        const transactionId = segments[2];
        const shortId = transactionId.slice(-8).toUpperCase();

        const isLCRCategory = category === "Civil Registry" || (txData?.type?.category === "Civil Registry");

        if (isLCRCategory) {
            crumbsToRender = [
                { seg: "category", label: "Civil Registry", href: `/admin/treasury?category=Civil Registry`, isLast: false },
                { seg: "detail", label: txData?.type?.name || "...", href: "", isLast: true }
            ];
        } else {
            crumbsToRender = [
                { seg: "category", label: categoryLabel, href: `/admin/treasury?category=${category}`, isLast: false },
                { seg: "detail", label: `Request #${shortId}`, href: "", isLast: true }
            ];
        }
    } else if (isRegistrarDetail) {
        crumbsToRender = [
            { seg: "registrar", label: "Civil Registry", href: `/admin/registrar`, isLast: false },
            { seg: "detail", label: txData?.type?.name || "...", href: "", isLast: true }
        ];
    } else {
        const isTreasuryList = segments.length === 2 && segments[0] === "admin" && segments[1] === "treasury";
        const isRegistrarList = segments.length === 2 && segments[0] === "admin" && segments[1] === "registrar";
        const category = searchParams.get("category") || "CEDULA";
        const regCategory = searchParams.get("category");

        if (isRegistrarList && regCategory && regCategory !== "ALL") {
            crumbsToRender = [
                { seg: "registrar", label: "Civil Registry", href: `/admin/registrar`, isLast: false },
                { seg: "category", label: regCategory, href: `/admin/registrar?category=${regCategory}`, isLast: true }
            ];
        } else if (isTreasuryList && category) {
            crumbsToRender = [
                { seg: "category", label: category, href: `/admin/treasury?category=${category}`, isLast: true }
            ];
        } else {
            // Filter out dynamic ID segments so the breadcrumbs remain clean and readable
            const filteredSegments = segments.filter(s => !isId(s));

            const origCrumbs = filteredSegments.map((seg, i) => {
                let href = "/" + filteredSegments.slice(0, i + 1).join("/");
                if (seg === "barangays") {
                    href = "/admin/barangays/list";
                }
                return {
                    seg,
                    label: formatSegment(seg),
                    href,
                    isLast: i === filteredSegments.length - 1,
                };
            });

            const accessiblePages = session?.user?.accessiblePages;
            let dashboardHref = "/admin/dashboard";

            if (accessiblePages && accessiblePages.length > 0) {
                const hasDashboardAccess = accessiblePages.some(page => {
                    const [pagePath] = page.split("?");
                    return pagePath === "/admin/dashboard" || pagePath === "/admin";
                });
                if (!hasDashboardAccess) {
                    dashboardHref = accessiblePages[0];
                }
            } else {
                const role = session?.user?.role || "ADMIN";
                const department = session?.user?.department || "";
                const deptUpper = department.toUpperCase();

                if (role !== "ADMIN" || deptUpper !== "LGU") {
                    if (deptUpper === "REGISTRAR" || deptUpper === "CIVIL_REGISTRY") {
                        dashboardHref = "/admin/registrar";
                    } else if (role === "TREASURY_STAFF" || deptUpper === "TREASURY") {
                        dashboardHref = "/admin/treasury?category=CEDULA";
                    } else if (role === "ADMIN_AIDE" || deptUpper === "BPLO") {
                        dashboardHref = "/admin/bplo";
                    } else if (role === "ENGINEER" || deptUpper === "ENGINEER") {
                        dashboardHref = "/admin/engineer";
                    } else {
                        dashboardHref = "";
                    }
                }
            }

            // Exclude 'admin' and 'dashboard' from the tail.
            const nonAdminSegments = filteredSegments.filter((s) => s !== "admin");
            const tailCrumbs = origCrumbs.filter((c) => c.seg !== "admin" && c.seg !== "dashboard");
            
            if (nonAdminSegments.length === 1 && nonAdminSegments[0] === "dashboard") {
                crumbsToRender = [
                    { seg: "dashboard", label: formatSegment("dashboard"), href: dashboardHref, isLast: true }
                ];
            } else {
                crumbsToRender = tailCrumbs;
            }
        }
    }

    // Close dropdown on outside click
    React.useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const initials = session.user?.name
        ? session.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : "A";

    const roleLabel =
        session.user?.role === "CONTENT_ADMIN"
            ? "Content Admin"
            : session.user?.role === "BARANGAY_ADMIN"
                ? `Brgy. ${session.user?.managedBarangay || "Admin"}`
                : session.user?.role === "TREASURY_STAFF"
                    ? "Treasury Staff"
                    : session.user?.role === "ADMIN_AIDE"
                        ? "Admin Aide"
                        : "Admin System";

    return (
        <motion.header 
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="h-14 shrink-0 flex items-center justify-between px-4 bg-white dark:bg-[#1e2330] border-b border-slate-200 dark:border-[#2a3040] z-30 relative"
        >
            {/* Left: Hamburger + Breadcrumbs */}
            <div className="flex items-center gap-3 min-w-0">
                {/* Hamburger toggle */}
                <>
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shrink-0"
                        title="Toggle Sidebar"
                        aria-expanded={isOpen}
                    >
                        <Menu size={18} />
                    </button>

                    {/* Divider */}
                    <span className="w-px h-5 bg-slate-200 dark:bg-[#2a3040] shrink-0" />
                </>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 min-w-0">
                    {!isOpen && (
                        <div className="flex items-center space-x-3 shrink-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shadow-lg"
                                style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                            >
                                {logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover p-1.5" />
                                ) : (
                                    <Map className="text-white w-4 h-4 transition-transform" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-slate-900 dark:text-slate-100 font-bold text-sm leading-tight">
                                    {brandWord1}<span style={{ color: themeColor }}>{brandWord2}</span>
                                </h2>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Admin Control</p>
                            </div>
                        </div>
                    )}
                    {!["/admin/barangays/list", "/admin/barangays/admins"].includes(pathname) && crumbsToRender.map((crumb, idx) => (
                        <React.Fragment key={`${crumb.seg}-${idx}`}>
                            <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
                            {crumb.isLast || !crumb.href ? (
                                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                                    {crumb.label}
                                </span>
                            ) : (
                                <Link href={crumb.href} className="hover:text-slate-800 dark:hover:text-slate-100 transition-colors truncate">
                                    {crumb.label}
                                </Link>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Right: User menu */}
            <div className="relative shrink-0" ref={dropdownRef}>
                <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                    {/* Avatar */}
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black text-white shadow"
                        style={{ backgroundColor: themeColor }}
                    >
                        {initials}
                    </div>
                    <div className="text-left hidden sm:block">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {session.user?.name || "Administrator"}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-tight">{session.user?.email || roleLabel}</p>
                    </div>
                    <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", dropdownOpen && "rotate-180")} />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-2xl shadow-slate-200/60 dark:shadow-black/40 overflow-hidden z-50">
                        {/* User info header */}
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-[#2a3040]">
                            <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-tight">{session.user?.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{session.user?.email}</p>
                        </div>

                        <div className="py-2 px-2 space-y-0.5">
                            {/* Dark Mode Toggle */}
                            <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                            >
                                {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-500" />}
                                <span className="font-medium">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                            </button>

                            {/* My Profile */}
                            <Link
                                href="/admin/users"
                                onClick={() => setDropdownOpen(false)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <User size={15} className="text-slate-500" />
                                <span className="font-medium">My Profile</span>
                            </Link>

                            {/* Settings */}
                            <Link
                                href="/admin/settings"
                                onClick={() => setDropdownOpen(false)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <Settings size={15} className="text-slate-500" />
                                <span className="font-medium">Settings</span>
                            </Link>
                        </div>

                        {/* Logout */}
                        <div className="px-2 pb-2 border-t border-slate-100 dark:border-[#2a3040] pt-1">
                            <button
                                onClick={() => signOut({ callbackUrl: window.location.origin + "/auth/login" })}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut size={15} />
                                <span className="font-medium">Log out</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.header>
    );
}
