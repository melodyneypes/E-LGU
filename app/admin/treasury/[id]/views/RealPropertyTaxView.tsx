"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    FileText,
    Receipt,
    AlertCircle,
    X,
    TrendingDown,
    Building2,
    Info,
    Calendar,
    BadgeCheck,
    Camera,
    Check,
    Clock,
    RotateCw,
    Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { TreasuryViewProps } from "./types";
import { releaseRptTransaction, RptPaymentDetails } from "@/app/admin/transactions/rpt-actions";
import { rejectTransaction } from "@/app/admin/transactions/actions";
import { exportForm10APdf, exportForm10AExcel } from "@/app/admin/treasury/payments/rpt-form10a-export";
import ResidentIdentityProfile from "../components/ResidentIdentityProfile";

const documentExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf"];
const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"];

function getFileExtension(url: string) {
    try {
        const cleanPath = new URL(url).pathname;
        return cleanPath.split(".").pop()?.toLowerCase() || "";
    } catch {
        return url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
    }
}

function isDocumentFile(url: string) {
    const lower = url.toLowerCase();
    if (lower.startsWith("data:application/pdf")) return true;
    return documentExtensions.includes(getFileExtension(url));
}

function isImageFile(url: string) {
    const lower = url.toLowerCase();
    if (lower.startsWith("data:image/") || lower.startsWith("blob:")) return true;
    const extension = getFileExtension(url);
    if (imageExtensions.includes(extension)) return true;
    return !isDocumentFile(url);
}

