"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { 
    FileText, Search, Home, BookOpen, Leaf,
    Calculator, Gavel, FileCheck, Shield, HeartPulse, Hammer, Siren, HelpCircle,
    ChevronLeft, ChevronRight, X, Loader2, Download, AlertCircle,
    Maximize2, Minimize2, Book, ZoomIn, ZoomOut, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import Link from "next/link";

interface CitizenCharter {
    id: string;
    officeName: string;
    fileUrl: string;
    isActive: boolean;
}

interface BookViewerProps {
    url: string;
    title: string;
    onClose: () => void;
}

function BookViewerModal({ url, title, onClose }: BookViewerProps) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [progress, setProgress] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [isScriptsLoaded, setIsScriptsLoaded] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [isMobile, setIsMobile] = useState<boolean>(false);

    // Zoom & Pan states
    const [zoom, setZoom] = useState<number>(1.0);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const bookContainerRef = useRef<HTMLDivElement | null>(null);
    const pageFlipInstance = useRef<any>(null);
    const isImage = !url.toLowerCase().endsWith(".pdf");

    // Responsive screen width detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Load PDF.js and St.PageFlip scripts from CDN
    useEffect(() => {
        if (typeof window === "undefined") return;

        let active = true;

        const loadScripts = async () => {
            try {
                // 1. PDF.js
                if (!(window as any).pdfjsLib) {
                    await new Promise<void>((resolve, reject) => {
                        const s = document.createElement("script");
                        s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
                        s.onload = () => {
                            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
                                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                            resolve();
                        };
                        s.onerror = reject;
                        document.body.appendChild(s);
                    });
                }

                // 2. PageFlip
                if (!(window as any).St) {
                    await new Promise<void>((resolve, reject) => {
                        const s = document.createElement("script");
                        s.src = "https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js";
                        s.onload = () => resolve();
                        s.onerror = reject;
                        document.body.appendChild(s);
                    });
                }

                if (active) {
                    setIsScriptsLoaded(true);
                }
            } catch (err) {
                console.error("Failed to load flipbook scripts:", err);
                if (active) {
                    setError("Failed to load flipbook engine. Please try downloading directly.");
                    setLoading(false);
                }
            }
        };

        loadScripts();

        return () => {
            active = false;
        };
    }, []);

    // Initialize PageFlip and render PDF pages with calculated responsive fit sizing
    useEffect(() => {
        if (!isScriptsLoaded || !bookContainerRef.current) return;

        let active = true;
        setLoading(true);
        setError(null);
        setProgress(5);

        const initBook = async () => {
            try {
                let images: string[] = [];
                let originalW = 550;
                let originalH = 750;

                if (isImage) {
                    images = [url];
                    setNumPages(1);
                } else {
                    const pdfjsLib = (window as any).pdfjsLib;
                    const loadingTask = pdfjsLib.getDocument(url);
                    const pdf = await loadingTask.promise;
                    if (!active) return;
                    setNumPages(pdf.numPages);

                    for (let i = 1; i <= pdf.numPages; i++) {
                        if (!active) return;
                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 1.5 });
                        originalW = viewport.width / 1.5;
                        originalH = viewport.height / 1.5;

                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        await page.render({ canvasContext: ctx!, viewport }).promise;
                        images.push(canvas.toDataURL("image/jpeg", 0.92));
                        setProgress(Math.round((i / pdf.numPages) * 100));
                    }

                    // Pad odd page counts on desktop so spread remains symmetric
                    const isPhone = window.innerWidth < 768;
                    if (!isPhone && images.length % 2 !== 0) {
                        const blankCanvas = document.createElement("canvas");
                        blankCanvas.width = Math.round(originalW * 1.5);
                        blankCanvas.height = Math.round(originalH * 1.5);
                        const blankCtx = blankCanvas.getContext("2d");
                        if (blankCtx) {
                            blankCtx.fillStyle = "#ffffff";
                            blankCtx.fillRect(0, 0, blankCanvas.width, blankCanvas.height);
                            images.push(blankCanvas.toDataURL("image/jpeg", 0.9));
                        }
                    }
                }

                if (!active || !bookContainerRef.current) return;

                // Responsive calculation: single-page for phone screens, two-page spread for desktop/tablets
                const isPhone = window.innerWidth < 768;
                const availableH = isPhone 
                    ? window.innerHeight - 150 
                    : Math.min(window.innerHeight - 200, 750);
                const availableW = isPhone 
                    ? Math.min(window.innerWidth - 24, 420) 
                    : Math.min((window.innerWidth - 160) / 2, 480);

                const aspect = originalH / (originalW || 1);
                let finalW = availableW;
                let finalH = availableW * aspect;

                if (finalH > availableH) {
                    finalH = availableH;
                    finalW = availableH / aspect;
                }

                // Clear previous instance
                if (pageFlipInstance.current) {
                    pageFlipInstance.current.destroy();
                    pageFlipInstance.current = null;
                }

                const St = (window as any).St;
                if (!St || !St.PageFlip) return;

                const pageFlip = new St.PageFlip(bookContainerRef.current, {
                    width: Math.round(finalW),
                    height: Math.round(finalH),
                    size: "fixed",
                    minWidth: 200,
                    maxWidth: 900,
                    minHeight: 300,
                    maxHeight: 1200,
                    maxShadowOpacity: 0.5,
                    showCover: false,
                    usePortrait: isPhone, // Single page on phone, double-page on desktop/tablet!
                    showPageCorners: false, // Disables hover magnet peeling
                    disableFlipByClick: false, // Enables animated flipNext and flipPrev
                    useMouseEvents: true, // Enables animated turning physics
                    flippingTime: 650, // Smooth realistic flip duration
                    mobileScrollSupport: false
                });

                pageFlip.loadFromImages(images);

                pageFlip.on("flip", (e: any) => {
                    if (active) {
                        setCurrentPageIndex(e.data);
                    }
                });

                pageFlipInstance.current = pageFlip;
                setLoading(false);
            } catch (err: any) {
                console.error("Error creating flipbook:", err);
                if (active) {
                    setError("Failed to render book pages. Please download the document directly.");
                    setLoading(false);
                }
            }
        };

        initBook();

        return () => {
            active = false;
            if (pageFlipInstance.current) {
                try {
                    pageFlipInstance.current.destroy();
                } catch {
                    // ignore
                }
                pageFlipInstance.current = null;
            }
        };
    }, [isScriptsLoaded, url, isImage]);

    // Flip Controls
    const handleNext = useCallback(() => {
        if (pageFlipInstance.current) {
            pageFlipInstance.current.flipNext();
        }
    }, []);

    const handlePrev = useCallback(() => {
        if (pageFlipInstance.current) {
            pageFlipInstance.current.flipPrev();
        }
    }, []);

    // Zoom Controls
    const handleZoomIn = () => {
        setZoom(prev => Math.min(2.5, +(prev + 0.2).toFixed(1)));
    };

    const handleZoomOut = () => {
        setZoom(prev => {
            const next = Math.max(0.6, +(prev - 0.2).toFixed(1));
            if (next <= 1.0) setPan({ x: 0, y: 0 });
            return next;
        });
    };

    const handleResetZoom = () => {
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
    };

    // Pan Drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom > 1.0) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoom > 1.0) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "Escape") onClose();
            if (e.key === "+" || e.key === "=") handleZoomIn();
            if (e.key === "-") handleZoomOut();
            if (e.key === "0") handleResetZoom();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleNext, handlePrev, onClose]);

    // Prevent body scroll when reader is active
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    // Calculate display page number
    const leftPage = currentPageIndex + 1;
    const rightPage = Math.min(numPages || 1, currentPageIndex + 2);
    const displayPageNumber = isMobile || leftPage >= (numPages || 1)
        ? `${leftPage}` 
        : `${leftPage}-${rightPage}`;

    return (
        <div className="fixed inset-0 bg-[#24262b]/95 z-[150] flex flex-col justify-between overflow-hidden text-white select-none animate-in fade-in duration-300">
            {/* Top Bar */}
            <div className="p-3 md:px-8 bg-black/40 border-b border-white/5 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                        <Book className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <div className="space-y-0.5">
                        <h4 className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Citizens Charter</h4>
                        <h3 className="text-xs md:text-sm font-black uppercase tracking-tight text-white line-clamp-1 max-w-[200px] sm:max-w-md">{title}</h3>
                    </div>
                </div>

                {/* Close Button */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose}
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                >
                    <X className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
            </div>

            {/* Viewer Content Area with Pan & Zoom support */}
            <div 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`flex-1 flex items-center justify-center relative p-1 sm:p-4 md:p-8 overflow-hidden select-none ${
                    zoom > 1.0 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
                }`}
            >
                {/* Left/Right Floating page-flip controls */}
                {!loading && !error && numPages && numPages > 1 && (
                    <>
                        <button 
                            onClick={handlePrev}
                            disabled={currentPageIndex <= 0}
                            className="absolute left-1.5 sm:left-4 md:left-8 z-30 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-black/75 hover:bg-black/95 border border-white/10 disabled:opacity-20 disabled:pointer-events-none rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white shadow-2xl cursor-pointer"
                            title="Previous Page"
                        >
                            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                        </button>
                        <button 
                            onClick={handleNext}
                            disabled={currentPageIndex >= (numPages - 1)}
                            className="absolute right-1.5 sm:right-4 md:right-8 z-30 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-black/75 hover:bg-black/95 border border-white/10 disabled:opacity-20 disabled:pointer-events-none rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white shadow-2xl cursor-pointer"
                            title="Next Page"
                        >
                            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                        </button>
                    </>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-white" />
                        <span className="text-[11px] md:text-xs font-black uppercase tracking-widest text-slate-300 italic">
                            Preparing pages ({progress}%)...
                        </span>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="max-w-md text-center p-6 md:p-8 bg-black/60 border border-white/10 rounded-[2rem] space-y-4 mx-4">
                        <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-red-400 mx-auto" />
                        <h4 className="text-base md:text-lg font-black uppercase tracking-tight italic">Error loading document</h4>
                        <p className="text-xs text-slate-300 font-semibold leading-relaxed">{error}</p>
                        <Button asChild className="rounded-xl h-10 md:h-11 bg-primary text-white font-bold" style={{ backgroundColor: 'var(--primary-theme)' }}>
                            <a href={url} target="_blank" rel="noopener noreferrer">Download Directly</a>
                        </Button>
                    </div>
                )}

                {/* FlipBook Container Element with Zoom & Pan transform */}
                <div 
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: "center center",
                        transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}
                    className={`flex items-center justify-center will-change-transform ${loading || error ? "hidden" : "block"}`}
                >
                    <div 
                        ref={bookContainerRef} 
                        className="shadow-[0_20px_60px_rgba(0,0,0,0.7)] md:shadow-[0_30px_90px_rgba(0,0,0,0.7)] rounded-lg overflow-hidden" 
                    />
                </div>
            </div>

            {/* Bottom Floating Control Bar (Responsive) */}
            <div className="p-2 sm:p-3 md:px-8 bg-black/50 border-t border-white/10 flex flex-row items-center justify-between gap-1.5 sm:gap-4 backdrop-blur-md">
                {/* Left: Page Counter */}
                <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-white/10 rounded-lg text-[10px] sm:text-xs font-black tracking-wider text-slate-200 shrink-0">
                        {!loading && !error && numPages ? (
                            <span>Page {displayPageNumber} / {numPages}</span>
                        ) : (
                            <span>Loading...</span>
                        )}
                    </div>
                </div>

                {/* Center: Zoom and Pan Controls */}
                {!loading && !error && (
                    <div className="flex items-center gap-1 sm:gap-2 bg-white/10 rounded-xl p-0.5 sm:p-1 border border-white/10">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleZoomOut}
                            disabled={zoom <= 0.6}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/20 text-white disabled:opacity-30"
                            title="Zoom Out (-)"
                        >
                            <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                        <span className="text-[9px] sm:text-[10px] font-black w-8 sm:w-12 text-center uppercase tracking-wider">
                            {Math.round(zoom * 100)}%
                        </span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleZoomIn}
                            disabled={zoom >= 2.5}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/20 text-white disabled:opacity-30"
                            title="Zoom In (+)"
                        >
                            <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleResetZoom}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/20 text-white"
                            title="Fit Screen / Reset (0)"
                        >
                            <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </Button>
                    </div>
                )}

                {/* Right: Fullscreen & Download Actions */}
                <div className="flex items-center gap-1.5">
                    <Button 
                        variant="ghost"
                        size="icon"
                        onClick={toggleFullscreen}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer shrink-0"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </Button>

                    <Button 
                        asChild
                        variant="outline"
                        className="h-8 sm:h-9 px-2.5 sm:px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/10 font-bold uppercase tracking-widest text-[8px] sm:text-[9px] italic flex items-center gap-1 shrink-0"
                    >
                        <a href={url} download target="_blank" rel="noopener noreferrer">
                            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span className="hidden sm:inline">Download PDF</span>
                            <span className="sm:hidden">PDF</span>
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}


