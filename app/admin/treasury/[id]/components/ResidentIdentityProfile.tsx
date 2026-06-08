"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, UserCheck } from "lucide-react";
import { differenceInYears } from "date-fns";

interface ResidentIdentityProfileProps {
    resident: any;
    safeFormatDate: (dateStr: any) => string;
    themeColor: string;
    titleColorText?: string;
    titleWhiteText?: string;
    subtitleText?: string;
    relationship?: string;
}

export default function ResidentIdentityProfile({
    resident,
    safeFormatDate,
    themeColor,
    titleColorText,
    titleWhiteText,
    subtitleText,
    relationship
}: ResidentIdentityProfileProps) {
    const [isOpen, setIsOpen] = useState(true);

    const age = (() => {
        if (!resident?.dateOfBirth) return "--";
        try {
            const birth = new Date(resident.dateOfBirth);
            if (isNaN(birth.getTime())) return "--";
            return differenceInYears(new Date(), birth);
        } catch {
            return "--";
        }
    })();

    const completeAddress = (() => {
        if (!resident) return "—";
        const parts = [
            resident.houseNumber ? `${resident.houseNumber}` : null,
            resident.street ? `${resident.street}` : null,
            resident.sitio ? `Sitio ${resident.sitio}` : null,
            resident.purok ? `Purok ${resident.purok}` : null,
            resident.barangay ? `Barangay ${resident.barangay}` : null,
            resident.municipality || "Mapandan",
            resident.province || "Pangasinan"
        ].filter(Boolean);
        return parts.join(", ") || "—";
    })();

    return (
        <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 transition-all duration-500 overflow-hidden">
            {/* Header section with toggle button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors"
                        style={{ 
                            backgroundColor: `${themeColor}10`, 
                            borderColor: `${themeColor}20`,
                            color: themeColor 
                        }}
                    >
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1 leading-none">
                            <span 
                                className="text-xl font-black italic tracking-tighter uppercase"
                                style={{ color: themeColor }}
                            >
                                {titleColorText || "Resident"}
                            </span>
                            <span className="text-xl font-black italic tracking-tighter text-slate-800 dark:text-white uppercase">
                                {titleWhiteText || "Identity Profile"}
                            </span>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mt-1 leading-none">
                            {subtitleText || "Verified Citizen Data Dossier"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all focus:outline-none"
                >
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {isOpen && (
                <div className="grid grid-cols-12 gap-5 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-500">
                    {/* First Name */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">First Name</span>
                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                            {resident.firstName || "—"}
                        </div>
                    </div>

                    {/* Middle Name */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Middle Name</span>
                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                            {resident.middleName || "—"}
                        </div>
                    </div>

                    {/* Last Name */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Last Name</span>
                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                            {resident.lastName || "—"}
                        </div>
                    </div>

                    {/* Suffix */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Suffix</span>
                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                            {resident.suffix || "--"}
                        </div>
                    </div>

                    {/* Birth Date */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Birth Date</span>
                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                            {safeFormatDate(resident.dateOfBirth)}
                        </div>
                    </div>

                    {/* Age */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Age</span>
                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                            {age}
                        </div>
                    </div>

                    {/* Civil Status */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Civil Status</span>
                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                            {resident.civilStatus || "—"}
                        </div>
                    </div>

                    {/* Contact Number */}
                    <div className="col-span-12 sm:col-span-3 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Contact Number</span>
                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                            {resident.contactNumber || resident.phoneNumber || "—"}
                        </div>
                    </div>

                    {/* Occupation */}
                    <div className="col-span-12 sm:col-span-12 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Occupation</span>
                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                            {resident.occupation || "—"}
                        </div>
                    </div>

                    {/* Relationship to Subject / Deceased */}
                    {relationship && (
                        <div className="col-span-12 sm:col-span-12 space-y-1.5 animate-in fade-in duration-300">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Relationship to Subject / Deceased</span>
                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                {relationship || "—"}
                            </div>
                        </div>
                    )}

                    {/* Barangay & Complete Address */}
                    <div className="col-span-12 sm:col-span-12 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Barangay & Complete Address</span>
                        <div 
                            className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none truncate cursor-help"
                            title={completeAddress}
                        >
                            {completeAddress}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
