"use client";

import React from "react";
import { User, Heart, Baby, Skull } from "lucide-react";
import { format } from "date-fns";

interface PsaEndorsementRequestDetailsProps {
    typeCode: string;
    additionalData: {
        relationship?: string;
        contactNumber?: string;
        email?: string;
        informantFirstName?: string;
        informantMiddleName?: string;
        informantLastName?: string;
        informantSuffix?: string;
        informantBirthDate?: string;
        informantAge?: string;
        informantCivilStatus?: string;
        informantCitizenship?: string;
        informantOccupation?: string;
        informantAddress?: string;

        // Birth PSA Endorsement specific fields
        subjectFullName?: string;
        subjectName?: string;
        subjectDateOfBirth?: string;
        mothersMaidenName?: string;

        // Death PSA Endorsement specific fields
        subjectDateOfDeath?: string;
        fathersName?: string;
        placeOfDeath?: string;
        causeOfDeath?: string;

        // Marriage PSA Endorsement specific fields
        husbandFullName?: string;
        wifeFullName?: string;
        dateOfMarriage?: string;
        placeOfMarriage?: string;

        // Document urls
        psaNegativeCert?: string;
        form1a?: string;
        form2a?: string;
        form3a?: string;
    };
}

export function PsaEndorsementRequestDetails({ typeCode, additionalData }: PsaEndorsementRequestDetailsProps) {
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "N/A";
        try {
            return format(new Date(dateStr), "MMMM d, yyyy");
        } catch {
            return dateStr;
        }
    };

    const isBirth = typeCode === "LCR_PSA_ENDORSEMENT";
    const isDeath = typeCode === "LCR_DEATH_PSA_ENDORSEMENT";
    const isMarriage = typeCode === "LCR_MARRIAGE_PSA_ENDORSEMENT";

    const title = isBirth
        ? "Birth PSA Endorsement Details"
        : isDeath
            ? "Death PSA Endorsement Details"
            : "Marriage PSA Endorsement Details";

    return (
        <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-white/5 animate-in fade-in duration-300">
            <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4">
                {title}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Subject Details */}
                {isBirth && (
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Baby className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Subject Information</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Child&apos;s Full Name</p>
                                <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{additionalData.subjectFullName || additionalData.subjectName || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Date of Birth</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(additionalData.subjectDateOfBirth)}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Mother&apos;s Maiden Name</p>
                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{additionalData.mothersMaidenName || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                )}

                {isDeath && (
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Skull className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Deceased Information</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Deceased Full Name</p>
                                <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{additionalData.subjectFullName || additionalData.subjectName || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Date of Death</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(additionalData.subjectDateOfDeath)}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Place of Death</p>
                                    <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{additionalData.placeOfDeath || "N/A"}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Father&apos;s Full Name</p>
                                    <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{additionalData.fathersName || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Mother&apos;s Maiden Name</p>
                                    <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{additionalData.mothersMaidenName || "—"}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Cause of Death</p>
                                <p className="text-xs font-bold uppercase text-slate-705 dark:text-slate-200">{additionalData.causeOfDeath || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                )}

                {isMarriage && (
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Heart className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Marriage Record Details</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Husband&apos;s Full Name</p>
                                <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{additionalData.husbandFullName || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Wife&apos;s Full Name (Maiden Name)</p>
                                <p className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">{additionalData.wifeFullName || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Date of Marriage</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(additionalData.dateOfMarriage)}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Place of Marriage</p>
                                    <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{additionalData.placeOfMarriage || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Requester Info */}
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <User className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Requester / Informant</span>
                    </div>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Relationship</p>
                                <p className="text-xs font-black uppercase text-primary italic leading-none">{additionalData.relationship || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Contact Number</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{additionalData.contactNumber || "N/A"}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Email Address</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{additionalData.email || "—"}</p>
                        </div>
                        <div>
                            <p className="text-[8px] md:text-[9px] uppercase font-semibold text-slate-400 tracking-widest">Address</p>
                            <p className="text-xs font-bold uppercase text-slate-707 dark:text-slate-200">{additionalData.informantAddress || "N/A"}</p>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
}
