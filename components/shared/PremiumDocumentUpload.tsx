"use client";

import React, { useRef } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compression";

interface PremiumDocumentUploadProps {
    label: string;
    required?: boolean;
    file: File | null;
    previewUrl?: string | null;
    existingUrl?: string | null;
    onFileSelect: (file: File) => void;
    onClear?: () => void;
    onView: () => void;
    error?: boolean | string;
    infoText?: string;
}

export default function PremiumDocumentUpload({
    label,
    required = false,
    file,
    previewUrl,
    existingUrl,
    onFileSelect,
    onView,
    error = false,
    infoText = "PDF / IMAGE (MAX 5MB)"
}: PremiumDocumentUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        if (selectedFile) {
            const maxBytes = 5 * 1024 * 1024; // 5MB limit
            if (selectedFile.size > maxBytes) {
                toast.error(`The file "${selectedFile.name}" is too large! Maximum limit is 5MB`);
                e.target.value = "";
                return;
            }

            const extension = selectedFile.name.split(".").pop()?.toLowerCase();
            if (extension === "docx" || extension === "doc" || selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || selectedFile.type === "application/msword") {
                toast.error("Word documents (.doc, .docx) are not accepted. Please upload PDF or image files.");
                e.target.value = "";
                return;
            }

            let fileToProcess = selectedFile;
            if (selectedFile.type.startsWith("image/")) {
                try {
                    toast.loading("Compressing and optimizing document...", { id: "image-compress-toast" });
                    fileToProcess = await compressImage(selectedFile);
                    toast.dismiss("image-compress-toast");
                } catch (err) {
                    console.error("Compression error:", err);
                    toast.dismiss("image-compress-toast");
                }
            }

            onFileSelect(fileToProcess);
        }
    };

    const triggerUpload = () => {
        inputRef.current?.click();
    };

    const hasFile = !!file || !!previewUrl || !!existingUrl;
    const checkIsPdfUrl = (url: string | null | undefined): boolean => {
        if (!url) return false;
        try {
            const cleanUrl = url.split("?")[0].toLowerCase();
            if (cleanUrl.endsWith(".pdf")) return true;
        } catch {}
        const lowerUrl = url.toLowerCase();
        return lowerUrl.includes("application/pdf") || 
               lowerUrl.includes(".pdf?") || 
               lowerUrl.startsWith("data:application/pdf");
    };

    const isPdf = file 
        ? (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
        : previewUrl 
        ? checkIsPdfUrl(previewUrl)
        : existingUrl
        ? checkIsPdfUrl(existingUrl)
        : false;

    const getFileName = () => {
        if (file) return file.name;
        const url = previewUrl || existingUrl;
        if (url) {
            try {
                const cleanUrl = url.split("?")[0];
                const parts = cleanUrl.split("/");
                const fileNameWithTimestamp = decodeURIComponent(parts[parts.length - 1]);
                const cleanName = fileNameWithTimestamp.replace(/^\d+_/, "");
                if (cleanName) return cleanName;
            } catch {}
        }
        return "PDF Document";
    };

    // Use current state previewUrl, or fall back to object URL if file is present, or existingUrl
    const currentPreview = previewUrl || (file ? URL.createObjectURL(file) : existingUrl || null);

    return (
        <div className={cn(
            "p-4 md:p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed flex flex-col gap-3 md:gap-4 transition-all duration-300 w-full hover:border-primary",
            error 
                ? "!border-red-500 !border-solid !border-2 dark:!border-red-500/80 ring-2 ring-red-500/20 bg-red-50/10 animate-pulse" 
                : "border-slate-200 dark:border-white/10"
        )}>
            {/* Hidden native input */}
            <input
                type="file"
                ref={inputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
            />

            {/* Header info row */}
            <div className="flex items-center gap-3 md:gap-4 w-full text-left">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-black/20 rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-slate-100 dark:border-white/5">
                    <Upload className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="space-y-0.5">
                    <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-white italic flex items-center gap-1">
                        {label} {required && <span className="text-red-500 font-black not-italic">*</span>}
                    </h4>
                    <p className="text-[8px] md:text-[9px] text-slate-400 font-bold italic uppercase tracking-tighter line-clamp-1">
                        {infoText}
                    </p>
                </div>
            </div>

            {/* Inline Preview Content */}
            {hasFile && (
                <>
                    {isPdf ? (
                        <div
                            onClick={onView}
                            className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between mt-1 cursor-pointer hover:bg-primary/10 transition-colors"
                        >
                            <span className="text-xs font-bold text-primary truncate max-w-[200px]">
                                {getFileName()}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary italic">🔍 Click to View</span>
                        </div>
                    ) : currentPreview ? (
                        <div
                            onClick={onView}
                            className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg mt-1 cursor-pointer group/preview"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={currentPreview}
                                alt={label}
                                className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 select-none z-20">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white italic">🔍 Click to View Full Size</span>
                            </div>
                        </div>
                    ) : null}
                </>
            )}

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between w-full gap-2 md:gap-3 mt-1">
                {hasFile ? (
                    <>
                        <button
                            type="button"
                            onClick={onView}
                            className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full border border-primary/20 text-primary hover:bg-primary/5 flex-1 transition-all duration-300"
                        >
                            View Document
                        </button>
                        <button
                            type="button"
                            onClick={triggerUpload}
                            className="font-black italic uppercase tracking-widest text-[8px] md:text-[9px] px-4 md:px-6 h-8 rounded-full border border-primary/20 text-primary hover:bg-primary/5 flex-1 transition-all duration-300"
                        >
                            Change
                        </button>
                     </>
                ) : (
                    <button
                        type="button"
                        onClick={triggerUpload}
                        className="w-full h-8 rounded-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest italic text-[8px] md:text-[9px] transition-all duration-300 flex items-center justify-center shadow-lg shadow-primary/10"
                    >
                        UPLOAD
                    </button>
                )}
            </div>
        </div>
    );
}
