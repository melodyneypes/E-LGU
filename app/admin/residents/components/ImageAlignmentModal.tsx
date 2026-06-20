"use client";

import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import { Check, X, ZoomIn, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useResident } from "../providers";

interface ImageAlignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string | null;
    cropShape: "circle" | "rect";
    onSave: (croppedImageBase64: string) => void;
    title?: string;
}

export function ImageAlignmentModal({
    isOpen,
    onClose,
    imageSrc,
    cropShape,
    onSave,
    title = "Align & Crop Image"
}: ImageAlignmentModalProps) {
    const { themeColor } = useResident();
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Reset zoom and offset when a new image is loaded
    useEffect(() => {
        if (isOpen) {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
        }
    }, [isOpen, imageSrc]);

    const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    };

    const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        setOffset({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
        if (e.touches.length !== 1) return;
        setIsDragging(true);
        const touch = e.touches[0];
        dragStart.current = { x: touch.clientX - offset.x, y: touch.clientY - offset.y };
    };

    const handleTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
        if (!isDragging || e.touches.length !== 1) return;
        const touch = e.touches[0];
        setOffset({
            x: touch.clientX - dragStart.current.x,
            y: touch.clientY - dragStart.current.y
        });
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const nextZoom = zoom - e.deltaY * 0.001;
        setZoom(Math.min(Math.max(nextZoom, 1), 3));
    };

    const handleSave = () => {
        if (!imgRef.current || !containerRef.current) return;

        const img = imgRef.current;
        const container = containerRef.current;

        // Create canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set output dimensions based on shape
        const targetWidth = cropShape === "circle" ? 400 : 800;
        const targetHeight = cropShape === "circle" ? 400 : 450; // Aspect ratio ~16:9 for rect

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Get container dimensions
        const containerRect = container.getBoundingClientRect();
        const maskWidth = cropShape === "circle" ? 250 : containerRect.width - 40;
        const maskHeight = cropShape === "circle" ? 250 : (containerRect.width - 40) * (9 / 16);

        // Get display size of image
        const imgRect = img.getBoundingClientRect();

        // The center of the mask relative to the container
        const maskCenterX = containerRect.width / 2;
        const maskCenterY = containerRect.height / 2;

        // Center of the image relative to the container
        const imgCenterX = containerRect.width / 2 + offset.x;
        const imgCenterY = containerRect.height / 2 + offset.y;

        // Coordinates of the mask top-left relative to the image
        const cropX = (maskCenterX - maskWidth / 2 - (imgCenterX - imgRect.width / 2)) / zoom;
        const cropY = (maskCenterY - maskHeight / 2 - (imgCenterY - imgRect.height / 2)) / zoom;

        const cropW = maskWidth / zoom;
        const cropH = maskHeight / zoom;

        // Draw cropped area onto the canvas
        // Convert screen crop dimensions back to original image coordinates
        const scaleToOriginalWidth = img.naturalWidth / imgRect.width;
        const scaleToOriginalHeight = img.naturalHeight / imgRect.height;

        const sX = cropX * zoom * scaleToOriginalWidth;
        const sY = cropY * zoom * scaleToOriginalHeight;
        const sW = cropW * zoom * scaleToOriginalWidth;
        const sH = cropH * zoom * scaleToOriginalHeight;

        ctx.drawImage(
            img,
            sX,
            sY,
            sW,
            sH,
            0,
            0,
            targetWidth,
            targetHeight
        );

        const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
        onSave(croppedBase64);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-900 border-none rounded-3xl">
                <DialogHeader className="p-6 bg-slate-900 border-b border-slate-800 text-white">
                    <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center justify-between">
                        {title}
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-400 font-medium">
                        Drag the image to align, and use the slider to zoom.
                    </DialogDescription>
                </DialogHeader>

                <div 
                    ref={containerRef}
                    className="relative w-full aspect-square bg-[#0f172a] overflow-hidden flex items-center justify-center cursor-move select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleMouseUp}
                    onWheel={handleWheel}
                >
                    {imageSrc && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="To Align"
                            style={{
                                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                                transition: isDragging ? "none" : "transform 0.1s ease-out",
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain"
                            }}
                            draggable={false}
                        />
                    )}

                    {/* Mask Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {cropShape === "circle" ? (
                            <div className="w-[250px] h-[250px] rounded-full border-[4px] border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.75)]" />
                        ) : (
                            <div className="w-[85%] aspect-video border-[4px] border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.75)] rounded-2xl" />
                        )}
                    </div>

                    <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        <Move className="w-3.5 h-3.5" /> Drag to Position
                    </div>
                </div>

                <div className="p-6 bg-slate-950 text-white space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                            <span className="flex items-center gap-1.5"><ZoomIn className="w-4 h-4" /> Zoom Level</span>
                            <span>{Math.round(zoom * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.05"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <div className="flex gap-4">
                        <Button 
                            variant="ghost" 
                            onClick={onClose}
                            className="flex-1 h-12 rounded-2xl font-bold uppercase text-xs tracking-wider text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSave}
                            style={{ backgroundColor: themeColor }}
                            className="flex-1 h-12 rounded-2xl font-bold uppercase text-xs tracking-wider text-white hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" /> Apply Alignment
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
