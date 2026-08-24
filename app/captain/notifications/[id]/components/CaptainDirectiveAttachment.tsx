"use client";

import React, { useState } from "react";
import { FileText, Eye, Paperclip } from "lucide-react";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";

interface CaptainDirectiveAttachmentProps {
    attachmentUrl: string;
    attachmentName?: string | null;
    attachmentSize?: string | null;
    themeColor?: string;
}

export function CaptainDirectiveAttachment({
    attachmentUrl,
    attachmentName,
    attachmentSize,
    themeColor = "#2563eb",
}: CaptainDirectiveAttachmentProps) {
    const [isOpen, setIsOpen] = useState(false);

    const displayName = attachmentName || "Official_Attachment_File";

    return (
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
                            {displayName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Official Attached File · {attachmentSize || "Official Attachment"}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 inline-flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                    <Eye className="w-4 h-4" /> Download / Open Attachment
                </button>
            </div>

            {/* Shared Document Viewer Modal */}
            <DocumentViewerModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                file={null}
                fileUrl={attachmentUrl}
                title={displayName}
                themeColor={themeColor}
            />
        </div>
    );
}
