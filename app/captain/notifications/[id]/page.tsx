import React from "react";
import { getSystemSetting } from "@/lib/settings";
import { CaptainReportsHeader } from "@/app/captain/reports/components/CaptainReportsHeader";
import { getCaptainDirectiveById } from "../actions";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import {
    FileText,
    Download,
    AlertCircle,
    Paperclip,
    Building2,
    ArrowLeft,
    CheckCircle2,
    Calendar,
    User,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CaptainSingleDirectivePage(props: {
    params: Promise<{
        id: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const userRole = user?.role;

    if (!session || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "ADMIN")) {
        redirect("/auth/login");
    }

    const managedBarangay = user?.managedBarangay || "Apaya";
    const { id } = await props.params;

    const res = await getCaptainDirectiveById(id);
    if (!res.success || !res.directive) {
        notFound();
    }

    const directive = res.directive;
    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    const getPriorityBadge = (p: string) => {
        if (p === "CRITICAL") {
            return (
                <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" /> Critical Priority
                </span>
            );
        }
        if (p === "URGENT") {
            return (
                <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" /> Urgent Priority
                </span>
            );
        }
        return (
            <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm">
                Normal Priority
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors pb-16">
            <CaptainReportsHeader
                session={session}
                themeColor={themeColor}
                managedBarangay={managedBarangay}
                title="Official Executive Directive"
                subtitle={`Notice for Barangay ${managedBarangay}`}
                iconName="file-text"
            />

            <main className="max-w-4xl mx-auto p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
                {/* Back to list navigation */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/captain/notifications"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>All Directives & Notifications</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged / Read
                        </span>
                    </div>
                </div>

                {/* Main Directive Document Paper */}
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm">
                    {/* Header Info */}
                    <div className="border-b border-slate-100 dark:border-[#2a3040] pb-6 space-y-4">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-black uppercase tracking-wider border border-indigo-500/20">
                                {directive.category.replace("_", " ")}
                            </span>
                            {getPriorityBadge(directive.priority)}
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
                            {directive.title}
                        </h1>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#121622] p-4 rounded-2xl border border-slate-100 dark:border-[#2a3040]">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400">Issuing Authority</p>
                                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                    <User className="w-3.5 h-3.5 text-indigo-500" /> {directive.senderName}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400">Target Recipient</p>
                                <p className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                    <Building2 className="w-3.5 h-3.5" />
                                    {directive.targetScope === "ALL_CAPTAINS" ? "All 15 Barangay Captains" : `Brgy. ${managedBarangay}`}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400">Date Issued</p>
                                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(directive.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Official Message Body */}
                    <div className="space-y-3">
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Official Message & Mayoral Directives
                        </h2>
                        <div className="p-6 sm:p-8 rounded-2xl bg-slate-50/80 dark:bg-[#121622] border border-slate-200/80 dark:border-[#2a3040] text-sm sm:text-base leading-relaxed font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                            {directive.content}
                        </div>
                    </div>

                    {/* Official Attachment Card (PDF or Image) */}
                    {directive.attachmentUrl && (
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-[#2a3040]">
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5" /> Official Attached Document / Notice
                            </h2>

                            <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                                            {directive.attachmentName || "Official_Attachment_File"}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            Official Attached File · {directive.attachmentSize || "Official Attachment"}
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

                            {/* If attachment is an image (jpg, png, webp), render image preview */}
                            {/\.(jpe?g|png|webp)(\?.*)?$/i.test(directive.attachmentUrl || "") && (
                                <div className="rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 shadow-inner">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={directive.attachmentUrl}
                                        alt={directive.attachmentName || "Executive Directive Attachment"}
                                        className="w-full max-h-[550px] object-contain rounded-2xl mx-auto"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
