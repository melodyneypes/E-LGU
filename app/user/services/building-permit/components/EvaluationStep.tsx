import React from 'react';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ClipboardList,
  Clock,
  Check,
  MapPin,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EvaluationStepProps {
  selectedApplication: any;
  existingApplications: any[];
  router: any;
  getEngineeringStatusLabel: (status: string) => string;
  setCurrentStep: (step: string) => void;
  showCancelDialog: boolean;
  setShowCancelDialog: (show: boolean) => void;
  isCancelling: boolean;
  confirmCancel: () => void;
  setIsRevision: (val: boolean) => void;
  setIsZoningRevision: (val: boolean) => void;
}

export function EvaluationStep({
  selectedApplication,
  existingApplications,
  router,
  getEngineeringStatusLabel,
  setCurrentStep,
  showCancelDialog,
  setShowCancelDialog,
  isCancelling,
  confirmCancel,
  setIsRevision,
  setIsZoningRevision
}: EvaluationStepProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {selectedApplication?.isCancelled && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-left space-y-1">
              <h4 className="font-black text-red-500 uppercase tracking-wider text-sm">
                Application Cancelled
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                You cancelled this building permit application. You can still view your details, but it is strictly read-only.
              </p>
            </div>
          </div>
          <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
            CANCELLED
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 mb-6">
          <ClipboardList className="w-6 h-6 text-primary" />
          Evaluation Status
        </h2>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 dark:text-slate-300">Engineering Department Review</h3>
            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 dark:text-white text-sm leading-snug">
                      {selectedApplication?.status === "FOR_INSPECTION"
                        ? "Scheduled for Site Inspection"
                        : selectedApplication?.status === "FOR_REINSPECTION"
                          ? "Scheduled for Site Re-inspection"
                          : ["EVALUATED", "UNPAID", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED", "DELIVERED"].includes(selectedApplication?.status || "")
                            ? "Evaluation Approved"
                            : "Documents Under Review"}
                    </p>
                    <p className="text-xs text-slate-500 leading-normal">
                      {selectedApplication?.status === "FOR_INSPECTION"
                        ? "Your application is scheduled for an upcoming site inspection."
                        : selectedApplication?.status === "FOR_REINSPECTION"
                          ? "Your application requires a site re-inspection. Please see the scheduled date below."
                          : ["EVALUATED", "UNPAID", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED", "DELIVERED"].includes(selectedApplication?.status || "")
                            ? "Your application documents have been evaluated and approved by the Engineering Department."
                            : "Your documents are being reviewed by the Engineering Department"}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shrink-0 w-fit sm:self-center self-start sm:ml-0 ml-14",
                  selectedApplication?.isCancelled
                    ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500"
                    : selectedApplication?.status === "REJECTED"
                      ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500"
                      : selectedApplication?.status === "FOR_REVISION"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                        : ["EVALUATED", "UNPAID", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED", "DELIVERED"].includes(selectedApplication?.status || "")
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                )}>
                  {selectedApplication?.isCancelled
                    ? "Cancelled"
                    : selectedApplication
                      ? getEngineeringStatusLabel(selectedApplication.status)
                      : "Pending Review"}
                </span>
              </div>

              {selectedApplication && (selectedApplication.status === "REJECTED" || selectedApplication.status === "FOR_REVISION") && selectedApplication.rejectionRemarks && (
                <div className="p-4 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl text-red-800 dark:text-red-400 text-sm">
                  <p className="font-bold uppercase tracking-widest text-[10px] mb-1">
                    {selectedApplication.status === "REJECTED" ? "Reason for Rejection" : "Revision Remarks"}
                  </p>
                  <p className="whitespace-pre-wrap font-medium">{selectedApplication.rejectionRemarks}</p>
                  
                  {selectedApplication.status === "FOR_REVISION" && selectedApplication.additionalData?.revisionRequests?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-500/20">
                      <p className="font-bold uppercase tracking-widest text-[10px] mb-2 text-red-700 dark:text-red-400">Documents to Revise / Additional Attachments:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {selectedApplication.additionalData.revisionRequests.map((req: any, i: number) => (
                          <li key={i} className="text-xs font-medium text-red-800 dark:text-red-300">
                            {req.name} <span className="text-[9px] uppercase tracking-widest text-red-600 dark:text-red-400/80 ml-1">({req.type === 'PERMITS' ? 'DOCUMENTS' : 'REQUIREMENTS'})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {(selectedApplication?.status === "FOR_INSPECTION" || selectedApplication?.status === "FOR_REINSPECTION") && selectedApplication?.additionalData?.inspectionSchedule && (
                <div className="p-5 bg-purple-50 dark:bg-purple-500/5 border border-purple-200 dark:border-purple-500/20 rounded-2xl space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                    {selectedApplication.status === "FOR_REINSPECTION" ? "Re-Inspection Details" : "Inspection Details"}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs text-purple-800 dark:text-purple-300 font-bold">
                    <div>
                      <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-0.5">Date & Time</span>
                      {selectedApplication.additionalData.inspectionSchedule.date} at {selectedApplication.additionalData.inspectionSchedule.time}
                    </div>
                    <div>
                      <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-0.5">Inspector</span>
                      {selectedApplication.additionalData.inspectionSchedule.inspectorName}
                    </div>
                    <div className="col-span-2">
                      <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-0.5">Type</span>
                      {selectedApplication.additionalData.inspectionSchedule.type}
                    </div>
                    {selectedApplication.additionalData.inspectionSchedule.notes && (
                      <div className="col-span-2 mt-2 pt-3 border-t border-purple-200 dark:border-purple-500/20">
                        <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-1">Notes / Reason for Re-inspection</span>
                        <p className="italic text-purple-700 dark:text-purple-300 font-medium">&quot;{selectedApplication.additionalData.inspectionSchedule.notes}&quot;</p>
                      </div>
                    )}
                  </div>

                  {/* Previous Schedules / Re-inspection History (User side) */}
                  {selectedApplication.additionalData?.reinspectionHistory && selectedApplication.additionalData.reinspectionHistory.length > 0 && (
                    <div className="pt-4 border-t border-dashed border-purple-200 dark:border-purple-500/20 space-y-3">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-400 dark:text-purple-500 block">Previous Schedules & History</span>
                      <div className="space-y-2">
                        {selectedApplication.additionalData.reinspectionHistory.map((h: any, idx: number) => {
                          const isOrig = h.count === 0 || h.isOriginal === true;
                          return (
                            <div key={idx} className="p-3 bg-white/50 dark:bg-black/20 border border-purple-200/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-medium text-purple-800 dark:text-purple-300">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[9px] font-black italic",
                                  isOrig ? "bg-purple-200 text-purple-800 dark:bg-purple-500/30 dark:text-purple-300" : "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400"
                                )}>
                                  {isOrig ? "Orig" : `#${h.count}`}
                                </span>
                                <span>
                                  {isOrig ? "Original Inspection Schedule" : "Re-inspection Requested"}
                                </span>
                              </div>
                              <div className="text-left sm:text-right text-[10px] text-slate-500">
                                {isOrig ? `${h.date} @ ${h.time}` : (h.date ? new Date(h.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A")}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {(() => {
            const isEngineeringRejected = selectedApplication?.status === "REJECTED";
            const isEngineeringCancelled = !!selectedApplication?.isCancelled || selectedApplication?.status === "CANCELLED";
            const isEngineeringApproved = ["EVALUATED", "UNPAID", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED", "DELIVERED"].includes(selectedApplication?.status || "");
            const isZoningRejected = selectedApplication?.additionalData?.zoningStatus === "REJECTED";
            const isZoningApproved = !!selectedApplication?.additionalData?.feeAssessment?.zoningEndorsed || selectedApplication?.additionalData?.zoningStatus === "EVALUATED";

            return (
              <>
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300">MPDC Zoning Review</h3>
                  <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                      <div className="flex items-start gap-4">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          isEngineeringRejected || isEngineeringCancelled || isZoningRejected
                            ? "bg-red-100 text-red-500 dark:bg-red-500/20"
                            : !isEngineeringApproved
                              ? "bg-amber-100 dark:bg-amber-500/20 text-amber-500"
                              : "bg-blue-100 text-blue-500 dark:bg-blue-500/20"
                        )}>
                          {isEngineeringRejected || isEngineeringCancelled || isZoningRejected ? (
                             <AlertCircle className="w-5 h-5" />
                          ) : !isEngineeringApproved ? (
                             <Clock className="w-5 h-5" />
                          ) : isZoningApproved ? (
                             <Check className="w-5 h-5" />
                          ) : (
                             <MapPin className="w-5 h-5" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800 dark:text-white text-sm leading-snug">
                            {isEngineeringRejected
                              ? "Zoning Review Halted"
                              : isEngineeringCancelled
                                ? "Zoning Review Cancelled"
                                : !isEngineeringApproved
                                  ? "Awaiting Engineering Approval"
                                  : isZoningRejected
                                    ? "Zoning Review Rejected"
                                    : selectedApplication?.additionalData?.zoningStatus === "FOR_INSPECTION"
                                      ? "Scheduled for Zoning Site Inspection"
                                      : selectedApplication?.additionalData?.zoningStatus === "FOR_REINSPECTION"
                                        ? "Scheduled for Zoning Site Re-inspection"
                                        : isZoningApproved
                                          ? "Zoning Assessment Approved"
                                          : "Zoning Clearance Under Review"}
                          </p>
                          <p className="text-xs text-slate-500 leading-normal">
                            {isEngineeringRejected
                              ? "Zoning review halted due to Engineering Department rejection."
                              : isEngineeringCancelled
                                ? "Zoning review halted due to application cancellation."
                                : !isEngineeringApproved
                                  ? "Zoning review will commence once the Engineering Department approves your documents."
                                  : isZoningRejected
                                    ? "Your zoning requirements were evaluated and rejected by the MPDC Zoning Office."
                                    : selectedApplication?.additionalData?.zoningStatus === "FOR_INSPECTION"
                                      ? "Your application is scheduled for an upcoming zoning site inspection."
                                      : selectedApplication?.additionalData?.zoningStatus === "FOR_REINSPECTION"
                                        ? "Your application requires a zoning site re-inspection. Please check for updates."
                                        : isZoningApproved
                                          ? "Your zoning requirements have been evaluated and endorsed by MPDC."
                                          : "Your documents are currently being reviewed by the MPDC Zoning Office."}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shrink-0 w-fit sm:self-center self-start sm:ml-0 ml-14",
                        isEngineeringCancelled
                          ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500"
                          : isEngineeringRejected || isZoningRejected
                            ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500"
                            : !isEngineeringApproved
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                              : selectedApplication?.additionalData?.zoningStatus === "FOR_REVISION"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                                : isZoningApproved
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                      )}>
                        {isEngineeringCancelled
                          ? "Cancelled"
                          : isEngineeringRejected || isZoningRejected
                            ? "REJECTED"
                            : !isEngineeringApproved
                              ? "Pending"
                              : isZoningApproved
                                ? "APPROVED"
                                : selectedApplication?.additionalData?.zoningStatus === "FOR_INSPECTION" || selectedApplication?.additionalData?.zoningStatus === "FOR_REINSPECTION"
                                  ? "For Inspection"
                                  : selectedApplication?.additionalData?.zoningStatus === "FOR_REVISION"
                                    ? "For Revision"
                                    : "Pending Review"}
                      </span>
                    </div>

                    {selectedApplication?.additionalData?.zoningStatus && (selectedApplication.additionalData.zoningStatus === "REJECTED" || selectedApplication.additionalData.zoningStatus === "FOR_REVISION") && selectedApplication.additionalData.zoningRejectionRemarks && (
                      <div className="p-4 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl text-red-800 dark:text-red-400 text-sm">
                        <p className="font-bold uppercase tracking-widest text-[10px] mb-1">
                          {selectedApplication.additionalData.zoningStatus === "REJECTED" ? "Zoning Rejection Reason" : "Zoning Revision Remarks"}
                        </p>
                        <p className="whitespace-pre-wrap font-medium">{selectedApplication.additionalData.zoningRejectionRemarks}</p>
                      </div>
                    )}

                    {(selectedApplication?.additionalData?.zoningStatus === "FOR_INSPECTION" || selectedApplication?.additionalData?.zoningStatus === "FOR_REINSPECTION") && (selectedApplication?.additionalData?.zoningInspectionSchedule || selectedApplication?.additionalData?.inspectionSchedule) && (
                      <div className="p-5 bg-purple-50 dark:bg-purple-500/5 border border-purple-200 dark:border-purple-500/20 rounded-2xl space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                          {selectedApplication.additionalData.zoningStatus === "FOR_REINSPECTION" ? "Zoning Re-Inspection Details" : "Zoning Inspection Details"}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-xs text-purple-800 dark:text-purple-300 font-bold">
                          <div>
                            <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-0.5">Date & Time</span>
                            {(selectedApplication.additionalData.zoningInspectionSchedule || selectedApplication.additionalData.inspectionSchedule).date} at {(selectedApplication.additionalData.zoningInspectionSchedule || selectedApplication.additionalData.inspectionSchedule).time}
                          </div>
                          <div>
                            <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-0.5">Inspector</span>
                            {(selectedApplication.additionalData.zoningInspectionSchedule || selectedApplication.additionalData.inspectionSchedule).inspectorName}
                          </div>
                          <div className="col-span-2">
                            <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-0.5">Type</span>
                            {(selectedApplication.additionalData.zoningInspectionSchedule || selectedApplication.additionalData.inspectionSchedule).type}
                          </div>
                          {(selectedApplication.additionalData.zoningInspectionSchedule || selectedApplication.additionalData.inspectionSchedule).notes && (
                            <div className="col-span-2 mt-2 pt-3 border-t border-purple-200 dark:border-purple-500/20">
                              <span className="text-purple-400 dark:text-purple-500 block text-[9px] uppercase tracking-wider mb-1">Notes / Instructions</span>
                              <p className="italic text-purple-700 dark:text-purple-300 font-medium">&quot;{(selectedApplication.additionalData.zoningInspectionSchedule || selectedApplication.additionalData.inspectionSchedule).notes}&quot;</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300">Endorsement Status</h3>
                  <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        isEngineeringCancelled || isEngineeringRejected || isZoningRejected
                          ? "bg-red-100 text-red-500 dark:bg-red-500/20"
                          : selectedApplication?.additionalData?.bfpStatus === "ACKNOWLEDGED" || (isEngineeringApproved && isZoningApproved)
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500"
                            : "bg-amber-100 dark:bg-amber-500/20 text-amber-500"
                      )}>
                        {isEngineeringCancelled || isEngineeringRejected || isZoningRejected ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : selectedApplication?.additionalData?.bfpStatus === "ACKNOWLEDGED" || (isEngineeringApproved && isZoningApproved) ? (
                          <Check className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 dark:text-white text-sm leading-snug">
                          {isEngineeringRejected || isZoningRejected
                            ? "Endorsement to BFP Halted"
                            : isEngineeringCancelled
                              ? "Endorsement to BFP Cancelled"
                              : "Endorsement to BFP"}
                        </p>
                        <p className="text-xs text-slate-500 leading-normal">
                          {isEngineeringRejected
                            ? "Endorsement halted due to Engineering Department rejection."
                            : isZoningRejected
                              ? "Endorsement halted due to MPDC Zoning Office rejection."
                              : isEngineeringCancelled
                                ? "Endorsement cancelled due to application cancellation."
                                : selectedApplication?.additionalData?.bfpStatus === "ACKNOWLEDGED"
                                  ? "BFP has successfully acknowledged your application"
                                  : (isEngineeringApproved && isZoningApproved)
                                    ? "Endorsed successfully to BFP"
                                    : !isEngineeringApproved
                                      ? "Awaiting Engineering and Zoning approval"
                                      : "Awaiting BFP acknowledgement"}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shrink-0 w-fit sm:self-center self-start sm:ml-0 ml-14",
                      isEngineeringCancelled || isEngineeringRejected || isZoningRejected
                        ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500"
                        : selectedApplication?.status === "UNPAID"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                          : selectedApplication?.additionalData?.bfpStatus === "ACKNOWLEDGED" || (isEngineeringApproved && isZoningApproved)
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                    )}>
                      {isEngineeringCancelled
                        ? "Cancelled"
                        : isEngineeringRejected || isZoningRejected
                          ? "REJECTED"
                          : selectedApplication?.status === "UNPAID"
                            ? "UNPAID"
                            : selectedApplication?.additionalData?.bfpStatus === "ACKNOWLEDGED" || (isEngineeringApproved && isZoningApproved)
                              ? "ACKNOWLEDGED"
                              : "PENDING"}
                    </span>
                  </div>
                </div>
              </>
            );
          })()}

          {selectedApplication?.fiscalSnapshot && (selectedApplication.fiscalSnapshot as any).lineItems && (
            <div className="mt-8 p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4 animate-in fade-in-50 duration-500">
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
        </div>
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => {
            if (selectedApplication) {
              setCurrentStep("DOCUMENTS");
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else if (existingApplications.length > 0) {
              setCurrentStep("EXISTING");
            } else {
              router.push("/user/transactions");
            }
          }}
          className="px-6 py-3 border border-slate-200 dark:border-white/10 rounded-full text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          ← Back
        </button>

        {/* Cancel Application Button */}
        {selectedApplication && selectedApplication.status === "FOR_REQUESTING" && !selectedApplication.isCancelled && (
          <button
            onClick={() => setShowCancelDialog(true)}
            disabled={isCancelling}
            className="px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent rounded-full text-xs font-bold transition-all disabled:opacity-50"
          >
            {isCancelling ? "Cancelling..." : "Cancel Application"}
          </button>
        )}

        {/* Edit for Revision Button */}
        {selectedApplication && (selectedApplication.status === "FOR_REVISION" || selectedApplication.additionalData?.zoningStatus === "FOR_REVISION") && !selectedApplication.isCancelled && (
          <button
            onClick={() => {
              if (selectedApplication.status === "FOR_REVISION") {
                setIsRevision(true);
              }
              if (selectedApplication.additionalData?.zoningStatus === "FOR_REVISION") {
                setIsZoningRevision(true);
              }
              setCurrentStep("PROFILE");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white border border-amber-500 hover:border-transparent rounded-full text-xs font-bold transition-all shadow-xl shadow-amber-500/20"
          >
            Edit and Resubmit Application
          </button>
        )}

        {!(selectedApplication?.isCancelled || selectedApplication?.status === "CANCELLED" || selectedApplication?.status === "FOR_REVISION") && (
          <button
            disabled={selectedApplication?.status !== "UNPAID"}
            onClick={() => {
              if (selectedApplication?.status !== "UNPAID") return;
              setCurrentStep("BFP");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="px-8 py-3 bg-emerald-500 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
          >
            {selectedApplication?.additionalData?.bfpStatus === "ACKNOWLEDGED"
              ? "AWAITING ENGINEER PAYMENT ENDORSEMENT"
              : selectedApplication?.status === "UNPAID"
                ? "OPEN PAYMENT ENDORSEMENT"
              : "Next: BFP →"}
          </button>
        )}
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-white dark:bg-[#11131a] border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-slate-800 dark:text-white uppercase tracking-wider italic text-lg flex items-center gap-2">
              <span className="text-red-500 font-sans">⚠️</span> Cancel Application
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed mt-2">
              Are you sure you want to cancel this application? This action is permanent and cannot be undone. Once cancelled, your application data will remain strictly read-only and a new permit application can be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel className="rounded-full border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 font-bold px-6 py-2.5 transition-colors cursor-pointer text-xs uppercase tracking-widest">
              No, Keep Application
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-red-500 text-white hover:bg-red-600 rounded-full font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-2 px-6 py-2.5 transition-all shadow-xl shadow-red-500/20 cursor-pointer"
            >
              Yes, Cancel Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
