"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import {
    LayoutDashboard, Users, Newspaper,
    Briefcase, MapPin, Map,
    UtensilsCrossed, Calendar, Phone, FolderKanban, BedDouble, AlertTriangle, Settings, Megaphone, UserCheck,
    ChevronDown, ChevronUp, LogOut, Search, Info, Church, CreditCard, Truck, HardHat, Moon, Sun,
    FileText, BarChart3, ShieldAlert, Activity, Package, Car, Trophy, DollarSign, Store, Scale,
    FolderArchive, MessageSquareHeart, Boxes, Pill, LayoutTemplate, FileWarning
} from "lucide-react";
import { logoutToLogin } from "@/components/auth/logout-to-login";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";
import { motion, AnimatePresence } from "framer-motion";
import { getBploInspectionCount, getUnviewedLcrCounts, getTransactionTypes, getSystemSettingsAction } from "@/app/admin/transactions/actions";
import { getPendingReportsCount } from "@/app/admin/actions";
import { getRHUEquipmentNotificationCount } from "@/app/admin/rhu/equipment/actions";
import { getRHUCheckedInVitalsCount } from "@/app/admin/rhu/actions";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface SidebarProps {
    session: {
        user?: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
            managedBarangay?: string | null;
            department?: string | null;
            accessiblePages?: string[];
        };
    };
    logoUrl?: string;
    brandWord1?: string;
    brandWord2?: string;
    themeColor?: string;
    pendingReportsCount?: number;
    pendingResidentsCount?: number;
    pendingTransactionsCount?: number;
    pendingAnnouncementsCount?: number;
    unviewedLcrCounts?: Record<string, number>;
    bploInspectionCount?: number;
    rhuCenterName?: string | null;
    rhuEquipmentCount?: number;
    rhuVitalsCount?: number;
}

