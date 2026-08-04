import React from "react";
import { UploadCloud, AlertCircle, FileText, FileSignature, CheckCircle, PenTool, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";
import SignaturePad from "@/components/shared/SignaturePad"; // Force recompile
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSecureUploadUrlsAction } from "@/app/auth/actions";

interface UploadStepProps {
  themeColor: string;
  isEditable: boolean;
  isRevision: boolean;
  isFieldRequested: (key: string) => boolean;
  activeDocTab: "REQUIREMENTS" | "PERMITS";
  setActiveDocTab: (tab: "REQUIREMENTS" | "PERMITS") => void;
  requiredRequirementsCount: number;
  documentRequirementsList: readonly string[];
  customRequirements: { label: string }[];
  isAffidavitOfConsentRequired: boolean;
  isOwnerDeceased?: boolean;
  hasMultipleFloors: boolean;
  permitTypesList: readonly string[];
  customPermits: { label: string }[];
  effectiveDocuments: any;
  uploadedRequirements: Record<number, any>;
  setUploadedRequirements: React.Dispatch<React.SetStateAction<Record<number, any>>>;
  uploadedPermits: Record<number, any>;
  setUploadedPermits: React.Dispatch<React.SetStateAction<Record<number, any>>>;
  requiredRequirementIndexes: number[];
  requiredPermitIndexes: number[];
  showValidationErrors: boolean;
  setCustomRequirements: React.Dispatch<React.SetStateAction<{ label: string }[]>>;
  setCustomPermits: React.Dispatch<React.SetStateAction<{ label: string }[]>>;
  setViewerFile: (file: File) => void;
  setViewerUrl: (url: string) => void;
  setViewerTitle: (title: string) => void;
  setViewerOpen: (open: boolean) => void;
  handleAddCustomDocument: () => void;
  uploadedRequirementsCount: number;
  uploadedPermitsCount: number;
  totalRequiredItems: number;
  selectedApplication: any;
  signatureUrl: string | null;
  setSignatureUrl: (url: string | null) => void;
  uploadFileClientSide: (file: File, type: string, target: any) => Promise<string | null>;
  privacyAccepted: boolean;
  setPrivacyAccepted: (accepted: boolean) => void;
  isPrivacyModalOpen: boolean;
  setIsPrivacyModalOpen: (open: boolean) => void;
  setCurrentStep: (step: string) => void;
  addAbandonedFile: (url: string) => void;
}

