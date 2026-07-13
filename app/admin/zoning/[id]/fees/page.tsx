/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
    ArrowLeft,
    AlertCircle,
    BadgeCheck,
    Coins,
    Check,
    Upload,
    ExternalLink,
    X,
    FileWarning,
    RefreshCw
} from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

import { toast } from "sonner";
import {
    getTransactionById,
    endorseBuildingPermitFees,
    getSystemSettingAction,
    approveBuildingPermit,
    uploadECopyAction,
    reviseBuildingPermitClearancesAction,
    declineBuildingPermitAction,
    submitZoningClearanceAction
} from "@/app/admin/transactions/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import LightboxView from "../../../treasury/[id]/components/LightboxView";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";

const formatNumberWithCommas = (value: string | number) => {
    if (value === undefined || value === null || value === "") return "";
    const str = String(value).replace(/,/g, "");
    const parts = str.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
};

const cleanCommaNumber = (value: string) => {
    return value.replace(/[^0-9.]/g, "");
};

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function BuildingPermitFeesPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isForcedView = searchParams.get("view") === "true";
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const backUrl = userRole === "MPDC_ZONING" ? "/admin/zoning" : userRole === "ENGINEER" ? "/admin/engineer" : "/admin/treasury";

    const [transaction, setTransaction] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [themeColor, setThemeColor] = useState<string>("#2563eb");

    // Fee form state
    const [buildingFee, setBuildingFee] = useState<string>("");
    const [engineerMunicipalCharges, setEngineerMunicipalCharges] = useState<{ name: string, amount: string }[]>([{ name: "", amount: "" }]);
    const [zoningMunicipalCharges, setZoningMunicipalCharges] = useState<{ name: string, amount: string }[]>([{ name: "", amount: "" }]);

    const [zoningClearanceUrl, setZoningClearanceUrl] = useState<string>("");
    const [uploading, setUploading] = useState(false);

    // Modals state
    const [reviseModalOpen, setReviseModalOpen] = useState(false);
    const [declineModalOpen, setDeclineModalOpen] = useState(false);
    const [reasonText, setReasonText] = useState("");
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");

    const addData = (transaction?.additionalData as any) || {};
    const zoningStatus = addData.zoningStatus;
    const isZoningActive = userRole === "MPDC_ZONING" && transaction?.status === "EVALUATED";

    const isEndorsed = zoningStatus === "ENDORSED" || ["UNPAID", "PAYMENT_SUBMITTED", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(transaction?.status || "");

    // ViewOnly for Zoning: if not active phase, if already endorsed, or if zoningStatus is not EVALUATED.
    // ViewOnly for others (Engineer/Admin): if not EVALUATED status, or if already endorsed.
    const isViewOnly = isForcedView ||
        isEndorsed ||
        (userRole === "MPDC_ZONING" && (!isZoningActive || zoningStatus !== "EVALUATED")) ||
        (userRole !== "MPDC_ZONING" && transaction && transaction.status !== "EVALUATED");

    const fetchTransaction = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTransactionById(id);
            if (res.success && res.data) {
                const tx = res.data;
                setTransaction(tx);
                if (tx.eCopyUrl) {
                    setECopyUrl(tx.eCopyUrl);
                }
                if (tx.additionalData?.zoningClearanceUrl) {
                    setZoningClearanceUrl(tx.additionalData.zoningClearanceUrl);
                }

                // Pre-populate if already assessed
                const assessed = tx.additionalData?.feeAssessment;
                if (assessed) {
                    setBuildingFee(String(assessed.buildingPermitFee || ""));
                    if (assessed.engineerMunicipalCharges && assessed.engineerMunicipalCharges.length > 0) {
                        setEngineerMunicipalCharges(assessed.engineerMunicipalCharges.map((c: any) => ({ name: c.name, amount: String(c.amount) })));
                    } else if (assessed.municipalCharges) {
                        setEngineerMunicipalCharges([{ name: "Other Applicable Municipal Charges", amount: String(assessed.municipalCharges) }]);
                    }
                    if (assessed.zoningMunicipalCharges && assessed.zoningMunicipalCharges.length > 0) {
                        setZoningMunicipalCharges(assessed.zoningMunicipalCharges.map((c: any) => ({ name: c.name, amount: String(c.amount) })));
                    }
                }
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

    const handleEndorse = async () => {
        const isZoning = userRole === "MPDC_ZONING";

        if (!isZoning && !buildingFee) {
            toast.error("Please fill in all required fee fields.");
            return;
        }

        const validCharges = engineerMunicipalCharges.filter(c => c.name.trim() && c.amount);
        const validZoningCharges = zoningMunicipalCharges.filter(c => c.name.trim() && c.amount);

        setActionLoading(true);
        try {
            const res = await endorseBuildingPermitFees(id, {
                ...(isZoning ? {
                    zoningMunicipalCharges: validZoningCharges.map(c => ({ name: c.name, amount: Number(c.amount) }))
                } : {
                    buildingPermitFee: Number(buildingFee),
                    engineerMunicipalCharges: validCharges.map(c => ({ name: c.name, amount: Number(c.amount) }))
                })
            });

            if (res.success) {
                toast.success("Fees endorsed to Treasury successfully!");
                router.push(backUrl);
            } else {
                toast.error(res.error || "Failed to endorse fees");
            }
        } catch {
            toast.error("An error occurred while submitting fees");
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            const res = await approveBuildingPermit(id);
            if (res.success) {
                toast.success("Building Permit approved & moved to processing successfully!");
                fetchTransaction();
            } else {
                toast.error(res.error || "Failed to approve permit");
            }
        } catch {
            toast.error("An error occurred while approving permit");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevise = async () => {
        if (!reasonText.trim()) {
            toast.error("Please provide a reason for revision.");
            return;
        }
        setActionLoading(true);
        try {
            const res = await reviseBuildingPermitClearancesAction(id, reasonText);
            if (res.success) {
                toast.success("Revision requested. Clearances have been reset.");
                setReviseModalOpen(false);
                setReasonText("");
                fetchTransaction();
            } else {
                toast.error(res.error || "Failed to request revision");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDecline = async () => {
        if (!reasonText.trim()) {
            toast.error("Please provide a reason for decline.");
            return;
        }
        setActionLoading(true);
        try {
            const res = await declineBuildingPermitAction(id, reasonText);
            if (res.success) {
                toast.success("Permit declined successfully.");
                setDeclineModalOpen(false);
                setReasonText("");
                fetchTransaction();
            } else {
                toast.error(res.error || "Failed to decline permit");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setActionLoading(false);
        }
    };



    const handleZoningClearanceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setUploading(true);
        const toastId = toast.loading("Uploading Zoning Clearance...");
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await uploadECopyAction(formData); // reuse this for generic file upload
            if (res.success && res.data) {
                setZoningClearanceUrl(res.data);
                toast.success("Zoning Clearance uploaded successfully!", { id: toastId });
            } else {
                toast.error(res.error || "Failed to upload file", { id: toastId });
            }
        } catch {
            toast.error("Error uploading file", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmitZoningClearance = async () => {
        if (!zoningClearanceUrl) {
            toast.error("Please upload the Zoning Clearance first.");
            return;
        }
        setActionLoading(true);
        try {
            const res = await submitZoningClearanceAction(id, zoningClearanceUrl);
            if (res.success) {
                toast.success("Zoning Clearance submitted to Engineer successfully!");
                fetchTransaction();
            } else {
                toast.error(res.error || "Failed to submit Zoning Clearance");
            }
        } catch {
            toast.error("An error occurred while submitting Zoning Clearance");
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

    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};
    const additional = transaction.additionalData || {};

    const steps = [
        { id: "FOR_REQUESTING", label: "EVALUATION" },
        { id: "FOR_INSPECTION", label: "INSPECTION" },
        { id: "FOR_REINSPECTION", label: "RE-IN-SPECTION" },
        { id: "EVALUATED", label: "FEE ASSESSMENT" },
        { id: "FOR_PROCESSING", label: "SUBMIT" }
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
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => { setViewerOpen(false); setViewerUrl(null); }}
                file={null}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor={themeColor}
            />
            <header className="h-16 px-8 flex items-center justify-between border-b border-transparent dark:border-white/5">
                <div className="flex items-center gap-4">
                    <Link href={backUrl}>
                        <Button variant="ghost" className="gap-2 text-slate-400 dark:text-slate-500 font-bold hover:text-primary">
                            <ArrowLeft className="w-4 h-4" /> BACK TO DASHBOARD
                        </Button>
                    </Link>
                    <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
                    <Link href={`/admin/zoning/${id}/evaluation?view=true`}>
                        <Button variant="outline" className="h-9 gap-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 font-black text-[10px] uppercase tracking-wider rounded-xl">
                            <ArrowLeft className="w-3.5 h-3.5" /> View Evaluation Phase
                        </Button>
                    </Link>
                    <Link href={`/admin/zoning/${id}/inspection?view=true`}>
                        <Button variant="outline" className="h-9 gap-2 border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/5 font-black text-[10px] uppercase tracking-wider rounded-xl">
                            <ArrowLeft className="w-3.5 h-3.5" /> View Site Inspection Phase
                        </Button>
                    </Link>
                    <Link href={`/admin/zoning/${id}/reinspection?view=true`}>
                        <Button variant="outline" className="h-9 gap-2 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 font-black text-[10px] uppercase tracking-wider rounded-xl">
                            <ArrowLeft className="w-3.5 h-3.5" /> View Re-Inspection Phase
                        </Button>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-2">
                        <Badge className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-500/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-1 rounded-xl">
                            Revision Count: {transaction?.revisionCount || 0} / 3
                        </Badge>
                        <Badge className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-1 rounded-xl">
                            Re-inspection Count: {transaction?.additionalData?.reinspectionCount || 0} / 3
                        </Badge>
                    </div>
                    <Badge variant="outline" className="font-black italic uppercase tracking-widest text-[10px] border-primary/20 text-primary bg-primary/5 px-4 py-1">
                        Zoning Fees Assessment Active
                    </Badge>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-8 grid grid-cols-12 gap-8 mt-4">
                {!isEndorsed && (
                    <div className="col-span-12 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">⚠️ Awaiting Zoning Endorsement</p>
                            <p className="text-[11px] font-medium opacity-90">Please specify the Zoning & Locational Clearance charges. The application will be forwarded to Treasury once endorsed.</p>
                        </div>
                    </div>
                )}

                {isEndorsed && !["PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(transaction.status) && (
                    <div className="col-span-12 bg-[#006A2E]/10 border border-[#006A2E]/20 text-[#006A2E] dark:text-green-400 p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">✅ Fees Successfully Endorsed to Treasury</p>
                            <p className="text-[11px] font-medium opacity-90">The building permit fees have been successfully calculated, locked, and endorsed to the Treasury department for collection.</p>
                        </div>
                        <Button onClick={() => router.push(backUrl)} size="sm" className="bg-[#006A2E] hover:bg-emerald-800 text-white font-bold text-xs uppercase h-10 px-4 rounded-xl active:scale-95 transition-all border-none">
                            Return to Dashboard
                        </Button>
                    </div>
                )}

                {isForcedView && !isEndorsed && (
                    <div className="col-span-12 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">📜 Archival Phase View Mode</p>
                            <p className="text-[11px] font-medium opacity-90">{transaction?.status === "REJECTED" ? "This building permit application has been officially rejected." : "You are reviewing the historical Fee Assessment phase record in read-only mode."}</p>
                        </div>
                        {transaction?.status !== "REJECTED" && (
                            <Button onClick={() => router.push(`/admin/zoning/${id}`)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase h-10 px-4 rounded-xl active:scale-95 transition-all border-none">Return to Active Phase
                            </Button>
                        )}
                    </div>
                )}

                {/* Left Column */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-[#0c4a6e]/10 dark:from-emerald-500/5 dark:to-[#0c4a6e]/5 border border-emerald-500/20 dark:border-emerald-500/10 rounded-[2rem] p-8 flex items-center justify-between shadow-sm relative overflow-hidden">
                        <div className="space-y-2 relative z-10">
                            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-[0.2em] italic">Phase 4: Fee & Charges Assessment</span>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">TREASURY ENDORSEMENT</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Specify the official building fees. These values will be endorsed to Treasury for final verification, penalty calculations, and citizen billing.</p>
                        </div>
                        <div className="text-5xl font-black italic text-emerald-500/20 select-none hidden md:block">ASSESS</div>
                    </div>

                    {/* Profile */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8 animate-in fade-in duration-500">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                Resident <span className="text-primary">Identity Profile</span>
                            </h2>
                            <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] italic mt-2">Verified Citizen Data Dossier</p>
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

                    {/* Card 1: Application Details */}
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

                    {/* Specify Official Endorsement Fees Block */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg"><Coins className="text-primary w-4 h-4" /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Specify Official Endorsement Fees</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Building Permit Fee (₱) *</Label>
                                <Input
                                    type="text"
                                    placeholder="0.00"
                                    value={formatNumberWithCommas(buildingFee)}
                                    onChange={(e) => {
                                        const cleanVal = cleanCommaNumber(e.target.value);
                                        const decimalCount = (cleanVal.match(/\./g) || []).length;
                                        if (decimalCount > 1) return;
                                        setBuildingFee(cleanVal);
                                    }}
                                    disabled={isViewOnly || userRole === "MPDC_ZONING"}
                                    className="h-12 rounded-xl text-slate-700 font-bold dark:text-slate-100"
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Other Applicable Municipal Charges</Label>
                                </div>

                                {engineerMunicipalCharges.map((charge, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <Input
                                            type="text"
                                            placeholder="Fee Name (e.g. Zoning Fee)"
                                            value={charge.name}
                                            onChange={(e) => {
                                                const newCharges = [...engineerMunicipalCharges];
                                                newCharges[index].name = e.target.value;
                                                setEngineerMunicipalCharges(newCharges);
                                            }}
                                            disabled={isViewOnly || userRole === "MPDC_ZONING"}
                                            className="h-12 rounded-xl text-slate-700 font-bold dark:text-slate-100 flex-1"
                                        />
                                        <Input
                                            type="text"
                                            placeholder="0.00"
                                            value={formatNumberWithCommas(charge.amount)}
                                            onChange={(e) => {
                                                const cleanVal = cleanCommaNumber(e.target.value);
                                                const decimalCount = (cleanVal.match(/\./g) || []).length;
                                                if (decimalCount > 1) return;
                                                const newCharges = [...engineerMunicipalCharges];
                                                newCharges[index].amount = cleanVal;
                                                setEngineerMunicipalCharges(newCharges);
                                            }}
                                            disabled={isViewOnly || userRole === "MPDC_ZONING"}
                                            className="h-12 rounded-xl text-slate-700 font-bold dark:text-slate-100 w-[150px]"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* ZONING CHARGES BLOCK */}
                            {(userRole === "MPDC_ZONING" || zoningMunicipalCharges.some(c => c.name || c.amount) || transaction.additionalData?.feeAssessment?.zoningMunicipalCharges?.length > 0) && (
                                <div className="col-span-1 md:col-span-2 space-y-4 pt-6 border-t border-dashed border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Zoning & Locational Clearance Charges</Label>
                                    </div>

                                    {zoningMunicipalCharges.map((charge, index) => (
                                        <div key={index} className="flex items-center gap-4">
                                            <Input
                                                type="text"
                                                placeholder="Fee Name (e.g. Zoning Fee)"
                                                value={charge.name}
                                                onChange={(e) => {
                                                    const newCharges = [...zoningMunicipalCharges];
                                                    newCharges[index].name = e.target.value;
                                                    setZoningMunicipalCharges(newCharges);
                                                }}
                                                disabled={isViewOnly || userRole !== "MPDC_ZONING"}
                                                className="h-12 rounded-xl text-slate-700 font-bold dark:text-slate-100 flex-1 border-primary/20 bg-primary/5 focus-visible:ring-primary/20"
                                            />
                                            <Input
                                                type="text"
                                                placeholder="0.00"
                                                value={formatNumberWithCommas(charge.amount)}
                                                onChange={(e) => {
                                                    const cleanVal = cleanCommaNumber(e.target.value);
                                                    const decimalCount = (cleanVal.match(/\./g) || []).length;
                                                    if (decimalCount > 1) return;
                                                    const newCharges = [...zoningMunicipalCharges];
                                                    newCharges[index].amount = cleanVal;
                                                    setZoningMunicipalCharges(newCharges);
                                                }}
                                                disabled={isViewOnly || userRole !== "MPDC_ZONING"}
                                                className="h-12 rounded-xl text-slate-700 font-bold dark:text-slate-100 w-[150px] border-primary/20 bg-primary/5 focus-visible:ring-primary/20"
                                            />
                                        </div>
                                    ))}
                                    {!isViewOnly && userRole === "MPDC_ZONING" && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setZoningMunicipalCharges([...zoningMunicipalCharges, { name: "", amount: "" }])}
                                            className="mt-2 text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg"
                                        >
                                            + Add Zoning Fee
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* ADDITIONAL TREASURY FEES LIST */}
                            {transaction.additionalData?.feeAssessment?.additionalFees && transaction.additionalData.feeAssessment.additionalFees.length > 0 && (
                                <div className="space-y-4 pt-6 border-t border-dashed border-slate-100 dark:border-white/5 col-span-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic block">
                                        Additional Treasury Charges
                                    </span>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {transaction.additionalData.feeAssessment.additionalFees.map((fee: any, idx: number) => (
                                            <div key={idx} className="space-y-2 relative group">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block">{fee.label}</label>
                                                <div className="h-12 flex items-center px-5 bg-amber-500/5 border border-amber-500/10 rounded-xl font-black text-sm text-amber-500">
                                                    ₱{Number(fee.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TOTAL AMOUNT BLOCK */}
                            <div className="pt-6 border-t border-dashed border-slate-100 dark:border-white/5 flex justify-between items-center col-span-2">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Endorsed Amount</span>
                                <span className="text-xl font-black italic text-primary">
                                    ₱{Number(
                                        (Number(buildingFee) || 0) +
                                        engineerMunicipalCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) +
                                        zoningMunicipalCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) +
                                        (transaction.additionalData?.feeAssessment?.additionalFees || []).reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0)
                                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Zoning Clearance Upload Block for MPDC_ZONING */}
                    {userRole === "MPDC_ZONING" && isEndorsed && transaction?.additionalData?.zoningStatus === "ENDORSED" && (
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                    Upload Zoning <span className="text-primary">Clearance</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">Upload the scanned or digital copy of the approved Zoning/Locational Clearance to send to the Engineer.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-8 text-center bg-slate-50/50 dark:bg-white/5 hover:bg-slate-100/50 dark:hover:bg-white/10 transition-all duration-300 relative group">
                                    <input
                                        type="file"
                                        id="zoningClearanceUpload"
                                        onChange={handleZoningClearanceUpload}
                                        accept="application/pdf,image/*"
                                        disabled={uploading}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center gap-4">
                                        <div className="p-4 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform">
                                            <Upload className="w-8 h-8 text-primary" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-600 block dark:text-slate-300">Drag & Drop or Click to Upload</span>
                                            <span className="text-[10px] font-bold text-slate-400 block mt-1">PDF or Images up to 10MB</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {zoningClearanceUrl && (
                                <div className="flex flex-col gap-6">
                                    <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                                <Check className="w-6 h-6 text-emerald-500" />
                                            </div>
                                            <div>
                                                <span className="text-xs font-black uppercase tracking-widest italic text-emerald-500">Clearance Ready</span>
                                                <span className="text-[11px] font-medium text-slate-400 block mt-0.5">Click preview to view the uploaded file.</span>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => {
                                                setViewerUrl(zoningClearanceUrl);
                                                setViewerTitle("Zoning Clearance");
                                                setViewerOpen(true);
                                            }}
                                            variant="outline"
                                            className="h-10 gap-2 font-black text-[10px] uppercase tracking-wider rounded-xl"
                                        >
                                            Preview <ExternalLink className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>

                                    <Button
                                        onClick={handleSubmitZoningClearance}
                                        disabled={actionLoading || !zoningClearanceUrl}
                                        className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                                    >
                                        {actionLoading ? "Submitting..." : "Submit Zoning Clearance to Engineer"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* BFP Clearance Vault */}
                    {transaction.additionalData?.bfpClearanceUrl && (
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-6">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                    BFP Fire Safety <span className="text-primary">Clearance Certificate</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">The resident has uploaded their BFP Fire Safety Clearance certificate.</p>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 group max-w-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
                                        <img src={transaction.additionalData.bfpClearanceUrl} alt="BFP Clearance" className="object-cover w-full h-full" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                                                View Fullscreen
                                            </span>
                                        </div>
                                    </div>
                                </DialogTrigger>
                                <LightboxView src={transaction.additionalData.bfpClearanceUrl} alt="BFP Clearance" label="BFP Fire Safety Clearance" />
                            </Dialog>
                        </div>
                    )}

                    {/* Zoning Clearance Vault */}
                    {transaction.additionalData?.zoningClearanceUrl && (
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-6">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                    Zoning / Locational <span className="text-primary">Clearance Certificate</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">The resident has uploaded their Zoning/Locational Clearance certificate issued by the Zoning Officer / MPDC.</p>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 group max-w-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
                                        <img src={transaction.additionalData.zoningClearanceUrl} alt="Zoning Clearance" className="object-cover w-full h-full" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                                                View Fullscreen
                                            </span>
                                        </div>
                                    </div>
                                </DialogTrigger>
                                <LightboxView src={transaction.additionalData.zoningClearanceUrl} alt="Zoning Clearance" label="Zoning / Locational Clearance" />
                            </Dialog>
                        </div>
                    )}


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
                        {!isViewOnly && userRole === "MPDC_ZONING" && (
                            <Button
                                onClick={handleEndorse}
                                disabled={actionLoading}
                                className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black italic uppercase tracking-widest text-xs transition-all shadow-xl shadow-green-900/20 active:scale-95"
                            >
                                <Check className="w-4 h-4 mr-2" /> Endorse Payment Assessment
                            </Button>
                        )}
                        {isEndorsed && userRole !== "MPDC_ZONING" && (
                            <div className="bg-[#151b28] rounded-[2rem] p-6 border border-white/5 space-y-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Treasury Payment Status</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        {["EVALUATED", "UNPAID", "PAYMENT_SUBMITTED"].includes(transaction.status) ? (
                                            <Badge className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs px-3 py-1 font-bold rounded-lg animate-pulse">
                                                AWAITING PAYMENT
                                            </Badge>
                                        ) : transaction.status === "PAID" ? (
                                            <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1 font-bold rounded-lg">
                                                PAID
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-3 py-1 font-bold rounded-lg">
                                                {transaction.status}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {["EVALUATED", "UNPAID", "PAYMENT_SUBMITTED"].includes(transaction.status) && (
                                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                        The resident&apos;s payment is currently pending with the Treasury department. The approval action will unlock once payment is fully settled.
                                    </p>
                                )}

                                {transaction.status === "PAID" && (
                                    <div className="space-y-4">
                                        {!transaction.additionalData?.bfpClearanceUrl ? (
                                            <div className="p-4 bg-red-500/5 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-bold uppercase tracking-wider italic flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                                                <span>Awaiting BFP Fire Safety Clearance upload from Resident.</span>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-xl text-[9px] font-bold uppercase tracking-wider italic flex items-start gap-2">
                                                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>BFP Fire Safety Clearance Proof has been submitted by BFP Officer!</span>
                                            </div>
                                        )}

                                        {!transaction.additionalData?.zoningClearanceUrl ? (
                                            <div className="p-4 bg-red-500/5 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-bold uppercase tracking-wider italic flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                                                <span>Awaiting Zoning/Locational Clearance upload from Resident.</span>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-xl text-[9px] font-bold uppercase tracking-wider italic flex items-start gap-2">
                                                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>Zoning/Locational Clearance Proof has been submitted by Zoning Officer!</span>
                                            </div>
                                        )}

                                        {(userRole === "ENGINEER" || userRole === "MPDC_ZONING") && (
                                            <div className="pt-2 space-y-3">
                                                {(transaction.additionalData?.clearanceRevisionCount || 0) > 0 && (
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5 text-[9px] uppercase font-bold tracking-widest">
                                                            Revision Count: {transaction.additionalData.clearanceRevisionCount} / 3
                                                        </Badge>
                                                    </div>
                                                )}
                                                <Button
                                                    onClick={handleApprove}
                                                    disabled={actionLoading || !transaction.additionalData?.bfpClearanceUrl || !transaction.additionalData?.zoningClearanceUrl || !transaction.additionalData?.clearancesSubmitted}
                                                    className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black italic uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <BadgeCheck className="w-4 h-4 mr-2" /> Approve & Process Permit
                                                </Button>

                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        onClick={() => { setReasonText(""); setReviseModalOpen(true); }}
                                                        disabled={actionLoading || !transaction.additionalData?.bfpClearanceUrl || !transaction.additionalData?.zoningClearanceUrl || !transaction.additionalData?.clearancesSubmitted}
                                                        variant="outline"
                                                        className="flex-1 h-12 rounded-xl border-amber-500/50 text-amber-500 hover:bg-amber-500/10 font-black italic uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5 mr-2" /> Revise Clearances
                                                    </Button>
                                                    <Button
                                                        onClick={() => { setReasonText(""); setDeclineModalOpen(true); }}
                                                        disabled={actionLoading || !transaction.additionalData?.bfpClearanceUrl || !transaction.additionalData?.zoningClearanceUrl || !transaction.additionalData?.clearancesSubmitted}
                                                        variant="outline"
                                                        className="flex-1 h-12 rounded-xl border-red-500/50 text-red-500 hover:bg-red-500/10 font-black italic uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <FileWarning className="w-3.5 h-3.5 mr-2" /> Decline Permit
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}


                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Revise Modal */}
            {reviseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#151b28] w-full max-w-lg rounded-[2rem] p-8 shadow-2xl border border-slate-100 dark:border-white/10 relative">
                        <button onClick={() => setReviseModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                    <RefreshCw className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white">Revise Clearances</h3>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Request the resident to re-upload their clearances.</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason for Revision</Label>
                                <textarea
                                    value={reasonText}
                                    onChange={(e) => setReasonText(e.target.value)}
                                    placeholder="Explain why the submitted clearances are invalid..."
                                    className="w-full h-32 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <Button onClick={() => setReviseModalOpen(false)} variant="outline" className="flex-1 h-12 rounded-xl text-xs font-bold uppercase tracking-widest">Cancel</Button>
                                <Button onClick={handleRevise} disabled={actionLoading || !reasonText.trim()} className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black italic uppercase tracking-widest transition-all">Submit Revision</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Decline Modal */}
            {declineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#151b28] w-full max-w-lg rounded-[2rem] p-8 shadow-2xl border border-slate-100 dark:border-white/10 relative">
                        <button onClick={() => setDeclineModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                                    <FileWarning className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white">Decline Permit</h3>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Reject this application permanently.</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason for Decline</Label>
                                <textarea
                                    value={reasonText}
                                    onChange={(e) => setReasonText(e.target.value)}
                                    placeholder="Explain why this permit application is being declined..."
                                    className="w-full h-32 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <Button onClick={() => setDeclineModalOpen(false)} variant="outline" className="flex-1 h-12 rounded-xl text-xs font-bold uppercase tracking-widest">Cancel</Button>
                                <Button onClick={handleDecline} disabled={actionLoading || !reasonText.trim()} className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black italic uppercase tracking-widest transition-all">Decline & Reject</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
