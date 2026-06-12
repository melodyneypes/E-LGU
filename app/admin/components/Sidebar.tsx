"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import {
    LayoutDashboard, Users, Newspaper,
    Briefcase, MapPin, Map,
    UtensilsCrossed, Calendar, Phone, FolderKanban, BedDouble, AlertTriangle, Settings, Megaphone, UserCheck,
    ChevronDown, ChevronUp, LogOut, Search, Info, Church, CreditCard, Truck, HardHat, Moon, Sun,
    FileText
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";
import { motion } from "framer-motion";

interface SidebarProps {
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
}

export function Sidebar({
    session,
    logoUrl,
    brandWord1 = "E",
    brandWord2 = "Mapandan",
    themeColor = "#2563eb",
    pendingReportsCount = 0,
    pendingResidentsCount = 0,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    pendingTransactionsCount = 0
}: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = session?.user?.role || "ADMIN";
    const department = session?.user?.department;
    const { isOpen: isSidebarOpen, close } = useSidebar();
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(pathname.startsWith("/admin/settings"));
    const [isAboutOpen, setIsAboutOpen] = React.useState(pathname.startsWith("/admin/about"));
    const [isBarangaysOpen, setIsBarangaysOpen] = React.useState(pathname.startsWith("/admin/barangays"));
    const [isTreasuryOpen, setIsTreasuryOpen] = React.useState(pathname.startsWith("/admin/treasury") && !pathname.includes("/payment-settings"));
    const [isRegistrarOpen, setIsRegistrarOpen] = React.useState(pathname.startsWith("/admin/registrar"));
    const [searchQuery, setSearchQuery] = React.useState("");
    const [isEntranceComplete, setIsEntranceComplete] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const { theme, setTheme } = useTheme();
    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        setIsSettingsOpen(pathname.startsWith("/admin/settings"));
        setIsAboutOpen(pathname.startsWith("/admin/about"));
        setIsBarangaysOpen(pathname.startsWith("/admin/barangays"));
        setIsTreasuryOpen(pathname.startsWith("/admin/treasury") && !pathname.includes("/payment-settings"));
        setIsRegistrarOpen(pathname.startsWith("/admin/registrar"));
    }, [pathname]);

    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const scrollToActive = React.useCallback((behavior: "smooth" | "instant" = "smooth") => {
        const container = scrollContainerRef.current;
        const activeElement = document.getElementById("active-sidebar-link");
        if (container && activeElement) {
            const containerRect = container.getBoundingClientRect();
            const elementRect = activeElement.getBoundingClientRect();

            // Calculate center scroll offset relative to the container boundaries
            const relativeTop = elementRect.top - containerRect.top;
            const targetScrollTop = container.scrollTop + relativeTop - (containerRect.height / 2) + (elementRect.height / 2);

            container.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior
            });
        }
    }, []);

    React.useEffect(() => {
        if (!mounted) return;

        // Perform an instant scroll right away so it is positioned correctly as early as possible
        scrollToActive("instant");

        // Set up sequential timers to ensure perfect alignment as animations and dynamic heights settle
        const timers = [
            setTimeout(() => scrollToActive("smooth"), 100),
            setTimeout(() => scrollToActive("smooth"), 300),
            setTimeout(() => scrollToActive("smooth"), 600),
            setTimeout(() => scrollToActive("smooth"), 1000)
        ];

        return () => {
            timers.forEach(clearTimeout);
        };
    }, [pathname, mounted, isSettingsOpen, isAboutOpen, isBarangaysOpen, isTreasuryOpen, scrollToActive]);

    const allMenuItems = [
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        {
            label: "Website Settings",
            icon: Settings,
            category: "Website Control",
            isDropdown: true,
            isOpen: isSettingsOpen,
            onToggle: () => setIsSettingsOpen(!isSettingsOpen),
            subItems: [
                { href: "/admin/settings?tab=general", label: "General" },
                // { href: "/admin/settings?tab=login", label: "Login Branding" },
                { href: "/admin/settings?tab=hero", label: "Hero Carousel" },
                { href: "/admin/settings?tab=credentials", label: "Credentials" },
                { href: "/admin/settings?tab=sections", label: "Landing Sections" },
            ]
        },
        {
            label: "About Us Content",
            icon: Info,
            category: "Website Control",
            isDropdown: true,
            isOpen: isAboutOpen,
            onToggle: () => setIsAboutOpen(!isAboutOpen),
            subItems: [
                { href: "/admin/about", label: "Platform Info" },
                { href: "/admin/about/past-mayors", label: role === "BARANGAY_ADMIN" ? "Past Captains" : "Past Mayors" },
            ]
        },
        {
            label: "Barangays Mgmt",
            icon: Map,
            category: "Infrastructure",
            isDropdown: true,
            isOpen: isBarangaysOpen,
            onToggle: () => setIsBarangaysOpen(!isBarangaysOpen),
            subItems: [
                { href: "/admin/barangays/list", label: "Add/Edit Barangays" },
                { href: "/admin/barangays/admins", label: "Add Barangay Admins" },
            ]
        },
        { href: "/admin/announcements", label: "Announcements", icon: Megaphone, category: "Content" },
        { href: "/admin/news", label: "News & Updates", icon: Newspaper },
        { href: "/admin/events", label: "Events", icon: Calendar },
        { href: "/admin/projects", label: "LGU Projects", icon: FolderKanban },
        { href: "/admin/dining", label: "Kainan (Dining)", icon: UtensilsCrossed },
        { href: "/admin/accommodation", label: "Tuluyan (Stay)", icon: BedDouble },
        { href: "/admin/tourism", label: "Gallery", icon: Map },
        { href: "/admin/church", label: "Church Management", icon: Church },
        { href: "/admin/reports", label: "Public Reports", icon: AlertTriangle, category: "Management", badge: pendingReportsCount },
        { href: "/admin/logistics", label: "Logistics Control", icon: Truck, category: "Management" },
        { href: "/admin/jobs", label: "Job Postings", icon: Briefcase },
        { href: "/admin/officials", label: "Council Members", icon: Users },
        { href: "/admin/hotlines", label: "Hotlines", icon: Phone },
        // { href: "/admin/settings?tab=hero", label: "Banner Slider", icon: Layers, category: "Content" },
        { href: "/admin/resident-approvals", label: "Resident Approvals", icon: UserCheck, category: "Resident Management", badge: pendingResidentsCount },
        { href: "/admin/residents", label: "Resident Registry", icon: Users },
        // { href: "/admin/services", label: "Barangay Services", icon: ClipboardList, category: "Citizens & Services" },
        { href: "/admin/households", label: "Household Map", icon: MapPin, category: "Data & Analysis" },
        {
            label: "Registrar Hub",
            icon: FileText,
            category: "Registrar",
            isDropdown: true,
            isOpen: isRegistrarOpen,
            onToggle: () => {
                if (isRegistrarOpen) {
                    setIsRegistrarOpen(false);
                } else {
                    setIsRegistrarOpen(true);
                    router.push("/admin/registrar?category=Birth Registration");
                }
            },
            subItems: [
                { href: "/admin/registrar?category=Birth Registration", label: "Birth Registration" },
                { href: "/admin/registrar?category=Birth Certificate", label: "Birth Certificate" },
                { href: "/admin/registrar?category=Birth PSA Endorsement", label: "PSA Endorsement" },
                { href: "/admin/registrar?category=Death Registration", label: "Death Registration" },
                { href: "/admin/registrar?category=Death Certificate", label: "Death Certificate" },
                { href: "/admin/registrar?category=Marriage License", label: "Marriage License" },
                { href: "/admin/registrar?category=Marriage Registration", label: "Marriage Registration" },
                { href: "/admin/registrar?category=Marriage Certificate", label: "Marriage Certificate" },
            ]
        },
        {
            label: "Treasury Hub",
            icon: LayoutDashboard,
            category: "Treasury",
            isDropdown: true,
            isOpen: isTreasuryOpen,
            onToggle: () => {
                if (isTreasuryOpen) {
                    setIsTreasuryOpen(false);
                } else {
                    setIsTreasuryOpen(true);
                    router.push("/admin/treasury?category=CEDULA");
                }
            },
            subItems: [
                { href: "/admin/treasury?category=CEDULA", label: "CEDULA" },
                { href: "/admin/treasury?category=Business Permit", label: "Business Permit" },
                { href: "/admin/treasury?category=Civil Registry", label: "Civil Registry" },
                { href: "/admin/treasury?category=Building Permit", label: "Building Permit" },
            ]
        },
        { href: "/admin/treasury/payments", label: "Payments Ledger", icon: CreditCard, category: "Treasury" },
        { href: "/admin/bplo", label: "BPLO Permits", icon: CreditCard, category: "Treasury" },
        { href: "/admin/treasury/payment-settings", label: "Payment Settings", icon: CreditCard, category: "Treasury" },
        { href: "/admin/users", label: "User Accounts", icon: UserCheck, category: "Security & Accounts" },
    ];

    const contentAdminAllowed = [
        "Dashboard",
        "About Us Content",
        "Announcements",
        "News & Updates",
        "Events",
        "LGU Projects",
        "Kainan (Dining)",
        "Tuluyan (Stay)",
        "Gallery",
        "Job Postings",
        "Typhoon Alerts"
    ];

    const barangayAdminAllowed = [
        "Dashboard",
        "About Us Content",
        "Announcements",
        "News & Updates",
        "Events",
        "LGU Projects",
        "Kainan (Dining)",
        "Tuluyan (Stay)",
        "Gallery",
        "Church Management",
        "Job Postings",
        "Council Members",
        "Resident Approvals",
        "Resident Registry",
        // "Barangay Services",
        // "Banner Slider",
        "Household Map"
    ];

    let menuItems = allMenuItems;

    if (role === "ADMIN") {
        if (department) {
            const deptUpper = department.toUpperCase();
            if (deptUpper === "BPLO") {
                menuItems = [
                    { href: "/admin/bplo", label: "BPLO Permits", icon: CreditCard, category: "Treasury" }
                ];
            } else if (deptUpper === "REGISTRAR" || deptUpper === "CIVIL_REGISTRY") {
                const registrarHubItem = allMenuItems.find(item => item.label === "Registrar Hub");
                menuItems = [
                    ...(registrarHubItem ? [registrarHubItem] : [])
                ];
            } else if (deptUpper === "TREASURY") {
                menuItems = allMenuItems.filter(item => 
                    ["Treasury Hub", "Payments Ledger", "Payment Settings"].includes(item.label)
                );
            } else if (deptUpper === "LGU") {
                menuItems = allMenuItems.filter(item => 
                    !["Registrar Hub", "Treasury Hub", "Payments Ledger", "BPLO Permits", "Payment Settings"].includes(item.label)
                );
            } else {
                menuItems = [
                    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }
                ];
            }
        } else {
            // ADMIN without department gets allMenuItems
            menuItems = allMenuItems;
        }
    } else if (role === "CONTENT_ADMIN") {
        menuItems = allMenuItems.filter(item => contentAdminAllowed.includes(item.label));
    } else if (role === "BARANGAY_ADMIN") {
        menuItems = allMenuItems.filter(item => barangayAdminAllowed.includes(item.label));
    } else if (role === "TREASURY_STAFF") {
        menuItems = allMenuItems.filter(item => ["Treasury Hub", "Payments Ledger", "Payment Settings"].includes(item.label));
    } else if (role === "ADMIN_AIDE") {
        menuItems = allMenuItems.filter(item => ["BPLO Permits"].includes(item.label));
    } else if (role === "ENGINEER") {
        menuItems = [{ href: "/admin/engineer", label: "Engineer Hub", icon: HardHat, category: "Engineering" }];
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredMenuItems = React.useMemo(() => {
        if (!normalizedQuery) return menuItems;
        return menuItems.filter((item) => {
            const label = (item.label || "").toLowerCase();
            if (label.includes(normalizedQuery)) return true;
            if (item.subItems) {
                return item.subItems.some((sub) => (sub.label || "").toLowerCase().includes(normalizedQuery));
            }
            return false;
        });
    }, [menuItems, normalizedQuery]);

    return (
        <>
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={close}
                />
            )}

            <motion.aside
                initial={isEntranceComplete ? undefined : { x: "-100%" }}
                animate={isEntranceComplete ? undefined : { x: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                onAnimationComplete={() => setIsEntranceComplete(true)}
                className={cn(
                    "fixed md:static inset-y-0 left-0 flex-shrink-0 z-40 bg-white dark:bg-[#1e2330] border-r border-slate-200 dark:border-[#2a3040] overflow-hidden",
                    isEntranceComplete && "transition-all duration-300",
                    isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:translate-x-0 md:w-0"
                )}
            >
                <div className="w-64 h-full flex flex-col justify-between">
                    <div ref={scrollContainerRef} className="overflow-y-auto custom-scrollbar flex-1 pb-4">
                        {/* Logo & Branding */}
                        <div className="sticky top-0 z-20 bg-white dark:bg-[#1e2330] border-b border-slate-100 dark:border-[#2a3040]">
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg"
                                            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                                        >
                                            {logoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover p-1.5" />
                                            ) : (
                                                <Map className="text-white w-5 h-5 transition-transform group-hover:rotate-12" />
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-slate-900 dark:text-slate-100 font-bold text-lg leading-tight">
                                                {brandWord1}<span style={{ color: themeColor }}>{brandWord2}</span>
                                            </h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Admin Control</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Search bar */}
                                <div className="mt-4">
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                            <Search size={16} />
                                        </div>
                                        <input
                                            type="search"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search menu..."
                                            aria-label="Search navigation"
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1724] text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-white/10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <nav className="px-4 space-y-1">
                            {filteredMenuItems.length === 0 && (
                                <div className="px-3 pt-4 text-sm text-slate-500 dark:text-slate-400">No menu items found.</div>
                            )}

                            {filteredMenuItems.map((item, idx) => {
                                const Icon = item.icon;
                                // Only show category if it's different from the previous filtered item
                                const showCategory = item.category && (idx === 0 || filteredMenuItems[idx - 1].category !== item.category);

                                if (item.isDropdown) {
                                    const parentMatches = normalizedQuery && item.label?.toLowerCase().includes(normalizedQuery);
                                    const subMatches = normalizedQuery
                                        ? item.subItems?.filter((sub) => (sub.label || "").toLowerCase().includes(normalizedQuery))
                                        : item.subItems;
                                    const showDropdown = item.isOpen || (normalizedQuery && ((parentMatches) || (subMatches && subMatches.length > 0)));

                                    return (
                                        <div key={idx}>
                                            {showCategory && (
                                                <div className="pt-6 pb-2 px-3">
                                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic opacity-50">{item.category}</p>
                                                </div>
                                            )}
                                            <button
                                                onClick={item.onToggle}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-all duration-200 group",
                                                    item.isOpen ? "bg-slate-50 dark:bg-white/5" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                                                )}
                                                style={{ color: item.isOpen ? themeColor : undefined }}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Icon size={18} style={{ color: item.isOpen ? themeColor : undefined }} className={cn(!item.isOpen && "text-slate-500")} />
                                                    <span className="text-sm">{item.label}</span>
                                                </div>
                                                {item.isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>

                                            {showDropdown && (
                                                <div className="mt-1 ml-4 pl-4 border-l border-slate-200 dark:border-[#2a3040] space-y-1">
                                                    {(normalizedQuery && !parentMatches ? subMatches : item.subItems)?.map((sub) => {
                                                        const currentCategory = searchParams.get("category") || "ALL";
                                                        const currentTab = searchParams.get("tab") || "general";

                                                        const urlObj = new URL(sub.href, "http://localhost");
                                                        const subCategory = urlObj.searchParams.get("category");
                                                        const subTab = urlObj.searchParams.get("tab");

                                                        const isSubActive = (
                                                            pathname === urlObj.pathname ||
                                                            (pathname.startsWith("/admin/treasury/") && !pathname.includes("/payment-settings") && !pathname.includes("/payments") && urlObj.pathname === "/admin/treasury") ||
                                                            (pathname.startsWith("/admin/registrar/") && urlObj.pathname === "/admin/registrar")
                                                        ) &&
                                                            (subCategory ? currentCategory === subCategory : true) &&
                                                            (subTab ? currentTab === subTab : true);
                                                        return (
                                                            <Link
                                                                key={sub.href}
                                                                id={isSubActive ? "active-sidebar-link" : undefined}
                                                                href={sub.href}
                                                                className={cn(
                                                                    "block px-3 py-2 text-xs font-medium rounded-lg transition-all",
                                                                    isSubActive
                                                                        ? "font-bold"
                                                                        : "text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                                                                )}
                                                                style={{
                                                                    color: isSubActive ? themeColor : undefined,
                                                                    backgroundColor: isSubActive ? `${themeColor}15` : undefined
                                                                }}
                                                            >
                                                                {sub.label}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                const isActive = pathname === item.href;
                                return (
                                    <React.Fragment key={item.href || idx}>
                                        {showCategory && (
                                            <div className="pt-6 pb-2 px-3">
                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic opacity-50">{item.category}</p>
                                            </div>
                                        )}
                                        <Link
                                            href={item.href || "#"}
                                            id={isActive ? "active-sidebar-link" : undefined}
                                            className={cn(
                                                "flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-all duration-200 group",
                                                isActive
                                                    ? "text-white shadow-lg font-bold"
                                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#2a3040]"
                                            )}
                                            style={{
                                                backgroundColor: isActive ? themeColor : undefined,
                                                boxShadow: isActive ? `0 10px 15px -3px ${themeColor}44` : undefined
                                            }}
                                        >
                                            <div className="flex items-center space-x-3">
                                                {Icon && <Icon size={18} className={cn(isActive ? "text-white" : "text-slate-500 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300")} />}
                                                <span className="text-sm">{item.label}</span>
                                            </div>
                                            {item.badge && (
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                    isActive ? "bg-white" : "bg-red-500 text-white"
                                                )} style={{ color: isActive ? themeColor : undefined }}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </Link>
                                    </React.Fragment>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-[#2a3040]">
                        <div className="flex items-center justify-between px-3 py-3">
                            <div className="flex items-center space-x-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-lg relative overflow-hidden"
                                    style={{ backgroundColor: themeColor, boxShadow: `0 4px 6px -1px ${themeColor}44` }}
                                >
                                    {session.user?.name?.charAt(0) || "A"}
                                    <div className="absolute inset-0 bg-white/10" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-slate-200 leading-none uppercase italic tracking-tighter">
                                        {session.user?.name}
                                    </p>
                                    <p
                                        className="text-[10px] text-slate-500 mt-1 hover:opacity-80 cursor-pointer transition-colors font-bold uppercase tracking-widest"
                                        style={{ color: themeColor }}
                                    >
                                        {role === "CONTENT_ADMIN"
                                            ? "Content Admin"
                                            : role === "BARANGAY_ADMIN"
                                                ? `Brgy. ${session?.user?.managedBarangay || "Admin"}`
                                                : role === "TREASURY_STAFF"
                                                    ? "Treasury Staff"
                                                    : role === "ADMIN_AIDE"
                                                        ? "Admin Aide"
                                                        : role === "ENGINEER"
                                                            ? "Municipal Engineer"
                                                            : "Admin System"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Toggle Theme"
                                >
                                    {!mounted ? (
                                        <div className="w-[18px] h-[18px]" />
                                    ) : theme === "dark" ? (
                                        <Sun size={18} className="text-amber-400" />
                                    ) : (
                                        <Moon size={18} />
                                    )}
                                </button>
                                <button
                                    onClick={() => signOut({ callbackUrl: window.location.origin + "/auth/login" })}
                                    className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Log Out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.aside>
        </>
    );
}