export function Sidebar({
    session,
    logoUrl,
    brandWord1 = "E",
    brandWord2 = "",
    themeColor = "#2563eb",
    pendingReportsCount = 0,
    pendingResidentsCount = 0,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    pendingTransactionsCount = 0,
    pendingAnnouncementsCount = 0,
    unviewedLcrCounts = {},
    bploInspectionCount: initialBploInspectionCount = 0,
    rhuCenterName = null,
    rhuEquipmentCount = 0,
    rhuVitalsCount = 0
}: SidebarProps) {
    const rhuLabel = React.useMemo(() => {
        if (!rhuCenterName) return "Rural Health Unit";
        if (rhuCenterName.toUpperCase().startsWith("RHU") || rhuCenterName.toLowerCase().includes("rural health unit")) {
            return rhuCenterName;
        }
        return `RHU ${rhuCenterName}`;
    }, [rhuCenterName]);

    const rhuCategory = React.useMemo(() => {
        if (!rhuCenterName) return "Rural Health Unit";
        if (rhuCenterName.toUpperCase().startsWith("RHU") || rhuCenterName.toLowerCase().includes("rural health unit")) {
            return rhuCenterName.toUpperCase();
        }
        return `RHU ${rhuCenterName.toUpperCase()}`;
    }, [rhuCenterName]);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = session?.user?.role || "ADMIN";
    const department = session?.user?.department;

    const isRhuRole = React.useMemo(() => [
        "ADMIN",
        "RHU_ADMIN",
        "RHU_CENTER_ADMIN",
        "RHU_DOCTOR",
        "RHU_STAFF",
        "RHU_PHARMACY"
    ].includes(role), [role]);

    const isLcrRole = React.useMemo(() => [
        "ADMIN",
        "ADMIN_AIDE",
        "ASST_SEC"
    ].includes(role) || Boolean(department?.includes("REGISTRAR") || department?.includes("LCR")), [role, department]);

    const isReportsRole = React.useMemo(() => [
        "ADMIN",
        "MDRRMO_ADMIN",
        "BARANGAY_ADMIN"
    ].includes(role) || Boolean(department?.includes("MDRRMO") || department?.includes("DISASTER")), [role, department]);
    const { isOpen: isSidebarOpen, close } = useSidebar();
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(pathname.startsWith("/admin/settings"));
    const [isAboutOpen, setIsAboutOpen] = React.useState(pathname.startsWith("/admin/about"));
    const [isBarangaysOpen, setIsBarangaysOpen] = React.useState(pathname.startsWith("/admin/barangays"));
    const [isAnnouncementsOpen, setIsAnnouncementsOpen] = React.useState(pathname.startsWith("/admin/announcements"));
    const [isRegistrarOpen, setIsRegistrarOpen] = React.useState(
        pathname.startsWith("/admin/registrar") &&
        !pathname.startsWith("/admin/registrar/ledger") &&
        !pathname.startsWith("/admin/registrar/appointment-settings") &&
        !pathname.startsWith("/admin/registrar/archive") &&
        !pathname.startsWith("/admin/registrar/feedback") &&
        !pathname.startsWith("/admin/registrar/queue")
    );

    const [searchQuery, setSearchQuery] = React.useState("");
    const [isEntranceComplete, setIsEntranceComplete] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [liveLcrCounts, setLiveLcrCounts] = React.useState<Record<string, number>>(unviewedLcrCounts);
    const [liveReportsCount, setLiveReportsCount] = React.useState(pendingReportsCount);
    const [livePendingAnnouncementsCount, setLivePendingAnnouncementsCount] = React.useState(pendingAnnouncementsCount);
    const [liveRhuEquipmentCount, setLiveRhuEquipmentCount] = React.useState(rhuEquipmentCount);
    const [liveRhuVitalsCount, setLiveRhuVitalsCount] = React.useState(rhuVitalsCount);
    const prevVitalsCountRef = React.useRef(rhuVitalsCount);

    React.useEffect(() => {
        setLiveLcrCounts(unviewedLcrCounts);
    }, [unviewedLcrCounts]);

    React.useEffect(() => {
        setLiveReportsCount(pendingReportsCount);
    }, [pendingReportsCount]);

    React.useEffect(() => {
        setLivePendingAnnouncementsCount(pendingAnnouncementsCount);
    }, [pendingAnnouncementsCount]);

    React.useEffect(() => {
        setLiveRhuEquipmentCount(rhuEquipmentCount);
    }, [rhuEquipmentCount]);

    React.useEffect(() => {
        setLiveRhuVitalsCount(rhuVitalsCount);
        prevVitalsCountRef.current = rhuVitalsCount;
    }, [rhuVitalsCount]);
    const [isTreasuryOpen, setIsTreasuryOpen] = React.useState(pathname.startsWith("/admin/treasury") && !pathname.includes("/payment-settings") && !pathname.includes("/appointment-settings"));
    const [isMarketStallsOpen, setIsMarketStallsOpen] = React.useState(pathname.startsWith("/admin/bplo/stall-registration"));
    const [isRHUOpen, setIsRHUOpen] = React.useState(pathname.startsWith("/admin/rhu") && !pathname.startsWith("/admin/rhu/appointment-settings"));
    const [isMDRRMOOpen, setIsMDRRMOOpen] = React.useState(pathname.startsWith("/admin/mdrrmo"));

    const [resolvedThemeColor, setResolvedThemeColor] = React.useState(themeColor || "#2563eb");
    const [resolvedLogoUrl, setResolvedLogoUrl] = React.useState(logoUrl);
    const [resolvedBrandWord1, setResolvedBrandWord1] = React.useState(brandWord1 || "E");
    const [resolvedBrandWord2, setResolvedBrandWord2] = React.useState(brandWord2 || "");

    const fetchThemeSettings = React.useCallback(async () => {
        try {
            const res = await getSystemSettingsAction(["theme_color", "brand_word_1", "brand_word_2", "site_logo"]);
            if (res && res.success && res.data) {
                if (res.data.theme_color) setResolvedThemeColor(res.data.theme_color);
                if (res.data.brand_word_1) setResolvedBrandWord1(res.data.brand_word_1);
                if (res.data.brand_word_2 !== undefined) setResolvedBrandWord2(res.data.brand_word_2);
                if (res.data.site_logo) setResolvedLogoUrl(res.data.site_logo);
            }
        } catch (err) {
            console.error("[Sidebar] Error fetching theme settings:", err);
        }
    }, []);

    React.useEffect(() => {
        if (themeColor) setResolvedThemeColor(themeColor);
        if (logoUrl) setResolvedLogoUrl(logoUrl);
        if (brandWord1) setResolvedBrandWord1(brandWord1);
        if (brandWord2 !== undefined) setResolvedBrandWord2(brandWord2);
    }, [themeColor, logoUrl, brandWord1, brandWord2]);

    React.useEffect(() => {
        if (!supabase) return;
        let channel: any;
        try {
            channel = supabase
                .channel("sidebar-system-settings-realtime")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "SystemSetting",
                    },
                    () => {
                        fetchThemeSettings();
                    }
                )
                .subscribe();
        } catch (error) {
            console.warn("[Sidebar SystemSettings Realtime] Setup error:", error);
        }

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [fetchThemeSettings]);

    const { theme, setTheme } = useTheme();
    React.useEffect(() => {
        setMounted(true);
    }, []);

    const [activeTypes, setActiveTypes] = React.useState<any[] | null>(null);

    React.useEffect(() => {
        getTransactionTypes().then(res => {

            if (res.success && res.data) {
                setActiveTypes(res.data);
            }
        }).catch(err => {
            console.error("[Sidebar] Error fetching active transaction types:", err);
        });
    }, []);

    const [bploInspectionCount, setBploInspectionCount] = React.useState(initialBploInspectionCount);

    React.useEffect(() => {
        setBploInspectionCount(initialBploInspectionCount);
    }, [initialBploInspectionCount]);

    const fetchBploCount = React.useCallback(async () => {
        try {
            const res = await getBploInspectionCount();
            if (res && res.success) {
                setBploInspectionCount(res.count ?? 0);
            }
        } catch (err) {
            console.error("Error fetching sidebar BPLO count:", err);
        }
    }, []);

    React.useEffect(() => {
        if (role !== "ADMIN" && role !== "ADMIN_AIDE") return;

        if (!supabase) return;
        let channel: any;
        try {
            channel = supabase
                .channel("sidebar-bplo-realtime")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "Transaction",
                    },
                    () => {
                        fetchBploCount();
                    }
                )
                .subscribe();
        } catch (error) {
            console.warn("Failed to setup sidebar realtime:", error);
        }

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [fetchBploCount, role]);

    const fetchLcrCounts = React.useCallback(async () => {
        try {
            const res = await getUnviewedLcrCounts();
            if (res && res.success && res.data) {
                setLiveLcrCounts(res.data);
            }
        } catch (err: any) {
            if (err?.name !== "AbortError" && !err?.message?.includes("Failed to fetch")) {
                console.error("[LCR Sidebar] Error fetching LCR count:", err);
            }
        }
    }, []);

    React.useEffect(() => {
        if (isLcrRole && pathname.startsWith("/admin/registrar")) {
            fetchLcrCounts();
        }
    }, [pathname, fetchLcrCounts, isLcrRole]);

    React.useEffect(() => {
        if (!isLcrRole || !supabase) return;
        let channel: any;
        let debounceTimer: NodeJS.Timeout | null = null;
        try {
            channel = supabase
                .channel("sidebar-lcr-realtime")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "Transaction",
                    },
                    () => {
                        if (debounceTimer) clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            fetchLcrCounts();
                        }, 1000);
                    }
                )
                .subscribe();
        } catch (error) {
            console.warn("[LCR Realtime] Failed to setup subscription:", error);
        }

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [fetchLcrCounts, isLcrRole]);

    const fetchReportsCount = React.useCallback(async () => {
        try {
            const res = await getPendingReportsCount();
            if (res && res.success) {
                setLiveReportsCount(res.count ?? 0);
            }
        } catch (err) {
            console.error("[Sidebar Reports Realtime] Error fetching count:", err);
        }
    }, []);

    React.useEffect(() => {
        if (isReportsRole && (pathname.startsWith("/admin/reports") || pathname.startsWith("/admin/mdrrmo"))) {
            fetchReportsCount();
        }
    }, [pathname, fetchReportsCount, isReportsRole]);

    React.useEffect(() => {
        if (!isReportsRole || !supabase) return;
        let channel: any;
        let debounceTimer: NodeJS.Timeout | null = null;

        try {
            channel = supabase
                .channel("sidebar-reports-realtime")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "Report",
                    },
                    () => {
                        if (debounceTimer) clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            fetchReportsCount();
                        }, 1000);
                    }
                )
                .subscribe();
        } catch (error) {
            console.warn("[Sidebar Reports Realtime] Setup error:", error);
        }

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [fetchReportsCount, isReportsRole]);

    const fetchRhuEquipmentCount = React.useCallback(async () => {
        try {
            const res = await getRHUEquipmentNotificationCount();
            if (res && res.success) {
                setLiveRhuEquipmentCount(res.count ?? 0);
            }
        } catch (err) {
            console.error("[Sidebar RHU Realtime] Error fetching count:", err);
        }
    }, []);

    React.useEffect(() => {
        if (isRhuRole && pathname.startsWith("/admin/rhu")) {
            fetchRhuEquipmentCount();
        }
    }, [pathname, fetchRhuEquipmentCount, isRhuRole]);

    React.useEffect(() => {
        if (!isRhuRole) return;
        const handleUpdate = () => {
            fetchRhuEquipmentCount();
        };
        window.addEventListener("rhu-equipment-updated", handleUpdate);
        return () => window.removeEventListener("rhu-equipment-updated", handleUpdate);
    }, [fetchRhuEquipmentCount, isRhuRole]);

    React.useEffect(() => {
        if (!isRhuRole || !supabase) return;
        let channel: any;
        let debounceTimer: NodeJS.Timeout | null = null;

        try {
            channel = supabase
                .channel("sidebar-rhu-equipment-realtime")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "EquipmentStockTransfer",
                    },
                    () => {
                        if (debounceTimer) clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            fetchRhuEquipmentCount();
                        }, 500);
                    }
                )
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "EquipmentRequestOrder",
                    },
                    () => {
                        if (debounceTimer) clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            fetchRhuEquipmentCount();
                        }, 500);
                    }
                )
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "EquipmentStockReturnTicket",
                    },
                    () => {
                        if (debounceTimer) clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            fetchRhuEquipmentCount();
                        }, 500);
                    }
                )
                .subscribe();
        } catch (error) {
            console.warn("[Sidebar RHU Realtime] Setup error:", error);
        }

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [fetchRhuEquipmentCount, isRhuRole]);

    const fetchVitalsCount = React.useCallback(async () => {
        try {
            const res = await getRHUCheckedInVitalsCount();
            if (res && res.success) {
                const newCount = res.count ?? 0;
                if (newCount > prevVitalsCountRef.current) {
                    const isDoctorOrStaff = role === "RHU_DOCTOR" || role === "RHU_STAFF" || role === "RHU_CENTER_ADMIN" || role === "ADMIN" || role === "RHU_ADMIN";
                    if (isDoctorOrStaff) {
                        try {
                            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                            if (AudioContextClass) {
                                const ctx = new AudioContextClass();
                                const osc = ctx.createOscillator();
                                const gain = ctx.createGain();
                                osc.type = "sine";
                                osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                                osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
                                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                                osc.connect(gain);
                                gain.connect(ctx.destination);
                                osc.start();
                                osc.stop(ctx.currentTime + 0.35);
                            }
                        } catch {}

                        toast.info("Secretary Triage Complete: Patient vitals recorded. Ready for doctor consultation!", {
                            icon: "🩺",
                            duration: 6000,
                        });
                    }
                }
                prevVitalsCountRef.current = newCount;
                setLiveRhuVitalsCount(newCount);
            }
        } catch (err) {
            console.error("[Sidebar Vitals Realtime] Error:", err);
        }
    }, [role]);

    React.useEffect(() => {
        if (isRhuRole && pathname.startsWith("/admin/rhu")) {
            fetchVitalsCount();
        }
    }, [pathname, fetchVitalsCount, isRhuRole]);

    React.useEffect(() => {
        if (!isRhuRole) return;
        const handleUpdate = () => {
            fetchVitalsCount();
        };
        window.addEventListener("rhu-vitals-updated", handleUpdate);
        return () => window.removeEventListener("rhu-vitals-updated", handleUpdate);
    }, [fetchVitalsCount, isRhuRole]);

    React.useEffect(() => {
        if (!isRhuRole || !supabase) return;
        let channel: any;
        let debounceTimer: NodeJS.Timeout | null = null;

        try {
            channel = supabase
                .channel("sidebar-rhu-vitals-realtime")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "Transaction",
                    },
                    () => {
                        if (debounceTimer) clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            fetchVitalsCount();
                        }, 1000);
                    }
                )
                .subscribe();
        } catch (error) {
            console.warn("[Sidebar RHU Vitals Realtime] Setup error:", error);
        }

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [fetchVitalsCount, isRhuRole]);

    React.useEffect(() => {
        // Background polling fallback every 30 seconds only for relevant role items
        const interval = setInterval(() => {
            if (role === "ADMIN" || role === "ADMIN_AIDE") {
                fetchBploCount();
            }
            if (isLcrRole) fetchLcrCounts();
            if (isRhuRole) {
                fetchRhuEquipmentCount();
                fetchVitalsCount();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchBploCount, fetchLcrCounts, fetchRhuEquipmentCount, fetchVitalsCount, role, isLcrRole, isRhuRole]);

    React.useEffect(() => {
        setIsSettingsOpen(pathname.startsWith("/admin/settings"));
        setIsAboutOpen(pathname.startsWith("/admin/about"));
        setIsBarangaysOpen(pathname.startsWith("/admin/barangays"));
        setIsAnnouncementsOpen(pathname.startsWith("/admin/announcements"));
        setIsRegistrarOpen(
            pathname.startsWith("/admin/registrar") &&
            !pathname.startsWith("/admin/registrar/ledger") &&
            !pathname.startsWith("/admin/registrar/appointment-settings") &&
            !pathname.startsWith("/admin/registrar/archive") &&
            !pathname.startsWith("/admin/registrar/feedback") &&
            !pathname.startsWith("/admin/registrar/queue")
        );
    }, [pathname]);

    React.useEffect(() => {
        setLivePendingAnnouncementsCount(pendingAnnouncementsCount);
    }, [pendingAnnouncementsCount]);

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
    }, [pathname, mounted, scrollToActive]);

    const baseMenuItems = [
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
        { href: "/admin/road-closures", label: "Road Closures", icon: AlertTriangle, category: "Infrastructure" },
        {
            label: "Announcements",
            icon: Megaphone,
            category: "Content",
            isDropdown: true,
            isOpen: isAnnouncementsOpen,
            onToggle: () => setIsAnnouncementsOpen(!isAnnouncementsOpen),
            badge: livePendingAnnouncementsCount,
            subItems: [
                { href: "/admin/announcements", label: "All Announcements" },
                { href: "/admin/announcements/approvals", label: "Approval of Announcements", badge: livePendingAnnouncementsCount },
            ]
        },
        { href: "/admin/news", label: "News & Updates", icon: Newspaper },
        { href: "/admin/events", label: "Events", icon: Calendar },
        { href: "/admin/projects", label: "LGU Projects", icon: FolderKanban },
        { href: "/admin/ordinances", label: "Ordinances & Resolutions", icon: Scale },
        { href: "/admin/directives", label: "Executive Directives", icon: FileText, category: "Governance" },
        { href: "/admin/dining", label: "Kainan (Dining)", icon: UtensilsCrossed },
        { href: "/admin/accommodation", label: "Tuluyan (Stay)", icon: BedDouble },
        { href: "/admin/tourism", label: "Gallery", icon: Map },
        { href: "/admin/church", label: "Church Management", icon: Church },
        { href: "/admin/reports", label: "Public Reports", icon: AlertTriangle, category: "Management", badge: liveReportsCount },
        { href: "/admin/logistics", label: "Logistics Control", icon: Truck, category: "Management" },
        { href: "/admin/jobs", label: "Job Postings", icon: Briefcase },
        { href: "/admin/officials", label: "Council Members", icon: Users },
        { href: "/admin/hotlines", label: "Hotlines", icon: Phone },
        { href: "/admin/citizens-charter", label: "Citizen's Charter", icon: FileText },
        // { href: "/admin/settings?tab=hero", label: "Banner Slider", icon: Layers, category: "Content" },
        { href: "/admin/resident-approvals", label: "Resident Approvals", icon: UserCheck, category: "Resident Management", badge: pendingResidentsCount },
        { href: "/admin/residents", label: "Resident Registry", icon: Users },
        // { href: "/admin/services", label: "Barangay Services", icon: ClipboardList, category: "Citizens & Services" },
        { href: "/admin/reports/daily-requests", label: "Daily Requests", icon: BarChart3, category: "Analytics" },
        { href: "/admin/households", label: "Household Map", icon: MapPin },
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
                    router.push("/admin/registrar");
                }
            },
            subItems: [
                { href: "/admin/registrar", label: "Dashboard" },
                { href: "/admin/registrar?category=Birth Registration", label: "Birth Registration" },
                { href: "/admin/registrar?category=Birth Certificate", label: "Birth Certificate" },
                { href: "/admin/registrar?category=PSA Endorsement", label: "PSA Endorsement" },
                { href: "/admin/registrar?category=Certified True Copy Appointment", label: "Certified True Copy Appointment" },
                { href: "/admin/registrar?category=Death Registration", label: "Death Registration" },
                { href: "/admin/registrar?category=Death Certificate", label: "Death Certificate" },
                { href: "/admin/registrar?category=Marriage License", label: "Marriage License" },
                { href: "/admin/registrar?category=Marriage Registration", label: "Marriage Registration" },
                { href: "/admin/registrar?category=Marriage Certificate", label: "Marriage Certificate" },
            ]
        },
        {
            href: "/admin/registrar/ledger?type=PSA",
            label: "Transaction Ledger",
            icon: FileText,
            category: "Registrar"
        },
        {
            href: "/admin/registrar/feedback",
            label: "Citizen Feedback",
            icon: MessageSquareHeart,
            category: "Registrar"
        },
        {
            href: "/admin/registrar/appointment-settings",
            label: "Appointment Settings",
            icon: Calendar,
            category: "Registrar"
        },
        { href: "/admin/registrar/archive", label: "Registrar Archives", icon: FolderArchive, category: "Registrar" },
        { href: "/admin/registrar/queue", label: "Registrar Queue", icon: Users, category: "Registrar" },
        { href: "/admin/treasury/payment-settings", label: "Payment Settings", icon: CreditCard, category: "Registrar" },
        {
            label: rhuLabel,
            icon: Activity,
            category: rhuCategory,
            isDropdown: true,
            isOpen: isRHUOpen,
            badge: !isRHUOpen 
                ? (liveRhuVitalsCount > 0 ? liveRhuVitalsCount : (liveRhuEquipmentCount > 0 ? liveRhuEquipmentCount : undefined)) 
                : undefined,
            badgeColor: !isRHUOpen && liveRhuVitalsCount > 0 ? "bg-emerald-500" : undefined,
            onToggle: () => {
                if (isRHUOpen) {
                    setIsRHUOpen(false);
                } else {
                    setIsRHUOpen(true);
                    router.push("/admin/rhu");
                }
            },
            subItems: [
                { href: "/admin/rhu", label: "Dashboard" },
                { 
                    href: "/admin/rhu/consultations", 
                    label: "All Consultations",
                    badge: liveRhuVitalsCount > 0 ? liveRhuVitalsCount : undefined,
                    badgeColor: "bg-emerald-500"
                },
                { href: "/admin/rhu/follow-ups", label: "Return / Follow-Up Visits" },
            ]
        },
        {
            href: "/admin/rhu/inventory",
            label: "Medicine & Supplies",
            icon: Package,
            category: rhuCategory
        },
        {
            href: "/admin/rhu/equipment",
            label: "Medical Equipment & Assets",
            icon: Boxes,
            category: rhuCategory,
            badge: liveRhuEquipmentCount > 0 ? liveRhuEquipmentCount : undefined
        },
        {
            href: "/admin/rhu/purchase-orders",
            label: "Dispense",
            icon: Pill,
            category: rhuCategory
        },
        {
            href: "/admin/rhu/announcements",
            label: "Announcements",
            icon: Megaphone,
            category: rhuCategory
        },
        {
            href: "/admin/rhu/appointment-settings",
            label: "Schedule Settings",
            icon: Calendar,
            category: rhuCategory
        },
        {
            href: "/admin/rhu/ledger",
            label: "Consultation Ledger",
            icon: FileText,
            category: rhuCategory
        },
        {
            href: "/admin/rhu/centers",
            label: "Health Center & Staff",
            icon: Users,
            category: rhuCategory
        },
        {
            label: "MDRRMO Department",
            icon: ShieldAlert,
            category: "MDRRMO",
            isDropdown: true,
            isOpen: isMDRRMOOpen,
            onToggle: () => {
                if (isMDRRMOOpen) {
                    setIsMDRRMOOpen(false);
                } else {
                    setIsMDRRMOOpen(true);
                    router.push("/admin/mdrrmo");
                }
            },
            subItems: [
                { href: "/admin/mdrrmo", label: "MDRRMO Hub" },
                { href: "/admin/mdrrmo/ambulance", label: "Ambulance Fleet" },
                { href: "/admin/mdrrmo/drivers", label: "Drivers Roster & Duty" },
                { href: "/admin/mdrrmo/documents", label: "OR/CR Digital Filing" },
                { href: "/admin/mdrrmo/schedule", label: "Dispatch Scheduling" },
                { href: "/admin/mdrrmo/announcements", label: "Emergency Advisories" },
            ]
        },
        {
            label: "Treasury Hub",
            icon: LayoutDashboard,
            category: "Treasury Department",
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
                { href: "/admin/treasury?category=Real Property Tax", label: "Real Property Tax" },
                { href: "/admin/treasury?category=Business Permit", label: "Business Permit" },
                { href: "/admin/treasury?category=Civil Registry", label: "Civil Registry" },
                { href: "/admin/treasury?category=Building Permit", label: "Building & Occupancy Permit" },
                { href: "/admin/treasury?category=POSO", label: "POSO Traffic Citations" },
            ]
        },
        { href: "/admin/treasury/collections", label: "Daily Ticket Collections", icon: Store, category: "Treasury Department" },
        { href: "/admin/treasury/collectors", label: "Collector Registry", icon: Users, category: "Treasury Department" },
        { href: "/admin/treasury/payments", label: "Payments Ledger", icon: CreditCard, category: "Treasury Department" },
        { href: "/admin/treasury/feedback", label: "Citizen Feedback", icon: MessageSquareHeart, category: "Treasury Department" },
        { href: "/admin/treasury/appointment-settings", label: "Appointment Settings", icon: Calendar, category: "Treasury Department" },
        { href: "/admin/treasury/cedula-template", label: "Cedula Template Studio", icon: LayoutTemplate, category: "Treasury Department" },
        { href: "/admin/treasury/queue", label: "Treasury Queue", icon: Users, category: "Treasury Department" },
        { href: "/admin/treasury/accountable-forms", label: "Cancelled Accountable Forms", icon: FileWarning, category: "Treasury Department" },
        {
            href: "/admin/assessor",
            label: "Assessor Hub",
            icon: HardHat,
            category: "Assessor Office",
            subItems: [
                { href: "/admin/assessor?category=RPT_CAT2", label: "RPT Category 2 (New Property)" },
                { href: "/admin/assessor?category=RPT_CAT3", label: "RPT Category 3 (Transfer Ownership)" },
            ]
        },
        { href: "/admin/assessor/appointment-settings", label: "Assessor Appointment Settings", icon: Calendar, category: "Assessor Office" },
        { href: "/admin/assessor/archive", label: "Document Archives", icon: FolderArchive, category: "Assessor Office" },
        { href: "/admin/assessor/queue", label: "Assessor Queue", icon: Users, category: "Assessor Office" },
        { href: "/admin/bplo", label: "BPLO Permits", icon: CreditCard, category: "BPLO Department", badge: bploInspectionCount > 0 ? bploInspectionCount : undefined },
        {
            label: "Stall Registration",
            icon: Store,
            category: "BPLO Department",
            isDropdown: true,
            isOpen: isMarketStallsOpen,
            onToggle: () => {
                setIsMarketStallsOpen(!isMarketStallsOpen);
            },
            subItems: [
                { href: "/admin/bplo/stall-registration", label: "All Market Stalls" },
                { href: "/admin/bplo/stall-registration/types", label: "Market Sections" },
                { href: "/admin/bplo/stall-registration/vendors", label: "Vendor Registry" },
            ]
        },
        { href: "/admin/bplo/feedback", label: "Citizen Feedback", icon: MessageSquareHeart, category: "BPLO Department" },
        { href: "/admin/bplo/appointment-settings", label: "BPLO Appointment Settings", icon: Calendar, category: "BPLO Department" },
        { href: "/admin/bplo/queue", label: "BPLO Queue", icon: Users, category: "BPLO Department" },
        { href: "/admin/bplo/announcements", label: "BPLO Announcements", icon: Megaphone, category: "BPLO Department" },
        { href: "/admin/settings/bplo", label: "BPLO Settings", icon: CreditCard, category: "Payment Settings" },
        { href: "/admin/settings/cedula", label: "Cedula Settings", icon: FileText, category: "Payment Settings" },
        { href: "/admin/engineer", label: "Engineer Hub", icon: HardHat, category: "Engineering" },
        { href: "/admin/engineer/archive", label: "Building Permit Archives", icon: FolderArchive, category: "Engineering" },
        { href: "/admin/engineer/occupancy-archive", label: "Occupancy Archives", icon: FolderArchive, category: "Engineering" },
        { href: "/admin/engineer/forms", label: "Downloadable Forms", icon: FileText, category: "Engineering" },
        { href: "/admin/engineer/appointment-setting", label: "Appointment Setting", icon: Calendar, category: "Engineering" },
        { href: "/admin/zoning", label: "Zoning Hub", icon: LayoutDashboard, category: "Zoning" },
        { href: "/admin/bfp", label: "BFP Hub", icon: LayoutDashboard, category: "BFP" },
        { href: "/admin/poso/tickets", label: "Citations & Tickets", icon: ShieldAlert, category: "Public Order & Safety" },
        { href: "/admin/poso/violations", label: "Violations Masterlist", icon: FileText, category: "Public Order & Safety" },
        { href: "/admin/poso/vehicle-classes", label: "Vehicle Classifications", icon: Car, category: "Public Order & Safety" },
        { href: "/admin/poso/leaderboard", label: "Enforcer Leaderboard", icon: Trophy, category: "Public Order & Safety" },
        { href: "/admin/poso/officers", label: "POSO Officers", icon: UserCheck, category: "Public Order & Safety" },
        { href: "/admin/poso/payment-ledger", label: "POSO Payment Ledger", icon: DollarSign, category: "Public Order & Safety" },
        { href: "/admin/users", label: "User Accounts", icon: UserCheck, category: "Security & Accounts" },
        { href: "/admin/audit-logs", label: "Audit Logs & Activity", icon: Activity, category: "Security & Accounts" },
    ];

    const contentAdminAllowed = [
        "About Us Content",
        "Announcements",
        "News & Updates",
        "Events",
        "LGU Projects",
        "Ordinances & Resolutions",
        "Kainan (Dining)",
        "Tuluyan (Stay)",
        "Gallery",
        "Church Management",
        "Job Postings",
        "Council Members",
        "Hotlines",
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
        "Public Reports",
        "Job Postings",
        "Council Members",
        "Resident Approvals",
        "Resident Registry",
        // "Barangay Services",
        // "Banner Slider",
        "Household Map",
        "Road Closures"
    ];

    const accessiblePages = session?.user?.accessiblePages;
    const hasCustomPages = accessiblePages && accessiblePages.length > 0;

    const activeCodes = activeTypes ? new Set(activeTypes.map(t => t.code)) : null;

    const allMenuItemsMapped = baseMenuItems.map(item => {
        if (item.label === "Registrar Hub" && item.subItems) {
            if (!activeCodes) return item;
            const filteredSub = item.subItems.filter(sub => {
                if (sub.label === "Dashboard") return true;

                let code: string | string[] | undefined;
                if (sub.label === "Birth Registration") code = "LCR_BIRTH_REG";
                else if (sub.label === "Birth Certificate") code = "LCR_BIRTH";
                else if (sub.label === "PSA Endorsement") code = ["LCR_PSA_ENDORSEMENT", "LCR_DEATH_PSA_ENDORSEMENT", "LCR_MARRIAGE_PSA_ENDORSEMENT"];
                else if (sub.label === "Certified True Copy Appointment") code = ["LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT", "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT", "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"];
                else if (sub.label === "Death Registration") code = "LCR_DEATH_REG";
                else if (sub.label === "Death Certificate") code = "LCR_DEATH";
                else if (sub.label === "Marriage License") code = "LCR_MARRIAGE_LICENSE";
                else if (sub.label === "Marriage Registration") code = "LCR_MARRIAGE_REG";
                else if (sub.label === "Marriage Certificate") code = "LCR_MARRIAGE";

                if (!code) return true;
                if (Array.isArray(code)) {
                    return code.some(c => activeCodes.has(c));
                }
                return activeCodes.has(code);
            });
            return { ...item, subItems: filteredSub };
        }

        return item;
    });

    const isLguAdmin = role === "ADMIN" && (department?.toUpperCase() === "LGU" || !department);

    const allMenuItems = allMenuItemsMapped.filter(item => {
        if (item.label === "Payment Settings") {
            return isLguAdmin;
        }
        return true;
    });

    let menuItems = allMenuItems;

    if (!hasCustomPages) {
        if (role === "ADMIN") {
            if (department) {
                const deptUpper = department.toUpperCase();
                if (deptUpper === "BPLO") {
                    menuItems = allMenuItems.filter(item =>
                        ["BPLO Permits", "Stall Registration", "BPLO Appointment Settings", "BPLO Queue", "BPLO Announcements"].includes(item.label) ||
                        (item.label === "Citizen Feedback" && item.category === "BPLO Department")
                    );
                } else if (deptUpper === "REGISTRAR" || deptUpper === "CIVIL_REGISTRY") {
                    menuItems = allMenuItems.filter(item =>
                        ["Registrar Hub", "Transaction Ledger", "Registrar Queue"].includes(item.label) ||
                        (item.label === "Registrar Archives" && item.category === "Registrar") ||
                        (item.label === "Citizen Feedback" && item.category === "Registrar") ||
                        (item.label === "Appointment Settings" && item.category === "Registrar")
                    );
                } else if (deptUpper === "TREASURY") {
                    menuItems = allMenuItems.filter(item =>
                        ["Treasury Hub", "Daily Ticket Collections", "Collector Registry", "Payments Ledger", "Treasury Queue", "Cancelled Accountable Forms"].includes(item.label) ||
                        (item.label === "Citizen Feedback" && item.category === "Treasury Department") ||
                        (item.label === "Appointment Settings" && item.category === "Treasury Department")
                    );
                } else if (deptUpper === "POSO") {
                    menuItems = allMenuItems.filter(item => ["Citations & Tickets", "Violations Masterlist", "Vehicle Classifications", "Enforcer Leaderboard", "POSO Officers", "POSO Payment Ledger", "POSO Settings"].includes(item.label));
                } else if (deptUpper === "RHU" || deptUpper === "HEALTH" || deptUpper === "RURAL_HEALTH_UNIT") {
                    menuItems = allMenuItems.filter(item => item.category === rhuCategory || item.category === "Rural Health Unit");
                } else if (deptUpper === "MDRRMO" || deptUpper === "DISASTER") {
                    menuItems = allMenuItems.filter(item => item.category === "MDRRMO");
                } else if (deptUpper === "LGU") {
                    menuItems = allMenuItems.filter(item =>
                        !["Registrar Hub", "Transaction Ledger", "Registrar Queue", "BPLO Queue", "Treasury Queue", "POSO Officers"].includes(item.label) &&
                        !(item.label === "Appointment Settings" && item.category === "Registrar")
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
            menuItems = allMenuItems.filter(item =>
                contentAdminAllowed.includes(item.label) &&
                item.category !== rhuCategory &&
                item.category !== "Rural Health Unit" &&
                item.category !== "RHU" &&
                item.category !== "MDRRMO"
            );
        } else if (role === "BARANGAY_ADMIN") {
            menuItems = allMenuItems.filter(item => barangayAdminAllowed.includes(item.label));
        } else if (role === "TREASURY_STAFF") {
            menuItems = allMenuItems.filter(item =>
                ["Treasury Hub", "Daily Ticket Collections", "Collector Registry", "Payments Ledger", "Treasury Queue", "Cancelled Accountable Forms"].includes(item.label) ||
                (item.label === "Citizen Feedback" && item.category === "Treasury Department") ||
                (item.label === "Appointment Settings" && item.category === "Treasury Department")
            );
        } else if (role === "ADMIN_AIDE") {
            const deptUpper = department?.toUpperCase();
            if (deptUpper === "RHU" || deptUpper === "HEALTH" || deptUpper === "RURAL_HEALTH_UNIT") {
                menuItems = allMenuItems.filter(item => item.category === rhuCategory || item.category === "Rural Health Unit");
            } else if (deptUpper === "MDRRMO" || deptUpper === "DISASTER") {
                menuItems = allMenuItems.filter(item => item.category === "MDRRMO");
            } else {
                menuItems = allMenuItems.filter(item =>
                    ["BPLO Permits", "Stall Registration", "BPLO Appointment Settings", "BPLO Queue", "BPLO Announcements"].includes(item.label) ||
                    (item.label === "Citizen Feedback" && item.category === "BPLO Department")
                );
            }
        } else if (role === "ENGINEER") {
            menuItems = [
                { href: "/admin/engineer", label: "Engineer Hub", icon: HardHat, category: "Engineering" },
                { href: "/admin/engineer/archive", label: "Building Permit Archives", icon: FolderArchive, category: "Engineering" },
                { href: "/admin/engineer/occupancy-archive", label: "Occupancy Archives", icon: FolderArchive, category: "Engineering" },
                { href: "/admin/engineer/forms", label: "Downloadable Forms", icon: FileText, category: "Engineering" },
                { href: "/admin/engineer/appointment-setting", label: "Appointment Setting", icon: Calendar, category: "Engineering" },
            ];
        } else if (role === "MPDC_ZONING") {
            menuItems = [
                { href: "/admin/zoning", label: "Zoning Hub", icon: HardHat, category: "Zoning" }
            ];
        } else if (role === "ASSESSOR") {
            menuItems = [
                { href: "/admin/assessor/appointment-settings", label: "Appointment Settings", icon: Calendar, category: "Assessor Office" },
                {
                    href: "/admin/assessor",
                    label: "Assessor Hub",
                    icon: HardHat,
                    category: "Assessor Office",
                    subItems: [
                        { href: "/admin/assessor?category=RPT_CAT2", label: "RPT Category 2" },
                        { href: "/admin/assessor?category=RPT_CAT3", label: "RPT Category 3" },
                    ]
                },
                { href: "/admin/assessor/queue", label: "Assessor Queue", icon: Users, category: "Assessor Office" },
                { href: "/admin/assessor/archive", label: "Document Archives", icon: FolderArchive, category: "Assessor Office" },
            ];
        } else if (role === "BFP") {
            menuItems = [
                { href: "/admin/bfp", label: "BFP Hub", icon: LayoutDashboard, category: "BFP" }
            ];
        } else if (role === "POSO_OFFICER") {
            menuItems = allMenuItems.filter(item => ["Citations & Tickets", "Violations Masterlist"].includes(item.label));
        } else if (role === "RHU_PHARMACY" || (department && department.toUpperCase().includes("PHARMACY"))) {
            menuItems = allMenuItems.filter(item =>
                item.label === rhuLabel ||
                item.label === "Rural Health Unit" ||
                item.label === "Medicine & Supplies" ||
                item.href === "/admin/rhu/inventory"
            );
        } else if (role === "RHU_ADMIN" || role === "RHU_CENTER_ADMIN" || role === "RHU_DOCTOR" || role === "RHU_STAFF" || role === "ASST_SEC" || (department && (department.toUpperCase().includes("RHU") || department.toUpperCase().includes("HEALTH")))) {
            menuItems = allMenuItems.filter(item => item.category === rhuCategory || item.category === "Rural Health Unit");
        } else if (role === "MDRRMO_ADMIN" || (department && (department.toUpperCase().includes("MDRRMO") || department.toUpperCase().includes("DISASTER")))) {
            menuItems = allMenuItems.filter(item => item.category === "MDRRMO");
        }
    }

    // Filter menuItems dynamically based on accessiblePages if assigned
    if (accessiblePages && accessiblePages.length > 0) {
        const isPageAccessible = (href: string) => {
            return accessiblePages.some(page => {
                if (page === href) return true;
                if (page.startsWith("/admin/treasury") && href.startsWith("/admin/treasury/")) return true;
                if (page.includes("?") && href.includes("?")) {
                    const [pagePath, pageQuery] = page.split("?");
                    const [hrefPath, hrefQuery] = href.split("?");
                    return pagePath === hrefPath && hrefQuery.includes(pageQuery);
                }
                if (!page.includes("?")) {
                    const [hrefPath] = href.split("?");
                    return page === hrefPath;
                }
                return false;
            });
        };

        menuItems = menuItems.map(item => {
            if (item.isDropdown) {
                const filteredSubItems = item.subItems?.filter(sub => isPageAccessible(sub.href)) || [];
                return {
                    ...item,
                    subItems: filteredSubItems
                };
            }
            return item;
        }).filter(item => {
            if (item.isDropdown) {
                return item.subItems && item.subItems.length > 0;
            }
            return item.href ? isPageAccessible(item.href) : false;
        });
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
                    "fixed md:static inset-y-0 left-0 flex-shrink-0 z-40 bg-white dark:bg-[#1e2330] border-r border-slate-200 dark:border-[#2a3040] overflow-hidden print:hidden",
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
                                            style={{ backgroundColor: resolvedThemeColor, boxShadow: `0 10px 15px -3px ${resolvedThemeColor}33` }}
                                        >
                                            {resolvedLogoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={resolvedLogoUrl} alt="Logo" className="w-full h-full object-cover p-1.5" />
                                            ) : (
                                                <Map className="text-white w-5 h-5 transition-transform group-hover:rotate-12" />
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-slate-900 dark:text-slate-100 font-bold text-lg leading-tight">
                                                {resolvedBrandWord1}<span style={{ color: resolvedThemeColor }}>{resolvedBrandWord2}</span>
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
                                                style={{ color: item.isOpen ? resolvedThemeColor : undefined }}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Icon size={18} style={{ color: item.isOpen ? resolvedThemeColor : undefined }} className={cn(!item.isOpen && "text-slate-500")} />
                                                    <span className="text-sm">{item.label}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    {item.label === "Registrar Hub" && Object.values(liveLcrCounts).reduce((a, b) => a + b, 0) > 0 && (
                                                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                                                            {Object.values(liveLcrCounts).reduce((a, b) => a + b, 0)}
                                                        </span>
                                                    )}
                                                    {typeof item.badge === "number" && item.badge > 0 && (
                                                        <span className={cn(
                                                            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white shadow-sm",
                                                            (item as any).badgeColor || "bg-rose-500"
                                                        )}>
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                    {item.isOpen ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
                                                </div>
                                            </button>

                                            <AnimatePresence initial={false}>
                                                {showDropdown && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                                        className="overflow-hidden mt-1 ml-3 pl-3 mr-1 space-y-1 border-l border-slate-200 dark:border-[#2a3040] pr-1"
                                                    >
                                                        {(normalizedQuery && !parentMatches ? subMatches : item.subItems)?.map((sub) => {
                                                            const currentCategory = searchParams.get("category");
                                                            const currentCheckupType = searchParams.get("checkupType");
                                                            const currentTab = searchParams.get("tab") || "general";
                                                            const currentType = searchParams.get("type") || "BIRTH";

                                                            const urlObj = new URL(sub.href, "http://localhost");
                                                            const subCategory = urlObj.searchParams.get("category");
                                                            const subCheckupType = urlObj.searchParams.get("checkupType");
                                                            const subTab = urlObj.searchParams.get("tab");
                                                            const subType = urlObj.searchParams.get("type");

                                                            const isPathMatch = (
                                                                pathname === urlObj.pathname ||
                                                                (pathname.startsWith("/admin/treasury/") && !pathname.includes("/payment-settings") && !pathname.includes("/payments") && urlObj.pathname === "/admin/treasury") ||
                                                                (pathname.startsWith("/admin/registrar/") && !pathname.startsWith("/admin/registrar/ledger") && urlObj.pathname === "/admin/registrar") ||
                                                                (pathname.startsWith("/admin/rhu/consultations") && urlObj.pathname === "/admin/rhu/consultations")
                                                            );

                                                            const isCategoryMatch = urlObj.searchParams.has("category")
                                                                ? currentCategory === subCategory
                                                                : true;

                                                            const isCheckupTypeMatch = urlObj.searchParams.has("checkupType")
                                                                ? currentCheckupType === subCheckupType
                                                                : !currentCheckupType || currentCheckupType === "ALL";

                                                            const isTabMatch = subTab ? currentTab === subTab : true;
                                                            const isTypeMatch = subType ? currentType === subType : true;

                                                            const isSubActive = isPathMatch && isCategoryMatch && isCheckupTypeMatch && isTabMatch && isTypeMatch;
                                                            const isDashboard = sub.label === "Dashboard";
                                                            return (
                                                                <React.Fragment key={sub.href}>
                                                                    <Link
                                                                        id={isSubActive ? "active-sidebar-link" : undefined}
                                                                        href={sub.href}
                                                                        prefetch={false}
                                                                        className={cn(
                                                                            "flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg transition-all focus:outline-none focus-visible:outline-none focus-visible:ring-0 select-none border",
                                                                            isSubActive
                                                                                ? "font-bold text-slate-900 dark:text-white"
                                                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 border-transparent",
                                                                            isDashboard ? "font-semibold text-slate-700 dark:text-slate-400" : "font-medium"
                                                                        )}
                                                                        style={{
                                                                            color: isSubActive ? resolvedThemeColor : undefined,
                                                                            backgroundColor: isSubActive ? `${resolvedThemeColor}15` : undefined,
                                                                            borderColor: isSubActive ? `${resolvedThemeColor}33` : "transparent"
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            {isDashboard && (
                                                                                <LayoutDashboard
                                                                                    size={13}
                                                                                    className={cn(
                                                                                        "transition-colors",
                                                                                        isSubActive ? "text-current" : "text-slate-400 dark:text-slate-500"
                                                                                    )}
                                                                                />
                                                                            )}
                                                                            <span>{sub.label}</span>
                                                                        </div>
                                                                        {!isDashboard && (liveLcrCounts[sub.label] || 0) > 0 && (
                                                                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                                                                                {liveLcrCounts[sub.label]}
                                                                            </span>
                                                                        )}
                                                                        {typeof (sub as any).badge === "number" && (sub as any).badge > 0 && (
                                                                            <span className={cn(
                                                                                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white shadow-sm animate-pulse",
                                                                                (sub as any).badgeColor || "bg-amber-500"
                                                                            )}>
                                                                                {(sub as any).badge}
                                                                            </span>
                                                                        )}
                                                                    </Link>
                                                                    {isDashboard && (
                                                                        <div className="h-px bg-slate-100 dark:bg-[#2a3040]/50 my-1 mx-2" />
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                }

                                const isActive = pathname === item.href || (item.href && pathname === item.href.split("?")[0]);
                                return (
                                    <React.Fragment key={item.href || idx}>
                                        {showCategory && (
                                            <div className="pt-6 pb-2 px-3">
                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic opacity-50">{item.category}</p>
                                            </div>
                                        )}
                                        <Link
                                            href={item.href || "#"}
                                            prefetch={false}
                                            id={isActive ? "active-sidebar-link" : undefined}
                                            className={cn(
                                                "flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-all duration-200 group",
                                                isActive
                                                    ? "text-white shadow-lg font-bold"
                                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#2a3040]"
                                            )}
                                            style={{
                                                backgroundColor: isActive ? resolvedThemeColor : undefined,
                                                boxShadow: isActive ? `0 10px 15px -3px ${resolvedThemeColor}44` : undefined
                                            }}
                                        >
                                            <div className="flex items-center space-x-3">
                                                {Icon && <Icon size={18} className={cn(isActive ? "text-white" : "text-slate-500 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300")} />}
                                                <span className="text-sm">{item.label}</span>
                                            </div>
                                            {item.badge && (
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm",
                                                    isActive ? "bg-white" : "bg-rose-500 text-white"
                                                )} style={{ color: isActive ? resolvedThemeColor : undefined }}>
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
                                    style={{ backgroundColor: resolvedThemeColor, boxShadow: `0 4px 6px -1px ${resolvedThemeColor}44` }}
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
                                        style={{ color: resolvedThemeColor }}
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
                                                            : role === "MPDC_ZONING"
                                                                ? "MPDC Zoning Officer"
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
                                    onClick={() => {
                                        logoutToLogin();
                                    }}
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
