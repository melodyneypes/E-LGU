"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

import { FileText } from "lucide-react";

interface CedulaViewProps {
    request: any;
    additionalData: any;
}

export default function CedulaView({ request, additionalData }: CedulaViewProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-widest italic text-slate-800 dark:text-white leading-none">Cedula Assessment Details</h3>
            </div>
            <div className="h-px bg-slate-100 dark:bg-white/5" />
            <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">Community Tax Certificate (CTC)</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs leading-relaxed">
                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Taxpayer Type</span>
                    <p className="font-black uppercase text-slate-850 dark:text-white">
                        {additionalData.applicantType || "INDIVIDUAL"}
                    </p>
                </div>
                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Annual Basic Income</span>
                    <p className="font-black text-slate-850 dark:text-white font-mono">
                        ₱{Number(additionalData.income || additionalData.basicSalary || additionalData.annualIncome || 0).toLocaleString()}
                    </p>
                </div>
                <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Estimated Assessment Tax</span>
                    <p className="font-black text-primary font-mono text-sm">
                        ₱{Number(request.totalAmount || additionalData.calculatedTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>
        </div>
    );
}
