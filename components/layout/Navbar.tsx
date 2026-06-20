"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
    Shield, Menu, X, LogIn, LogOut,
    ChevronDown, Briefcase, Sun, Moon,
    Newspaper, PhoneCall, Info,
    Compass, MapPin, Globe, Activity, Archive,
    Building2, Hammer, CreditCard, FileText, User,
    AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useBarangay } from "@/components/providers/BarangayProvider";
import { BarangaySelectionModal } from "@/components/shared/BarangaySelectionModal";

interface NavbarProps {
    logoUrl?: string;
    brandWord1?: string;
    brandWord2?: string;
    themeColor?: string;
    barangays?: string[];
    isMaintenanceActive?: boolean;
}

export function Navbar({
    logoUrl,
    brandWord1 = "E",
    brandWord2 = "Mapandan",
    themeColor = "#2563eb",
    barangays = [],
    isMaintenanceActive = false
}: NavbarProps) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = React.useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [isBarangayModalOpen, setIsBarangayModalOpen] = React.useState(false);
    const [isServicesHovered, setIsServicesHovered] = React.useState(false);
    const [isMobileServicesOpen, setIsMobileServicesOpen] = React.useState(false);
    const { selectedBarangay } = useBarangay();
    const { scrollY } = useScroll();
    const isTransparentNavPage = pathname === "/";
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const backgroundColor = useTransform(
        scrollY,
        [0, 60],
        [isTransparentNavPage ? "rgba(255, 255, 255, 0)" : "rgba(255, 255, 255, 0.95)", "rgba(255, 255, 255, 0.95)"]
    );

    const darkBackgroundColor = useTransform(
        scrollY,
        [0, 60],
        [isTransparentNavPage ? "rgba(10, 12, 16, 0)" : "rgba(10, 12, 16, 0.95)", "rgba(10, 12, 16, 0.95)"]
    );

    const backdropBlur = useTransform(
        scrollY,
        [0, 60],
        [isTransparentNavPage ? "blur(0px)" : "blur(20px)", "blur(20px)"]
    );

    const color = useTransform(
        scrollY,
        [0, 60],
        [isTransparentNavPage ? "rgba(255, 255, 255, 1)" : "rgba(15, 23, 42, 1)", "rgba(15, 23, 42, 1)"]
    );

    const darkColor = useTransform(
        scrollY,
        [0, 60],
        ["rgba(255, 255, 255, 1)", "rgba(255, 255, 255, 1)"]
    );

    const shadow = useTransform(
        scrollY,
        [0, 60],
        [isTransparentNavPage ? "none" : "0 4px 30px -10px rgba(0, 0, 0, 0.1)", "0 4px 30px -10px rgba(0, 0, 0, 0.1)"]
    );

    const borderOpacity = useTransform(scrollY, [0, 60], [isTransparentNavPage ? 0 : 1, 1]);

    const isAuth = status === "authenticated";
    const [activeSection, setActiveSection] = React.useState("");

    // EFFECT 1: Immediately sync active state from URL hash when pathname changes.
    // This handles cross-page navigation (e.g., /about → /#services) where
    // IntersectionObserver can't fire because sections haven't mounted yet.
    React.useEffect(() => {
        if (pathname === "/") {
            const hash = window.location.hash;
            if (hash) {
                setActiveSection(hash);
            }
        } else {
            setActiveSection("");
        }
    }, [pathname]);

    // EFFECT 2: IntersectionObserver for scroll-based active detection.
    // Handles same-page scrolling. Uses a retry loop because sections are
    // nextDynamic (lazy loaded) and may not exist in DOM immediately.
    React.useEffect(() => {
        if (pathname !== "/") return;

        const sectionIds = ["services", "tourism", "news", "careers", "hotlines", "reports"];
        const observers: IntersectionObserver[] = [];
        let retryTimer: ReturnType<typeof setTimeout>;

        const attachObservers = (attempt = 0) => {
            sectionIds.forEach((id) => {
                if (observers.some((o) => (o as any).__id === id)) return;
                const el = document.getElementById(id);
                if (!el) return;
                const observer = new IntersectionObserver(
                    ([entry]) => {
                        if (entry.isIntersecting) {
                            setActiveSection(`#${id}`);
                        }
                    },
                    { threshold: 0.25, rootMargin: "-96px 0px 0px 0px" }
                );
                (observer as any).__id = id;
                observer.observe(el);
                observers.push(observer);
            });

            const allFound = sectionIds.every((id) => document.getElementById(id));
            if (!allFound && attempt < 5) {
                retryTimer = setTimeout(() => attachObservers(attempt + 1), 500);
            }
        };

        attachObservers();

        return () => {
            observers.forEach((obs) => obs.disconnect());
            clearTimeout(retryTimer);
        };
    }, [pathname]);

    // Smart active link detection
    const isLinkActive = (href: string): boolean => {
        if (href.startsWith("/#")) {
            return pathname === "/" && activeSection === href.slice(1);
        }
        if (href === "/") return pathname === "/" && activeSection === "";
        return pathname === href || pathname.startsWith(href + "/");
    };

    // Scroll to section or navigate to page
    const handleNavClick = (e: React.MouseEvent, href: string) => {
        if (!href.startsWith("/#")) return;
        const id = href.slice(2);
        const el = document.getElementById(id);
        if (el) {
            e.preventDefault();
            const navbarHeight = 96;
            const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight;
            window.scrollTo({ top, behavior: "smooth" });
            window.history.pushState(null, "", `#${id}`);
            setActiveSection(`#${id}`);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const userRole = (session?.user as { role?: string })?.role;
    const userName = session?.user?.name || "Member";
    const userEmail = session?.user?.email || "";

    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Prevent body scroll when mobile menu is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    // Main nav links (no auth-specific links — those go in the dropdown)
    const mainLinks = [
        { name: "About", href: "/about", icon: Info },
        { name: "Services", href: "/#services", icon: Briefcase },
        { name: "Gallery", href: "/#tourism", icon: Compass },
        { name: "Updates", href: "/#news", icon: Newspaper },
        { name: "Careers", href: "/#careers", icon: Briefcase },
        { name: "Safety", href: "/#hotlines", icon: PhoneCall },
        { name: "Report", href: "/#reports", icon: AlertTriangle },
    ];

    const serviceCategories = [
        { name: "Civil Registry", href: "/user/services/civil-registry", desc: "Birth, Marriage, Death Certs & Endorsements", icon: FileText, color: "text-blue-500 bg-blue-500/10" },
        { name: "Business Permit", href: "/user/services/business-permit", desc: "Apply for New Business & Renewal Permits", icon: Building2, color: "text-emerald-500 bg-emerald-500/10" },
        { name: "Building Permit", href: "/user/services/building-permit", desc: "Construction, Electrical & Occupancy Permits", icon: Hammer, color: "text-amber-500 bg-amber-500/10" },
        { name: "Cedula (CTC)", href: "/user/services/cedula", desc: "Community Tax Certificate Issuance", icon: CreditCard, color: "text-indigo-500 bg-indigo-500/10" },
    ];

    // Dropdown-specific links (only shown when authenticated)
    const userDropdownLinks = [
        { name: "My Profile", href: "/user/resident-profile", icon: User },
        { name: "My Reports", href: "/user/reports", icon: Archive },
        { name: "My Requests", href: "/user/services/requests", icon: Activity },
    ];

    const activeTheme = mounted ? resolvedTheme : "light";
    const isDark = activeTheme === "dark";

    return (
        <motion.header
            style={{
                backgroundColor: isDark ? darkBackgroundColor : backgroundColor,
                backdropFilter: backdropBlur,
                boxShadow: shadow,
            }}
            className={cn(
                "fixed left-0 right-0 z-[100] transition-colors duration-300",
                isMaintenanceActive ? "top-10 sm:top-12 md:top-14" : "top-0"
            )}
        >
            <motion.div
                style={{ opacity: borderOpacity }}
                className="absolute inset-x-0 bottom-0 h-px bg-slate-200/50 dark:bg-white/5"
            />
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 md:h-24 flex items-center justify-between gap-2 sm:gap-4">

                {/* ── Logo ── */}
                <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg overflow-hidden relative"
                        style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                    >
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover p-1.5" />
                        ) : (
                            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        )}
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                    <div className="flex flex-col">
                        <motion.span
                            style={{ color: isDark ? darkColor : color }}
                            className="text-lg sm:text-2xl font-black uppercase tracking-tighter italic leading-none"
                        >
                            {brandWord1}<span style={{ color: themeColor }}>{brandWord2}</span>
                        </motion.span>
                        <motion.span
                            style={{ opacity: useTransform(scrollY, [0, 80], [0.7, 0.4]) }}
                            className="text-[7px] sm:text-[10px] uppercase font-bold tracking-[0.2em] mt-0.5 hidden sm:block text-slate-400 dark:text-slate-500"
                        >
                            Smart Municipality
                        </motion.span>
                    </div>
                </Link>

                {/* ── Desktop Navigation ── */}
                <nav className="hidden lg:flex items-center gap-0.5 bg-white/5 dark:bg-black/5 p-1 rounded-full backdrop-blur-sm">
                    {/* Jurisdiction Switcher */}
                    <button
                        onClick={() => setIsBarangayModalOpen(true)}
                        className="relative px-3 xl:px-5 py-2 group overflow-hidden flex items-center gap-1.5 transition-all hover:bg-slate-50 dark:hover:bg-white/5 rounded-full"
                    >
                        <MapPin
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: selectedBarangay !== "All" ? themeColor : undefined }}
                        />
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Jurisdiction</span>
                            <span
                                className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider"
                                style={{ color: selectedBarangay !== "All" ? themeColor : undefined }}
                            >
                                {selectedBarangay === "All" ? "Mapandan" : selectedBarangay}
                            </span>
                        </div>
                    </button>

                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1" />

                    {/* Main nav links */}
                    {mainLinks.map((link) => {
                        const isActive = isLinkActive(link.href);
                        if (link.name === "Services") {
                            return (
                                <div
                                    key={link.name}
                                    className="relative group/services"
                                    onMouseEnter={() => setIsServicesHovered(true)}
                                    onMouseLeave={() => setIsServicesHovered(false)}
                                >
                                    <button
                                        type="button"
                                        className="relative px-3 xl:px-4 py-2.5 pb-3 group overflow-hidden rounded-full flex items-center gap-1 xl:gap-1.5 transition-colors duration-200"
                                        style={{ color: isActive ? themeColor : undefined }}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute inset-0 rounded-full -z-0"
                                                style={{ backgroundColor: `${themeColor}18` }}
                                                initial={false}
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <div className="relative z-10 text-[10px] xl:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 xl:gap-1.5">
                                            <link.icon
                                                className={cn(
                                                    "w-3.5 h-3.5 transition-all duration-200",
                                                    isActive ? "opacity-100 scale-110" : "opacity-60 group-hover/services:opacity-100"
                                                )}
                                            />
                                            <motion.span style={{ color: isActive ? themeColor : (isDark ? darkColor : color) }}>
                                                {link.name}
                                            </motion.span>
                                            <ChevronDown className="w-3 h-3 text-slate-400 transition-transform duration-355 group-hover/services:rotate-180" />
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isServicesHovered && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                className="absolute left-1/2 -translate-x-1/2 top-[80%] pt-4 w-[340px] z-[120]"
                                            >
                                                <div 
                                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden p-3 grid grid-cols-1 gap-1.5"
                                                    style={{ boxShadow: "0 30px 60px -15px rgba(0,0,0,0.15)" }}
                                                >
                                                    {serviceCategories.map((cat) => (
                                                        <Link
                                                            key={cat.name}
                                                            href={cat.href}
                                                            className="flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group/item"
                                                        >
                                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover/item:scale-105 shadow-sm", cat.color)}>
                                                                <cat.icon className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex flex-col text-left">
                                                                <span className="text-[10px] xl:text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider leading-none">
                                                                    {cat.name}
                                                                </span>
                                                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold tracking-tight mt-1 leading-tight uppercase italic">
                                                                    {cat.desc}
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={(e) => handleNavClick(e, link.href)}
                                className="relative px-3 xl:px-4 py-2.5 pb-3 group overflow-hidden rounded-full"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 rounded-full -z-0"
                                        style={{ backgroundColor: `${themeColor}18` }}
                                        initial={false}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <div
                                    className="relative z-10 text-[10px] xl:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 xl:gap-1.5 transition-colors duration-200"
                                    style={{ color: isActive ? themeColor : undefined }}
                                >
                                    <link.icon
                                        className={cn(
                                            "w-3 h-3 xl:w-3.5 xl:h-3.5 transition-all duration-200",
                                            isActive ? "opacity-100 scale-110" : "opacity-60 group-hover:opacity-100"
                                        )}
                                    />
                                    <motion.span
                                        style={{ color: isActive ? themeColor : (isDark ? darkColor : color) }}
                                        className="group-hover:opacity-80 transition-opacity"
                                    >
                                        {link.name}
                                    </motion.span>
                                </div>
                                {/* Active bottom indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full"
                                        style={{ backgroundColor: themeColor }}
                                        initial={false}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* ── Desktop Right Actions ── */}
                <div className="hidden lg:flex items-center gap-2 shrink-0">
                    {isAuth ? (
                        /* ── User Avatar Dropdown ── */
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen((v) => !v)}
                                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 pl-1.5 pr-3 py-1.5 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 transition-all active:scale-95"
                            >
                                {/* Avatar */}
                                <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-black uppercase shadow-sm"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    {userName.charAt(0)}
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none">Member</span>
                                    <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[90px] leading-tight">{userName}</span>
                                </div>
                                <ChevronDown
                                    className={cn(
                                        "w-3.5 h-3.5 text-slate-400 transition-transform duration-300",
                                        isDropdownOpen && "rotate-180"
                                    )}
                                />
                            </button>

                            {/* Dropdown Panel */}
                            <AnimatePresence>
                                {isDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                        transition={{ type: "spring", damping: 28, stiffness: 400 }}
                                        className="absolute right-0 top-[calc(100%+10px)] w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden z-50"
                                        style={{ boxShadow: "0 20px 60px -10px rgba(0,0,0,0.2)" }}
                                    >
                                        {/* Header */}
                                        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black uppercase text-sm shadow-md"
                                                    style={{ backgroundColor: themeColor, boxShadow: `0 4px 12px ${themeColor}50` }}
                                                >
                                                    {userName.charAt(0)}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Authenticated</span>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{userName}</span>
                                                    <span className="text-[10px] text-slate-400 truncate">{userEmail}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-2">
                                            {/* Theme Toggle Row */}
                                            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    {isDark
                                                        ? <Moon className="w-4 h-4 text-slate-400" />
                                                        : <Sun className="w-4 h-4 text-slate-400" />
                                                    }
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                        {isDark ? "Dark Mode" : "Light Mode"}
                                                    </span>
                                                </div>
                                                {/* Toggle Switch */}
                                                <button
                                                    onClick={() => setTheme(isDark ? "light" : "dark")}
                                                    className={cn(
                                                        "w-10 h-5.5 rounded-full relative transition-all duration-300 flex items-center px-0.5",
                                                        isDark ? "bg-slate-700" : "bg-slate-200"
                                                    )}
                                                    style={isDark ? { backgroundColor: `${themeColor}80` } : undefined}
                                                >
                                                    <motion.div
                                                        layout
                                                        className="w-4 h-4 rounded-full bg-white shadow-sm"
                                                        animate={{ x: isDark ? 18 : 0 }}
                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    />
                                                </button>
                                            </div>

                                            <div className="h-px bg-slate-100 dark:bg-white/5 mx-3 my-1" />

                                            {/* My Profile */}
                                            <Link
                                                href="/user/resident-profile"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group",
                                                    isLinkActive("/user/resident-profile") && "bg-slate-50 dark:bg-white/5"
                                                )}
                                            >
                                                <User
                                                    className="w-4 h-4 transition-colors"
                                                    style={{ color: isLinkActive("/user/resident-profile") ? themeColor : undefined }}
                                                />
                                                <span
                                                    className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
                                                    style={{ color: isLinkActive("/user/resident-profile") ? themeColor : undefined }}
                                                >
                                                    My Profile
                                                </span>
                                                {isLinkActive("/user/resident-profile") && (
                                                    <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                                                )}
                                            </Link>

                                            {/* My Archive */}
                                            <Link
                                                href="/user/reports"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group",
                                                    isLinkActive("/user/reports") && "bg-slate-50 dark:bg-white/5"
                                                )}
                                            >
                                                <Archive
                                                    className="w-4 h-4 transition-colors"
                                                    style={{ color: isLinkActive("/user/reports") ? themeColor : undefined }}
                                                />
                                                <span
                                                    className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
                                                    style={{ color: isLinkActive("/user/reports") ? themeColor : undefined }}
                                                >
                                                    My Reports
                                                </span>
                                                {isLinkActive("/user/reports") && (
                                                    <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                                                )}
                                            </Link>

                                            {/* My Requests */}
                                            <Link
                                                href="/user/services/requests"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group",
                                                    isLinkActive("/user/services/requests") && "bg-slate-50 dark:bg-white/5"
                                                )}
                                            >
                                                <Activity
                                                    className="w-4 h-4 transition-colors"
                                                    style={{ color: isLinkActive("/user/services/requests") ? themeColor : undefined }}
                                                />
                                                <span
                                                    className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
                                                    style={{ color: isLinkActive("/user/services/requests") ? themeColor : undefined }}
                                                >
                                                    My Requests
                                                </span>
                                                {isLinkActive("/user/services/requests") && (
                                                    <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                                                )}
                                            </Link>

                                            <div className="h-px bg-slate-100 dark:bg-white/5 mx-3 my-1" />

                                            {/* Log Out */}
                                            <button
                                                onClick={() => { setIsDropdownOpen(false); signOut({ callbackUrl: window.location.origin + "/" }); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group"
                                            >
                                                <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-500 transition-colors" />
                                                <span className="text-sm font-semibold text-red-400 group-hover:text-red-500 transition-colors">Log out</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        /* ── Login Button ── */
                        <div className="flex items-center gap-2">
                            {/* Theme toggle for guest */}
                            <button
                                onClick={() => setTheme(isDark ? "light" : "dark")}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            >
                                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
                            <Link href="/auth/login" className="active:scale-95 transition-all">
                                <Button
                                    style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                                    className="text-white font-black uppercase tracking-widest px-5 xl:px-8 rounded-2xl h-10 xl:h-12 flex items-center gap-2 text-[10px] border-none"
                                >
                                    <LogIn className="w-4 h-4" />
                                    <span className="hidden xl:inline">Access Resident Hub</span>
                                    <span className="xl:hidden">Login</span>
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* ── Mobile/Tablet Controls ── */}
                <div className="flex lg:hidden items-center gap-2">
                    {/* Theme toggle */}
                    <button
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 transition-all"
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    {/* Hamburger */}
                    <button
                        className="w-9 h-9 flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-white/10 transition-all active:scale-95"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Toggle menu"
                    >
                        <motion.div style={{ color: isDark ? darkColor : color }}>
                            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </motion.div>
                    </button>
                </div>
            </div>

            {/* ── Premium Mobile Menu ── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.97 }}
                        transition={{ type: "spring", damping: 25, stiffness: 400 }}
                        className="absolute top-full left-0 right-0 h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] bg-white/97 dark:bg-slate-950/97 backdrop-blur-2xl border-t border-slate-100 dark:border-white/5 shadow-2xl flex flex-col"
                    >
                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="px-4 sm:px-6 py-5 flex flex-col gap-5 max-w-lg mx-auto">

                                {/* ── User Card (if authenticated) ── */}
                                {isAuth && (
                                    <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 overflow-hidden">
                                        {/* User Info */}
                                        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-white/5">
                                            <div
                                                className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-base font-black shadow-md"
                                                style={{ backgroundColor: themeColor, boxShadow: `0 4px 12px ${themeColor}40` }}
                                            >
                                                {userName.charAt(0)}
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Welcome Back</span>
                                                <span className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase truncate">{userName}</span>
                                                <span className="text-[10px] text-slate-400 truncate">{userEmail}</span>
                                            </div>
                                        </div>
                                        {/* User Quick Links */}
                                        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/5">
                                            {userDropdownLinks.map((link) => {
                                                const isActive = isLinkActive(link.href);
                                                return (
                                                    <Link
                                                        key={link.name}
                                                        href={link.href}
                                                        onClick={() => setIsOpen(false)}
                                                        className="flex flex-col items-center gap-1.5 py-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-all active:scale-95"
                                                    >
                                                        <div
                                                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                                                            style={{ backgroundColor: isActive ? themeColor : undefined }}
                                                        >
                                                            <link.icon
                                                                className="w-4 h-4"
                                                                style={{ color: isActive ? "#fff" : themeColor }}
                                                            />
                                                        </div>
                                                        <span
                                                            className="text-[10px] font-bold uppercase tracking-wide"
                                                            style={{ color: isActive ? themeColor : undefined }}
                                                        >
                                                            {link.name}
                                                        </span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* ── Barangay Switcher ── */}
                                <button
                                    onClick={() => { setIsBarangayModalOpen(true); setIsOpen(false); }}
                                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-between group active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                                            <MapPin className="w-5 h-5" style={{ color: themeColor }} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Select Jurisdiction</p>
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none"
                                                style={{ color: selectedBarangay !== "All" ? themeColor : undefined }}>
                                                {selectedBarangay === "All" ? "Municipality" : selectedBarangay}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/5">
                                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                </button>

                                {/* ── Main Nav Links ── */}
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Navigation</p>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {mainLinks.map((link) => {
                                            const isMobileActive = isLinkActive(link.href);
                                            if (link.name === "Services") {
                                                return (
                                                    <div key={link.name} className="flex flex-col gap-1">
                                                        <button
                                                            onClick={() => setIsMobileServicesOpen(!isMobileServicesOpen)}
                                                            className="flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98] w-full text-left"
                                                            style={isMobileActive
                                                                ? { borderColor: `${themeColor}40`, backgroundColor: `${themeColor}0d` }
                                                                : { borderColor: "transparent", backgroundColor: undefined }
                                                            }
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-slate-100 dark:bg-white/10"
                                                                    style={isMobileActive ? { backgroundColor: themeColor } : undefined}
                                                                >
                                                                    <link.icon
                                                                        className="w-4 h-4"
                                                                        style={{ color: isMobileActive ? "#fff" : themeColor }}
                                                                    />
                                                                </div>
                                                                <span
                                                                    className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white"
                                                                    style={isMobileActive ? { color: themeColor } : undefined}
                                                                >
                                                                    {link.name}
                                                                </span>
                                                            </div>
                                                            <ChevronDown
                                                                className={cn(
                                                                    "w-4 h-4 text-slate-400 transition-transform duration-250",
                                                                    isMobileServicesOpen && "rotate-180"
                                                                )}
                                                            />
                                                        </button>

                                                        <AnimatePresence>
                                                            {isMobileServicesOpen && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.25 }}
                                                                    className="overflow-hidden pl-4 pr-1 flex flex-col gap-1"
                                                                >
                                                                    {serviceCategories.map((cat) => (
                                                                        <Link
                                                                            key={cat.name}
                                                                            href={cat.href}
                                                                            onClick={() => {
                                                                                setIsOpen(false);
                                                                                setIsMobileServicesOpen(false);
                                                                            }}
                                                                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                                                        >
                                                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", cat.color)}>
                                                                                <cat.icon className="w-4 h-4" />
                                                                            </div>
                                                                            <div className="flex flex-col text-left">
                                                                                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider leading-none">
                                                                                    {cat.name}
                                                                                </span>
                                                                                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold tracking-tight mt-0.5 leading-tight uppercase italic">
                                                                                    {cat.desc}
                                                                                </span>
                                                                            </div>
                                                                        </Link>
                                                                    ))}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <Link
                                                    key={link.name}
                                                    href={link.href}
                                                    onClick={(e) => {
                                                        handleNavClick(e, link.href);
                                                        setIsOpen(false);
                                                    }}
                                                    className="flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98]"
                                                    style={isMobileActive
                                                        ? { borderColor: `${themeColor}40`, backgroundColor: `${themeColor}0d` }
                                                        : { borderColor: "transparent", backgroundColor: undefined }
                                                    }
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-slate-100 dark:bg-white/10"
                                                            style={isMobileActive ? { backgroundColor: themeColor } : undefined}
                                                        >
                                                            <link.icon
                                                                className="w-4 h-4"
                                                                style={{ color: isMobileActive ? "#fff" : themeColor }}
                                                            />
                                                        </div>
                                                        <span
                                                            className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white"
                                                            style={isMobileActive ? { color: themeColor } : undefined}
                                                        >
                                                            {link.name}
                                                        </span>
                                                    </div>
                                                    <ChevronDown
                                                        className="w-4 h-4 -rotate-90 text-slate-300"
                                                        style={isMobileActive ? { color: themeColor } : undefined}
                                                    />
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Sticky Footer ── */}
                        <div className="p-4 sm:p-6 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md border-t border-slate-100 dark:border-white/5 pb-8 sm:pb-6 flex flex-col gap-2">
                            {isAuth ? (
                                <Button
                                    onClick={() => signOut({ callbackUrl: window.location.origin + "/" })}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white h-12 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Log out
                                </Button>
                            ) : (
                                <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                                    <Button
                                        style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                                        className="w-full text-white h-12 rounded-xl font-bold uppercase tracking-wider text-xs shadow-xl active:scale-95 transition-all outline-none border-none"
                                    >
                                        Access Member Hub
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <BarangaySelectionModal
                isOpen={isBarangayModalOpen}
                onClose={() => setIsBarangayModalOpen(false)}
                barangays={barangays}
                themeColor={themeColor}
            />
        </motion.header>
    );
}
