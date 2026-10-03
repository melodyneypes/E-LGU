/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { Landmark, Receipt, Hourglass, CreditCard, AlertCircle, Check, QrCode, Building2, UploadCloud, Eye, Ticket, Printer, Loader2 } from 'lucide-react';
import PrintQueueTicket from '@/components/shared/PrintQueueTicket';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getOrCreateBuildingPermitQueueTicket } from '../actions';

interface BFPStepProps {
  selectedApplication: any;
  router: any;
  setViewerUrl: (url: string) => void;
  setViewerTitle: (title: string) => void;
  setViewerOpen: (open: boolean) => void;
  setCurrentStep: (step: string) => void;
  setIsPaymentModalOpen?: (open: boolean) => void;
  residentData?: any;
  onApplicationUpdated?: (updatedData: any) => void;
}

export function BFPStep({
  selectedApplication,
  router,
  setViewerUrl,
  setViewerTitle,
  setViewerOpen,
  setCurrentStep,
  setIsPaymentModalOpen,
  residentData,
  onApplicationUpdated
}: BFPStepProps) {
  const [printTriggered, setPrintTriggered] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isGeneratingTicket, setIsGeneratingTicket] = useState(false);

  const handleGenerateQueueTicket = async () => {
    if (!selectedApplication?.id) return;
    try {
      setIsGeneratingTicket(true);
      const res = await getOrCreateBuildingPermitQueueTicket(selectedApplication.id);
      if (res.success && res.data) {
        toast.success("Walk-in queue ticket generated! Scan this at the front desk.");
        if (onApplicationUpdated) {
          onApplicationUpdated(res.data);
        }
        setIsTicketModalOpen(true);
      } else {
        toast.error(res.error || "Failed to generate queue ticket.");
      }
    } catch (err: any) {
      console.error("Queue ticket generation error:", err);
      toast.error(err.message || "Failed to generate queue ticket.");
    } finally {
      setIsGeneratingTicket(false);
    }
  };

  const formattedDate = selectedApplication?.appointmentDate
    ? new Date(selectedApplication.appointmentDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Print Ticket Portal */}
      {selectedApplication?.queueNumber && (
        <PrintQueueTicket
          queueNumber={selectedApplication.queueNumber}
          residentName={
            residentData?.firstName
              ? `${residentData.firstName} ${residentData.lastName}`
              : (selectedApplication.applicantName || "Resident")
          }
          serviceName="Building Permit - Treasury Fee"
          appointmentDate={selectedApplication.appointmentDate || new Date()}
          appointmentSlot={selectedApplication.appointmentSlot || "08:00 AM - 12:00 PM"}
          isPriority={selectedApplication.isPriority || false}
          department="Municipal Treasury"
          triggerPrint={printTriggered}
          onPrintCompleted={() => setPrintTriggered(false)}
        />
      )}

      {/* Queue Ticket QR Modal Dialog */}
      {selectedApplication?.queueNumber && (
        <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-[#0d0f14] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <DialogHeader className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Municipal Hall Walk-In
                </span>
                {selectedApplication.isPriority && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    ♿ Priority Lane
                  </span>
                )}
              </div>
              <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white italic">
                Municipal Treasury Queue Ticket
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Present this QR code to the Front Desk staff or Kiosk scanner upon arriving at the Municipal Town Hall.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center gap-4">
              <div className="text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Official Queue Number
                </span>
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-primary">
                  {selectedApplication.queueNumber}
                </span>
              </div>

              {/* High Definition QR Code */}
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col items-center gap-1.5">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(selectedApplication.queueNumber)}`}
                  alt="Walk-in Queue QR Code"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 text-center">
                  Scan via Front Desk App / Kiosk
                </span>
              </div>

              {/* Ticket Meta Details */}
              <div className="w-full space-y-2 text-xs pt-3 border-t border-slate-200/70 dark:border-white/10">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-[11px] text-slate-400 font-medium">Department:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Municipal Treasury Office</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-[11px] text-slate-400 font-medium">Service:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Building Permit Fee</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-[11px] text-slate-400 font-medium">Total Amount:</span>
                  <span className="font-mono font-black text-primary">
                    ₱{Number((selectedApplication.fiscalSnapshot as any)?.totalAmount || selectedApplication.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-[11px] text-slate-400 font-medium">Date / Schedule:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {formattedDate} ({selectedApplication.appointmentSlot || "Day Shift"})
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setPrintTriggered(true)}
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-widest italic flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" /> Print Ticket Slip
              </button>
              <button
                type="button"
                onClick={() => setIsTicketModalOpen(false)}
                className="h-11 px-6 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-widest italic transition-all"
              >
                Done
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="bg-white dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 mb-6">
          <Landmark className="w-6 h-6 text-primary" />
          Treasury Status / Payment Status
        </h2>

        <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Receipt className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Treasury Payment Processing</h3>
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
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-500/5 rounded-xl p-5 flex items-center justify-between gap-4 border border-amber-100 dark:border-amber-500/10">
                <div className="flex items-center gap-3 text-amber-700 dark:text-amber-500">
                  <Hourglass className="w-5 h-5 animate-pulse" />
                  <span className="font-bold text-sm">Status: Pending Payment</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
                  Action Required
                </span>
              </div>

              {/* Show Revision Remarks if any */}
              {selectedApplication?.rejectionRemarks && (
                <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-5 space-y-2 animate-in fade-in-50 duration-500">
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
                <div className="space-y-3">
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

              {/* Choose Payment Method */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <h4 className="text-sm font-black uppercase tracking-wider italic text-slate-800 dark:text-white">
                    Choose Payment Method
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Choose whether to settle online via instant digital payment or walk in directly at the Municipal Treasury counter.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Online Payment */}
                  <div className="p-6 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/[0.03] transition-all flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-black text-sm uppercase italic text-slate-900 dark:text-white">Online Payment</h5>
                          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Instant Verification</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Pay digitally via <strong>QRPh, GCash, or Maya</strong>. Your permit payment status updates automatically upon checkout.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push(`/user/services/requests/${selectedApplication.id}`)}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest italic flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <CreditCard className="w-4 h-4" /> Pay Online (QRPh / GCash)
                    </button>
                  </div>

                  {/* Option 2: Walk-in Payment */}
                  <div className="p-6 rounded-2xl border-2 border-slate-200 dark:border-white/10 hover:border-primary/40 bg-slate-50 dark:bg-white/[0.02] transition-all flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-black text-sm uppercase italic text-slate-900 dark:text-white">Walk-In Treasury</h5>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cash Payment Counter</span>
                          </div>
                        </div>
                        {selectedApplication?.queueNumber && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Ticket Active
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Proceed to the <strong>Municipal Treasury Office</strong> at the Municipal Town Hall. Present your queue ticket and QR code to the Front Desk, and settle your payment in cash at the Treasury counter.
                      </p>

                      {/* Active Queue Ticket Box if generated */}
                      {selectedApplication?.queueNumber && (
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Treasury Queue Ticket</span>
                            {selectedApplication.isPriority && (
                              <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">Priority Lane</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <span className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white block">
                                {selectedApplication.queueNumber}
                              </span>
                              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">
                                Ready to scan at Front Desk
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsTicketModalOpen(true)}
                              className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg border border-slate-200 dark:border-white/10 transition-transform active:scale-95 shrink-0"
                              title="Click to view full QR code"
                            >
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(selectedApplication.queueNumber)}`}
                                alt="Queue QR"
                                className="w-12 h-12 rounded"
                              />
                            </button>
                          </div>

                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setIsTicketModalOpen(true)}
                              className="w-full h-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-black uppercase tracking-wider italic flex items-center justify-center gap-2 transition-all active:scale-95 border border-primary/20"
                            >
                              <QrCode className="w-4 h-4" /> View QR Code
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {!selectedApplication?.queueNumber && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleGenerateQueueTicket}
                          disabled={isGeneratingTicket}
                          className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-widest italic flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isGeneratingTicket ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Generating Queue Ticket...
                            </>
                          ) : (
                            <>
                              <Ticket className="w-4 h-4" /> Get Walk-In Queue Ticket & QR
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : selectedApplication?.status === "UNPAID" && selectedApplication?.paymentReference ? (
            <div className="bg-blue-50 dark:bg-blue-500/5 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-blue-100 dark:border-blue-500/10">
              <div className="flex items-center gap-3 text-blue-700 dark:text-blue-500">
                <Hourglass className="w-5 h-5 animate-pulse" />
                <div>
                  <span className="font-bold text-sm block">Status: Waiting Treasury Verification</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400">Official receipt submitted. Treasury is validating your payment.</span>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setViewerUrl(selectedApplication.paymentReference);
                    setViewerTitle("Uploaded Payment Receipt");
                    setViewerOpen(true);
                  }}
                  className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black italic uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 shadow-md transition-all flex-1 md:flex-none"
                >
                  <Eye className="w-3.5 h-3.5" /> View Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen?.(true)}
                  className="px-4 py-2 rounded-full border border-blue-300 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-black italic uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 transition-all flex-1 md:flex-none"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> Re-upload
                </button>
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
