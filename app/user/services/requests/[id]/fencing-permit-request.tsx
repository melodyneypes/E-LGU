"use client";

import React from "react";
import { 
  Building2, 
  MapPin, 
  CheckCircle2 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FencingPermitRequestDetailsProps {
  additionalData: {
    fencingLocation?: {
      barangay?: string;
      street?: string;
      estimatedCost?: number;
      fenceType?: string;
      fenceSecurityFeature?: string;
      fenceLength?: number;
      fenceHeight?: number;
    };
    barangay?: string;
    street?: string;
    projectAddress?: string;
    estimatedCost?: number;
    fenceType?: string;
    fenceSecurityFeature?: string;
    fenceLength?: number;
    fenceHeight?: number;
    documents?: Record<string, string>;
    submittedAt?: string;
  };
  themeColor?: string;
}

export function FencingPermitRequestDetails({ additionalData }: FencingPermitRequestDetailsProps) {
  const loc = additionalData.fencingLocation || {};
  const barangay = loc.barangay || additionalData.barangay || "Mapandan";
  const street = loc.street || additionalData.street || "";
  const projectAddress = additionalData.projectAddress || `${street ? street + ", " : ""}Brgy. ${barangay}, Mapandan, Pangasinan`;

  return (
    <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-white/5 animate-in fade-in duration-300">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Fencing Project Site Verification & Filing Records
        </h4>
        <Badge variant="outline" className="w-fit text-[8px] font-black uppercase tracking-widest px-3 py-1 border-primary/30 text-primary bg-primary/5">
          Engineering Evaluation Record
        </Badge>
      </div>

      {/* Main Grid: Site Location & Documentary Clearance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Site Location Card */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-2.5 text-primary">
            <MapPin className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Designated Fencing Parcel Location</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/5 space-y-3">
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Complete Parcel Site Address</p>
              <p className="text-sm md:text-base font-bold italic uppercase text-slate-900 dark:text-white leading-tight">
                {projectAddress}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-white/5">
              <div>
                <p className="text-[8px] font-semibold uppercase text-slate-400">Barangay Jurisdiction</p>
                <p className="text-xs md:text-sm font-bold uppercase text-slate-700 dark:text-slate-300">{barangay}</p>
              </div>
              <div>
                <p className="text-[8px] font-semibold uppercase text-slate-400">Municipality / Province</p>
                <p className="text-xs md:text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Mapandan, Pangasinan</p>
              </div>
              <div>
                <p className="text-[8px] font-semibold uppercase text-slate-400">Security Add-on</p>
                <p className="text-xs md:text-sm font-bold uppercase text-slate-700 dark:text-slate-300">
                  {(() => {
                    const sec = loc.fenceSecurityFeature || additionalData.fenceSecurityFeature;
                    if (sec === "BARBED_WIRE") return "Barbed Wire";
                    if (sec === "ELECTRIFIED") return "Electrified ⚡";
                    if (sec === "BOTH") return "Barbed + Electrified ⚡";
                    return "Standard (Plain)";
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Documentary Clearance Card */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Documentary Verification</span>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Standard compliance checks registered under the municipal engineering desk.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/5">
            <div className="space-y-1">
              <span className="text-[7px] font-bold uppercase text-slate-400">Ownership</span>
              <div className="flex items-center justify-center gap-1 text-[8px] font-black text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>VERIFIED</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[7px] font-bold uppercase text-slate-400">Plans</span>
              <div className="flex items-center justify-center gap-1 text-[8px] font-black text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>FILED</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[7px] font-bold uppercase text-slate-400">Clearance</span>
              <div className="flex items-center justify-center gap-1 text-[8px] font-black text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>ATTACHED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

