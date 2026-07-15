"use client";
 
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSystemSettingAction } from "@/app/admin/transactions/actions";
 
export default function NotFound() {
    const [themeColor, setThemeColor] = useState("#2563eb");
 
    useEffect(() => {
        getSystemSettingAction("theme_color").then((res) => {
            if (res.success && res.data) {
                setThemeColor(res.data);
            }
        });
    }, []);
 
    return (
        <div 
            className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans"
            style={{ "--primary": themeColor } as React.CSSProperties}
        >
            {/* Background decorative elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
 
            <div className="max-w-md w-full text-center space-y-8 relative z-10">
                <div className="space-y-4">
                    <h1 className="text-8xl font-black font-mono tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-rose-500 to-amber-500 animate-pulse">
                        404
                    </h1>
                    <h2 className="text-xl font-bold uppercase tracking-wider text-slate-200">
                        Page Not Available
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
                        This service page is temporarily offline or undergoing scheduled maintenance. Please check back later.
                    </p>
                </div>
 
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button 
                        asChild
                        variant="outline"
                        className="w-full sm:w-auto h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[9px] border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    >
                        <Link href="/user/services" className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Services
                        </Link>
                    </Button>
                    <Button 
                        asChild
                        className="w-full sm:w-auto h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[9px]"
                    >
                        <Link href="/">
                            Go to Homepage
                        </Link>
                    </Button>
                </div>
            </div>
 
            {/* Footer watermark */}
            <div className="absolute bottom-6 left-0 right-0 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                    EMapandan LGU Portal
                </p>
            </div>
        </div>
    );
}
