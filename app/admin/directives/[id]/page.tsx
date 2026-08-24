import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Building2,
    User,
    Paperclip,
    Download,
    FileText,
    AlertCircle,
    CheckCircle2,
    Clock,
    ShieldCheck,
    Users,
} from "lucide-react";
import { getExecutiveDirectiveById } from "../actions";

export const dynamic = "force-dynamic";

interface AdminDirectiveDetailsPageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminDirectiveDetailsPage(props: AdminDirectiveDetailsPageProps) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "MAYOR")) {
        redirect("/auth/login");
    }

    const { id } = await props.params;
    const res = await getExecutiveDirectiveById(id);

    if (!res.success || !res.data) {
        notFound();
    }

    const directive = res.data;

    const dateStr = new Date(directive.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const timeStr = new Date(directive.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const getPriorityBadge = (p: string) => {
        if (p === "CRITICAL") {
            return (
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" /> Critical Action Required
                </span>
            );
        }
        if (p === "URGENT") {
            return (
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" /> Urgent Notice
                </span>
            );
        }
        return (
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm">
                Normal Priority
            </span>
        );
    };

    const isAllCaptains = directive.targetScope === "ALL_CAPTAINS";
    const totalTargetCount = isAllCaptains ? 15 : (directive.targetBarangays?.length || 1);
    const readCount = directive.reads.length;
    const readPercentage = Math.min(100, Math.round((readCount / totalTargetCount) * 100));

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto min-h-screen">
            {/* Navigation & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Link
                    href="/admin/directives"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95 group w-fit"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-slate-500" />
                    Back to All Directives
                </Link>

                <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> Official Municipal Record
                    </span>
                </div>
            </div>

            {/* Main Directive Content Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
                {/* Meta Header */}
                <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-wider">
                            {directive.category.replace("_", " ")}
                        </span>
                        {getPriorityBadge(directive.priority)}
                        <span className="text-xs font-semibold text-slate-400">
                            Issued on {dateStr} at {timeStr}
                        </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        {directive.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-2">
                        <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4 text-indigo-500" />
                            <span>Sender: <strong className="text-slate-800 dark:text-slate-200">{directive.senderName}</strong></span>
                        </div>
                        <span>·</span>
                        <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-emerald-500" />
                            <span>
                                Scope:{" "}
                                <strong className="text-slate-800 dark:text-slate-200">
                                    {isAllCaptains
                                        ? "All 15 Barangay Captains"
                                        : `Specific: ${directive.targetBarangay}`}
                                </strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Message Content */}
                <div className="space-y-3">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Official Message / Instructions
                    </h2>
                    <div className="p-6 sm:p-8 rounded-2xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 text-sm sm:text-base leading-relaxed font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                        {directive.content}
                    </div>
                </div>

                {/* Official Attachment Preview & Download */}
                {directive.attachmentUrl && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" /> Official Attached File / Scan
                        </h2>

                        <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                                        {directive.attachmentName || "Official_Attachment"}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        Attached Document · {directive.attachmentSize || "View Attachment"}
                                    </p>
                                </div>
                            </div>

                            <a
                                href={directive.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 inline-flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                            >
                                <Download className="w-4 h-4" /> Download / Open Attachment
                            </a>
                        </div>

                        {/* If image, display high resolution preview */}
                        {/\.(jpe?g|png|webp)(\?.*)?$/i.test(directive.attachmentUrl) && (
                            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 shadow-inner">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={directive.attachmentUrl}
                                    alt={directive.attachmentName || "Directive Preview"}
                                    className="w-full max-h-[550px] object-contain rounded-2xl mx-auto"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Read Receipts & Barangay Captains Audit Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Barangay Captain Read Receipts & Acknowledgement Audit
                            </h2>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Real-time tracking of barangay officials who have viewed and read this directive
                        </p>
                    </div>

                    {/* Read Counter Badge */}
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {readCount} of {totalTargetCount} Read
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold">{readPercentage}% Compliance</p>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center">
                            {readPercentage}%
                        </div>
                    </div>
                </div>

                {directive.reads.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic">
                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Pending Captain Acknowledgements</p>
                        <p className="text-xs text-slate-400 mt-1">
                            No Barangay Captain has opened or viewed this directive yet.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {directive.reads.map((r: any) => {
                            const readDateStr = new Date(r.readAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            });
                            const readTimeStr = new Date(r.readAt).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                            });

                            return (
                                <div
                                    key={r.id}
                                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-sm"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {r.userName}
                                            </p>
                                            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                                                Brgy. {r.managedBarangay}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold block mb-0.5">
                                            Acknowledged
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {readDateStr} {readTimeStr}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
