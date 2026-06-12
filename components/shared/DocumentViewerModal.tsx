"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, FileText, Download, ZoomIn, ZoomOut, RotateCw, RotateCcw, RefreshCw, Move, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: File | null;
    fileUrl: string | null;
    title: string;
    themeColor?: string;
    documents?: { url?: string | null; label: string }[];
    initialIndex?: number;
}

const documentExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf"];
const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"];

function isImageFile(url: string) {
    const lower = url.toLowerCase();
    if (lower.startsWith("data:image/") || lower.startsWith("blob:")) return true;
    const ext = getFileExtension(lower);
    if (imageExtensions.includes(ext)) return true;
    if (documentExtensions.includes(ext)) return false;
    return true;
}

function getFileExtension(value: string) {
    try {
        const cleanPath = new URL(value).pathname;
        return cleanPath.split(".").pop()?.toLowerCase() || "";
    } catch {
        return value.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
    }
}

export default function DocumentViewerModal({
    isOpen,
    onClose,
    file,
    fileUrl,
    title,
    themeColor = "var(--primary-theme)",
    documents,
    initialIndex
}: DocumentViewerModalProps) {

    // Lock document.body background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const [fetchedType, setFetchedType] = React.useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = React.useState(0);

    const docxContainerRef = React.useRef<HTMLDivElement>(null);
    const [docxRendering, setDocxRendering] = React.useState(false);
    const [docxError, setDocxError] = React.useState<string | null>(null);

    // Image Manipulation States
    const [scale, setScale] = React.useState(1);
    const [rotation, setRotation] = React.useState(0);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

    // Reset States on open/close and sync indexes
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setRotation(0);
            setPosition({ x: 0, y: 0 });

            if (documents && documents.length > 0) {
                if (typeof initialIndex === "number" && initialIndex >= 0 && initialIndex < documents.length) {
                    setCurrentIndex(initialIndex);
                } else {
                    const matchIndex = documents.findIndex(doc => doc.url === fileUrl);
                    setCurrentIndex(matchIndex !== -1 ? matchIndex : 0);
                }
            } else {
                setCurrentIndex(0);
            }
        }
    }, [isOpen, initialIndex, documents, fileUrl]);

    const currentDoc = React.useMemo(() => {
        if (documents && documents.length > 0 && currentIndex >= 0 && currentIndex < documents.length) {
            return documents[currentIndex];
        }
        return null;
    }, [documents, currentIndex]);

    const activeUrl = React.useMemo(() => {
        if (fileUrl && /^https?:\/\//i.test(fileUrl)) {
            return fileUrl;
        }
        if (file) {
            return URL.createObjectURL(file);
        }
        return currentDoc ? currentDoc.url : fileUrl;
    }, [file, currentDoc, fileUrl]);

    const activeTitle = currentDoc ? currentDoc.label : title;

    const fileExtension = React.useMemo(() => {
        if (file?.name) return getFileExtension(file.name);
        if (activeUrl) return getFileExtension(activeUrl);
        return "";
    }, [file, activeUrl]);

    const isLocalDocx = React.useMemo(() => {
        if (fileExtension !== "docx") return false;
        if (file) return true;
        if (activeUrl && (activeUrl.startsWith("blob:") || activeUrl.startsWith("data:"))) return true;
        return false;
    }, [fileExtension, file, activeUrl]);

    useEffect(() => {
        if (activeUrl && activeUrl.startsWith("blob:")) {
            fetch(activeUrl)
                .then(res => res.blob())
                .then(blob => setFetchedType(blob.type))
                .catch(() => { });
        } else {
            setFetchedType(null);
        }
    }, [activeUrl]);

    React.useEffect(() => {
        if (!isOpen || !isLocalDocx || !docxContainerRef.current) return;

        let active = true;
        setDocxRendering(true);
        setDocxError(null);

        async function renderDocx() {
            try {
                let docxBlob: Blob;
                if (file) {
                    docxBlob = file;
                } else if (activeUrl) {
                    const response = await fetch(activeUrl);
                    docxBlob = await response.blob();
                } else {
                    throw new Error("No file or URL provided");
                }

                if (!active) return;

                const docxPreviewModule = await import("docx-preview");
                if (docxContainerRef.current && active) {
                    docxContainerRef.current.innerHTML = "";
                    await docxPreviewModule.renderAsync(docxBlob, docxContainerRef.current, undefined, {
                        className: "docx-preview",
                        inWrapper: false,
                        ignoreWidth: true,
                        ignoreHeight: true,
                        ignoreFonts: false,
                        breakPages: true,
                        debug: false,
                        experimental: true,
                    });
                }
            } catch (err: any) {
                console.error("Failed to render DOCX:", err);
                if (active) {
                    setDocxError(err.message || "Failed to render docx document");
                }
            } finally {
                if (active) {
                    setDocxRendering(false);
                }
            }
        }

        renderDocx();

        return () => {
            active = false;
        };
    }, [isOpen, file, activeUrl, isLocalDocx]);

    const isPdf = React.useMemo(() => {
        if (file) {
            return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        }
        if (fetchedType) {
            return fetchedType === "application/pdf";
        }
        if (activeUrl) {
            if (activeUrl.toLowerCase().endsWith(".pdf") || activeUrl.includes("application/pdf") || activeUrl.includes(".pdf?")) {
                return true;
            }
        }
        if (activeTitle && activeTitle.toLowerCase().includes("pdf")) {
            return true;
        }
        return false;
    }, [file, activeUrl, fetchedType, activeTitle]);

    const isDocument = React.useMemo(() => {
        if (isPdf) return true;
        if (file) {
            if (file.type.startsWith("image/")) return false;
            return documentExtensions.includes(fileExtension) || file.type.startsWith("application/");
        }
        if (fetchedType) {
            if (fetchedType.startsWith("image/")) return false;
            return fetchedType.startsWith("application/") || fetchedType.startsWith("text/");
        }
        return documentExtensions.includes(fileExtension);
    }, [file, fetchedType, fileExtension, isPdf]);

    const isImage = !isDocument;

    const officeViewerUrl = React.useMemo(() => {
        if (!activeUrl || isPdf || !["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(fileExtension)) return null;
        if (!/^https?:\/\//i.test(activeUrl)) return null;
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activeUrl)}`;
    }, [activeUrl, fileExtension, isPdf]);

    // Interactive Handlers
    const handleWheel = (e: React.WheelEvent) => {
        if (!isImage) return;
        e.preventDefault();
        const newScale = Math.min(Math.max(scale - e.deltaY * 0.0015, 0.4), 8);
        setScale(newScale);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isImage) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !isImage) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handlePointerUp = () => {
        if (!isImage) return;
        setIsDragging(false);
    };

    const handleReset = () => {
        setScale(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
    };

    const handleDownload = async () => {
        if (!activeUrl) return;
        try {
            const response = await fetch(activeUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;

            const cleanTitle = activeTitle.trim().replace(/[^a-zA-Z0-9\-_]/g, "_") || "document";
            const ext = fileExtension || (blob.type.includes("pdf") ? "pdf" : blob.type.split("/")[1] || "bin");
            link.download = `${cleanTitle}.${ext}`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Direct download failed, falling back to new tab:", error);
            window.open(activeUrl, "_blank");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && activeUrl && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
                    {/* Backdrop Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
                    />

                    {/* Modal Window Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="relative w-full max-w-4xl bg-white dark:bg-[#0c0f16] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 h-[85vh]"
                    >
                        {/* Ambient Glow */}
                        <div
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 blur-[80px] rounded-full opacity-10 pointer-events-none"
                            style={{ backgroundColor: themeColor }}
                        />

                        {/* Modal Header */}
                        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between relative z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-100 dark:border-white/5 shrink-0">
                                    {isDocument ? (
                                        <FileText className="w-5 h-5 text-primary" style={{ color: themeColor }} />
                                    ) : (
                                        <Eye className="w-5 h-5 text-primary" style={{ color: themeColor }} />
                                    )}
                                </div>
                                <div>
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 italic block leading-none">Document Visualizer</span>
                                    <h3 className="text-sm sm:text-base font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-tight">
                                        {activeTitle}
                                    </h3>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Visualizer Controls - Only for Images */}
                                {isImage && (
                                    <div className="hidden sm:flex items-center gap-1 bg-slate-50 dark:bg-white/5 rounded-xl p-1 border border-slate-100 dark:border-white/5 mr-2">
                                        <Button
                                            onClick={() => setScale(prev => Math.min(prev + 0.25, 8))}
                                            variant="ghost"
                                            size="icon"
                                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                            title="Zoom In"
                                        >
                                            <ZoomIn className="w-4.5 h-4.5" />
                                        </Button>
                                        <Button
                                            onClick={() => setScale(prev => Math.max(prev - 0.25, 0.4))}
                                            variant="ghost"
                                            size="icon"
                                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                            title="Zoom Out"
                                        >
                                            <ZoomOut className="w-4.5 h-4.5" />
                                        </Button>
                                        <Button
                                            onClick={() => setRotation(prev => prev - 90)}
                                            variant="ghost"
                                            size="icon"
                                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                            title="Rotate Counter-Clockwise"
                                        >
                                            <RotateCcw className="w-4.5 h-4.5" />
                                        </Button>
                                        <Button
                                            onClick={() => setRotation(prev => prev + 90)}
                                            variant="ghost"
                                            size="icon"
                                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                            title="Rotate Clockwise"
                                        >
                                            <RotateCw className="w-4.5 h-4.5" />
                                        </Button>
                                        <Button
                                            onClick={handleReset}
                                            variant="ghost"
                                            size="icon"
                                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                            title="Reset Changes"
                                        >
                                            <RefreshCw className="w-4.5 h-4.5" />
                                        </Button>
                                    </div>
                                )}

                                <Button
                                    onClick={handleDownload}
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-primary transition-all shrink-0"
                                    title="Download document"
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div
                            className="flex-grow bg-slate-100/50 dark:bg-black/40 flex items-center justify-center overflow-hidden relative select-none"
                            onWheel={handleWheel}
                        >
                            {/* Floating Previous Navigation Button */}
                            {documents && documents.length > 1 && currentIndex > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentIndex(prev => prev - 1);
                                        handleReset();
                                    }}
                                    className="absolute left-4 z-30 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-900/90 text-white backdrop-blur-md flex items-center justify-center border border-white/10 hover:scale-105 transition-all shadow-xl active:scale-95"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            )}

                            {/* Floating Next Navigation Button */}
                            {documents && documents.length > 1 && currentIndex < documents.length - 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentIndex(prev => prev + 1);
                                        handleReset();
                                    }}
                                    className="absolute right-4 z-30 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-900/90 text-white backdrop-blur-md flex items-center justify-center border border-white/10 hover:scale-105 transition-all shadow-xl active:scale-95"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            )}

                            {isPdf ? (
                                <iframe
                                    src={`${activeUrl}#toolbar=0&navpanes=0`}
                                    className="w-full h-full rounded-2xl border-0 bg-white"
                                    title="PDF Document Viewer"
                                />
                            ) : isLocalDocx ? (
                                <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden">
                                    {docxRendering && (
                                        <div className="flex-grow flex flex-col items-center justify-center p-8 text-slate-500">
                                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">Rendering document content...</p>
                                        </div>
                                    )}
                                    {docxError && (
                                        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                                            <p className="text-sm text-red-500 font-bold mb-2">Failed to render preview</p>
                                            <p className="text-xs text-slate-400 max-w-sm mb-4">{docxError}</p>
                                            <Button onClick={handleDownload} style={{ backgroundColor: themeColor }}>
                                                <Download className="w-4 h-4 mr-2" /> Download File
                                            </Button>
                                        </div>
                                    )}
                                    <div
                                        ref={docxContainerRef}
                                        className={cn(
                                            "flex-grow overflow-auto p-4 md:p-8 bg-white text-black text-left border-0",
                                            docxError && "hidden"
                                        )}
                                        style={{ color: "black", background: "white" }}
                                    />
                                </div>
                            ) : isDocument ? (
                                officeViewerUrl ? (
                                    <iframe
                                        src={officeViewerUrl}
                                        className="w-full h-full rounded-2xl border-0 bg-white"
                                        title="Office Document Viewer"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center p-8">
                                        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
                                            <div className="mx-auto w-20 h-20 rounded-3xl bg-white/10 border border-white/10 flex items-center justify-center">
                                                <FileText className="w-10 h-10" style={{ color: themeColor }} />
                                            </div>
                                            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                                {fileExtension.toUpperCase() || "Document"} File
                                            </p>
                                            <h4 className="mt-2 text-xl font-black italic uppercase tracking-tight text-white">
                                                {activeTitle}
                                            </h4>
                                            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                                                This file type cannot be previewed directly in the browser. Open it in a new tab to view or download the submitted document.
                                            </p>
                                            <Button
                                                onClick={handleDownload}
                                                className="mt-6 h-11 rounded-xl px-6 text-xs font-black uppercase tracking-wider text-white"
                                                style={{ backgroundColor: themeColor }}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download Document
                                            </Button>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center relative active:cursor-grabbing overflow-hidden cursor-grab"
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerLeave={handlePointerUp}
                                    style={{ touchAction: "none" }}
                                >
                                    {/* Action instructions overlay */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white backdrop-blur-md px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest pointer-events-none z-20 flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                                        <Move className="w-3.5 h-3.5 text-primary" />
                                        <span>Drag to Pan • Scroll to Zoom</span>
                                    </div>

                                    <motion.div
                                        className="relative flex items-center justify-center pointer-events-none"
                                        style={{
                                            x: position.x,
                                            y: position.y,
                                            scale,
                                            rotate: rotation,
                                        }}
                                        transition={{ type: "spring", stiffness: 400, damping: 40 }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={activeUrl}
                                            alt={activeTitle}
                                            className="max-w-[85vw] max-h-[60vh] object-contain rounded-2xl shadow-2xl select-none"
                                            draggable={false}
                                        />
                                    </motion.div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer / Document Indicators */}
                        {documents && documents.length > 1 && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-white/5 relative z-10 shrink-0 flex flex-col gap-2 overflow-x-auto">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                                        Requirement Index ({currentIndex + 1} of {documents.length})
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 overflow-x-auto py-2 scrollbar-none">
                                    {documents.map((doc, idx) => {
                                        const isActive = idx === currentIndex;
                                        const hasDoc = !!doc.url;
                                        const isImg = hasDoc && isImageFile(doc.url!);

                                        return (
                                            <button
                                                key={idx}
                                                disabled={!hasDoc}
                                                onClick={() => {
                                                    setCurrentIndex(idx);
                                                    handleReset();
                                                }}
                                                className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 transition-all active:scale-95 border-2 ${isActive
                                                        ? "scale-105 shadow-md"
                                                        : hasDoc
                                                            ? "border-transparent opacity-60 hover:opacity-100 hover:scale-102"
                                                            : "opacity-20 cursor-not-allowed border-transparent"
                                                    }`}
                                                style={isActive ? { borderColor: themeColor, boxShadow: `0 0 12px ${themeColor}40` } : undefined}
                                                title={doc.label}
                                            >
                                                {hasDoc ? (
                                                    isImg ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img
                                                            src={doc.url!}
                                                            alt={doc.label}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-200 dark:bg-white/5 flex flex-col items-center justify-center gap-1 p-1">
                                                            <FileText className="w-5 h-5 text-slate-400" />
                                                            <span className="text-[7px] font-black uppercase text-slate-500 truncate max-w-full">
                                                                {getFileExtension(doc.url!).toUpperCase() || "DOC"}
                                                            </span>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="w-full h-full bg-slate-300 dark:bg-slate-900 flex items-center justify-center">
                                                        <span className="text-[8px] font-black uppercase text-slate-400">Empty</span>
                                                    </div>
                                                )}

                                                {/* Text Overlay for Labels */}
                                                <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 backdrop-blur-[1px] py-0.5 px-1 text-center text-white text-[7px] font-black uppercase tracking-wider truncate">
                                                    {doc.label}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
