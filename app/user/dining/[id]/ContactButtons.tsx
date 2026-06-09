"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Phone, Facebook, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";

interface ContactButtonsProps {
    contactNumber?: string | null;
    facebookUrl?: string | null;
    isMobile?: boolean;
}

export function ContactButtons({ contactNumber, facebookUrl, isMobile }: ContactButtonsProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!contactNumber) return;
        
        try {
            // Primary method: Navigator Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(contactNumber);
            } else {
                // Fallback method: execCommand('copy') for non-secure contexts
                const textArea = document.createElement("textarea");
                textArea.value = contactNumber;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            setCopied(true);
            toast.success("Contact number copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Copy failed. Please try again.");
        }
    };

    if (isMobile) {
        return (
            <div className="lg:hidden flex flex-wrap gap-2 pt-2 w-full">
                {contactNumber && (
                    <Button 
                        onClick={handleCopy}
                        variant="outline" 
                        className="flex-1 h-11 rounded-xl border-slate-200 dark:border-white/10 font-black uppercase tracking-widest text-[8px] flex items-center gap-2 shadow-sm bg-white dark:bg-white/5 active:scale-95 transition-all"
                    >
                        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Phone className="w-3 h-3 text-primary" />}
                        {copied ? "Copied!" : "Copy Number"}
                    </Button>
                )}
                {facebookUrl && (
                    <Link href={facebookUrl || null as any} target="_blank" className="flex-1">
                        <Button variant="outline" className="w-full h-11 rounded-xl border-slate-200 dark:border-white/10 font-black uppercase tracking-widest text-[8px] flex items-center gap-2 shadow-sm bg-white dark:bg-white/5">
                            <Facebook className="w-3 h-3 text-primary" />
                            Facebook
                        </Button>
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="hidden lg:flex items-center gap-4">
            {contactNumber && (
                <Button 
                    onClick={handleCopy}
                    className="h-14 px-10 bg-primary text-white rounded-3xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
                >
                    {copied ? <Check className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    {copied ? "Copied to Clipboard!" : `Copy ${contactNumber}`}
                </Button>
            )}
            {facebookUrl && (
                <Link href={facebookUrl || null as any} target="_blank">
                    <Button variant="outline" className="h-14 px-10 rounded-3xl border-slate-200 dark:border-white/10 font-black uppercase tracking-widest text-[10px] flex items-center gap-3 bg-white dark:bg-white/5 hover:border-primary/50 transition-all">
                        <Facebook className="w-4 h-4 text-primary" />
                        Official Page
                    </Button>
                </Link>
            )}
        </div>
    );
}
