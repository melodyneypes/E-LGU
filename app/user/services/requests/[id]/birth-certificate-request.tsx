"use client";

import React, { useState } from "react";
import { User, Users, ShieldCheck, FileText, AlertCircle, Check, Download, Eye, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";
import { toast } from "sonner";
import { requestPsaEndorsement } from "@/app/admin/transactions/actions";

interface BirthCertificateRequestDetailsProps {
    additionalData: {
        subjectName?: string;
        dateOfEvent?: string;
        placeOfEvent?: string;
        fatherName?: string;
        motherName?: string;
        relationship?: string;
        email?: string;
        contactNumber?: string;
    };
}

export function BirthCertificateRequestDetails({ additionalData }: BirthCertificateRequestDetailsProps) {
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "N/A";
        try {
            return format(new Date(dateStr), "MMMM d, yyyy");
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-white/5">
            <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4">
                Birth Certificate Request Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <User className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Subject Identity</span>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">{"Child's Full Name"}</p>
                            <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{additionalData.subjectName || "N/A"}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Date of Birth</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(additionalData.dateOfEvent)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Place of Birth</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{additionalData.placeOfEvent || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <Users className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Lineage & Requester</span>
                    </div>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">{"Father's Full Name"}</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{additionalData.fatherName || "—"}</p>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">{"Mother's Maiden Name"}</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{additionalData.motherName || "—"}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Relationship</p>
                                <p className="text-xs font-black uppercase text-primary italic">{additionalData.relationship || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Contact Number</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{additionalData.contactNumber || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const getVerificationConfig = (formType: string) => {
    switch (formType) {
        case "FORM_1B":
            return {
                title: "Record Not Available (Form 1B)",
                description: "Your requested birth certificate record is not available in our archives.",
                themeColor: "#f59e0b",
            };
        case "FORM_1C":
            return {
                title: "Record Destroyed (Form 1C)",
                description: "Your requested birth certificate record has been destroyed in our archives.",
                themeColor: "#f43f5e",
            };
        case "FORM_1A":
        default:
            return {
                title: "Record Found (Form 1A)",
                description: "Your requested birth certificate has been retrieved and certified.",
                themeColor: "#10b981",
            };
    }
};

interface BirthCertificateVerificationCardProps {
    request: any;
    additionalData: any;
    themeColor: string;
    handleViewFile: (url: string | null, title: string) => void;
}

export function BirthCertificateVerificationCard({ request, additionalData, themeColor, handleViewFile }: BirthCertificateVerificationCardProps) {
    const formType = additionalData.registryBookVerification || "FORM_1A";
    const config = getVerificationConfig(formType);

    const [psaEndorsementOpen, setPsaEndorsementOpen] = useState(false);
    const [psaNegFile, setPsaNegFile] = useState<File | null>(null);
    const [psaNegPreview, setPsaNegPreview] = useState<string | null>(null);
    const [isSubmittingPsaEndorsement, setIsSubmittingPsaEndorsement] = useState(false);

    const handlePsaEndorsementSubmit = async () => {
        if (!psaNegFile) {
            toast.error("Please upload the PSA Negative Certification document.");
            return;
        }
        setIsSubmittingPsaEndorsement(true);
        try {
            const formData = new FormData();
            formData.append("transactionId", request.id);
            formData.append("psaNegCertFile", psaNegFile);

            const res = await requestPsaEndorsement(formData);
            if (res.success) {
                toast.success("PSA Endorsement requested successfully!");
                setPsaEndorsementOpen(false);
                window.location.reload();
            } else {
                toast.error(res.error || "Failed to request PSA endorsement");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred during submission");
        } finally {
            setIsSubmittingPsaEndorsement(false);
        }
    };

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

                {(formType === "FORM_1B" || formType === "FORM_1C") && (
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
                            <Link href="/user/services/civil-registry/birth-registration">
                                Proceed to Registration
                            </Link>
                        </Button>
                    </div>
                )}

                {formType === "FORM_1A" && (
                    <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner space-y-4">
                        <div className="flex flex-col gap-2">
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-none">Need to forward to Manila?</h4>
                                <p className="text-[10px] text-slate-400 italic">Initiate Birth PSA endorsement to forward the certificate to PSA Main office.</p>
                            </div>
                            {additionalData.psaEndorsementRequested ? (
                                <div
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic mt-1 p-3 rounded-xl border"
                                    style={{ color: themeColor, backgroundColor: `${themeColor}10`, borderColor: `${themeColor}20` }}
                                >
                                    <Check className="w-4 h-4 shrink-0" />
                                    <span>Birth PSA Endorsement Requested (₱200)</span>
                                </div>
                            ) : (
                                <Dialog open={psaEndorsementOpen} onOpenChange={setPsaEndorsementOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            className="w-full h-12 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
                                            style={{
                                                backgroundColor: themeColor,
                                                boxShadow: `0 10px 20px -5px ${themeColor}30`
                                            }}
                                        >
                                            Request Birth PSA Endorsement (₱200)
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-[360px] w-full bg-white dark:bg-slate-950 border-none rounded-[1.5rem] shadow-2xl p-6 z-[150]">
                                        <DialogHeader className="space-y-1">
                                            <DialogTitle className="text-md font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                Birth PSA <span style={{ color: themeColor }}>Endorsement</span>
                                            </DialogTitle>
                                            <DialogDescription className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">
                                                Official Manila Dispatch Protocol
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-3">
                                            <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                                                Please upload your PSA Negative Certification document to initiate the endorsement process. This service carries a government fee of ₱200.
                                            </p>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic ml-1 leading-none">PSA Negative Cert (PDF/Image)</Label>
                                                <div className="w-full aspect-[21/8] bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center relative overflow-hidden group">
                                                    {psaNegPreview ? (
                                                        <>
                                                            <div className="absolute inset-0 flex items-center justify-center font-bold text-xs uppercase text-slate-800 dark:text-white">
                                                                File Selected
                                                            </div>
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Button variant="secondary" size="sm" className="h-7 px-3 font-black italic uppercase text-[8px] tracking-widest rounded-lg relative overflow-hidden">
                                                                    Change
                                                                    <input
                                                                        type="file"
                                                                        accept=".pdf,image/*"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                setPsaNegFile(file);
                                                                                setPsaNegPreview(URL.createObjectURL(file));
                                                                            }
                                                                        }}
                                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                                    />
                                                                </Button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                                            <Upload className="w-4 h-4 text-slate-350 mb-0.5" />
                                                            <p className="text-[8px] font-black uppercase text-slate-400 italic">Upload Document</p>
                                                            <input
                                                                type="file"
                                                                accept=".pdf,image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        setPsaNegFile(file);
                                                                        setPsaNegPreview(URL.createObjectURL(file));
                                                                    }
                                                                }}
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter className="pt-2">
                                            <Button
                                                onClick={handlePsaEndorsementSubmit}
                                                disabled={isSubmittingPsaEndorsement || !psaNegFile}
                                                className="w-full h-11 text-white rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all active:scale-95 gap-2 hover:opacity-90 border-none"
                                                style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}30` }}
                                            >
                                                {isSubmittingPsaEndorsement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                Submit Request
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </div>
                )}

                {additionalData.scannedDocUrl && (
                    <div className="space-y-4 pt-2">
                        {(() => {
                            const docUrl = additionalData.scannedDocUrl;
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
                                    if (!additionalData.scannedDocUrl) return;
                                    try {
                                        const response = await fetch(additionalData.scannedDocUrl);
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
                                    if (additionalData.scannedDocUrl) {
                                        handleViewFile(additionalData.scannedDocUrl, "Verification Document");
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
