"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";

interface EvidenceGalleryProps {
    images: string[];
    category: string;
}

export default function EvidenceGallery({ images, category }: EvidenceGalleryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const documents = images.map((img, idx) => ({
        url: img,
        label: `Evidence Photo ${idx + 1}`
    }));

    return (
        <>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                {images.map((img: string, i: number) => (
                    <div key={i} className="aspect-[4/3] md:aspect-video rounded-xl md:rounded-[1.5rem] overflow-hidden border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#0d0f14] group relative shadow-lg">
                        <Image 
                            src={img} 
                            alt="evidence" 
                            fill
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                        {/* Overlay with theme-colored view button */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                                onClick={() => {
                                    setActiveIndex(i);
                                    setIsOpen(true);
                                }}
                                className="px-3 py-1.5 bg-primary hover:opacity-90 text-white rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest italic flex items-center gap-1 shadow-lg active:scale-95 transition-all"
                            >
                                <Eye className="w-3 h-3" />
                                <span>View Photo</span>
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <DocumentViewerModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                file={null}
                fileUrl={images[activeIndex] || null}
                title={category}
                documents={documents}
                initialIndex={activeIndex}
            />
        </>
    );
}
