"use client";

import React from "react";

interface RptViewProps {
    request: any;
    additionalData: any;
}

export default function RptView({ request: _request, additionalData }: RptViewProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Property Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs leading-relaxed">
                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tax Declaration No. (TDN)</span>
                    <p className="font-black text-slate-850 dark:text-white font-mono text-sm tracking-wide">
                        {additionalData?.tdn || "N/A"}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Property Index No. (PIN)</span>
                    <p className="font-black text-slate-850 dark:text-white font-mono text-sm tracking-wide">
                        {additionalData?.pin || "N/A"}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Declared Owner Name</span>
                    <p className="font-black uppercase text-slate-850 dark:text-white">
                        {additionalData?.ownerName || "N/A"}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Property Classification</span>
                    <p className="font-black uppercase text-slate-850 dark:text-white">
                        {additionalData?.propertyType || "RESIDENTIAL"}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tax Assessment Year</span>
                    <p className="font-black text-slate-850 dark:text-white font-mono">
                        {additionalData?.taxYear || new Date().getFullYear().toString()}
                    </p>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Barangay Location</span>
                    <p className="font-black uppercase text-slate-850 dark:text-white">
                        {additionalData?.barangay || "{{BARANGAY_NAME}}"}
                    </p>
                </div>

                <div className="space-y-1 col-span-1 sm:col-span-2">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Property Complete Address</span>
                    <p className="font-black text-slate-850 dark:text-white">
                        {additionalData?.propertyAddress || `${additionalData?.barangay || "{{BARANGAY_NAME}}"}, Municipality of E-LGU`}
                    </p>
                </div>
            </div>
        </div>
    );
}
