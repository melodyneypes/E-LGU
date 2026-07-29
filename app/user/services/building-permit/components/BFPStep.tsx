/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Landmark, Receipt, Hourglass, CreditCard, AlertCircle, Check } from 'lucide-react';

interface BFPStepProps {
  selectedApplication: any;
  router: any;
  setViewerUrl: (url: string) => void;
  setViewerTitle: (title: string) => void;
  setViewerOpen: (open: boolean) => void;
  setCurrentStep: (step: string) => void;
}

export function BFPStep({
  selectedApplication,
  router,
  setViewerUrl,
  setViewerTitle,
  setViewerOpen,
  setCurrentStep
}: BFPStepProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-white dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 mb-6">
          <Landmark className="w-6 h-6 text-primary" />
          BFP Acknowledgement Status
        </h2>

        <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Receipt className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">BFP Review Processing</h3>
          </div>

          {selectedApplication?.fiscalSnapshot && (selectedApplication.fiscalSnapshot as any).lineItems && (
            <div className="mb-6 p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Endorsed Fees Summary</span>
              <div className="space-y-2">
                {(selectedApplication.fiscalSnapshot as any).lineItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                    <span>{item.label}</span>
                    <span className="font-mono">₱{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-dashed border-slate-200 dark:border-white/10 flex justify-between items-center">
                <span className="text-xs font-black uppercase text-slate-800 dark:text-white">Total Amount</span>
                <span className="text-lg font-black text-primary font-mono">
                  ₱{Number((selectedApplication.fiscalSnapshot as any).totalAmount || selectedApplication.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {selectedApplication?.status === "UNPAID" && !selectedApplication?.paymentReference ? (
            <>
              <div className="bg-amber-50 dark:bg-amber-500/5 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-amber-100 dark:border-amber-500/10">
                <div className="flex items-center gap-3 text-amber-700 dark:text-amber-500">
                  <Hourglass className="w-5 h-5 animate-pulse" />
                  <span className="font-bold text-sm">Status: Pending Payment</span>
                </div>

                <button onClick={() => router.push(`/user/services/requests/${selectedApplication.id}`)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all w-full md:w-auto justify-center">
                  <CreditCard className="w-4 h-4" /> {selectedApplication.rejectionRemarks ? "Upload New Receipt" : "Proceed to Payment"}
                </button>
              </div>

              {/* Show Revision Remarks if any */}
              {selectedApplication?.rejectionRemarks && (
                <div className="mt-4 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-5 space-y-2 animate-in fade-in-50 duration-500">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-500">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <h4 className="font-black text-xs uppercase tracking-widest italic">Payment Revision Required</h4>
                  </div>
                  <p className="text-xs font-medium text-red-800 dark:text-red-400 leading-relaxed">
                    {selectedApplication.rejectionRemarks}
                  </p>
                </div>
              )}

              {/* Show Previous Uploaded Receipts if any */}
              {selectedApplication?.additionalData?.previousPaymentProofs && selectedApplication.additionalData.previousPaymentProofs.length > 0 && (
                <div className="mt-4 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Previous Submissions</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedApplication.additionalData.previousPaymentProofs.map((proof: any, idx: number) => (
                      <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100 transition-opacity">
                        <img src={proof.url} alt={`Previous Proof ${idx + 1}`} className="object-cover w-full h-full" />
                        <div className="absolute top-2 left-2 bg-red-500/90 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded">Rejected</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 text-amber-700 dark:text-amber-500 text-xs font-medium px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Please proceed to the LGU Mapandan Treasury Office to pay the required fees. After payment, upload your official receipt here. Receipt verification takes 24 hours.</p>
              </div>
            </>
          ) : selectedApplication?.status === "UNPAID" && selectedApplication?.paymentReference ? (
            <div className="bg-blue-50 dark:bg-blue-500/5 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-blue-100 dark:border-blue-500/10">
              <div className="flex items-center gap-3 text-blue-700 dark:text-blue-500">
                <Hourglass className="w-5 h-5 animate-pulse" />
                <span className="font-bold text-sm">Status: Waiting Verification</span>
              </div>
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Receipt uploaded successfully. Treasury is verifying your payment.
              </div>
            </div>
          ) : ["PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED", "DELIVERED"].includes(selectedApplication?.status || "") ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-emerald-100 dark:border-emerald-500/10">
                <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-500">
                  <Check className="w-5 h-5 text-emerald-500" />
                  <span className="font-bold text-sm">Status: Paid (Receipt Submitted)</span>
                </div>
                {selectedApplication?.additionalData?.treasuryReceiptUrl && (
                  <button
                    onClick={() => {
                      setViewerUrl(selectedApplication.additionalData.treasuryReceiptUrl);
                      setViewerTitle("Official Treasury Receipt");
                      setViewerOpen(true);
                    }}
                    className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black italic uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                  >
                    View Official Receipt
                  </button>
                )}
              </div>
              {selectedApplication?.additionalData?.treasuryRemarks && (
                <div className="p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 italic">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 not-italic block mb-1">Treasury Notes:</span>
                  &ldquo;{selectedApplication.additionalData.treasuryRemarks}&rdquo;
                </div>
              )}
              {selectedApplication?.additionalData?.clearanceRevisionReason && (!selectedApplication?.additionalData?.bfpClearanceUrl || !selectedApplication?.additionalData?.zoningClearanceUrl) && (
                <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5 space-y-2 animate-in fade-in-50 duration-500">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <h4 className="font-black text-xs uppercase tracking-widest italic">Revision Required</h4>
                  </div>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-400 leading-relaxed">
                    {selectedApplication.additionalData.clearanceRevisionReason}
                  </p>
                </div>
              )}



            </div>
          ) : null}
        </div>
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => {
            setCurrentStep("EVALUATION");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 font-bold uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 dark:border-white/20 rounded-full transition-colors shadow-sm"
        >
          ← Back
        </button>

        <button
          disabled={
            selectedApplication?.status === "UNPAID"
          }
          onClick={() => {
            setCurrentStep("SUBMIT");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="px-8 py-3 bg-emerald-500 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
        >
          Next: Submission →
        </button>
      </div>
    </div>
  );
}
