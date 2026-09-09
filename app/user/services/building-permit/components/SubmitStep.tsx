import React from 'react';
import { CheckCircle2, FileText, Shield } from 'lucide-react';

interface SubmitStepProps {
  selectedApplication: any;
  setCurrentStep: (step: string) => void;
  setViewerUrl: (url: string) => void;
  setViewerTitle: (title: string) => void;
  setViewerOpen: (open: boolean) => void;
}

export function SubmitStep({
  selectedApplication,
  setCurrentStep,
  setViewerUrl,
  setViewerTitle,
  setViewerOpen
}: SubmitStepProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-white dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 p-10 shadow-sm text-center">
        <div className="w-20 h-20 bg-[#1e293b] dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Application Status</h2>
        <p className="text-slate-500 text-sm font-medium mb-8">
          {selectedApplication?.status === "FOR_CLAIM" && (
            <span className="text-emerald-500 font-black uppercase tracking-widest block text-lg mb-1">✅ Ready to Claim!</span>
          )}
          {selectedApplication?.status === "FOR_PICKING" && (
            <span className="text-blue-500 font-black uppercase tracking-widest block text-lg mb-1">🚚 The Rider is on its way!</span>
          )}
          {selectedApplication?.status === "RELEASED" && (
            <span className="text-emerald-500 font-black uppercase tracking-widest block text-lg mb-1">🎉 Released!</span>
          )}
          {["FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(selectedApplication?.status || "") ? (
            "Your building permit has been approved and the digital copy is now available below."
          ) : (
            "Your application is being processed. You will be notified once your permit is ready for release."
          )}
        </p>

        {selectedApplication?.eCopyUrl && ["FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(selectedApplication?.status || "") ? (
          <div className="max-w-2xl mx-auto space-y-4 mb-6">
            {/* Official Permit */}
            <div className="border-2 border-emerald-500/50 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-emerald-500/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-center md:text-left">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">
                    Official Permit E-Copy
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Your approved building permit is ready for download.
                    {selectedApplication?.updatedAt && (
                      <span className="block mt-1.5 text-[9px] text-emerald-600/80 dark:text-emerald-400/80 font-bold uppercase tracking-widest">
                        Released on: {new Date(selectedApplication.updatedAt).toLocaleDateString()} {new Date(selectedApplication.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setViewerUrl(selectedApplication.eCopyUrl);
                  setViewerTitle("Official Permit E-Copy");
                  setViewerOpen(true);
                }}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 shrink-0"
              >
                <FileText className="w-4 h-4" /> Preview & Download
              </button>
            </div>

            {/* Zoning Clearance */}
            {selectedApplication?.additionalData?.zoningClearanceUrl && (
              <div className="border-2 border-emerald-500/50 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-emerald-500/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">
                      Zoning Clearance
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Your approved zoning clearance is ready for download.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setViewerUrl(selectedApplication.additionalData.zoningClearanceUrl);
                    setViewerTitle("Zoning Clearance");
                    setViewerOpen(true);
                  }}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 shrink-0"
                >
                  <FileText className="w-4 h-4" /> Preview & Download
                </button>
              </div>
            )}

            {/* BFP Clearance */}
            {selectedApplication?.additionalData?.bfpClearanceUrl && (
              <div className="border-2 border-emerald-500/50 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-emerald-500/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">
                      BFP Fire Safety Clearance
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Your approved fire safety clearance is ready for download.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setViewerUrl(selectedApplication.additionalData.bfpClearanceUrl);
                    setViewerTitle("BFP Clearance");
                    setViewerOpen(true);
                  }}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 shrink-0"
                >
                  <FileText className="w-4 h-4" /> Preview & Download
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto border-2 border-dashed border-[#1e293b] dark:border-white/50 rounded-xl p-6 flex flex-col md:flex-row items-center justify-center gap-4 bg-slate-50/50 dark:bg-white/5 mb-6">
            <div className="w-10 h-10 bg-[#1e293b] dark:bg-white text-white dark:text-slate-900 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-center md:text-left">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-bold">Digital Copy</span> of your documents will be available here upon release
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">You can view and download your approved permit directly from this page.</p>
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-4 flex items-start gap-3 text-left">
          <Shield className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            <span className="font-bold text-slate-700 dark:text-slate-300">RA 10173 (Data Privacy Act of 2012) Compliance:</span> Your personal information is collected for building permit processing only and will not be shared with third parties without your consent.
          </p>
        </div>
      </div>

      <div className="flex justify-start items-center mt-6">
        <button
          onClick={() => {
            setCurrentStep("BFP");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 font-bold uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 dark:border-white/20 rounded-full transition-colors shadow-sm"
        >
          ← Back to Treasury & Zoning
        </button>
      </div>
    </div>
  );
}