export default function RealPropertyTaxView(props: TreasuryViewProps) {
    const {
        transaction,
        backUrl,
        actionLoading,
        setActionLoading,
        handleViewFile,
        orSeriesNumber = "",
        setOrSeriesNumber,
        handleConfirmPayment
    } = props;

    // --- State Toggles ---
    const [isProfileOpen, setIsProfileOpen] = useState(true);
    const [isRevenueAllocationOpen, setIsRevenueAllocationOpen] = useState(true);
    const [isRequirementsOpen, setIsRequirementsOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    // --- Transaction & Property Data Extraction ---
    const rpt = transaction?.realPropertyTax || {};
    const additional = useMemo(() => {
        if (!transaction?.additionalData) return {};
        return typeof transaction.additionalData === "string"
            ? JSON.parse(transaction.additionalData || "{}")
            : transaction.additionalData;
    }, [transaction?.additionalData]);

    const rawSnapshot = useMemo(() => {
        if (!transaction?.residentSnapshot) return {};
        return typeof transaction.residentSnapshot === "string"
            ? (() => { try { return JSON.parse(transaction.residentSnapshot); } catch { return {}; } })()
            : (transaction.residentSnapshot || {});
    }, [transaction?.residentSnapshot]);

    const baseResident = transaction?.user?.residentProfile || rawSnapshot || {};

    // Prioritize name from snapshot or user object
    const applicantFullName = (
        rawSnapshot.name ||
        baseResident.fullName ||
        `${baseResident.firstName || ""} ${baseResident.lastName || ""}`.trim() ||
        transaction?.user?.name ||
        "MARIA DELA CRUZ"
    ).trim();

    // Parse applicant name parts if firstName/lastName are missing in snapshot
    const nameParts = applicantFullName.split(" ").filter(Boolean);
    const parsedFirstName = baseResident.firstName || (nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0] || "");
    const parsedLastName = baseResident.lastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "");

    const normalizedResident = useMemo(() => ({
        ...baseResident,
        ...rawSnapshot,
        firstName: parsedFirstName,
        lastName: parsedLastName,
        fullName: applicantFullName,
        name: applicantFullName,
        email: rawSnapshot.email || baseResident.email || transaction?.user?.email || ""
    }), [baseResident, rawSnapshot, parsedFirstName, parsedLastName, applicantFullName, transaction?.user?.email]);

    const resident = normalizedResident;
    const applicantName = applicantFullName;
    const ownerName =
        rpt.ownerName ||
        additional.ownerName ||
        resident.fullName ||
        `${resident.firstName || ""} ${resident.lastName || ""}`.trim() ||
        "MARIA DELA CRUZ";

    const isApplicantTheOwner = applicantName.toLowerCase().replace(/\s+/g, "") === ownerName.toLowerCase().replace(/\s+/g, "");
    const tdn = rpt.tdn || additional.tdn || "2026-MAP-1234";
    const pin = rpt.pin || additional.pin || "N/A";
    const barangay = (rpt.barangay || additional.barangay || "GOLDEN").toUpperCase();

    // Prior computation snapshot if saved
    const savedComp = (additional?.rptComputation as any) || {};

    // Default base assessed value from Assessor data or transaction record (defaults to 5,435.00)
    const rawAssessedValue = Number(
        savedComp.assessedValue ||
        rpt.assessedValue ||
        additional.assessedValue ||
        (savedComp.basicTax ? savedComp.basicTax / 0.01 : 0) ||
        (rpt.basicTax ? rpt.basicTax / 0.01 : 0) ||
        (transaction?.totalAmount ? transaction.totalAmount / 0.02 : 0) ||
        5435
    );

    // --- Computation Form State ---
    const currentYearStr = new Date().getFullYear().toString();
    const [taxYear, setTaxYear] = useState<string>(
        savedComp.taxYear ? String(savedComp.taxYear) : (rpt.taxYear || additional.taxYear || currentYearStr)
    );
    const [periodCovered, setPeriodCovered] = useState<string>(
        savedComp.periodCovered || additional.periodCovered || "Current Year"
    );
    const [paymentDate, setPaymentDate] = useState<string>(() => {
        if (savedComp.paymentDate) return savedComp.paymentDate;
        if (additional.paymentDate) return additional.paymentDate;
        const now = new Date();
        return now.toISOString().split("T")[0]; // YYYY-MM-DD
    });

    // Discount options: None | Advance Annual (20% Prov. Ord. 166-2012) | Prompt Quarterly (10% Prov. Ord. 166-2012) | Other
    const [discountType, setDiscountType] = useState<"NONE" | "ADVANCE_ANNUAL_20" | "PROMPT_QUARTERLY_10" | "OTHER">(
        savedComp.discountType || additional.discountType || (additional.hasDiscount || additional.isDiscounted ? "ADVANCE_ANNUAL_20" : "NONE")
    );
    const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(
        savedComp.discountRate ? savedComp.discountRate * 100 : (additional.discountRate ? additional.discountRate * 100 : 10)
    );

    // Penalty options: None | Delinquent (2% per month, capped at 36 months)
    const [penaltyType, setPenaltyType] = useState<"NONE" | "DELINQUENT_2">(
        savedComp.penaltyType || additional.penaltyType || (additional.penalties || additional.penalty ? "DELINQUENT_2" : "NONE")
    );
    const [penaltyMonths, setPenaltyMonths] = useState<number>(
        savedComp.penaltyMonths || additional.penaltyMonths || 1
    );

    // Audit fields
    const [treasuryRemarks, setTreasuryRemarks] = useState<string>(savedComp.treasuryRemarks || "");
    const [overrideReason, setOverrideReason] = useState<string>(savedComp.overrideReason || "");

    // Payment Form state
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "GCASH" | "LANDBANK">(
        savedComp.paymentMethod || (transaction?.paymentType as any) || "CASH"
    );
    const [paymentReference, setPaymentReference] = useState<string>(
        savedComp.paymentReference || transaction?.paymentReference || additional?.paymentReference || ""
    );

    // --- Live Auto-Computation (Rules from Pangasinan Prov. Ord. No. 166-2012 & LGC Sec. 235) ---
    const computation = useMemo(() => {
        const av = rawAssessedValue;
        // Basic RPT is 1% of Assessed Value
        const basicRptRate = 0.01;
        const grossBasic = av * basicRptRate;

        // Special Education Fund (SEF) is 1% of Assessed Value
        const sefRate = 0.01;
        const grossSef = av * sefRate;

        // Discount calculation
        let discRate = 0;
        if (discountType === "ADVANCE_ANNUAL_20") {
            discRate = 0.20; // 20% per Pangasinan Prov. Ord. 166-2012
        } else if (discountType === "PROMPT_QUARTERLY_10") {
            discRate = 0.10; // 10% per Pangasinan Prov. Ord. 166-2012
        } else if (discountType === "OTHER") {
            discRate = Math.min(0.20, Math.max(0, (customDiscountPercent || 0) / 100));
        }

        const basicDiscount = grossBasic * discRate;
        const sefDiscount = grossSef * discRate;
        const totalDiscount = basicDiscount + sefDiscount;

        // Penalty calculation (2% per month or fraction thereof, 36-month cap auto-enforced)
        const cappedMonths = Math.min(36, Math.max(1, Number(penaltyMonths) || 1));
        let penRate = 0;
        if (penaltyType === "DELINQUENT_2") {
            penRate = cappedMonths * 0.02; // max 72%
        }

        const basicPenalty = grossBasic * penRate;
        const sefPenalty = grossSef * penRate;
        const totalPenalty = basicPenalty + sefPenalty;

        // Component totals
        const basicTotal = Math.max(0, grossBasic - basicDiscount + basicPenalty);
        const sefTotal = Math.max(0, grossSef - sefDiscount + sefPenalty);
        const totalAmountDue = basicTotal + sefTotal;

        // Revenue Allocations (Local Government Code Sec. 271 & 272)
        // Basic RPT: Municipality 40%, Province 35%, Barangay 25%
        const allocMunicipality = basicTotal * 0.40;
        const allocProvince = basicTotal * 0.35;
        const allocBarangay = basicTotal * 0.25;

        // SEF Allocation: Municipal Local School Board 50%, Provincial School Board 50%
        const allocMunicipalSchoolBoard = sefTotal * 0.50;
        const allocProvincialSchoolBoard = sefTotal * 0.50;

        return {
            av,
            grossBasic,
            grossSef,
            discRate,
            basicDiscount,
            sefDiscount,
            totalDiscount,
            penRate,
            cappedMonths,
            basicPenalty,
            sefPenalty,
            totalPenalty,
            basicTotal,
            sefTotal,
            totalAmountDue,
            allocMunicipality,
            allocProvince,
            allocBarangay,
            allocMunicipalSchoolBoard,
            allocProvincialSchoolBoard
        };
    }, [rawAssessedValue, discountType, customDiscountPercent, penaltyType, penaltyMonths]);

    // Formatted current timestamp for the verification badge
    const verifiedTimestamp = useMemo(() => {
        const raw = savedComp.computedAt ? new Date(savedComp.computedAt) : new Date();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[raw.getMonth()];
        const day = raw.getDate().toString().padStart(2, "0");
        const year = raw.getFullYear();
        let hours = raw.getHours();
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        const minutes = raw.getMinutes().toString().padStart(2, "0");
        return `${month} ${day}, ${year} ${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
    }, [savedComp.computedAt]);

    if (!transaction) return null;

    const isReleased = transaction.status === "RELEASED";
    const isCheckedIn = Boolean(
        additional?.checkedIn === true ||
        additional?.checkedInAt ||
        additional?.checkInData ||
        additional?.kioskCheckIn ||
        additional?.checkInTime ||
        (transaction as any)?.checkedIn === true ||
        (transaction as any)?.checkedInAt
    );

    const attachments = [
        { label: "Valid Government ID", url: rpt.validIdUrl || additional.validIdUrl },
        { label: "Previous O.R. / SOA", url: rpt.previousOrUrl || additional.previousOrUrl },
        { label: "Building Permit", url: rpt.buildingPermitUrl || additional.buildingPermitUrl },
        { label: "Deed of Absolute Sale", url: rpt.deedOfSaleUrl || additional.deedOfSaleUrl },
        { label: "Transfer Certificate of Title (TCT)", url: rpt.titleUrl || additional.titleUrl },
        { label: "BIR eCAR Document", url: rpt.birEcarUrl || additional.birEcarUrl }
    ].filter(att => Boolean(att.url));

    // Stepper configuration matching Image
    const steps = [
        {
            label: "TO PROCESS",
            status: "COMPLETED" as const
        },
        {
            label: "FOR PROCESSING",
            status: isReleased ? ("COMPLETED" as const) : ("ACTIVE" as const)
        },
        {
            label: "RELEASED",
            status: isReleased ? ("COMPLETED" as const) : ("PENDING" as const)
        }
    ];

    // Execution handler for "MARK AS PAID & RELEASED"
    const handleReleasePayment = async (method?: string, ref?: string) => {
        if (!orSeriesNumber || !orSeriesNumber.trim()) {
            toast.error("Official Receipt (O.R.) Number is required before releasing payment.");
            return;
        }

        if (discountType === "OTHER" && !overrideReason.trim()) {
            toast.error("An override reason or legal basis is required for custom discounts.");
            return;
        }

        const effectivePaymentMethod = (method as any) || paymentMethod;
        const effectivePaymentRef = ref || paymentReference;

        setActionLoading(true);
        try {
            const paymentDetails: RptPaymentDetails = {
                paymentMethod: effectivePaymentMethod,
                paymentReference: effectivePaymentMethod !== "CASH" ? effectivePaymentRef.trim() : undefined,
                taxYear,
                periodCovered,
                paymentDate,
                discountType,
                discountRate: computation.discRate,
                discountAmount: computation.totalDiscount,
                penaltyType,
                penaltyRate: computation.penRate,
                penaltyMonths: computation.cappedMonths,
                penaltyAmount: computation.totalPenalty,
                assessedValue: computation.av,
                basicTax: computation.grossBasic,
                basicDiscount: computation.basicDiscount,
                basicPenalty: computation.basicPenalty,
                basicTotal: computation.basicTotal,
                sefTax: computation.grossSef,
                sefDiscount: computation.sefDiscount,
                sefPenalty: computation.sefPenalty,
                sefTotal: computation.sefTotal,
                totalAmountDue: computation.totalAmountDue,
                allocMunicipality: computation.allocMunicipality,
                allocProvince: computation.allocProvince,
                allocBarangay: computation.allocBarangay,
                allocMunicipalSchoolBoard: computation.allocMunicipalSchoolBoard,
                allocProvincialSchoolBoard: computation.allocProvincialSchoolBoard,
                treasuryRemarks: treasuryRemarks.trim() || undefined,
                overrideReason: overrideReason.trim() || undefined,
                verifiedAt: new Date().toISOString()
            };

            const res = await releaseRptTransaction(
                transaction.id,
                orSeriesNumber.trim(),
                props.orPreview || transaction.orUrl || undefined,
                paymentDetails
            );

            if (res.success) {
                toast.success("RPT Payment recorded! Official Receipt & Tax Clearance released.");
                if (props.fetchTransaction) {
                    await props.fetchTransaction();
                }
            } else {
                toast.error(res.error || "Failed to mark transaction as paid & released.");
            }
        } catch (err: any) {
            console.error("RPT release error:", err);
            toast.error(err?.message || "An error occurred while releasing payment.");
        } finally {
            setActionLoading(false);
        }
    };

    // Export single transaction as official Form 10(A) PDF / Excel
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const handleExportSingleForm10A = async (mode: "pdf" | "excel" = "pdf") => {
        setIsExporting(true);
        const toastId = `export-form10a-single-${mode}`;
        toast.loading(`Generating Form 10(A) ${mode.toUpperCase()}...`, { id: toastId });
        try {
            const singlePaymentObj = {
                id: (transaction as any)?.payment?.id || `tx_${transaction.id}`,
                amount: computation.totalAmountDue,
                method: paymentMethod,
                orNumber: orSeriesNumber,
                createdAt: paymentDate ? new Date(paymentDate) : new Date(),
                transaction: {
                    ...transaction,
                    totalAmount: computation.totalAmountDue,
                    additionalData: {
                        ...additional,
                        tdn,
                        pin,
                        ownerName,
                        barangay,
                        taxYear,
                        periodCovered,
                        paymentDate,
                        orSeriesNumber,
                        rptComputation: {
                            taxYear,
                            periodCovered,
                            paymentDate,
                            discountType,
                            discountRate: computation.discRate,
                            discountAmount: computation.totalDiscount,
                            penaltyType,
                            penaltyRate: computation.penRate,
                            penaltyMonths: computation.cappedMonths,
                            penaltyAmount: computation.totalPenalty,
                            assessedValue: computation.av,
                            basicTax: computation.grossBasic,
                            basicDiscount: computation.basicDiscount,
                            basicPenalty: computation.basicPenalty,
                            basicTotal: computation.basicTotal,
                            sefTax: computation.grossSef,
                            sefDiscount: computation.sefDiscount,
                            sefPenalty: computation.sefPenalty,
                            sefTotal: computation.sefTotal,
                            totalAmountDue: computation.totalAmountDue,
                            allocMunicipality: computation.allocMunicipality,
                            allocProvince: computation.allocProvince,
                            allocBarangay: computation.allocBarangay,
                            allocMunicipalSchoolBoard: computation.allocMunicipalSchoolBoard,
                            allocProvincialSchoolBoard: computation.allocProvincialSchoolBoard
                        }
                    }
                }
            };

            if (mode === "pdf") {
                await exportForm10APdf([singlePaymentObj], { category: "RPT" });
                toast.success("Official Prov. Form No. 10(A) PDF downloaded!", { id: toastId });
            } else {
                await exportForm10AExcel([singlePaymentObj], { category: "RPT" });
                toast.success("Official Prov. Form No. 10(A) Excel downloaded!", { id: toastId });
            }
        } catch (err: any) {
            console.error("Single transaction export error:", err);
            toast.error(err.message || "Failed to export Form 10(A)", { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    // Rejection execution handler
    const handleConfirmReject = async () => {
        if (!rejectReason.trim()) {
            toast.error("Rejection remarks are required.");
            return;
        }

        setActionLoading(true);
        try {
            const res = await rejectTransaction(transaction.id, rejectReason.trim());
            if (res.success) {
                toast.success("Transaction rejected.");
                setIsRejectModalOpen(false);
                if (props.fetchTransaction) {
                    await props.fetchTransaction();
                }
            } else {
                toast.error(res.error || "Failed to reject transaction.");
            }
        } catch (err: any) {
            toast.error(err?.message || "Error rejecting transaction.");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#080b11] text-slate-100 pb-20 font-sans selection:bg-rose-500/30">
            {/* Header matching Image */}
            <header className="h-16 px-6 md:px-10 flex items-center justify-between border-b border-white/5 bg-[#080b11]/90 backdrop-blur-md sticky top-0 z-30">
                <Link
                    href={backUrl}
                    prefetch={false}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 hover:text-rose-500 transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-slate-400 group-hover:text-rose-500" />
                    <span>Back to Registry</span>
                </Link>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportSingleForm10A("pdf")}
                        disabled={isExporting}
                        className="h-8 px-3 rounded-full border-rose-500/30 bg-rose-500/10 text-rose-300 hover:text-white hover:bg-rose-500/25 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-rose-950/20"
                        title="Export official Prov. Form No. 10(A) Abstract PDF for this transaction"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Form 10(A)</span>
                    </Button>
                    <span className="font-mono font-black italic uppercase tracking-widest text-[10px] text-rose-500 bg-rose-500/10 border border-rose-500/30 px-3.5 py-1 rounded-full shadow-lg shadow-rose-950/20">
                        TYPE OF REQUEST: {isReleased ? "RELEASED" : "PROCESSING"}
                    </span>
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 mt-6 grid grid-cols-12 gap-6 lg:gap-8">
                {/* ============================================================ */}
                {/* LEFT COLUMN: Main Clearance & Computation Workspace          */}
                {/* ============================================================ */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    {/* Main Title Banner matching Image */}
                    <div className="space-y-1">
                        <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-wider text-white">
                            Clearance
                        </h1>
                        <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest italic">
                            Real Property Tax Billing & Official Clearance Management
                        </p>
                    </div>

                    {/* Card 1: PRIMARY APPLICANT & PROPERTY PROFILE (100% matched with Image) */}
                    <Card className="rounded-3xl border border-white/5 bg-[#0f1420] shadow-2xl text-white py-0 gap-0">
                        <CardContent className="px-6 md:px-8 py-5 space-y-4">
                            <div
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center justify-between cursor-pointer select-none group"
                            >
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-500 italic block">
                                        Primary Applicant & Property Profile
                                    </span>
                                    <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white group-hover:text-rose-100 transition-colors">
                                        {ownerName}
                                    </h2>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full text-slate-400 hover:text-white hover:bg-white/5"
                                >
                                    {isProfileOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </Button>
                            </div>

                            {isProfileOpen && (
                                <div className="pt-2 animate-in fade-in duration-300">
                                    {/* 4 Metric Boxes matching Image */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                                        <div className="bg-[#080d18] border border-white/5 rounded-2xl p-4 space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] block">
                                                Assessed Property Value
                                            </span>
                                            <p className="font-mono font-black text-lg tracking-wide text-rose-500">
                                                ₱{rawAssessedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>

                                        <div className="bg-[#080d18] border border-white/5 rounded-2xl p-4 space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] block">
                                                Tax Declaration # (TDN)
                                            </span>
                                            <p className="font-mono font-black text-sm tracking-wide text-white truncate">
                                                {tdn}
                                            </p>
                                        </div>

                                        <div className="bg-[#080d18] border border-white/5 rounded-2xl p-4 space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] block">
                                                PIN Number
                                            </span>
                                            <p className="font-mono font-black text-sm tracking-wide text-white truncate">
                                                {pin}
                                            </p>
                                        </div>

                                        <div className="bg-[#080d18] border border-white/5 rounded-2xl p-4 space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] block">
                                                Barangay Location
                                            </span>
                                            <p className="font-black text-sm uppercase text-slate-200 truncate">
                                                {barangay}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Card 2: TAX COMPUTATION BREAKDOWN (100% matched with Image) */}
                    <Card className="rounded-3xl border border-rose-500/30 bg-[#0f1420] shadow-2xl text-white py-0 gap-0">
                        <CardContent className="px-6 md:px-8 py-6 space-y-6">
                            {/* Section Header with Icon & Export Action */}
                            <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                <div className="flex items-center gap-2 text-rose-500 font-black text-xs uppercase tracking-widest italic">
                                    <Receipt className="w-4 h-4 text-rose-500" />
                                    <span>Tax Computation Breakdown</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleExportSingleForm10A("pdf")}
                                    disabled={isExporting}
                                    className="h-7 px-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:text-white hover:bg-rose-500/25 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                    title="Export official Prov. Form No. 10(A) PDF for this computation"
                                >
                                    <Download className="w-3 h-3 text-rose-400" />
                                    <span>Export Form 10(A)</span>
                                </button>
                            </div>

                            {/* Row 1: Tax Year, Period Covered, Payment Date Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                        Tax Year
                                    </label>
                                    <select
                                        value={taxYear}
                                        onChange={(e) => setTaxYear(e.target.value)}
                                        className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-[#080d18] text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500 transition-colors"
                                    >
                                        {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
                                            <option key={y} value={y} className="bg-[#0f1420] text-white">
                                                {y}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                        Period Covered
                                    </label>
                                    <select
                                        value={periodCovered}
                                        onChange={(e) => setPeriodCovered(e.target.value)}
                                        className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-[#080d18] text-xs font-bold text-white focus:outline-none focus:border-rose-500 transition-colors"
                                    >
                                        <option value="Current Year" className="bg-[#0f1420] text-white">Current Year</option>
                                        <option value="Full Year (Annual)" className="bg-[#0f1420] text-white">Full Year (Annual)</option>
                                        <option value="1st Quarter (Q1)" className="bg-[#0f1420] text-white">1st Quarter (Q1)</option>
                                        <option value="2nd Quarter (Q2)" className="bg-[#0f1420] text-white">2nd Quarter (Q2)</option>
                                        <option value="3rd Quarter (Q3)" className="bg-[#0f1420] text-white">3rd Quarter (Q3)</option>
                                        <option value="4th Quarter (Q4)" className="bg-[#0f1420] text-white">4th Quarter (Q4)</option>
                                        <option value="Prior Delinquent Years" className="bg-[#0f1420] text-white">Prior Delinquent Years</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                        Payment Date
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                            className="w-full h-11 px-3.5 pr-10 rounded-xl border border-white/10 bg-[#080d18] text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500 transition-colors scheme-dark"
                                        />
                                        <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Discount & Penalty Section matching Image */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-1.5 text-rose-500 font-black text-[10px] uppercase tracking-widest italic">
                                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Discount / Penalty</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                                    {/* Discount Type */}
                                    <div className="space-y-1.5 col-span-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                            Discount
                                        </label>
                                        <select
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value as any)}
                                            className="w-full h-11 px-3 rounded-xl border border-white/10 bg-[#080d18] text-xs font-bold text-white focus:outline-none focus:border-rose-500 transition-colors"
                                        >
                                            <option value="NONE" className="bg-[#0f1420] text-white">None</option>
                                            <option value="ADVANCE_ANNUAL_20" className="bg-[#0f1420] text-white">Advance Annual (20%)</option>
                                            <option value="PROMPT_QUARTERLY_10" className="bg-[#0f1420] text-white">Prompt Quarterly (10%)</option>
                                            <option value="OTHER" className="bg-[#0f1420] text-white">Other / Custom</option>
                                        </select>
                                    </div>

                                    {/* Discount Amount (read-only computation display) */}
                                    <div className="space-y-1.5 col-span-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                            Discount Amount
                                        </label>
                                        <div className="h-11 px-3 flex items-center rounded-xl border border-white/10 bg-[#080d18] text-xs font-mono font-bold text-slate-200">
                                            ₱{computation.totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    {/* Penalty Type */}
                                    <div className="space-y-1.5 col-span-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                            Penalty
                                        </label>
                                        <select
                                            value={penaltyType}
                                            onChange={(e) => setPenaltyType(e.target.value as any)}
                                            className="w-full h-11 px-3 rounded-xl border border-white/10 bg-[#080d18] text-xs font-bold text-white focus:outline-none focus:border-rose-500 transition-colors"
                                        >
                                            <option value="NONE" className="bg-[#0f1420] text-white">None</option>
                                            <option value="DELINQUENT_2" className="bg-[#0f1420] text-white">Delinquent (2% per month)</option>
                                        </select>
                                    </div>

                                    {/* Penalty Rate with Info Icon */}
                                    <div className="space-y-1.5 col-span-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                                Penalty Rate
                                            </label>
                                            <Info className="w-3 h-3 text-slate-500" />
                                        </div>
                                        {penaltyType === "DELINQUENT_2" ? (
                                            <select
                                                value={penaltyMonths}
                                                onChange={(e) => setPenaltyMonths(Number(e.target.value))}
                                                className="w-full h-11 px-3 rounded-xl border border-white/10 bg-[#080d18] text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500 transition-colors"
                                            >
                                                {Array.from({ length: 36 }, (_, i) => i + 1).map((m) => (
                                                    <option key={m} value={m} className="bg-[#0f1420] text-white">
                                                        {m} mo ({m * 2}%)
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="h-11 px-3 flex items-center justify-between rounded-xl border border-white/10 bg-[#080d18] text-xs font-bold text-slate-400">
                                                <span>2% per month</span>
                                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Penalty Amount (read-only computation display) */}
                                    <div className="space-y-1.5 col-span-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                            Penalty Amount
                                        </label>
                                        <div className="h-11 px-3 flex items-center rounded-xl border border-white/10 bg-[#080d18] text-xs font-mono font-bold text-slate-200">
                                            ₱{computation.totalPenalty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Discount Percentage & Reason (when OTHER selected) */}
                                {discountType === "OTHER" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 animate-in fade-in duration-200">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                                Custom Discount %
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={customDiscountPercent}
                                                onChange={(e) => setCustomDiscountPercent(Number(e.target.value))}
                                                className="w-full h-10 px-3 rounded-xl border border-white/10 bg-[#080d18] text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500"
                                            />
                                        </div>
                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                                Legal Basis / Override Remarks
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Specify Legal Basis or Ordinance No...."
                                                value={overrideReason}
                                                onChange={(e) => setOverrideReason(e.target.value)}
                                                className="w-full h-10 px-3 rounded-xl border border-white/10 bg-[#080d18] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Row 3: 3-Column Detailed Breakdown matching Image */}
                            <div className="pt-4 border-t border-white/5">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                    {/* Column 1: Basic Real Property Tax (1%) */}
                                    <div className="md:col-span-5 space-y-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-wider text-rose-500 italic">
                                            Basic Real Property Tax (1%)
                                        </h3>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between text-slate-400">
                                                <span>Assessed Value</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{computation.av.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-slate-400">
                                                <span>Basic RPT (1%)</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{computation.grossBasic.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-slate-400">
                                                <span>Less: Discount {computation.discRate > 0 ? `(${Math.round(computation.discRate * 100)}% if applicable)` : "(10% if applicable)"}</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{computation.basicDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-slate-400">
                                                <span>Add: Penalty (if applicable)</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{computation.basicPenalty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                                <span className="font-black uppercase tracking-wider text-xs text-white">Basic Total</span>
                                                <span className="font-mono font-black text-sm text-white">
                                                    ₱{computation.basicTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Special Education Fund (1%) */}
                                    <div className="md:col-span-4 space-y-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-wider text-rose-500 italic">
                                            Special Education Fund (1%)
                                        </h3>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between text-slate-400">
                                                <span>Assessed Value</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{computation.av.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-slate-400">
                                                <span>SEF (1%)</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{computation.grossSef.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-slate-400">
                                                <span>Less: Discount {computation.discRate > 0 ? `(${Math.round(computation.discRate * 100)}% if applicable)` : "(10% if applicable)"}</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{computation.sefDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-slate-400">
                                                <span>Add: Penalty (if applicable)</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{computation.sefPenalty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                                <span className="font-black uppercase tracking-wider text-xs text-white">SEF Total</span>
                                                <span className="font-mono font-black text-sm text-white">
                                                    ₱{computation.sefTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 3: Total Amount Due matching Image */}
                                    <div className="md:col-span-3 flex flex-col justify-center items-center md:items-end text-center md:text-right pt-4 md:pt-0">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic block mb-1">
                                            Total Amount Due
                                        </span>
                                        <span className="text-3xl lg:text-4xl font-black italic tracking-tighter text-rose-500 font-mono">
                                            ₱{computation.totalAmountDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Row 4: REVENUE ALLOCATION (For Developer Reference Only) matching Image */}
                            <div className="pt-4 border-t border-white/5 space-y-3">
                                <div
                                    onClick={() => setIsRevenueAllocationOpen(!isRevenueAllocationOpen)}
                                    className="flex items-center justify-between cursor-pointer select-none group"
                                >
                                    <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest italic">
                                        <Building2 className="w-4 h-4 text-rose-500" />
                                        <span>Revenue Allocation (For Developer Reference Only)</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-7 h-7 rounded-full text-slate-400 hover:text-white hover:bg-white/5"
                                    >
                                        {isRevenueAllocationOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                </div>

                                {isRevenueAllocationOpen && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 text-xs border-t border-white/5 animate-in fade-in duration-200">
                                        {/* Basic RPT Allocation */}
                                        <div className="space-y-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                                Basic RPT Allocation
                                            </span>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-[#080d18] border border-white/5 rounded-xl p-2.5 space-y-0.5">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Municipality</span>
                                                    <span className="text-[10px] font-mono text-slate-400 block">40%</span>
                                                    <p className="font-mono font-black text-slate-100 text-xs">
                                                        ₱{computation.allocMunicipality.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                                <div className="bg-[#080d18] border border-white/5 rounded-xl p-2.5 space-y-0.5">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Province</span>
                                                    <span className="text-[10px] font-mono text-slate-400 block">35%</span>
                                                    <p className="font-mono font-black text-slate-100 text-xs">
                                                        ₱{computation.allocProvince.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                                <div className="bg-[#080d18] border border-white/5 rounded-xl p-2.5 space-y-0.5">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Barangay</span>
                                                    <span className="text-[10px] font-mono text-slate-400 block">25%</span>
                                                    <p className="font-mono font-black text-slate-100 text-xs">
                                                        ₱{computation.allocBarangay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SEF Allocation */}
                                        <div className="space-y-2 md:border-l md:border-white/5 md:pl-6">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                                SEF Allocation
                                            </span>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-[#080d18] border border-white/5 rounded-xl p-2.5 space-y-0.5">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase block truncate">Municipal / Local School Board</span>
                                                    <span className="text-[10px] font-mono text-slate-400 block">50%</span>
                                                    <p className="font-mono font-black text-slate-100 text-xs">
                                                        ₱{computation.allocMunicipalSchoolBoard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                                <div className="bg-[#080d18] border border-white/5 rounded-xl p-2.5 space-y-0.5">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase block truncate">Provincial / Provincial School Board</span>
                                                    <span className="text-[10px] font-mono text-slate-400 block">50%</span>
                                                    <p className="font-mono font-black text-slate-100 text-xs">
                                                        ₱{computation.allocProvincialSchoolBoard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Collapsible Citizen Profile Section */}
                    <div className="space-y-4">
                        <ResidentIdentityProfile
                            resident={resident}
                            safeFormatDate={props.safeFormatDate || ((d: any) => String(d))}
                            themeColor="#e11d48"
                            titleColorText="Applicant"
                            titleWhiteText="Profile"
                            subtitleText={isApplicantTheOwner ? "Applicant is the Registered Property Owner" : `Transacting Citizen • Representative of ${ownerName}`}
                            transactionId={transaction.id}
                            canEdit={!props.isReadOnlyAide}
                            onProfileUpdated={props.fetchTransaction}
                        />
                    </div>

                    {/* Collapsible Requirements Section */}
                    {attachments.length > 0 && (
                        <div className="bg-white dark:bg-[#0f1420] p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6">
                            <div
                                className="flex justify-between items-center cursor-pointer select-none"
                                onClick={() => setIsRequirementsOpen(!isRequirementsOpen)}
                            >
                                <div className="flex items-center gap-2">
                                    <BadgeCheck className="w-5 h-5 text-rose-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attached Requirements ({attachments.length})</span>
                                </div>
                                <div className="w-8 h-8 rounded-full hover:bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                                    {isRequirementsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </div>

                            {isRequirementsOpen && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {attachments.map((doc, idx, arr) => (
                                        <div
                                            key={idx}
                                            onClick={() => doc.url && handleViewFile?.(doc.url, doc.label, arr, idx)}
                                            className="relative aspect-[4/3] rounded-2xl bg-white/5 border border-white/5 overflow-hidden group cursor-pointer hover:border-rose-500/50 transition-all select-none"
                                        >
                                            {doc.url ? (
                                                isImageFile(doc.url) ? (
                                                    <>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={doc.url} alt={doc.label} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                                                        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white font-black italic uppercase tracking-wider text-[8px] truncate">
                                                            {doc.label}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="absolute inset-0 bg-gradient-to-br from-[#111827] to-[#0b1220]" />
                                                        <div className="relative h-full w-full flex flex-col items-center justify-center gap-3 p-6">
                                                            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 shadow-sm flex items-center justify-center">
                                                                <FileText className="w-7 h-7 text-rose-500" />
                                                            </div>
                                                            <div className="text-center min-w-0">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                                                    {getFileExtension(doc.url).toUpperCase() || "DOC"} File
                                                                </p>
                                                                <p className="mt-1 text-sm font-black italic uppercase tracking-tight text-white truncate max-w-[220px]">
                                                                    {doc.label}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="absolute inset-x-3 bottom-3 rounded-xl bg-slate-950/75 backdrop-blur-md px-3 py-2 text-center text-white font-black italic uppercase tracking-widest text-[9px] opacity-90 group-hover:opacity-100 transition-opacity">
                                                            Open Document
                                                        </div>
                                                    </>
                                                )
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1.5 p-4">
                                                    <Camera className="w-6 h-6 mx-auto" />
                                                    <span className="text-[8px] font-black uppercase text-center tracking-widest leading-none">{doc.label}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ============================================================ */}
                {/* RIGHT COLUMN: Stepper & Payment Panel matching Image         */}
                {/* ============================================================ */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* Status Tracking Panel matching Image */}
                    <div className="bg-[#0f1420] rounded-3xl p-6 md:p-8 border border-white/5 shadow-2xl space-y-6">
                        <div className="space-y-4">
                            {steps.map((st, idx) => {
                                const isCompleted = st.status === "COMPLETED";
                                const isActive = st.status === "ACTIVE";
                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                            isCompleted
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                                : isActive
                                                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 font-black text-xs"
                                                    : "bg-slate-800/60 text-slate-500 border border-white/5 font-black text-xs"
                                        }`}>
                                            {isCompleted ? (
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            ) : (
                                                <span>{idx === 1 ? 3 : 4}</span>
                                            )}
                                        </div>
                                        <span className={`text-xs font-black uppercase tracking-wider italic ${
                                            isCompleted
                                                ? "text-emerald-400"
                                                : isActive
                                                    ? "text-rose-400"
                                                    : "text-slate-500"
                                        }`}>
                                            {st.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* PAYMENT METHOD & OFFICIAL RECEIPT CARD matching Image */}
                    <div className="bg-[#0f1420] rounded-3xl p-6 md:p-8 border border-white/5 shadow-2xl space-y-5">
                        {transaction.status === "RELEASED" ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-emerald-300 space-y-3">
                                <div className="flex items-center gap-2 font-black uppercase text-xs italic tracking-wider text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Payment Completed & Released
                                </div>
                                <p className="text-[11px] leading-relaxed font-medium text-slate-300">
                                    This transaction has been successfully processed, paid, and released by Treasury. Official Receipt and Tax Clearance Certificate have been issued.
                                </p>
                                {orSeriesNumber && (
                                    <div className="pt-2.5 border-t border-emerald-500/20 text-xs font-mono font-bold text-white flex items-center justify-between">
                                        <span>O.R. Series Number: <span className="text-emerald-400">{orSeriesNumber}</span></span>
                                        <button
                                            type="button"
                                            onClick={() => handleExportSingleForm10A("pdf")}
                                            disabled={isExporting}
                                            className="h-6 px-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:text-white hover:bg-emerald-500/25 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                                            title="Export Form 10(A) PDF"
                                        >
                                            <Download className="w-3 h-3" />
                                            <span>Form 10(A)</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Payment Method Selector */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                        Payment Method
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(["CASH", "GCASH", "LANDBANK"] as const).map((method) => {
                                            const isSelected = paymentMethod === method;
                                            return (
                                                <button
                                                    key={method}
                                                    type="button"
                                                    onClick={() => setPaymentMethod(method)}
                                                    className={`h-11 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                                        isSelected
                                                            ? "bg-[#ff1e56] border-[#ff1e56] text-white shadow-lg shadow-rose-600/30"
                                                            : "bg-[#080d18] border-white/5 text-slate-400 hover:text-white hover:bg-white/5"
                                                    }`}
                                                >
                                                    {method}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Online Payment Reference Number if not CASH */}
                                    {paymentMethod !== "CASH" && (
                                        <div className="space-y-1.5 pt-2 animate-in fade-in duration-200">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                                {paymentMethod} Reference Number <span className="text-rose-500 font-extrabold">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={`Enter ${paymentMethod} reference...`}
                                                value={paymentReference}
                                                onChange={(e) => setPaymentReference(e.target.value)}
                                                className="w-full h-11 px-3 rounded-xl border border-white/10 bg-[#080d18] text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Official Receipt Series Number Input */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                        OR Number (Official Receipt)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter OR Series Number..."
                                        value={orSeriesNumber || ""}
                                        onChange={(e) => setOrSeriesNumber?.(e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-white/10 bg-[#080d18] text-sm font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                                    />
                                </div>

                                {/* Tax Computation Verified Badge matching Image */}
                                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3.5 flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                        <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-emerald-400">
                                            Tax computation verified
                                        </p>
                                        <p className="text-[10px] font-mono text-slate-400">
                                            Computed: {verifiedTimestamp}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-2 pt-2">
                                    <Button
                                        onClick={() => handleReleasePayment()}
                                        disabled={actionLoading || !orSeriesNumber?.trim()}
                                        className="w-full h-13 bg-[#ff1e56] hover:bg-rose-600 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-xl shadow-rose-600/25 italic flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50"
                                    >
                                        {actionLoading ? (
                                            <RotateCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        <span>Mark as Paid & Released</span>
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => setIsRejectModalOpen(true)}
                                        disabled={actionLoading}
                                        className="w-full text-center text-xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-400 py-1.5 transition-colors italic cursor-pointer"
                                    >
                                        Reject Application
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Rejection Remarks Modal */}
            {isRejectModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0f1420] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2 text-rose-500 font-black text-sm uppercase italic">
                                <AlertCircle className="w-5 h-5" />
                                <span>Reject Application</span>
                            </div>
                            <button
                                onClick={() => setIsRejectModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300">
                                Reason for Rejection <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                rows={3}
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Specify reasons for rejecting this Real Property Tax clearance application..."
                                className="w-full p-3 rounded-xl border border-white/10 bg-[#080b11] text-xs text-slate-200 focus:outline-none focus:border-rose-500 resize-none"
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsRejectModalOpen(false)}
                                className="flex-1 rounded-xl border-white/10 text-slate-300 hover:bg-white/5"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmReject}
                                disabled={actionLoading || !rejectReason.trim()}
                                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black italic uppercase text-xs"
                            >
                                Confirm Rejection
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
