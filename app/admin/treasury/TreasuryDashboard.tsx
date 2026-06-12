"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    getPendingTreasuryCount,
    getTransactionTypes
} from "@/app/admin/transactions/actions";
import {
    getTreasuryTransactions
} from "@/app/admin/transactions/cedula-actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Search, RefreshCcw,
    Archive, Clock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";

const STATUS_TABS = [
    { value: "ALL", label: "All Status", color: "text-slate-600", activeColor: "bg-slate-900 text-white dark:bg-white dark:text-slate-900" },
    { value: "FOR_REQUESTING", label: "For Evaluation", color: "text-amber-600", activeColor: "bg-amber-500 text-white" },
    { value: "FOR_INSPECTION", label: "Inspection", color: "text-blue-600", activeColor: "bg-blue-500 text-white" },
    { value: "FOR_REVISION", label: "For Revision", color: "text-amber-600", activeColor: "bg-amber-600 text-white" },
    { value: "FOR_PROCESSING", label: "For Processing", color: "text-sky-600", activeColor: "bg-sky-500 text-white" },
    { value: "FOR_CLAIM", label: "For Claim", color: "text-indigo-600", activeColor: "bg-indigo-500 text-white" },
    { value: "FOR_PICKING", label: "For Picking", color: "text-pink-600", activeColor: "bg-pink-500 text-white" },
    { value: "IN_ROUTE", label: "In Route", color: "text-orange-600", activeColor: "bg-orange-500 text-white" },
    { value: "DELIVERED", label: "Delivered", color: "text-teal-600", activeColor: "bg-teal-500 text-white" },
    { value: "PAID", label: "Paid", color: "text-emerald-600", activeColor: "bg-emerald-500 text-white" },
    { value: "UNPAID", label: "Unpaid", color: "text-red-500", activeColor: "bg-red-500 text-white" },
    { value: "RELEASED", label: "Released", color: "text-slate-600", activeColor: "bg-slate-700 text-white" },
    { value: "REJECTED", label: "Rejected", color: "text-red-500", activeColor: "bg-red-500 text-white" },
    { value: "CANCELLED", label: "Cancelled", color: "text-red-400", activeColor: "bg-red-600 text-white" },
    { value: "RETURN_REQUESTED", label: "Request for Return", color: "text-orange-500", activeColor: "bg-orange-500 text-white" },
    { value: "REFUND_REQUESTED", label: "Request for Refund", color: "text-orange-500", activeColor: "bg-orange-500 text-white" },
];

// Helper: format exact date & time
function formatDateTime(date: string | Date): { date: string; time: string } {
    const d = new Date(date);
    return {
        date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }),
    };
}

// Helper: Safely parse residentSnapshot which might be stringified JSON
function getResidentSnapshot(tx: any): any {
    if (!tx.residentSnapshot) return {};
    if (typeof tx.residentSnapshot === 'string') {
        try {
            return JSON.parse(tx.residentSnapshot);
        } catch {
            return {};
        }
    }
    return tx.residentSnapshot;
}

