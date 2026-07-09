"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface BusinessPermitViewProps {
    request: any;
    additionalData: any;
}

export default function BusinessPermitView({ additionalData }: BusinessPermitViewProps) {
    const isNew = additionalData.businessType === "NEW";

    const formatCurrency = (amount: any) => {
        const val = parseFloat(String(amount || 0).replace(/,/g, ""));
        return isNaN(val) ? "₱0.00" : `₱${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                    {isNew ? "New Business Application" : "Business Renewal"}
                </Badge>
                {additionalData.businessBranch && (
                    <Badge className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                        {additionalData.businessBranch} BRANCH
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs leading-relaxed">
                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Business Name</span>
                    <p className="font-black uppercase text-slate-800 dark:text-white">
                        {additionalData.businessName || "N/A"}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Trade / Signage Name</span>
                    <p className="font-black uppercase text-slate-850 dark:text-white">
                        {additionalData.tradeName || "N/A"}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Organization Type</span>
                    <p className="font-black uppercase text-slate-850 dark:text-white">
                        {String(additionalData.orgType || "").replace(/_/g, " ")}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Line of Business</span>
                    <p className="font-black uppercase text-slate-850 dark:text-white">
                        {additionalData.lineOfBusiness || "N/A"}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Business Address</span>
                    <p className="font-black uppercase text-slate-850 dark:text-white">
                        {[additionalData.building, additionalData.street, additionalData.barangay].filter(Boolean).join(", ")}, Mapandan, Pangasinan
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">TIN Number</span>
                    <p className="font-black text-slate-850 dark:text-white font-mono">
                        {additionalData.tinNumber || "N/A"}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Store Area & Employees</span>
                    <p className="font-black text-slate-850 dark:text-white">
                        {additionalData.businessArea || "0"} SQM / {additionalData.employeeCount || "0"} Employees
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                        {isNew ? "Initial Capitalization" : "Previous Gross Sales"}
                    </span>
                    <p className="font-black text-primary font-mono text-sm">
                        {isNew ? formatCurrency(additionalData.capitalInvestment) : formatCurrency(additionalData.grossSales)}
                    </p>
                </div>

                {isNew ? (
                    <>
                        <div className="space-y-1">
                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Registration Type & No.</span>
                            <p className="font-black uppercase text-slate-850 dark:text-white">
                                {additionalData.registrationType || "DTI"}: {additionalData.dtiSecNumber || "N/A"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Registration Date</span>
                            <p className="font-black text-slate-850 dark:text-white">
                                {additionalData.dtiSecDate || "N/A"}
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Existing Permit License No.</span>
                        <p className="font-black uppercase text-slate-850 dark:text-white">
                            {additionalData.permitNumber || "N/A"}
                        </p>
                    </div>
                )}

                {(additionalData.philhealthNumber || additionalData.pagibigNumber || additionalData.sssNumber) && (
                    <div className="col-span-1 sm:col-span-2 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 dark:bg-[#1a1f2c]/50 dark:border-white/5 p-3 rounded-2xl">
                        {additionalData.philhealthNumber && (
                            <div className="space-y-1">
                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">PhilHealth No.</span>
                                <p className="font-black text-slate-850 dark:text-white font-mono">{additionalData.philhealthNumber}</p>
                            </div>
                        )}
                        {additionalData.pagibigNumber && (
                            <div className="space-y-1">
                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Pag-IBIG MID</span>
                                <p className="font-black text-slate-850 dark:text-white font-mono">{additionalData.pagibigNumber}</p>
                            </div>
                        )}
                        {additionalData.sssNumber && (
                            <div className="space-y-1">
                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">SSS Number</span>
                                <p className="font-black text-slate-850 dark:text-white font-mono">{additionalData.sssNumber}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Document Links if they exist */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Uploaded Documents</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { label: "Valid ID Certificate", url: additionalData.ownerIdUrl },
                        { label: "Community Tax Certificate (CTC)", url: additionalData.ctcUrl },
                        { label: "DTI/SEC/COA Registration", url: additionalData.dtiSecUrl },
                        { label: "Barangay Clearance", url: additionalData.brgyClearanceUrl },
                        { label: "Sanitary Permit", url: additionalData.sanitaryPermitUrl },
                        { label: "Fire Safety Certificate (FSIC)", url: additionalData.fireSafetyUrl },
                        { label: "Previous Business Permit", url: additionalData.previousPermitUrl },
                        { label: "BIR COR Certificate", url: additionalData.birCorUrl },
                        { label: "Photo of Location", url: additionalData.locationPhotoUrl }
                    ].map((doc, i) => {
                        if (!doc.url) return null;
                        return (
                            <a
                                key={i}
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-50 dark:hover:bg-white/[0.02] hover:border-primary/20 transition-all text-[11px] font-bold text-slate-700 dark:text-slate-300"
                            >
                                <span>{doc.label}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            </a>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