interface StandingBookCardProps {
    title: string;
    logoUrl?: string;
    icon?: any;
    onClick: () => void;
}

function StandingBookCard({ title, logoUrl, icon: Icon, onClick }: StandingBookCardProps) {
    const cleanTitle = title
        .replace(/^(OFFICE OF THE|MUNICIPAL)\s+/i, "")
        .replace(/\s+OFFICE$/i, "")
        .trim();

    return (
        <div 
            onClick={onClick}
            className="group relative flex flex-col items-center justify-center p-2 sm:p-4 cursor-pointer select-none py-6"
            style={{ perspective: "1200px" }}
        >
            {/* 3D Book Assembly: Image 1 (Flat) on desktop default -> Image 2 (3D with Pages) on Hover / Mobile */}
            <div 
                className="relative w-[195px] h-[310px] sm:w-[225px] sm:h-[355px] transition-all duration-500 ease-out transform
                           rotate-y-[-16deg] rotate-x-[2deg] -translate-y-2.5 scale-[1.02]
                           md:rotate-y-0 md:rotate-x-0 md:translate-y-0 md:scale-100
                           md:group-hover:rotate-y-[-16deg] md:group-hover:rotate-x-[2deg] md:group-hover:-translate-y-3.5 md:group-hover:scale-105"
                style={{
                    transformStyle: "preserve-3d"
                }}
            >
                {/* 1. Floor Shadow: Centered on desktop default, 3D angled on hover/mobile */}
                <div 
                    className="absolute -bottom-5 left-2 right-0 h-5 bg-black/50 dark:bg-black/80 rounded-full blur-md transform -skew-x-12 opacity-80
                               md:-skew-x-0 md:left-4 md:right-4 md:opacity-40 md:blur-sm
                               md:group-hover:-skew-x-12 md:group-hover:left-2 md:group-hover:right-0 md:group-hover:opacity-90 md:group-hover:blur-md
                               transition-all duration-500" 
                />

                {/* 2. Layered White Book Pages (Visible on hover on desktop, always visible on mobile) */}
                <div 
                    className="absolute inset-0 bg-white dark:bg-slate-200 rounded-r-md border border-slate-300 dark:border-slate-400 shadow-sm
                               opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500"
                    style={{
                        transform: "translateZ(-12px) translateX(12px) scaleY(0.96)",
                        transformOrigin: "left center"
                    }}
                />
                <div 
                    className="absolute inset-0 bg-slate-50 dark:bg-slate-100 rounded-r-md border-r-2 border-slate-300 dark:border-slate-400 shadow-sm
                               opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500"
                    style={{
                        transform: "translateZ(-8px) translateX(8px) scaleY(0.97)",
                        transformOrigin: "left center"
                    }}
                />
                <div 
                    className="absolute inset-0 bg-white dark:bg-slate-100 rounded-r-md border-r-2 border-slate-300 dark:border-slate-400 shadow-sm
                               opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500"
                    style={{
                        transform: "translateZ(-4px) translateX(4px) scaleY(0.98)",
                        transformOrigin: "left center"
                    }}
                />

                {/* 3. Front Book Cover */}
                <div 
                    className="absolute inset-0 rounded-2xl md:rounded-2xl md:group-hover:rounded-r-xl md:group-hover:rounded-l-xs overflow-hidden shadow-2xl transition-all duration-500 border-l border-white/20 flex flex-col justify-between"
                    style={{
                        background: "linear-gradient(160deg, color-mix(in srgb, var(--primary-theme, #a1112e) 85%, #fff 15%) 0%, var(--primary-theme, #880d24) 45%, color-mix(in srgb, var(--primary-theme, #68081a) 70%, #000 30%) 100%)",
                        boxShadow: "-4px 8px 24px rgba(0, 0, 0, 0.45), inset -1px 0 6px rgba(0, 0, 0, 0.3)"
                    }}
                >
                    {/* Left Spine 3D Curve Highlight */}
                    <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-gradient-to-r from-black/45 via-white/20 to-transparent z-30 pointer-events-none" />
                    <div className="absolute left-3.5 top-0 bottom-0 w-px bg-black/20 z-30 pointer-events-none" />

                    {/* Dynamic Vector Wave & Multi-Stripe Ribbon Art Pattern (Shifted Upwards) */}
                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                        <svg 
                            viewBox="0 0 160 260" 
                            className="absolute inset-0 w-full h-full object-cover"
                            preserveAspectRatio="none"
                        >
                            <g transform="translate(0, -32)">
                                {/* Layer 1: Light Tint Wave */}
                                <path 
                                    d="M -5,95 C 20,95 35,120 42,145 C 50,175 95,178 165,115 L 165,185 C 95,248 50,245 42,215 C 35,190 20,165 -5,165 Z" 
                                    fill="color-mix(in srgb, var(--primary-theme, #e11d48) 55%, #ffffff 45%)" 
                                    opacity="0.9"
                                />

                                {/* Layer 2: White Pinstripe */}
                                <path 
                                    d="M -5,103 C 20,103 35,128 42,153 C 50,181 95,184 165,123 L 165,130 C 95,191 50,188 42,160 C 35,135 20,110 -5,110 Z" 
                                    fill="#ffffff" 
                                />

                                {/* Layer 3: Vibrant Primary Theme Wave */}
                                <path 
                                    d="M -5,110 C 20,110 35,135 42,160 C 50,188 95,191 165,130 L 165,150 C 95,211 50,208 42,180 C 35,155 20,130 -5,130 Z" 
                                    fill="var(--primary-theme, #e11d48)" 
                                />

                                {/* Layer 4: White Pinstripe */}
                                <path 
                                    d="M -5,130 C 20,130 35,155 42,180 C 50,208 95,211 165,150 L 165,157 C 95,218 50,215 42,187 C 35,162 20,137 -5,137 Z" 
                                    fill="#ffffff" 
                                />

                                {/* Layer 5: Deep Dark Theme Shadow Wave */}
                                <path 
                                    d="M -5,137 C 20,137 35,162 42,187 C 50,215 95,218 165,157 L 165,175 C 95,236 50,233 42,205 C 35,180 20,155 -5,155 Z" 
                                    fill="color-mix(in srgb, var(--primary-theme, #880d24) 45%, #000000 55%)" 
                                />
                            </g>
                        </svg>
                    </div>

                    {/* Cover Top Header */}
                    <div className="relative z-10 pt-5 px-3 flex flex-col items-center text-center">
                        <div className="space-y-0.5 mb-2.5">
                            <span className="text-[8.5px] font-black uppercase tracking-[0.25em] text-white drop-shadow-sm block">
                                Citizen&apos;s Charter
                            </span>
                            <span className="text-[6.5px] font-bold uppercase tracking-widest text-white/80 block">
                                Municipality of Mapandan
                            </span>
                        </div>

                        {/* Official Seal Badge */}
                        <div 
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1.5 shadow-2xl border-2 flex items-center justify-center transition-transform group-hover:scale-105 duration-500"
                            style={{ borderColor: "color-mix(in srgb, var(--primary-theme, #f59e0b) 40%, #fef08a 60%)" }}
                        >
                            {logoUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={logoUrl} alt="Seal" className="w-full h-full object-contain" />
                            ) : Icon ? (
                                <Icon className="w-9 h-9" style={{ color: "var(--primary-theme)" }} />
                            ) : (
                                <BookOpen className="w-9 h-9" style={{ color: "var(--primary-theme)" }} />
                            )}
                        </div>
                    </div>

                    {/* Cover Bottom: Department Title & Hover CTA */}
                    <div className="relative z-10 pb-5 px-3 text-center flex flex-col items-center">
                        <p className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-wider line-clamp-2 leading-tight drop-shadow-md mb-2">
                            {cleanTitle}
                        </p>

                        {/* Hover Action Badge: Always visible on mobile, appears on hover for desktop */}
                        <div className="opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-300">
                            <span 
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white rounded-full text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider shadow-lg border border-white/20 active:scale-95"
                                style={{ backgroundColor: "var(--primary-theme)" }}
                            >
                                <BookOpen className="w-3 h-3" /> Read Charter
                            </span>
                        </div>
                    </div>

                    {/* Book Gloss Reflection on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none z-30 opacity-20 md:opacity-0 md:group-hover:opacity-60 transition-opacity duration-500" />
                </div>
            </div>
        </div>
    );
}

export function UserCitizensCharterView({ 
    initialCharters = [],
    logoUrl = ""
}: { 
    initialCharters: CitizenCharter[];
    logoUrl?: string;
}) {
    const [search, setSearch] = useState("");
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState<string>("");

    // Dynamic Lucide icon helper based on office name
    const getOfficeIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes("agri")) return Leaf;
        if (lower.includes("account") || lower.includes("budget") || lower.includes("treasur") || lower.includes("finance")) return Calculator;
        if (lower.includes("bid") || lower.includes("award")) return Gavel;
        if (lower.includes("permit") || lower.includes("license") || lower.includes("bplo")) return FileCheck;
        if (lower.includes("registrar") || lower.includes("registry") || lower.includes("lcr")) return BookOpen;
        if (lower.includes("admin") || lower.includes("mayor") || lower.includes("executive")) return Shield;
        if (lower.includes("health") || lower.includes("rhu") || lower.includes("clinic") || lower.includes("medic")) return HeartPulse;
        if (lower.includes("engineer") || lower.includes("building") || lower.includes("construction")) return Hammer;
        if (lower.includes("police") || lower.includes("security") || lower.includes("poso") || lower.includes("fire") || lower.includes("siren")) return Siren;
        return FileText;
    };

    const filtered = initialCharters.filter(c => 
        c.officeName.toLowerCase().includes(search.toLowerCase())
    );

    const openBookViewer = (url: string, title: string) => {
        setViewerUrl(url);
        setViewerTitle(title);
    };

    const closeBookViewer = () => {
        setViewerUrl(null);
        setViewerTitle("");
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-12 sm:pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
            {/* Compact Breadcrumbs */}
            <div className="hidden md:block">
                <Breadcrumb>
                    <BreadcrumbList className="bg-white/40 dark:bg-white/5 backdrop-blur-sm px-4 py-1 rounded-xl border border-slate-100 dark:border-white/5 w-fit shadow-2xs">
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/" className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                                    <Home className="w-3 h-3 mb-0.5" />
                                    Home
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="text-slate-300 dark:text-white/20" />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="text-[9.5px] font-black uppercase tracking-widest text-primary italic max-w-[200px] truncate">Citizens Charter</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Compact Hero & Search Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 dark:border-white/5 pb-3 sm:pb-4">
                <div className="flex items-center gap-3">
                    <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-md text-white shrink-0"
                        style={{ backgroundColor: 'var(--primary-theme)', boxShadow: '0 6px 16px -3px color-mix(in srgb, var(--primary-theme) 40%, transparent)' }}
                    >
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight leading-none">
                                Citizens Charter
                            </h1>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hidden sm:inline-block">
                                RA 11032
                            </span>
                        </div>
                        <p className="text-slate-400 dark:text-slate-400 font-medium text-[10.5px] sm:text-xs mt-1 line-clamp-1 italic">
                            Municipal service procedures, requirements, fees, and standard processing times.
                        </p>
                    </div>
                </div>

                {/* Compact Search Bar */}
                <div className="relative max-w-full md:max-w-[260px] w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input 
                        placeholder="Search office or unit..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-8 h-9 sm:h-10 border-slate-200 dark:border-white/10 rounded-xl dark:bg-[#0c101b] text-xs font-medium shadow-2xs"
                    />
                    {search && (
                        <button 
                            onClick={() => setSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white px-1"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Main Bookshelf Grid */}
            <div>
                <div className="flex items-center justify-between mb-3 sm:mb-5">
                    <h2 className="text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 italic">
                        Municipal Offices / Units & Sections
                    </h2>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        {filtered.length} {filtered.length === 1 ? 'Office' : 'Offices'}
                    </span>
                </div>

                {filtered.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {filtered.map((charter, idx) => {
                            const Icon = getOfficeIcon(charter.officeName);
                            return (
                                <motion.div
                                    key={charter.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.05, duration: 0.4 }}
                                >
                                    <StandingBookCard 
                                        title={charter.officeName} 
                                        logoUrl={logoUrl} 
                                        icon={Icon} 
                                        onClick={() => openBookViewer(charter.fileUrl, charter.officeName)}
                                    />
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem]">
                        <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
                        <h4 className="text-lg font-black text-slate-700 dark:text-slate-300 uppercase italic tracking-tight">No Charters Found</h4>
                        <p className="text-slate-400 text-sm font-medium italic mt-1 max-w-xs mx-auto">
                            {search.trim() ? "No departments match your search term. Try another query." : "We are currently compiling the documents. Please check back soon!"}
                        </p>
                    </div>
                )}
            </div>

            {/* Real Physical Page-Flip Book Viewer Modal */}
            {viewerUrl && (
                <BookViewerModal 
                    url={viewerUrl} 
                    title={viewerTitle} 
                    onClose={closeBookViewer} 
                />
            )}
        </div>
    );
}
