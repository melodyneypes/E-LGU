"use client";

import React from "react";
import { User, Users, ShieldCheck, FileText, AlertCircle, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

interface MarriageCertificateRequestDetailsProps {
    additionalData: {
        subjectName?: string;
        spouseName?: string;
        dateOfEvent?: string;
        placeOfEvent?: string;
        relationship?: string;
        email?: string;
        contactNumber?: string;
        registryBookVerification?: string;
        applicant1?: {
            fullName: string;
            birthDate: string;
            birthPlace: string;
            citizenship: string;
            gender: string;
        };
        applicant2?: {
            isResident?: boolean;
            fullName: string;
            birthDate: string;
            birthPlace: string;
            citizenship: string;
            address: string;
            gender: string;
        };
        dateOfMarriage?: string;
        placeOfMarriage?: string;
        registrationType?: string;
        informantAddress?: string;
    };
}

export function MarriageCertificateRequestDetails({ additionalData }: MarriageCertificateRequestDetailsProps) {
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "N/A";
        try {
            return format(new Date(dateStr), "MMMM d, yyyy");
        } catch {
            return dateStr;
        }
    };

    const isRegistration = !!additionalData.applicant1;
    const title = isRegistration ? "Marriage Registration Details" : "Marriage Certificate Request Details";

    if (isRegistration) {
        const app1 = additionalData.applicant1;
        const app2 = additionalData.applicant2;
        const isApp1Male = app1?.gender === "MALE";
        const husband = isApp1Male ? app1 : app2;
        const wife = isApp1Male ? app2 : app1;

        return (
            <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-white/5 animate-in fade-in duration-300">
                <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4">
                    {title}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Husband Info Card */}
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <User className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Husband Details</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Full Name</p>
                                <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{husband?.fullName || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Date of Birth</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(husband?.birthDate)}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Citizenship</p>
                                    <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{husband?.citizenship || "N/A"}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Place of Birth</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{husband?.birthPlace || "N/A"}</p>
                            </div>
                            {!isApp1Male && app2?.address && (
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Address</p>
                                    <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{app2.address}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Wife Info Card */}
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <User className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Wife Details (Maiden Name)</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Full Name</p>
                                <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{wife?.fullName || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Date of Birth</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(wife?.birthDate)}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Citizenship</p>
                                    <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{wife?.citizenship || "N/A"}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Place of Birth</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{wife?.birthPlace || "N/A"}</p>
                            </div>
                            {isApp1Male && app2?.address && (
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Address</p>
                                    <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{app2.address}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Marriage Details Card */}
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4 md:col-span-2">
                        <div className="flex items-center gap-2 text-primary">
                            <Users className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Marriage Event Details</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Date of Marriage</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatDate(additionalData.dateOfMarriage)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Place of Marriage</p>
                                <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{additionalData.placeOfMarriage || "N/A"}</p>
                            </div>
                            {additionalData.registrationType && (
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Registration Type</p>
                                    <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{additionalData.registrationType}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-white/5">
            <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4">
                {title}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Card: Spouses Identity Info */}
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <Users className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Spouse Identity Details</span>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">{"Husband's Full Name"}</p>
                            <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{additionalData.subjectName || "N/A"}</p>
                        </div>
                        <div>
                            <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">{"Wife's Full Name (Maiden Name)"}</p>
                            <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{additionalData.spouseName || "N/A"}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Date of Marriage</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(additionalData.dateOfEvent)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Place of Marriage</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{additionalData.placeOfEvent || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Card: Requester Info */}
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <User className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Requester Information</span>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Contact Number</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{additionalData.contactNumber || "N/A"}</p>
                        </div>
                        <div>
                            <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Email Address</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{additionalData.email || "—"}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const getVerificationConfig = (formType: string) => {
    switch (formType) {
        case "FORM_3B":
            return {
                title: "Record Not Available (Form 3B)",
                description: "Your requested marriage certificate record is not available in our archives.",
                themeColor: "#f59e0b",
            };
        case "FORM_3C":
            return {
                title: "Record Destroyed (Form 3C)",
                description: "Your requested marriage certificate record has been destroyed in our archives.",
                themeColor: "#f43f5e",
            };
        case "FORM_3A":
        default:
            return {
                title: "Record Found (Form 3A)",
                description: "Your requested marriage certificate has been retrieved and certified.",
                themeColor: "#10b981",
            };
    }
};

interface MarriageCertificateVerificationCardProps {
    request: any;
    additionalData: any;
    themeColor: string;
    handleViewFile: (url: string | null, title: string) => void;
}

export function MarriageCertificateVerificationCard({ request, additionalData, themeColor, handleViewFile }: MarriageCertificateVerificationCardProps) {
    let formType = additionalData.registryBookVerification || "FORM_3A";
    if (formType.endsWith("A")) formType = "FORM_3A";
    else if (formType.endsWith("B")) formType = "FORM_3B";
    else if (formType.endsWith("C")) formType = "FORM_3C";
    const config = getVerificationConfig(formType);

    const docUrl = additionalData.scannedDocUrl || 
                   additionalData.verificationDocUrl || 
                   additionalData.form3a || 
                   additionalData.form3A || 
                   additionalData.form3b || 
                   additionalData.form3B || 
                   additionalData.form3c || 
                   additionalData.form3C || 
                   request.eCopyUrl;

    return (
        <div
            className="p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden group transition-all duration-300 hover:scale-[1.01] w-full text-left bg-white dark:bg-slate-900/40"
            style={{
                borderColor: `${themeColor}20`,
                boxShadow: `0 20px 25px -5px ${themeColor}10`
            }}
        >
            <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                <ShieldCheck className="w-24 h-24" style={{ color: themeColor }} />
            </div>
            <div className="relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                            style={{ backgroundColor: themeColor }}
                        >
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-widest italic opacity-70 leading-none" style={{ color: themeColor }}>
                                Registry Book Verification
                            </p>
                            <p className="text-xs md:text-sm font-black italic tracking-tight uppercase leading-none mt-1.5 text-slate-900 dark:text-white">
                                {config.title}
                            </p>
                        </div>
                    </div>
                    <Badge
                        className="text-[8px] font-black uppercase tracking-widest italic px-3 py-1 rounded-full text-white border-transparent"
                        style={{ backgroundColor: themeColor }}
                    >
                        {formType.replace(/_/g, " ")}
                    </Badge>
                </div>

                <div className="p-5 bg-white/50 dark:bg-[#121620]/60 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <p className="text-xs md:text-sm font-bold italic text-slate-700 dark:text-slate-200 leading-relaxed">
                        &ldquo;{config.description}&rdquo;
                    </p>
                </div>

                {(formType === "FORM_3B" || formType === "FORM_3C") && (
                    <div
                        className="p-5 rounded-2xl border shadow-inner space-y-4 animate-in slide-in-from-top-2 duration-300 bg-white dark:bg-white/[0.02]"
                        style={{ borderColor: `${themeColor}20` }}
                    >
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: themeColor }} />
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest leading-none" style={{ color: themeColor }}>MCR negative verification notice</h4>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-normal italic">
                                    MCR issued {formType} (Negative Result). Please proceed with Registration to create a record.
                                </p>
                            </div>
                        </div>
                        <Button
                            asChild
                            className="w-full h-11 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center border-none hover:opacity-90"
                            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}30` }}
                        >
                            <Link href="/user/services/civil-registry/marriage-registration">
                                Proceed to Registration
                            </Link>
                        </Button>
                    </div>
                )}

                {docUrl && (
                    <div className="space-y-4 pt-2">
                        {(() => {
                            const isPdf = docUrl.toLowerCase().endsWith(".pdf") || docUrl.includes("application/pdf") || docUrl.includes(".pdf?");
                            if (isPdf) {
                                return (
                                    <button
                                        type="button"
                                        onClick={() => handleViewFile(docUrl, "Verification Document")}
                                        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-lg shrink-0 group-hover:scale-110 transition-transform">
                                                📕
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">Registry Record PDF</p>
                                                <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic mt-0.5 leading-none">Click to view</p>
                                            </div>
                                        </div>
                                        <div className="h-8 px-3 rounded-lg border border-primary/20 text-primary font-black italic uppercase tracking-widest text-[8px] group-hover:bg-primary/10 flex items-center gap-1 transition-all shrink-0" style={{ color: themeColor, borderColor: `${themeColor}33` }}>
                                            Open PDF ➔
                                        </div>
                                    </button>
                                );
                            }

                            return (
                                <div
                                    onClick={() => handleViewFile(docUrl, "Verification Document")}
                                    className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all cursor-pointer select-none"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={docUrl}
                                        alt="Registry Record Preview"
                                        className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                                        <button
                                            type="button"
                                            style={{ backgroundColor: themeColor }}
                                            className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg hover:scale-105 transition-all"
                                        >
                                            <span>VIEW</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                                onClick={async () => {
                                    if (!docUrl) return;
                                    try {
                                        const response = await fetch(docUrl);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement("a");
                                        link.href = url;
                                        const ext = blob.type.includes("pdf") ? "pdf" : "png";
                                        link.download = `Scanned_Verification_${request.id.slice(-6).toUpperCase()}.${ext}`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                        toast.success("Document downloaded!");
                                    } catch {
                                        toast.error("Download failed. Try opening in a new tab.");
                                    }
                                }}
                                className="h-12 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
                                style={{
                                    backgroundColor: themeColor,
                                    boxShadow: `0 10px 20px -5px ${themeColor}30`
                                }}
                            >
                                <Download className="w-4 h-4" />
                                Verification Form
                            </Button>
                            <Button
                                onClick={() => {
                                    if (docUrl) {
                                        handleViewFile(docUrl, "Verification Document");
                                    }
                                }}
                                variant="outline"
                                className="h-12 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 hover:bg-slate-50 dark:hover:bg-white/5 bg-transparent"
                            >
                                <Eye className="w-4 h-4" />
                                Preview Form
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
