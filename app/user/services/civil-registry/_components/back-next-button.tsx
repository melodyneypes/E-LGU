import React from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackNextButtonProps {
    onBack: () => void;
    onNext: () => void | Promise<void>;
    backLabel?: string;
    nextLabel?: string;
    isSubmitting?: boolean;
    nextDisabled?: boolean;
    backDisabled?: boolean;
    themeColor?: string;
    nextClassName?: string;
    backClassName?: string;
    className?: string;
}

export function BackNextButton({
    onBack,
    onNext,
    backLabel = "BACK",
    nextLabel = "NEXT",
    isSubmitting = false,
    nextDisabled = false,
    backDisabled = false,
    themeColor,
    nextClassName,
    backClassName,
    className
}: BackNextButtonProps) {
    const isThemeHex = themeColor?.startsWith("#") || themeColor?.startsWith("rgb") || themeColor?.startsWith("hsl") || themeColor?.startsWith("var");
    
    // Create soft shadow/glow for the next button based on the theme color
    const nextStyle: React.CSSProperties = {};
    if (isThemeHex && themeColor) {
        nextStyle.backgroundColor = themeColor;
        if (themeColor.startsWith("var")) {
            nextStyle.boxShadow = `0 0 20px color-mix(in srgb, ${themeColor} 30%, transparent)`;
        } else {
            nextStyle.boxShadow = `0 0 20px ${themeColor}4d`; // 4d is 30% opacity
        }
    }

    return (
        <div className={cn("flex justify-end items-center gap-6 pt-6 select-none", className)}>
            <button
                type="button"
                onClick={onBack}
                disabled={backDisabled || isSubmitting}
                className={cn(
                    "flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors duration-200 uppercase font-black tracking-widest italic text-[11px] disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-0 outline-none cursor-pointer group",
                    backClassName
                )}
            >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                {backLabel}
            </button>

            <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled || isSubmitting}
                style={nextStyle}
                className={cn(
                    "rounded-full px-6 py-3 font-black uppercase tracking-widest italic text-[11px] flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-[#e11d48] text-white hover:brightness-110 shadow-[0_0_20px_rgba(225,29,72,0.3)] group",
                    nextClassName
                )}
            >
                {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <>
                        {nextLabel}
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </>
                )}
            </button>
        </div>
    );
}