export function UploadStep({
  themeColor,
  isEditable,
  isRevision,
  isFieldRequested,
  activeDocTab,
  setActiveDocTab,
  requiredRequirementsCount,
  documentRequirementsList,
  customRequirements,
  isAffidavitOfConsentRequired,
  isOwnerDeceased,
  hasMultipleFloors,
  permitTypesList,
  customPermits,
  effectiveDocuments,
  uploadedRequirements,
  setUploadedRequirements,
  uploadedPermits,
  setUploadedPermits,
  requiredRequirementIndexes,
  requiredPermitIndexes,
  showValidationErrors,
  setCustomRequirements,
  setCustomPermits,
  setViewerFile,
  setViewerUrl,
  setViewerTitle,
  setViewerOpen,
  handleAddCustomDocument,
  uploadedRequirementsCount,
  uploadedPermitsCount,
  totalRequiredItems,
  selectedApplication,
  signatureUrl,
  setSignatureUrl,
  uploadFileClientSide,
  privacyAccepted,
  setPrivacyAccepted,
  isPrivacyModalOpen,
  setIsPrivacyModalOpen,
  setCurrentStep,
  addAbandonedFile
}: UploadStepProps) {

  const [clearedKeys, setClearedKeys] = React.useState<Set<string>>(new Set());

  const handleClearUpload = (idx: number, isRequirement: boolean) => {
    const key = isRequirement ? `req_${idx}` : `permit_${idx}`;
    setClearedKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    if (isRequirement) {
      setUploadedRequirements(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    } else {
      setUploadedPermits(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    }
  };

  const handleAsyncUpload = async (file: File, idx: number, isRequirement: boolean) => {
    const fieldName = isRequirement ? `req_${idx}` : `permit_${idx}`;
    setClearedKeys(prev => {
      const next = new Set(prev);
      next.delete(fieldName);
      return next;
    });
    const toastId = toast.loading("Uploading document...", { id: `upload-${idx}` });
    try {
      const extension = file.name.split(".").pop() || "bin";
      const fieldName = isRequirement ? `req_${idx}` : `permit_${idx}`;
      
      const allocation = await getSecureUploadUrlsAction(
        [{ fieldName, fileExt: extension }],
        "building_permits"
      );
      
      const target = allocation.success ? allocation.data?.[0] : undefined;
      const url = target ? await uploadFileClientSide(file, fieldName, target) : null;
      
      if (url) {
        addAbandonedFile(url);
        if (isRequirement) {
          setUploadedRequirements(prev => ({ ...prev, [idx]: url }));
        } else {
          setUploadedPermits(prev => ({ ...prev, [idx]: url }));
        }
        toast.success("Document uploaded successfully!", { id: toastId });
      } else {
        toast.error("Failed to upload document.", { id: toastId });
      }
    } catch {
      toast.error("An error occurred during upload.", { id: toastId });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Header */}
      <div className="space-y-3 md:space-y-4 mb-8">
        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight flex items-center gap-4">
          <UploadCloud className="w-10 h-10 md:w-12 md:h-12 text-slate-800 dark:text-white" />
          <span className="text-slate-800 dark:text-white">Upload Requirements & Documents</span>
        </h2>
        <p className="text-slate-500 font-medium text-xs md:text-sm uppercase tracking-widest">
          Upload all required requirements and documents. Files must be PDF, JPG, or PNG (max 5MB each).
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        <div className="bg-slate-100/50 dark:bg-white/5 border-l-4 border-slate-800 dark:border-white p-4 rounded-r-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-slate-800 dark:text-white shrink-0" />
          <p className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">
            <b>File Upload Rules:</b> Max 5MB per file · Allowed: .pdf, .jpg, .jpeg, .png only
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
        <button
          onClick={() => setActiveDocTab("REQUIREMENTS")}
          className={cn(
            "flex-1 py-4 px-6 rounded-full font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-3 transition-all border w-full",
            activeDocTab === "REQUIREMENTS"
              ? "text-white shadow-xl"
              : "bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
          )}
          style={activeDocTab === "REQUIREMENTS" ? {
            backgroundColor: themeColor,
            borderColor: themeColor,
            boxShadow: themeColor.startsWith("#") ? `0 20px 25px -5px ${themeColor}30` : `0 20px 25px -5px rgba(var(--primary), 0.2)`
          } : undefined}
        >
          <FileText className="w-4 h-4" />
          Requirements ({requiredRequirementsCount} items)
        </button>
        <button
          onClick={() => setActiveDocTab("PERMITS")}
          className={cn(
            "flex-1 py-4 px-6 rounded-full font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-3 transition-all border w-full",
            activeDocTab === "PERMITS"
              ? "text-white shadow-xl"
              : "bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
          )}
          style={activeDocTab === "PERMITS" ? {
            backgroundColor: themeColor,
            borderColor: themeColor,
            boxShadow: themeColor.startsWith("#") ? `0 20px 25px -5px ${themeColor}30` : `0 20px 25px -5px rgba(var(--primary), 0.2)`
          } : undefined}
        >
          <FileSignature className="w-4 h-4" />
          Documents (Upload 4 or more)
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h3 className="text-xl font-black text-slate-800 dark:text-white">
            {activeDocTab === "REQUIREMENTS" ? "Requirements" : "Documents"}
          </h3>
          {activeDocTab === "PERMITS" && (
            <span className="bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full w-fit mt-1">
              Upload at least 4 to proceed
            </span>
          )}
        </div>
        {isEditable && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustomDocument}
            className="rounded-full border-slate-300 hover:bg-slate-50 dark:border-white/20 dark:hover:bg-white/10 flex items-center gap-2"
          >
            <span>+</span> Add Custom {activeDocTab === "REQUIREMENTS" ? "Requirement" : "Document"}
          </Button>
        )}
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {(activeDocTab === "REQUIREMENTS"
          ? [
              ...documentRequirementsList
                .map((docName, idx) => ({ docName, idx, kind: "base" as const })),
              ...customRequirements.map((req, idx) => ({ docName: req.label, idx: documentRequirementsList.length + idx, kind: "custom" as const }))
            ].filter(({ idx, kind }) => {
              if (kind === "custom") return true;
              if (idx === 5) return false;
              if (!isOwnerDeceased && [13, 14].includes(idx)) return false;
              if (!isAffidavitOfConsentRequired && [7, 10, 11, 12].includes(idx)) return false;
              if (isAffidavitOfConsentRequired && [21, 22].includes(idx)) return false;
              if (!hasMultipleFloors && [23, 24].includes(idx)) return false;
              return true;
            })
          : [
              ...permitTypesList.map((docName, idx) => ({ docName, idx, kind: "base" as const })),
              ...customPermits.map((permit, idx) => ({ docName: permit.label, idx: permitTypesList.length + idx, kind: "custom" as const }))
            ]
        ).map(({ docName, idx, kind }) => {
          const isCustomItem = kind === "custom";
          const key = activeDocTab === "REQUIREMENTS" ? `req_${idx}` : `permit_${idx}`;
          const fileUrl = clearedKeys.has(key) ? null : effectiveDocuments?.[key];
          const newlyUploaded = activeDocTab === "REQUIREMENTS" ? !!uploadedRequirements[idx] : !!uploadedPermits[idx];
          const isUploaded = !isEditable ? !!fileUrl : (!!fileUrl || newlyUploaded);
          const isRequired = isCustomItem
            ? false
            : (activeDocTab === "PERMITS"
              ? requiredPermitIndexes.includes(idx)
              : requiredRequirementIndexes.includes(idx));
          const hasError = showValidationErrors && isRequired && !isUploaded;
          
          const uploadedData = activeDocTab === "REQUIREMENTS" ? uploadedRequirements[idx] : uploadedPermits[idx];
          const isFileObj = uploadedData && typeof uploadedData !== 'string';
          const cleanDocName = docName.replace(/\s*\(Optional\)/gi, "").trim();

          return (
            <div key={key} className={cn("bg-white/40 dark:bg-white/5 backdrop-blur-md border rounded-2xl p-5 shadow-sm transition-all group", hasError ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border-slate-200 dark:border-white/10 hover:border-primary/30")}>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm min-w-0 flex-1">
                  <div className="min-h-[40px] leading-tight">
                    <span className="text-lg mr-1.5 align-bottom">📄</span>
                    <span className="break-words">{cleanDocName}</span>
                    {isRequired ? (
                      <span className="text-red-500 ml-1 text-base align-top">*</span>
                    ) : (
                      activeDocTab !== "PERMITS" && (
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 ml-1 align-middle">(Optional)</span>
                      )
                    )}
                  </div>
                </h4>
                <div className="flex items-center gap-2 shrink-0">
                  {isUploaded ? (
                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">
                      Uploaded
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">
                      Pending
                    </span>
                  )}
                  {isCustomItem && isEditable && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeDocTab === "REQUIREMENTS") {
                          setCustomRequirements(prev => prev.filter((_, i) => i !== (idx - documentRequirementsList.length)));
                          setUploadedRequirements(prev => {
                            const nextReqs: Record<number, any> = {};
                            Object.entries(prev).forEach(([kStr, file]) => {
                              const k = parseInt(kStr, 10);
                              if (k < idx) {
                                nextReqs[k] = file;
                              } else if (k > idx) {
                                nextReqs[k - 1] = file;
                              }
                            });
                            return nextReqs;
                          });
                        } else {
                          setCustomPermits(prev => prev.filter((_, i) => i !== (idx - permitTypesList.length)));
                          setUploadedPermits(prev => {
                            const nextPermits: Record<number, any> = {};
                            Object.entries(prev).forEach(([kStr, file]) => {
                              const k = parseInt(kStr, 10);
                              if (k < idx) {
                                nextPermits[k] = file;
                              } else if (k > idx) {
                                nextPermits[k - 1] = file;
                              }
                            });
                            return nextPermits;
                          });
                        }
                      }}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-[10px] font-bold transition-colors border border-red-200 dark:border-red-500/20 px-2 py-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <PremiumDocumentUpload
                  label="Document File"
                  required={isRequired}
                  file={isFileObj ? uploadedData : null}
                  previewUrl={!isFileObj && uploadedData ? uploadedData : undefined}
                  existingUrl={fileUrl}
                  onFileSelect={(file) => handleAsyncUpload(file, idx, activeDocTab === "REQUIREMENTS")}
                  onClear={() => handleClearUpload(idx, activeDocTab === "REQUIREMENTS")}
                  onView={() => {
                    const currentData = activeDocTab === "REQUIREMENTS" ? uploadedRequirements[idx] : uploadedPermits[idx];
                    if (currentData && typeof currentData !== 'string') {
                      setViewerFile(currentData);
                    } else if (currentData && typeof currentData === 'string') {
                      setViewerUrl(currentData);
                    } else if (fileUrl) {
                      setViewerUrl(fileUrl);
                    }
                    setViewerTitle(docName);
                    setViewerOpen(true);
                  }}
                  error={hasError}
                  infoText="PDF / Image (Max 5MB)"
                  disabled={!isEditable || (isRevision && !isFieldRequested(key))}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div className="space-y-4 mt-8">
        <div 
          className="border-l-4 p-4 rounded-r-xl flex items-center gap-3"
          style={{
            backgroundColor: themeColor.startsWith("#") ? `${themeColor}0d` : `rgba(var(--primary), 0.05)`,
            borderLeftColor: themeColor
          }}
        >
          <UploadCloud 
            className="w-5 h-5 shrink-0" 
            style={{ color: themeColor }}
          />
          <p 
            className="text-xs md:text-sm font-bold"
            style={{ color: themeColor }}
          >
            {activeDocTab === "REQUIREMENTS"
              ? `Requirements Progress: ${uploadedRequirementsCount}/${requiredRequirementsCount} documents uploaded`
              : `Permits Progress: ${uploadedPermitsCount} uploaded (min. 4 required)`}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-500/5 border-l-4 border-blue-500 p-4 rounded-r-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
            <p className="text-xs md:text-sm font-bold text-blue-800 dark:text-blue-300">
              Total Progress: {uploadedRequirementsCount + uploadedPermitsCount}/{totalRequiredItems} items uploaded
            </p>
          </div>
          {!selectedApplication && (
            <span className="text-[10px] text-blue-600/60 dark:text-blue-400/60 font-medium uppercase tracking-widest hidden sm:block">All requirements and at least 4 permits must be uploaded</span>
          )}
        </div>
      </div>

      {/* Signature Block */}
      <div className="bg-white dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm mt-8">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: themeColor.startsWith("#") ? `${themeColor}1a` : `rgba(var(--primary), 0.1)`
            }}
          >
            <PenTool 
              className="w-5 h-5" 
              style={{ color: themeColor }}
            />
          </div>
          <div>
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-lg flex items-center gap-2">
              Digital Signature <span className="text-red-500 text-xl">*</span>
            </h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Sign directly below</p>
          </div>
        </div>
        {!isEditable ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Your digital signature was recorded with this application submission:</p>
            {selectedApplication?.additionalData?.signature ? (
              <div className="border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-white max-w-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedApplication.additionalData.signature} alt="Digital Signature" className="max-h-32 object-contain mx-auto" />
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No signature was saved for this application.</p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-6">Please sign to acknowledge that all information provided is true and correct.</p>
            {isRevision && signatureUrl && (
              <div className="mb-4">
                <p 
                  className="text-xs font-bold mb-2"
                  style={{ color: themeColor }}
                >
                  Previous Signature (You can resign below to update):
                </p>
                <div className="border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-white max-w-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signatureUrl} alt="Digital Signature" className="max-h-32 object-contain mx-auto" />
                </div>
              </div>
            )}
            <div className={cn("rounded-xl overflow-hidden bg-white transition-all", showValidationErrors && !signatureUrl ? "border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "border border-slate-200 dark:border-white/10")}>
            <SignaturePad
              themeColor={themeColor}
              onSave={async (file: File | null) => {
                if (!file) return;
                toast.loading("Uploading signature...", { id: "signature-upload-toast" });
                const extension = file.name.split(".").pop() || "bin";
                const allocation = await getSecureUploadUrlsAction(
                  [{ fieldName: "signature_signature", fileExt: extension }],
                  "building_permits"
                );
                const target = allocation.success ? allocation.data?.[0] : undefined;
                const url = target
                  ? await uploadFileClientSide(file, "signature", target)
                  : null;
                if (url) {
                  setSignatureUrl(url);
                  toast.success("Signature uploaded successfully. Ready to submit!", { id: "signature-upload-toast" });
                } else {
                  toast.error("Failed to upload signature.", { id: "signature-upload-toast" });
                }
              }}
            />
            </div>
            {signatureUrl && (
              <div 
                className="mt-4 p-3 border rounded-xl flex items-center gap-2 text-sm font-bold"
                style={{
                  backgroundColor: themeColor.startsWith("#") ? `${themeColor}0d` : `rgba(var(--primary), 0.05)`,
                  borderColor: themeColor.startsWith("#") ? `${themeColor}33` : `rgba(var(--primary), 0.2)`,
                  color: themeColor
                }}
              >
                <CheckCircle className="w-4 h-4" /> Signature captured successfully. Ready to submit!
              </div>
            )}
          </>
        )}
      </div>

      {/* Data Privacy Agreement Block */}
      <div className="mt-8">
        <div
          onClick={() => {
            if (privacyAccepted) {
              setPrivacyAccepted(false);
            } else {
              setIsPrivacyModalOpen(true);
            }
          }}
          className={cn(
            "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 select-none",
            privacyAccepted ? "bg-primary/5 border-primary shadow-sm" : "bg-slate-50 dark:bg-white/[0.02] border-transparent hover:border-primary/20",
            showValidationErrors && !privacyAccepted && "border-red-500 bg-red-50/50"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
            privacyAccepted ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-white/10",
            showValidationErrors && !privacyAccepted && "border-red-400"
          )}>
            {privacyAccepted && <Check className="w-3.5 h-3.5" />}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black italic uppercase tracking-tight text-slate-900 dark:text-white">Data Privacy and Terms Agreement</p>
            <p className="text-[8px] md:text-[10px] text-slate-500 font-medium leading-relaxed italic uppercase tracking-widest">
              I officially accept the EMapandan Data Privacy Agreement & Terms. I declare under penalty of perjury that all submitted details are 100% legal and genuine. Click to review agreement.
            </p>
          </div>
        </div>
      </div>

      <PrivacyTermsModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onAccept={() => {
          setPrivacyAccepted(true);
          setIsPrivacyModalOpen(false);
        }}
        themeColor={themeColor}
      />

      {/* Footer Buttons */}
      <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <button
          onClick={() => {
            setCurrentStep("PROFILE");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 font-bold uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 dark:border-white/20 rounded-full transition-colors shadow-sm"
        >
          ← Back to Applicant Details
        </button>
        {!isEditable ? (
          <button
            onClick={() => {
              setCurrentStep("EVALUATION");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-3 transition-all shadow-xl shadow-primary/20 w-full md:w-auto"
          >
            Next: Evaluation Status
            <span className="text-xl leading-none">→</span>
          </button>
        ) : (
          <button
            onClick={() => document.getElementById("submitBtn")?.click()}
            className="px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-3 transition-all w-full md:w-auto text-white hover:opacity-90 shadow-xl"
            style={{
              backgroundColor: themeColor,
              boxShadow: themeColor.startsWith("#") ? `0 20px 25px -5px ${themeColor}30` : `0 20px 25px -5px rgba(var(--primary), 0.2)`
            }}
          >
            Submit to Engineering for Review
            <span className="text-xl leading-none">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
