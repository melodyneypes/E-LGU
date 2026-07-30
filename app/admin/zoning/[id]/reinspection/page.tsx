
"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
    ArrowLeft,
    BadgeCheck,
    Check
} from "lucide-react";

import { toast } from "sonner";
import {
    getTransactionById,
    evaluateZoningApplication as evaluateCedulaTransaction,
    markZoningForReinspection as markForReinspection,
    getSystemSettingAction
} from "@/app/admin/transactions/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";

interface PageProps {
    params: Promise<{ id: string }>;
}



export default function BuildingPermitReinspectionPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isForcedView = searchParams.get("view") === "true";
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const backUrl = userRole === "MPDC_ZONING" ? "/admin/zoning" : userRole === "ENGINEER" ? "/admin/engineer" : "/admin/treasury";

    const [transaction, setTransaction] = useState<any>(null);
    const addData = (transaction?.additionalData as any) || {};
    const zoningStatus = addData.zoningStatus;

    const isZoningActive = userRole === "MPDC_ZONING" && transaction?.status === "EVALUATED" && (
        transaction?.additionalData?.feeAssessment?.engineerEndorsedToZoning === true ||
        transaction?.additionalData?.feeAssessment?.endorsed === true
    );
    const isZoningReadonly = userRole === "MPDC_ZONING" && !isZoningActive;

    const isViewOnly = isForcedView || transaction?.isCancelled || 
        isZoningReadonly || 
        (userRole === "MPDC_ZONING" && isZoningActive && zoningStatus !== "FOR_REINSPECTION") ||
        (userRole !== "MPDC_ZONING" && transaction && transaction.status !== "FOR_REINSPECTION");
    
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [themeColor, setThemeColor] = useState<string>("#2563eb");

    // Re-inspection State
    const [isReinspecting, setIsReinspecting] = useState(false);
    const [reinspectReason, setReinspectReason] = useState("");
    const [reinspectDate, setReinspectDate] = useState("");
    const [reinspectTime, setReinspectTime] = useState("");
    const [reinspectInspector, setReinspectInspector] = useState("");
    const [reinspectType, setReinspectType] = useState("Structural Inspection");

    const fetchTransaction = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTransactionById(id);
            if (res.success && res.data) {
                setTransaction(res.data);
            } else {
                toast.error(res.error || "Failed to load transaction");
            }
        } catch {
            toast.error("An error occurred while fetching details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTransaction();
        getSystemSettingAction("theme_color", "#2563eb").then(res => {
            if (res.success && res.data) setThemeColor(res.data);
        });
    }, [fetchTransaction]);

    const handleEvaluate = async () => {
        setActionLoading(true);
        try {
            const res = await evaluateCedulaTransaction(id);
            if (res.success) {
                toast.success("Inspection Approved Successfully");
                router.push(`/admin/zoning/${id}/fees`);
            } else {
                toast.error(res.error || "Failed");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleReinspect = async () => {
        if (!reinspectReason) { toast.error("Reason required"); return; }
        if (!reinspectDate || !reinspectTime || !reinspectInspector) { toast.error("Please fill in Date, Time, and Inspector"); return; }
        setActionLoading(true);
        try {
            const res = await markForReinspection(id, reinspectReason, {
                date: reinspectDate,
                time: reinspectTime,
                inspectorName: reinspectInspector,
                type: reinspectType
            });
            if (res.success) {
                toast.success("Application marked for Re-Inspection");
                router.push(backUrl);
            } else {
                toast.error(res.error || "Failed");
            }
        } finally {
            setActionLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!transaction) return <div className="p-20 text-center dark:text-white">Protocol Error: Transaction Inaccessible</div>;

    const additional = transaction.additionalData || {};
    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};

    const steps = [
        { id: "FOR_REQUESTING", label: "EVALUATION" },
        { id: "FOR_INSPECTION", label: "INSPECTION" },
        { id: "FOR_REINSPECTION", label: "RE-INSPECTION" },
        { id: "EVALUATED", label: "FEE ASSESSMENT" }
    ];
    const getStepIndex = (status: string) => {
        if (status === "FOR_REQUESTING" || status === "FOR_REVISION") return 0;
        if (status === "FOR_INSPECTION") return 1;
        if (status === "FOR_REINSPECTION") return 2;
        if (status === "EVALUATED" || status === "UNPAID" || status === "PAYMENT_SUBMITTED" || status === "PAID") return 3;
        return 4;
    };
    const currentStepIdx = getStepIndex(zoningStatus || "FOR_REQUESTING");

    return (
        <div
            className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] text-[#0f172a] dark:text-[#f8fafc] pb-20 font-sans transition-colors duration-500"
            style={{ "--theme_color": themeColor, "--primary-theme": themeColor } as React.CSSProperties}
        >
            <header className="h-16 px-8 flex items-center justify-between border-b border-transparent dark:border-white/5">
                <div className="flex items-center gap-4">
                    <Link href={backUrl} prefetch={false}>
                        <Button variant="ghost" className="gap-2 text-slate-400 dark:text-slate-500 font-bold hover:text-primary">
                            <ArrowLeft className="w-4 h-4" /> BACK TO DASHBOARD
                        </Button>
                    </Link>
                    <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
                    <Link href={`/admin/zoning/${id}/evaluation?view=true`} prefetch={false}>
                        <Button variant="outline" className="h-9 gap-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 font-black text-[10px] uppercase tracking-wider rounded-xl">
                            <ArrowLeft className="w-3.5 h-3.5" /> View Evaluation Phase
                        </Button>
                    </Link>
                    <Link href={`/admin/zoning/${id}/inspection?view=true`} prefetch={false}>
                        <Button variant="outline" className="h-9 gap-2 border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/5 font-black text-[10px] uppercase tracking-wider rounded-xl">
                            <ArrowLeft className="w-3.5 h-3.5" /> View Site Inspection Phase
                        </Button>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-2">
                        <Badge className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-500/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-1 rounded-xl">
                            Revision Count: {transaction?.additionalData?.zoningRevisionCount || 0} / 3
                        </Badge>
                        <Badge className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-1 rounded-xl">
                            Re-inspection Count: {transaction?.additionalData?.zoningReinspectionCount || 0} / 3
                        </Badge>
                    </div>
                    <Badge variant="outline" className="font-black italic uppercase tracking-widest text-[10px] border-primary/20 text-primary bg-primary/5 px-4 py-1">
                        Zoning Re-inspection Portal Active
                    </Badge>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-8 grid grid-cols-12 gap-8 mt-4">
                {isZoningReadonly && (
                    <div className="col-span-12 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">⚠️ Awaiting Engineering Endorsement</p>
                            <p className="text-[11px] font-medium opacity-90">This building permit application has not yet been endorsed by the Municipal Engineer. Currently viewing in read-only mode.</p>
                        </div>
                    </div>
                )}

                {isViewOnly && !isZoningReadonly && (
                    <div className="col-span-12 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">📜 Archival Phase View Mode</p>
                            <p className="text-[11px] font-medium opacity-90">{transaction?.status === "REJECTED" ? "This building permit application has been officially rejected." : "You are reviewing the historical Re-inspection phase record in read-only mode."}</p>
                        </div>
                        {transaction?.status !== "REJECTED" && (
                            <Button onClick={() => router.push(`/admin/zoning/${id}`)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase h-10 px-4 rounded-xl active:scale-95 transition-all border-none">
                                Return to Active Phase
                            </Button>
                        )}
                    </div>
                )}

                {/* Left Column */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-[#0c4a6e]/10 dark:from-blue-500/5 dark:to-[#0c4a6e]/5 border border-blue-500/20 dark:border-blue-500/10 rounded-[2rem] p-8 flex items-center justify-between shadow-sm relative overflow-hidden">
                        <div className="space-y-2 relative z-10">
                            <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-[0.2em] italic">Phase 3: Field Re-Verification</span>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">RE-INSPECTION & HISTORY</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Field Re-inspection in progress. Verify previous defects are resolved. Automatic rejection triggers on the 4th failure.</p>
                        </div>
                        <div className="text-5xl font-black italic text-blue-500/20 select-none hidden md:block">RE-INSPECT</div>
                    </div>

                    {/* Active Re-Inspection Details */}
                    {additional?.zoningInspectionSchedule && (
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-blue-500/20 dark:border-blue-500/10 space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[100px] pointer-events-none" />
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-blue-600 dark:text-blue-400 leading-none">
                                    Active <span className="text-[#1e293b] dark:text-white">Re-Inspection schedule</span>
                                </h2>
                                <p className="text-[9px] font-black uppercase text-blue-400 dark:text-blue-500 tracking-[0.2em] italic mt-2">Active Scheduled Re-visit</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Inspection Type</label>
                                    <div className="h-12 flex items-center px-5 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl font-bold text-sm text-blue-900 dark:text-blue-100">{additional.zoningInspectionSchedule.type || "--"}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Date & Time</label>
                                    <div className="h-12 flex items-center px-5 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl font-bold text-sm text-blue-900 dark:text-blue-100">{additional.zoningInspectionSchedule.date} @ {additional.zoningInspectionSchedule.time}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Assigned Inspector</label>
                                    <div className="h-12 flex items-center px-5 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl font-bold text-sm text-blue-900 dark:text-blue-100">{additional.zoningInspectionSchedule.inspectorName || "--"}</div>
                                </div>
                                {additional.zoningInspectionSchedule.notes && (
                                    <div className="space-y-2 md:col-span-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Zoning Officer&apos;s Instructions</label>
                                        <div className="p-5 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl font-medium italic text-sm text-blue-800 dark:text-blue-200 min-h-[48px]">&quot;{additional.zoningInspectionSchedule.notes}&quot;</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* History Log */}
                    {additional?.reinspectionHistory && additional.reinspectionHistory.length > 0 && (
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-white/5 space-y-8">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white leading-none">
                                    Inspection <span className="text-primary">History Log</span>
                                </h2>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] italic mt-2">Previous Schedules & Re-inspections Dossier</p>
                            </div>
                            <div className="space-y-3">
                                {additional.reinspectionHistory.map((h: any, idx: number) => {
                                    const isOrig = h.count === 0 || h.isOriginal === true;
                                    return (
                                        <div key={idx} className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-lg flex items-center justify-center font-black italic text-[10px]",
                                                    isOrig ? "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400" : "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                                )}>
                                                    {isOrig ? "Orig" : `#${h.count}`}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700 dark:text-slate-200">{isOrig ? "Original Inspection" : "Re-inspection Attempt"}</p>
                                                    <p className="text-[10px] text-slate-400">{isOrig ? `${h.date} @ ${h.time}` : (h.date ? new Date(h.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Date Unknown")}</p>
                                                </div>
                                            </div>
                                            <div className="md:text-right max-w-md">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{isOrig ? "Inspector & Type" : "Reason for Re-inspection"}</p>
                                                <p className="font-medium italic text-slate-600 dark:text-slate-300">{isOrig ? `${h.inspectorName || 'N/A'} (${h.type || 'Site Inspection'})` : `"${h.reason}"`}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Profile */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                Resident <span className="text-primary">Identity Profile</span>
                            </h2>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] italic mt-2">Verified Citizen Data Dossier</p>
                        </div>
                        <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">First Name</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.firstName || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Middle Name</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.middleName || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Last Name</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.lastName || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Suffix</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.suffix || "--"}</div>
                            </div>

                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Birth Date</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                    {resident?.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-2 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Age</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                    {resident?.age ?? (resident?.dateOfBirth ? Math.floor((new Date().getTime() - new Date(resident.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "--")}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Civil Status</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 uppercase">{resident?.civilStatus || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-4 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Contact Number</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.contactNumber || "--"}</div>
                            </div>

                            <div className="col-span-12 md:col-span-6 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Occupation</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.occupation || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-6 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Barangay & Complete Address</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                    {resident?.houseNumber || ""} {resident?.street || ""} {resident?.barangay ? `${resident.barangay}, Mapandan, Pangasinan` : "--"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Application Details */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                Application <span className="text-primary">Details</span>
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Description of Work</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.descriptionOfWork || "--"}</div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Occupancy Use</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.occupancyUse || "--"}</div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Total Floor(s)</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.totalFloors || "--"}</div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Is applicant lot owner?</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.isLotOwner || "--"}</div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Location of Construction</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.locationOfConstruction || additional?.location || "--"}</div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Estimated Cost</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-black text-sm text-primary min-h-[48px]">₱{Number(additional?.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Workflow Tracking & Executive Actions */}
                <div className="col-span-12 lg:col-span-4 space-y-8 sticky top-16 self-start">
                    <div className="bg-[#151b28] rounded-[2rem] p-8 border border-white/5 space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Workflow Tracking</h3>
                        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                            {(() => {
                                const handleStepClick = (stepId: string) => {
                                    if (stepId === "FOR_REQUESTING") {
                                        router.push(`/admin/zoning/${id}/evaluation?view=true`);
                                    } else if (stepId === "FOR_INSPECTION") {
                                        router.push(`/admin/zoning/${id}/inspection?view=true`);
                                    } else if (stepId === "FOR_REINSPECTION") {
                                        router.push(`/admin/zoning/${id}/reinspection?view=true`);
                                    } else if (stepId === "EVALUATED") {
                                        router.push(`/admin/zoning/${id}/fees?view=true`);
                                    }
                                };
                                return steps.map((step, idx) => {
                                    const isCompleted = idx < currentStepIdx;
                                    const isActive = idx === currentStepIdx;
                                    return (
                                        <div
                                            key={step.id}
                                            onClick={() => { if (isCompleted) handleStepClick(step.id); }}
                                            className={`relative flex items-center justify-between group ${isCompleted ? "cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-all" : ""
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`absolute left-[-29px] w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? "bg-[#006A2E] border-[#006A2E] text-white shadow-lg shadow-green-500/20" :
                                                    isActive ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110" :
                                                        "bg-slate-900 border-white/10 text-slate-500"
                                                    }`}>
                                                    {isCompleted ? <BadgeCheck className="w-3.5 h-3.5" /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-black uppercase tracking-widest italic transition-colors ${isActive ? "text-white" : "text-slate-400"}`}>{step.label}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* Executive Actions */}
                    <div className="space-y-4">
                        {!isViewOnly && (userRole === "MPDC_ZONING" || userRole === "ENGINEER") && (
                            <div className="space-y-3">
                                <Button onClick={handleEvaluate} disabled={actionLoading} className="w-full h-16 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20">
                                    <Check className="w-4 h-4 mr-2" /> Approve Inspection
                                </Button>

                                <Dialog open={isReinspecting} onOpenChange={setIsReinspecting}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black italic uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                                            For Re-Inspection
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                                        <DialogHeader className="space-y-3">
                                            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                Mark for <span className="text-blue-600">Re-Inspection</span>
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-6 py-6">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Re-Inspection <span className="text-red-500">*</span></Label>
                                                <Textarea placeholder="State reason..." value={reinspectReason} onChange={(e) => setReinspectReason(e.target.value)} className="min-h-[80px] rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold p-6 text-sm" required />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Inspection Type <span className="text-red-500">*</span></Label>
                                                <select className="flex h-12 w-full rounded-2xl border-none bg-slate-50 px-4 py-2 text-sm font-bold dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none" value={reinspectType} onChange={(e) => setReinspectType(e.target.value)}>
                                                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Structural Inspection">Structural Inspection</option>
                                                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Electrical Inspection">Electrical Inspection</option>
                                                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Sanitary/Plumbing Inspection">Sanitary/Plumbing Inspection</option>
                                                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Complete Site Inspection">Complete Site Inspection</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date <span className="text-red-500">*</span></Label>
                                                    <Input type="date" value={reinspectDate} onChange={(e) => setReinspectDate(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold px-4" />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Time <span className="text-red-500">*</span></Label>
                                                    <Input type="time" value={reinspectTime} onChange={(e) => setReinspectTime(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold px-4" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Inspector <span className="text-red-500">*</span></Label>
                                                <Input placeholder="Engr. Santos" value={reinspectInspector} onChange={(e) => setReinspectInspector(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold px-4" />
                                            </div>
                                        </div>
                                        <Button onClick={handleReinspect} disabled={actionLoading || !reinspectReason.trim() || !reinspectDate || !reinspectTime || !reinspectInspector} className="w-full h-14 bg-blue-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl">
                                            {actionLoading ? "Processing..." : "Confirm Re-Inspection"}
                                        </Button>
                                    </DialogContent>
                                </Dialog>

                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
