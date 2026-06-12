import React from "react";
import { Copy, Upload, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TreasuryPaymentCollectionPanelProps {
    transaction: any;
    additional: any;
    actionLoading: boolean;
    orSeriesNumber?: string;
    setOrSeriesNumber?: (val: string) => void;
    orFile: File | null;
    setOrFile?: (file: File | null) => void;
    orPreview: string | null;
    setOrPreview?: (url: string | null) => void;
    themeColor: string;
    handleConfirmPayment: () => void;
    handleViewFile?: (url: string, label: string) => void;
}

export default function TreasuryPaymentCollectionPanel({
    transaction,
    additional,
    actionLoading,
    orSeriesNumber,
    setOrSeriesNumber,
    orFile,
    setOrFile,
    orPreview,
    setOrPreview,
    themeColor,
    handleConfirmPayment,
    handleViewFile
}: TreasuryPaymentCollectionPanelProps) {
    
    const refNo =
        additional?.paymentId ||
        additional?.reference_number ||
        additional?.gcashReferenceNo ||
        (transaction.paymentReference && !transaction.paymentReference.startsWith("http") && !transaction.paymentReference.startsWith("/") ? transaction.paymentReference : null) ||
        additional?.payment_id ||
        transaction.paymentId;

    const isBusinessPermit = transaction?.type?.code?.startsWith("BUSINESS_PERMIT") ?? false;

    return (
        <div className="space-y-4">
            {/* GCash Reference Panel */}
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

            {/* O.R. Upload and Confirmation Section */}
            {["PAID", "PENDING_PAYMENT_VERIFICATION", "EVALUATED", "UNPAID"].includes(transaction.status) && (
                <div className="space-y-6">
                    <div className="space-y-6 bg-white dark:bg-[#151b28] rounded-[2rem] p-8 border border-slate-50 dark:border-white/5 shadow-2xl">
                        <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-white/5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] italic" style={{ color: themeColor }}>Treasury Collection</h4>
                            <p className="text-[10px] font-bold text-slate-400 italic">
                                {transaction.status === "PAID" && (transaction.orSeriesNumber || additional?.orSeriesNumber) ? "Official Receipt details recorded for this payment." : "Record receipt serial, attach scanned document, and mark as paid."}
                            </p>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 italic block">
                                    O.R. Series Number {((transaction.status !== "PAID" || !(transaction.orSeriesNumber || additional?.orSeriesNumber)) || isBusinessPermit) && <span className="text-rose-500 font-extrabold">*Required</span>}
                                </label>
                                {transaction.status === "PAID" && (transaction.orSeriesNumber || additional?.orSeriesNumber) && !isBusinessPermit ? (
                                    <div className="h-11 flex items-center px-4 rounded-xl border border-slate-150 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-xs font-bold text-slate-800 dark:text-slate-100">
                                        {orSeriesNumber || transaction.orSeriesNumber || additional?.orSeriesNumber || "N/A"}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={orSeriesNumber || ""}
                                        onChange={(e) => setOrSeriesNumber?.(e.target.value)}
                                        placeholder="Enter O.R. Series Number..."
                                        className="w-full h-11 px-4 rounded-xl border border-slate-150 dark:border-white/5 bg-white dark:bg-[#151b28]/60 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-primary transition-all"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 italic block">
                                    Official Receipt (O.R.) Document {((transaction.status !== "PAID" || !transaction.orUrl) || isBusinessPermit) && <span className="text-rose-500 font-extrabold">*Required</span>}
                                </label>
                                {((transaction.status !== "PAID" || !transaction.orUrl) || isBusinessPermit) && (
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setOrFile?.(file);
                                            if (file) {
                                                const url = URL.createObjectURL(file);
                                                setOrPreview?.(url);
                                            } else {
                                                setOrPreview?.(null);
                                            }
                                        }}
                                        className="hidden"
                                        id="or-document-upload-paid"
                                    />
                                )}
                                {orFile || transaction.orUrl ? (
                                    <div className="space-y-3">
                                        {(() => {
                                            const isPdf = orFile
                                                ? (orFile.type === "application/pdf" || orFile.name.toLowerCase().endsWith(".pdf"))
                                                : (transaction.orUrl
                                                    ? (transaction.orUrl.toLowerCase().endsWith(".pdf") || transaction.orUrl.includes("application/pdf") || transaction.orUrl.includes(".pdf?"))
                                                    : false);

                                            if (isPdf) {
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewFile?.(orPreview || transaction.orUrl, "Official Receipt PDF")}
                                                        className="w-full flex items-center justify-between p-5 bg-[#151b28]/60 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left animate-in fade-in duration-300 group"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-xl shrink-0 group-hover:scale-110 transition-transform">
                                                                📕
                                                            </div>
                                                            <div className="space-y-1">
                                                                 <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">Official Receipt PDF</p>
                                                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Click to View PDF in Modal</p>
                                                            </div>
                                                        </div>
                                                        <div className="h-9 px-4 rounded-xl border border-primary/20 text-primary font-black italic uppercase tracking-widest text-[9px] group-hover:bg-primary/10 flex items-center gap-1.5 transition-all shrink-0">
                                                            Open PDF ➔
                                                        </div>
                                                    </button>
                                                );
                                            }

                                            return (
                                                <div
                                                    onClick={() => handleViewFile?.(orPreview || transaction.orUrl, "Official Treasury Receipt")}
                                                    className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all text-left block cursor-pointer select-none"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={orPreview || transaction.orUrl}
                                                        alt="OR Preview"
                                                        className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                                    />
                                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-350 backdrop-blur-[2px]">
                                                        <div
                                                            style={{ backgroundColor: themeColor }}
                                                            className="backdrop-blur-md px-4 py-2 rounded-xl border border-white/25 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg animate-in zoom-in-75 duration-200"
                                                        >
                                                            <span>View</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        {((transaction.status !== "PAID" || !transaction.orUrl) || isBusinessPermit) && (
                                            <div className="flex justify-end">
                                                <label
                                                    htmlFor="or-document-upload-paid"
                                                    className="h-8 px-3 rounded-lg border border-transparent bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-[9px] font-black uppercase tracking-widest italic flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm select-none"
                                                >
                                                    Replace O.R. File
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    ((transaction.status !== "PAID" || !transaction.orUrl) || isBusinessPermit) ? (
                                        <label
                                            htmlFor="or-document-upload-paid"
                                            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all h-28 bg-white dark:bg-[#151b28]/60 overflow-hidden relative group cursor-pointer border-slate-200 dark:border-white/10 hover:border-primary/30"
                                        >
                                            <Upload className="w-4.5 h-4.5 text-slate-400 group-hover:text-primary transition-colors mb-1" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 text-center px-2">
                                                Upload Scanned O.R. Document
                                            </span>
                                        </label>
                                    ) : (
                                        <div className="h-28 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest italic">
                                            No O.R. Document Uploaded
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {((transaction.status !== "PAID" || !transaction.orSeriesNumber || !transaction.orUrl) || isBusinessPermit) && (
                        <Button
                            onClick={handleConfirmPayment}
                            disabled={actionLoading || !orSeriesNumber || !orFile}
                            style={{ backgroundColor: themeColor }}
                            className="w-full h-14 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all opacity-100 hover:opacity-90 disabled:opacity-50"
                        >
                            {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                            {transaction.status === "PAID" ? "Submit O.R. Details" : "Upload O.R. & Mark as Paid"}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
