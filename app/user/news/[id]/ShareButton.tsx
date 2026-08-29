"use client";

import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ShareButton() {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const url = window.location.href;
        const title = document.title;

        // Default native share dialog (supported on mobile / HTTPS secure contexts)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    url: url
                });
                return;
            } catch (err) {
                // If user aborted, do nothing
                if ((err as Error).name === 'AbortError') return;
            }
        }

        // Fallback for non-HTTPS / Local IPs (Copy link to clipboard)
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textArea = document.createElement("textarea");
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                toast.success("Link copied to clipboard!");
                setTimeout(() => setCopied(false), 2000);
            } catch {
                toast.error("Failed to copy link.");
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-primary/20 group cursor-pointer"
        >
            {copied ? (
                <Check className="w-4 h-4 text-green-500 group-hover:text-white" />
            ) : (
                <Share2 className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Share Article"}
        </button>
    );
}
