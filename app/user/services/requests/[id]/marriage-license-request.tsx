"use client";

import React from "react";
import { User } from "lucide-react";
import { format } from "date-fns";

interface MarriageLicenseRequestDetailsProps {
    additionalData: {
        applicant1?: {
            fullName?: string;
            birthDate?: string;
            birthPlace?: string;
            citizenship?: string;
            gender?: string;
        };
        applicant2?: {
            fullName?: string;
            birthDate?: string;
            birthPlace?: string;
            citizenship?: string;
            gender?: string;
        };
    };
}

export function MarriageLicenseRequestDetails({ additionalData }: MarriageLicenseRequestDetailsProps) {
    const app1 = additionalData.applicant1 || {};
    const app2 = additionalData.applicant2 || {};
    const app1Gender = (app1.gender || "").toUpperCase();
    const app2Gender = (app2.gender || "").toUpperCase();

    const app1Role = app1Gender === "MALE" ? "Groom (Male)" : app1Gender === "FEMALE" ? "Bride / Wife (Female)" : "Applicant 1";
    const app2Role = app2Gender === "MALE" ? "Groom (Male)" : app2Gender === "FEMALE" ? "Bride / Wife (Female)" : "Applicant 2";

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "N/A";
        try {
            return format(new Date(dateStr), "MMMM d, yyyy");
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-white/5 animate-in fade-in duration-300">
            <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4">
                Marriage License Application Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Card: Applicant 1 Details */}
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <User className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">{app1Role}</span>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Full Name</p>
                            <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{app1.fullName || "N/A"}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Date of Birth</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(app1.birthDate)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Citizenship</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{app1.citizenship || "N/A"}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Place of Birth</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{app1.birthPlace || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Sex</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{app1.gender || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Card: Applicant 2 Details */}
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <User className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">{app2Role}</span>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Full Name</p>
                            <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{app2.fullName || "N/A"}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Date of Birth</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(app2.birthDate)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Citizenship</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{app2.citizenship || "N/A"}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Place of Birth</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{app2.birthPlace || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Sex</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{app2.gender || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