export default function TreasuryDashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get("category");
    const hasSelectedCategory = Boolean(categoryParam && categoryParam !== "ALL");
    const { data: session } = useSession();

    // Auto-redirect to category=CEDULA if no category is specified to avoid blank dashboard
    useEffect(() => {
        if (!categoryParam) {
            router.replace("/admin/treasury?category=CEDULA");
        }
    }, [categoryParam, router]);

    const userRole = (session?.user as any)?.role;
    const userDepartment = (session?.user as any)?.department;
    const isAdminAide = userRole === "ADMIN_AIDE" || (userRole === "ADMIN" && userDepartment?.toUpperCase() === "BPLO");

    const filteredTabs = useMemo(() => {
        if (isAdminAide) {
            // BPLO Admin sees: inspection, reinspection, claiming, picking, return/refund/dispute resolution tabs
            return STATUS_TABS.filter(tab => ["ALL", "FOR_INSPECTION", "FOR_REINSPECTION", "FOR_CLAIM", "FOR_PICKING", "RETURN_REQUESTED", "REFUND_REQUESTED", "RELEASED", "DELIVERED", "REJECTED"].includes(tab.value));
        }
        if (categoryParam === "Civil Registry" || categoryParam === "Business Permit") {
            // Civil Registry and Business Permit categories should only show evaluation, assessment, paid, and unpaid statuses
            return STATUS_TABS.filter(tab => ["ALL", "FOR_REQUESTING", "EVALUATED", "PAID", "UNPAID"].includes(tab.value));
        }
        // Treasury Staff should see everything EXCEPT BPLO-exclusive inspection phases
        return STATUS_TABS.filter(tab => !["FOR_INSPECTION", "FOR_REINSPECTION"].includes(tab.value));
    }, [isAdminAide, categoryParam]);

    const [status, setStatus] = useState("ALL");

    // Default status tab to ALL for ADMIN_AIDE since they now handle multiple states
    useEffect(() => {
        if (!session) return;
        const role = (session?.user as any)?.role;
        const dept = (session?.user as any)?.department;
        if (role === "ADMIN" && dept?.toUpperCase() === "BPLO") {
            router.push("/admin/bplo");
        }
    }, [session, router]);

    useEffect(() => {
        if (isAdminAide) {
            setStatus("ALL");
        }
    }, [isAdminAide]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [serviceTypes, setServiceTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState<"date" | "service">("date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [serviceFilter, setServiceFilter] = useState<string | null>(null);
    const [serviceSearch, setServiceSearch] = useState("");

    // Listen to query param category filter changes
    useEffect(() => {
        setServiceFilter(null);
    }, [categoryParam]);

    // Memoize the filtered list of services based on the search query for optimal performance
    const allServices = useMemo(() => {
        let filtered = serviceTypes;
        if (isAdminAide) {
            filtered = filtered.filter((t: any) => t.code?.startsWith("BUSINESS_PERMIT"));
        } else if (categoryParam && categoryParam !== "ALL") {
            filtered = filtered.filter((t: any) => t.category === categoryParam);
        }
        const names = filtered.map((t: any) => t.name).filter(Boolean);
        if (categoryParam === "CEDULA") {
            names.push("Student");
        }
        return names;
    }, [serviceTypes, isAdminAide, categoryParam]);

    const filteredServices = useMemo(() => {
        return allServices.filter(srv =>
            srv.toLowerCase().includes(serviceSearch.toLowerCase())
        );
    }, [allServices, serviceSearch]);

    // Fetch all active service types directly from the database for the filter dropdown
    useEffect(() => {
        async function fetchServices() {
            try {
                const res = await getTransactionTypes();
                if (res.success && res.data) {
                    setServiceTypes(res.data || []);
                }
            } catch (err) {
                console.error("Failed to load services for filter:", err);
            }
        }
        fetchServices();
    }, []);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTreasuryTransactions(status);
            if (res.success) {
                setTransactions(res.data || []);
            } else {
                // Surface the server-side error — toast shows user message, console shows dev detail
                console.error("[TreasuryDashboard] getTreasuryTransactions failed:", res.error);
                setTransactions([]);
                toast.error(res.error || "Failed to load transactions. Check your permissions.");
            }
            await getPendingTreasuryCount();
        } catch (err) {
            console.error("[TreasuryDashboard] Unexpected error:", err);
            toast.error("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Reset page and serviceFilter when status changes to prevent lingering filter states across empty pages
    useEffect(() => {
        setServiceFilter(null);
    }, [status]);

    // Realtime Supabase Subscription for new transactions
    useEffect(() => {
        if (!supabase) return;

        console.log("Subscribing to Supabase Realtime 'Transaction' table...");
        let channel: any;
        try {
            channel = supabase
                .channel("realtime-treasury-filings")
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "Transaction",
                    },
                    async (payload: any) => {
                        const newTx = payload.new;
                        console.log("Realtime INSERT caught:", newTx);

                        // Fetch the latest transactions to hydrate client state fully with joins
                        fetchTransactions();

                        // Parse resident snapshot to show applicant's name
                        let applicantName = "Someone";
                        try {
                            const snap = typeof newTx.residentSnapshot === "string"
                                ? JSON.parse(newTx.residentSnapshot)
                                : newTx.residentSnapshot;
                            if (snap && (snap.firstName || snap.lastName)) {
                                applicantName = `${snap.firstName || ""} ${snap.lastName || ""}`.trim();
                            }
                        } catch (e) {
                            console.error("Failed to parse residentSnapshot from payload:", e);
                        }

                        // Display a premium notification
                        toast.info(`A new request has been submitted by ${applicantName}!`, {
                            description: `Reference ID: ${newTx.id.slice(-8).toUpperCase()}`,
                            duration: 7000,
                        });
                    }
                )
                .subscribe((status: string, err?: any) => {
                    if (err) {
                        console.error("Supabase Realtime subscription error:", err);
                    }
                    if (status === "CHANNEL_ERROR") {
                        console.error("Supabase Realtime channel error status caught");
                    }
                });
        } catch (error) {
            console.error("Failed to initialize Supabase Realtime subscription:", error);
        }

        return () => {
            console.log("Unsubscribing from Supabase Realtime 'Transaction' table...");
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [fetchTransactions]);


    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status, itemsPerPage]);

    const filteredTransactions = transactions.filter(tx => {
        const rs = getResidentSnapshot(tx);
        const name = `${rs.firstName || ''} ${rs.lastName || ''}`.trim().toLowerCase();
        const refId = tx.id.slice(-8).toUpperCase();
        const searchUpper = search.toUpperCase();

        const matchesSearch = name.includes(search.toLowerCase()) ||
            tx.id.toLowerCase().includes(search.toLowerCase()) ||
            refId.includes(searchUpper);

        // Category filter: match url category parameter if set
        const matchesCategory = !categoryParam || categoryParam === "ALL" || tx.type?.category === categoryParam;

        // Specific service name filter: match selected service from dropdown if set
        let matchesService = !serviceFilter || serviceFilter === "ALL";
        if (!matchesService && serviceFilter) {
            const isStudentCedula = tx.isStudent === true && (tx.typeId === "cmpgkxwyz0011vpjk2arznkmt" || tx.type?.id === "cmpgkxwyz0011vpjk2arznkmt");
            if (serviceFilter === "Student") {
                matchesService = isStudentCedula;
            } else {
                matchesService = tx.type?.name === serviceFilter && !isStudentCedula;
            }
        }

        // For LCR Certified Copy / LCR Registration evaluation phases, only the Registrar department should see it
        const isLcrBirthCertifiedCopy = tx.type?.code === "LCR_BIRTH" || tx.type?.code === "LCR_DEATH" || tx.type?.code === "LCR_MARRIAGE" || (tx.type?.name && (tx.type.name.includes("Birth Certificate") || tx.type.name.includes("Death Certificate") || tx.type.name.includes("Marriage Certificate"))) || false;
        const isLcrBirthRegistration = tx.type?.code === "LCR_BIRTH_REG" || tx.type?.code === "LCR_DEATH_REG" || tx.type?.code === "LCR_MARRIAGE_REG" || tx.type?.code === "LCR_MARRIAGE_LICENSE" || (tx.type?.name && (tx.type.name.includes("Registration") || tx.type.name.includes("License"))) || false;
        if ((isLcrBirthCertifiedCopy || isLcrBirthRegistration) && ["FOR_REQUESTING", "EVALUATED", "FOR_PROCESSING"].includes(tx.status)) {
            const isRegistrar = userRole === "REGISTRAR" || userDepartment?.toUpperCase() === "REGISTRAR";
            if (!isRegistrar) {
                // If Civil Registry category is active, Treasury needs to see FOR_REQUESTING and EVALUATED
                if (categoryParam === "Civil Registry" && ["FOR_REQUESTING", "EVALUATED"].includes(tx.status)) {
                    // allow
                } else {
                    return false;
                }
            }
        }

        // During the verify & issue O.R. phase (PAID/PENDING_PAYMENT_VERIFICATION), the Registrar department cannot see it yet
        if (isLcrBirthCertifiedCopy && ["PAID", "PENDING_PAYMENT_VERIFICATION"].includes(tx.status)) {
            const isRegistrar = userRole === "REGISTRAR" || userDepartment?.toUpperCase() === "REGISTRAR";
            if (isRegistrar) {
                return false;
            }
        }

        // For the Birth Certificate (Certified Copy) only, if the status is FOR_PROCESSING, do not display it in treasury
        if (isLcrBirthCertifiedCopy && tx.status === "FOR_PROCESSING") {
            return false;
        }

        // For Building Permits, Treasury only needs to see EVALUATED, UNPAID, PAID, and REJECTED
        const isBuildingPermitTx = tx.type?.code?.startsWith("BUILDING_PERMIT") || tx.type?.name?.toUpperCase().includes("BUILDING PERMIT");
        if (isBuildingPermitTx) {
            const allowedStatuses = ["EVALUATED", "UNPAID", "PAID", "REJECTED"];
            if (!allowedStatuses.includes(tx.status)) {
                return false;
            }
        }

        // For Civil Registry and Business Permit, Treasury only needs to see FOR_REQUESTING, EVALUATED, PAID, and UNPAID when they are active
        if (categoryParam === "Civil Registry" || categoryParam === "Business Permit") {
            const allowedStatuses = ["FOR_REQUESTING", "EVALUATED", "PAID", "UNPAID"];
            if (!allowedStatuses.includes(tx.status)) {
                return false;
            }
        }

        return matchesSearch && matchesCategory && matchesService;
    });

    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        if (sortBy === "service") {
            const serviceA = (a.type?.name || "").toLowerCase();
            const serviceB = (b.type?.name || "").toLowerCase();
            return sortDirection === "asc"
                ? serviceA.localeCompare(serviceB)
                : serviceB.localeCompare(serviceA);
        } else {
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        }
    });

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = sortedTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Resets any dynamic service filtering when explicit date sorting is toggled
    const handleDateHeaderClick = () => {
        setServiceFilter(null);
        if (sortBy === "date") {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy("date");
            setSortDirection("desc");
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {!hasSelectedCategory ? (
                <div className="min-h-[420px] flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-[#2a3040] bg-white/60 dark:bg-[#151b2b]/60 px-6 text-center animate-in fade-in duration-500">
                    <Archive className="w-16 h-16 mb-5 text-slate-300 dark:text-slate-600" />
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200">
                        Select a treasury category
                    </h2>
                    <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
                        Choose a category from the Treasury Hub sidebar to view and manage its transactions.
                    </p>
                </div>
            ) : (
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-2xl shadow-blue-500/5 overflow-hidden ring-1 ring-slate-200 dark:ring-white/5">
                <Tabs value={status} onValueChange={setStatus} className="w-full">
                    {/* Filters Section — matching ResidentFilters style */}
                    <div className="flex flex-col border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b]">
                        {/* (Status dropdown moved inline into the search row below) */}

                        {/* Search Row — matching ResidentFilters style */}
                        <div className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                                <div className="relative w-full sm:w-[350px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <Input
                                        placeholder="Search names or Reference ID..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10 h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] focus-visible:ring-blue-500 rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Right controls: Status dropdown + Refresh */}
                            <div className="flex items-center gap-3">
                                <div className="hidden sm:block">
                                    <Select
                                        value={serviceFilter ?? "ALL"}
                                        onValueChange={(v) => { setServiceFilter(v === "ALL" ? null : v); }}
                                        onOpenChange={(open) => { if (!open) setServiceSearch(""); }}
                                    >
                                        <SelectTrigger className="h-11 w-48 rounded-xl border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117]">
                                            <SelectValue placeholder="Service" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#151b2b] min-w-[220px] max-h-80 overflow-y-auto">
                                            {/* Search input to filter dropdown items */}
                                            <div className="p-2 border-b border-slate-100 dark:border-[#2a3040] sticky top-0 bg-white dark:bg-[#151b2b] z-10">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                                                    <Input
                                                        placeholder="Search service..."
                                                        value={serviceSearch}
                                                        onChange={(e) => setServiceSearch(e.target.value)}
                                                        className="pl-8 h-8 text-xs bg-slate-50 dark:bg-[#0f1117] border-slate-100 dark:border-[#2a3040] focus-visible:ring-blue-500 rounded-lg w-full"
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <SelectItem value="ALL" className="text-sm">All Services</SelectItem>
                                            {filteredServices.length === 0 ? (
                                                <div className="p-3 text-xs text-slate-500 dark:text-slate-400 text-center italic">
                                                    No services found
                                                </div>
                                            ) : (
                                                filteredServices.map(srv => (
                                                    <SelectItem key={srv} value={srv} className="text-sm">{srv}</SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>


                                <div className="hidden sm:block">
                                    <Select value={status} onValueChange={(v) => setStatus(v)}>
                                        <SelectTrigger className="h-11 w-48 rounded-xl border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#151b2b]">
                                            {filteredTabs.map(tab => {
                                                return (
                                                    <SelectItem key={tab.value} value={tab.value} className="text-sm">
                                                        {tab.label}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    onClick={fetchTransactions}
                                    variant="outline"
                                    className="h-11 w-11 rounded-xl p-0 border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117]"
                                >
                                    <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {status !== "SETTINGS" && (
                        <TabsContent value={status} className="mt-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50 border-b border-slate-200 dark:bg-[#1a1f2e] dark:border-[#2a3040]">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-5">#</TableHead>
                                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Applicant</TableHead>
                                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-5">
                                                <span>Service</span>
                                            </TableHead>
                                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Method</TableHead>
                                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Amount</TableHead>
                                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                                            <TableHead
                                                className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-primary transition-colors py-5"
                                                onClick={handleDateHeaderClick}
                                            >
                                                <div className="flex items-center gap-1.5 group">
                                                    <span>Date</span>
                                                    <span className={cn(
                                                        "transition-colors duration-200 font-black text-[10px]",
                                                        sortBy === "date"
                                                            ? "text-blue-600 dark:text-blue-400 font-bold"
                                                            : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
                                                    )}>
                                                        {sortBy === "date"
                                                            ? (sortDirection === "asc" ? "▲" : "▼")
                                                            : "⇅"
                                                        }
                                                    </span>
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            Array(5).fill(0).map((_, i) => (
                                                <TableRow key={i} className="animate-pulse">
                                                    <TableCell colSpan={7} className="h-20 text-center"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded mx-8" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : paginatedTransactions.length > 0 ? (
                                            paginatedTransactions.map((tx, index) => (
                                                <TableRow
                                                    key={tx.id}
                                                    onClick={() => router.push(`/admin/treasury/${tx.id}?category=${categoryParam || "CEDULA"}`)}
                                                    className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50 transition-colors cursor-pointer select-none"
                                                >
                                                    <TableCell className="py-4">
                                                        <span className="text-xs font-black font-mono tracking-widest text-primary">{(currentPage - 1) * itemsPerPage + index + 1}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                                                {(() => {
                                                                    const rs = getResidentSnapshot(tx);
                                                                    return `${rs.firstName || 'Unknown'} ${rs.lastName || 'Applicant'}`;
                                                                })()}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase italic mt-0.5">
                                                                {tx.type?.requiresBusinessName
                                                                    ? `Business: ${tx.businessName || (tx.additionalData as any)?.businessName || "UNNAMED ENTITY"}`
                                                                    : "Registered Resident"}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                                                            {tx.type?.name}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{tx.fulfillmentType}</span>
                                                            <span className="text-[10px] text-slate-500 font-bold uppercase">{tx.paymentType?.replace("_", " ")}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {tx.totalAmount > 0 ? `₱${tx.totalAmount.toLocaleString()}` : "–"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={cn(
                                                            "text-[10px] font-black uppercase italic tracking-wider",
                                                            tx.isCancelled ? "text-red-600" : ({
                                                                "FOR_REQUESTING": "text-amber-600",
                                                                "FOR_REVISION": "text-amber-600",
                                                                "EVALUATED": "text-blue-600",
                                                                "FOR_CLAIM": "text-indigo-600",
                                                                "FOR_PICKING": "text-pink-600",
                                                                "IN_ROUTE": "text-orange-600",
                                                                "DELIVERED": "text-teal-600",
                                                                "FOR_PROCESSING": "text-sky-600",
                                                                "PAID": "text-emerald-600",
                                                                "RELEASED": "text-slate-600",
                                                                "REJECTED": "text-red-600",
                                                                "RETURN_REQUESTED": "text-orange-500",
                                                                "REFUND_REQUESTED": "text-orange-500",
                                                                "RETURNED": "text-slate-500",
                                                                "REFUNDED": "text-slate-500",
                                                                "DISPUTE_REJECTED": "text-red-700",
                                                            } as Record<string, string>)[tx.status] || "text-slate-500"
                                                        )}>
                                                            {tx.isCancelled 
                                                                ? "CANCELLED" 
                                                                : ({
                                                                    "FOR_REQUESTING": "FOR EVALUATION",
                                                                    "FOR_PROCESSING": "FOR PROCESSING",
                                                                    "FOR_REINSPECTION": "FOR PROCESSING",
                                                                    "RETURN_REQUESTED": "REQUEST FOR RETURN",
                                                                    "REFUND_REQUESTED": "REQUEST FOR REFUND",
                                                                } as Record<string, string>)[tx.status] || tx.status?.replace(/_/g, " ")}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            {/* Always show transaction update date and time */}
                                                            {(() => {
                                                                const source = tx.updatedAt;
                                                                const f = formatDateTime(source);
                                                                return (
                                                                    <>
                                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{f.date}</span>
                                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{f.time}</span>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-[400px] text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                                        <Archive className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" />
                                                        <p className="text-xl font-bold text-slate-700 dark:text-slate-300">No transactions found</p>
                                                        <p className="mt-2">Try adjusting your filters or search term.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Controls — matching ResidentTable */}
                            <div className="p-6 border-t border-slate-200 dark:border-[#2a3040] flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#151b2b]/50">
                                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    <span className="hidden sm:inline-block">Rows per page:</span>
                                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                                        <SelectTrigger className="h-8 w-[70px] border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117] rounded-lg">
                                            <SelectValue placeholder={itemsPerPage} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#151b2b]">
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                            <SelectItem value="30">30</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                        Showing {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="h-10 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold"
                                        >
                                            Prev
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="h-10 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
            )}
        </div>
    );
}
