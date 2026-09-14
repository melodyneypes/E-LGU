import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  Clock,
  Building2,
  ArrowRight,
  AlertCircle,
  Scale,
  FileCheck,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
export const metadata: Metadata = {
  title: "Fencing Permit | E-Mapandan",
  description: "Official Municipal Fencing Permit Guidelines, Requirements, and Application for Mapandan, Pangasinan.",
};

export default function FencingPermitPage() {

  const requirements = [
    {
      title: "Barangay Clearance (for Fencing)",
      desc: "Clearance certifying no existing boundary dispute from the Barangay Captain of the property location.",
      copies: "1 Original, 2 Photocopies"
    },
    {
      title: "Proof of Lot Ownership",
      desc: "Certified True Copy of Transfer Certificate of Title (TCT), Deed of Absolute Sale, or Notarized Lease Contract / Authority to Construct.",
      copies: "1 Certified Copy, 2 Photocopies"
    },
    {
      title: "Real Property Tax (Amilyar) Clearance",
      desc: "Latest Tax Declaration and official tax payment receipt for the current fiscal year from the Municipal Assessor/Treasury.",
      copies: "1 Original, 2 Photocopies"
    },
    {
      title: "Fencing Plan & Layout",
      desc: "Detailed architectural and structural fencing plans with elevations and cross-sections, signed and sealed by a Registered Civil Engineer or Architect.",
      copies: "5 Complete Sets"
    },
    {
      title: "Bill of Materials & Cost Estimate",
      desc: "Notarized itemized bill of materials, labor estimation, and structural specifications signed and sealed by the supervising professional.",
      copies: "3 Copies (Notarized)"
    },
    {
      title: "Lot Plan with Vicinity Map",
      desc: "Certified survey lot plan with vicinity coordinates prepared, signed, and sealed by a Licensed Geodetic Engineer.",
      copies: "3 Copies"
    },
    {
      title: "DOLE Construction Safety Program (CSHP)",
      desc: "Construction Safety and Health Program commitment duly notarized and received by DOLE field office.",
      copies: "2 Copies"
    },
    {
      title: "Valid Government-Issued IDs",
      desc: "Government-issued IDs with 3 specimen signatures of the applicant/property owner and involved professional engineers.",
      copies: "2 Photocopies each"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Prepare Documents & Clearances",
      desc: "Assemble required property titles, barangay clearances, and 5 sets of signed/sealed fencing plans by your engineer."
    },
    {
      number: "02",
      title: "Submit for Engineering Evaluation",
      desc: "Submit plans to the Municipal Engineering Office (MEO) for boundary setback inspection and structural integrity review."
    },
    {
      number: "03",
      title: "Assessment & Treasury Payment",
      desc: "Receive the municipal Order of Payment and pay the regulatory fencing permit fees at the Municipal Treasury."
    },
    {
      number: "04",
      title: "Permit Approval & Issuance",
      desc: "Claim your official Fencing Permit along with approved stamped plans before commencing site enclosure works."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-20 pt-28 sm:pt-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* ── Breadcrumbs ── */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="hover:text-amber-500 transition-colors">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/user/services" className="hover:text-amber-500 transition-colors">Services</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-amber-500">Fencing Permit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* ── Header Banner ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-8 sm:p-12 text-white shadow-2xl border border-amber-500/20">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              <Shield className="w-3.5 h-3.5" />
              Municipal Engineering Office (MEO)
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
              Fencing Permit
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Official municipal clearance required prior to the construction, alteration, or reconstruction of perimeter walls, concrete fences, and boundary enclosures in the Municipality of Mapandan.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/user/services/building-permit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 bg-amber-400 hover:bg-amber-300 transition-colors shadow-lg shadow-amber-500/20"
              >
                Building Permit Portal
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/user/services/occupancy"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
              >
                Occupancy Permit
              </Link>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
            <Shield className="w-96 h-96" />
          </div>
        </div>

        {/* ── Key Highlights ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Processing Time</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">3 – 5 Working Days</div>
              <div className="text-xs text-slate-500 mt-0.5">Upon complete submission</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Jurisdiction</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">Engineering Office</div>
              <div className="text-xs text-slate-500 mt-0.5">Mapandan Municipal Hall</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Governing Law</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">PD 1096 (NBCP)</div>
              <div className="text-xs text-slate-500 mt-0.5">Section 301 Requirements</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Validity</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">120 Calendar Days</div>
              <div className="text-xs text-slate-500 mt-0.5">To commence construction</div>
            </div>
          </div>
        </div>

        {/* ── Document Requirements ── */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-md p-6 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-5">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-amber-500">Checklist</span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1">
                Required Documents
              </h2>
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full self-start">
              8 Standard Requirements
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requirements.map((req, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 hover:border-amber-500/30 transition-all space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {req.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-8 leading-relaxed">
                  {req.desc}
                </p>
                <div className="pl-8 pt-1">
                  <span className="inline-block text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md">
                    {req.copies}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
            <p>
              <strong>Important Reminder:</strong> All structural and architectural fencing plans must adhere strictly to road right-of-way setbacks mandated by municipal zoning ordinances. Never build a fence that encroaches into public sidewalks, road widening projects, or neighboring boundary lines.
            </p>
          </div>
        </div>

        {/* ── Step-by-Step Workflow ── */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-md p-6 sm:p-10 space-y-8">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-amber-500">Procedure</span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1">
              Application Process
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => (
              <div key={idx} className="relative space-y-3">
                <div className="text-3xl font-black text-amber-500/30">
                  {step.number}
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Call to Action / Navigation ── */}
        <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Need Assistance with Fencing Clearance?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visit the Municipal Engineering Office, 2nd Floor, Mapandan Town Hall. Open Monday to Friday, 8:00 AM – 5:00 PM.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/user/services"
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
            >
              All Services
            </Link>
            <Link
              href="/user/services/building-permit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
            >
              Building Permit
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
