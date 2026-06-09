import React from "react";
import { Copy, FileText } from "lucide-react";
import { toast } from "sonner";

interface RegistrarPaymentDetailsPanelProps {
    transaction: any;
    additional: any;
    handleViewFile?: (url: string, label: string) => void;
    themeColor?: string;
}

export default function RegistrarPaymentDetailsPanel({
    transaction,
    additional,
    handleViewFile,
    themeColor
}: RegistrarPaymentDetailsPanelProps) {
    const refNo =
        additional?.paymentId ||
        additional?.reference_number ||
        additional?.gcashReferenceNo ||
        (transaction.paymentReference && !transaction.paymentReference.startsWith("http") && !transaction.paymentReference.startsWith("/") ? transaction.paymentReference : null) ||
        additional?.payment_id ||
        transaction.paymentId;

    const orNo = additional?.orSeriesNumber || transaction.orSeriesNumber || additional?.orNumber || additional?.orNo;
    const orDocUrl = additional?.orDocumentUrl || transaction.orUrl || additional?.orUrl;

    return (
        <div className="space-y-4">
            {/* GCash Reference Box (Screenshot Card Layout) */}
            {refNo && (
                <div className="bg-slate-50 dark:bg-white/5 rounded-[1.5rem] p-6 border border-slate-100 dark:border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-450 dark:text-slate-500 leading-none">
                            Resident GCash Reference
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(refNo);
                                toast.success("Reference number copied!");
                            }}
                            className="text-slate-450 hover:text-primary transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-sm md:text-base font-black tracking-widest font-mono text-slate-800 dark:text-white select-all">
                        {refNo}
                    </p>
                </div>
            )}

            {/* O.R. Details Box */}
            {(orNo || orDocUrl) && (
                <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block italic leading-none">Treasury Official Receipt</span>
                            <span className="text-sm font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">O.R. Details</span>
                        </div>
                    </div>

                    {orNo && (
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block leading-none">Receipt Serial Number</span>
                            <span className="text-xs font-black uppercase italic tracking-wider text-slate-800 dark:text-slate-200 font-mono block">
                                {orNo}
                            </span>
                        </div>
                    )}

                    {orDocUrl && (
                        <div className="space-y-2">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block leading-none">Scanned O.R. Copy</span>
                            {(() => {
                                const isPdf = orDocUrl.toLowerCase().endsWith(".pdf") || orDocUrl.includes("application/pdf") || orDocUrl.includes(".pdf?");
                                if (isPdf) {
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => handleViewFile?.(orDocUrl, "Official Treasury Receipt PDF")}
                                            className="w-full flex items-center justify-between p-4 bg-[#151b28]/60 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-lg shrink-0 group-hover:scale-110 transition-transform">
                                                    📕
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">Receipt PDF</p>
                                                    <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic mt-0.5 leading-none">Click to view</p>
                                                </div>
                                            </div>
                                            <div className="h-8 px-3 rounded-lg border border-primary/20 text-primary font-black italic uppercase tracking-widest text-[8px] group-hover:bg-primary/10 flex items-center gap-1 transition-all shrink-0">
                                                Open PDF ➔
                                            </div>
                                        </button>
                                    );
                                }

                                return (
                                    <div
                                        onClick={() => handleViewFile?.(orDocUrl, "Official Treasury Receipt")}
                                        className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all cursor-pointer select-none"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={orDocUrl}
                                            alt="OR Preview"
                                            className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                                            <button
                                                type="button"
                                                style={{ backgroundColor: themeColor || 'var(--primary)' }}
                                                className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg hover:scale-105 transition-all"
                                            >
                                                <span>VIEW</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
