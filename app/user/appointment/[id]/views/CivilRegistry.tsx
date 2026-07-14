"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileText, Baby, Skull, Heart } from "lucide-react";

interface CivilRegistryProps {
    request: any;
    additionalData: any;
}

export default function CivilRegistry({ request, additionalData }: CivilRegistryProps) {
    const code = request.type?.code || "";
    
    // Determine specific LCR type
    const isBirth = code.includes("BIRTH") || code === "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT" || additionalData.registryType === "BIRTH_PSA_ENDORSEMENT" || additionalData.registryType === "BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT";
    const isDeath = code.includes("DEATH") || code.includes("LCR_DEATH") || additionalData.registryType === "DEATH_PSA_APPOINTMENT_ENDORSEMENT" || additionalData.registryType === "DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT";
    const isMarriage = code.includes("MARRIAGE") || code.includes("LCR_MARRIAGE") || additionalData.registryType === "MARRIAGE_PSA_APPOINTMENT_ENDORSEMENT" || additionalData.registryType === "MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT";



    // Helper to format date
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "N/A";
        try {
            return new Date(dateStr).toLocaleDateString("en-PH", {
                month: "long",
                day: "numeric",
                year: "numeric"
            });
        } catch {
            return dateStr;
        }
    };

    // Determine header icon and title
    let headerIcon = <FileText className="w-5 h-5 text-primary" />;
    let headerTitle = "Civil Registry Details";
    let badgeText = "Local Civil Registry";

    if (isBirth) {
        headerIcon = <Baby className="w-5 h-5 text-primary" />;
        headerTitle = "Birth Certified True Copy Details";
        badgeText = "Birth Registry (Certified True Copy Appointment)";
    } else if (isDeath) {
        headerIcon = <Skull className="w-5 h-5 text-primary" />;
        headerTitle = "Death Certified True Copy Details";
        badgeText = "Death Registry (Certified True Copy Appointment)";
    } else if (isMarriage) {
        headerIcon = <Heart className="w-5 h-5 text-primary" />;
        headerTitle = "Marriage Certified True Copy Details";
        badgeText = "Marriage Registry (Certified True Copy Appointment)";
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
                {headerIcon}
                <h3 className="text-sm font-black uppercase tracking-widest italic text-slate-800 dark:text-white leading-none">{headerTitle}</h3>
            </div>
            
            <div className="h-px bg-slate-100 dark:bg-white/5" />
            
            <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">{badgeText}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs leading-relaxed">
                {/* Subject Details Section */}
                <div className="space-y-4 col-span-1 sm:col-span-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/80">Document / Subject Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                        <div className="space-y-1 col-span-1 sm:col-span-2">
                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Relationship to Subject</span>
                            <p className="font-black uppercase text-slate-800 dark:text-white">
                                {additionalData.relationship || "N/A"}
                            </p>
                        </div>
                        {isBirth && (
                            <>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Subject Full Name</span>
                                    <p className="font-black uppercase text-slate-800 dark:text-white">{additionalData.subjectFullName || additionalData.subjectName || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Date of Birth</span>
                                    <p className="font-black text-slate-800 dark:text-white">{formatDate(additionalData.subjectDateOfBirth)}</p>
                                </div>
                                <div className="space-y-1 col-span-1 sm:col-span-2">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Mother&apos;s Maiden Name</span>
                                    <p className="font-black uppercase text-slate-800 dark:text-white">{additionalData.mothersMaidenName || "N/A"}</p>
                                </div>
                            </>
                        )}

                        {isDeath && (
                            <>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Deceased Full Name</span>
                                    <p className="font-black uppercase text-slate-800 dark:text-white">{additionalData.subjectFullName || additionalData.subjectName || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Date of Death</span>
                                    <p className="font-black text-slate-800 dark:text-white">{formatDate(additionalData.subjectDateOfDeath)}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Mother&apos;s Maiden Name</span>
                                    <p className="font-black uppercase text-slate-800 dark:text-white">{additionalData.mothersMaidenName || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Father&apos;s Full Name</span>
                                    <p className="font-black uppercase text-slate-800 dark:text-white">{additionalData.fathersName || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Place of Death</span>
                                    <p className="font-black uppercase text-slate-800 dark:text-white">{additionalData.placeOfDeath || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Cause of Death</span>
                                    <p className="font-black uppercase text-slate-800 dark:text-white">{additionalData.causeOfDeath || "N/A"}</p>
                                </div>
                            </>
                        )}

                        {isMarriage && (
                            <>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Husband Full Name</span>
                                    <p className="font-black uppercase text-slate-800 dark:text-white">{additionalData.husbandFullName || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Wife Full Name</span>
                                    <p className="font-black uppercase text-slate-800 dark:text-white">{additionalData.wifeFullName || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Date of Marriage</span>
                                    <p className="font-black text-slate-800 dark:text-white">{formatDate(additionalData.dateOfMarriage)}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Place of Marriage</span>
                                    <p className="font-black uppercase text-slate-800 dark:text-white">{additionalData.placeOfMarriage || "N/A"}</p>
                                </div>
                            </>
                        )}

                        {!isBirth && !isDeath && !isMarriage && (
                            <div className="space-y-1 col-span-1 sm:col-span-2">
                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Subject / Purpose</span>
                                <p className="font-black uppercase text-slate-800 dark:text-white">{additionalData.subjectName || "N/A"}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
