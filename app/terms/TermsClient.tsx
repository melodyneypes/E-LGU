"use client";

import React from "react";
import { motion } from "framer-motion";
import { Scale, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface TermsClientProps {
    themeColor: string;
}

export function TermsClient({ themeColor }: TermsClientProps) {
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut" as any,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <div className="max-w-4xl mx-auto relative">
            {/* Ambient Background Glows */}
            <div 
                className="absolute top-[-10%] left-1/4 w-[300px] h-[300px] blur-[120px] rounded-full opacity-[0.08] dark:opacity-[0.12] pointer-events-none"
                style={{ backgroundColor: themeColor }}
            />

            {/* Header section */}
            <div className="text-center mb-12 relative z-10">
                <motion.span 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 mb-4"
                >
                    <Scale className="w-3.5 h-3.5" style={{ color: themeColor }} />
                    LGU Terms & Agreement
                </motion.span>
                <motion.h1 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="text-4xl sm:text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white"
                >
                    Terms of <span style={{ color: themeColor }}>Service</span>
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium italic mt-3 max-w-xl mx-auto"
                >
                    Please read the following terms and guidelines regarding the legal responsibilities of using the municipal portal.
                </motion.p>
            </div>

            {/* Content card */}
            <div className="relative z-10">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-white/80 dark:bg-[#0c0f16]/80 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 sm:p-10 shadow-xl space-y-8"
                >
                    {/* Terms Pillar Cards */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2">Three-Strike Policy</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium italic">
                                To prevent fraudulent filings, accounts rejected 3 times for fake documents or falsified info in the same category face permanent digital portal ban.
                            </p>
                        </div>
                        <div className="p-5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3">
                                <Scale className="w-5 h-5 text-indigo-500" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2">Legal Accuracy Obligation</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium italic">
                                You assume complete legal responsibility for declared financial metrics, local business details, and scanned attachment integrity.
                            </p>
                        </div>
                    </motion.div>

                    {/* Detailed Sections */}
                    <motion.div variants={itemVariants} className="space-y-6">
                        <div className="space-y-3">
                            <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                                1. Accuracy and Verification of Filings
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic pl-3.5">
                                By using EMapandan digital portal, you state under pain of perjury that all uploaded files, ID scans, declarations of annual gross revenue, and household counts are legitimate and accurate. The LGU reserves the right to run spot verification audits and require physical document presentation at the Municipal Hall.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                                2. Permissible File Attachments
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic pl-3.5">
                                All uploaded requirements must be high-resolution, unedited digital copies or scans of the original physical documents. Any upload that appears tampered with, intentionally blurred, or containing spoofed headers will cause the transaction to be immediately declined.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-lg font-black uppercase tracking-wider text-red-500 dark:text-red-400 flex items-center gap-2">
                                <span className="w-1.5 h-6 rounded-full bg-red-500 dark:bg-red-400" />
                                3. Account Action and Suspension Policies
                            </h3>
                            <p className="text-sm text-red-500 dark:text-red-400 leading-relaxed font-bold italic pl-3.5">
                                We enforce a strict Three-Strike Rejection Policy. If your submitted requests in a service division are rejected 3 times due to fraudulent data, false declarations, or intentional documentation violations, your portal login privileges will be suspended permanently. You must resolve the suspension in person at Mapandan Municipal Hall.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                                4. Portal Availability and Maintenance Disclaimer
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic pl-3.5">
                                Although we target maximum portal uptime, EMapandan LGU is not liable for transaction processing delays resulting from network downtime, server updates, database sync lags, or system maintenance cycles. All payments and approvals must clear official verification queues.
                            </p>
                        </div>
                    </motion.div>

                    {/* Navigation Link to Privacy */}
                    <motion.div variants={itemVariants} className="pt-4 flex justify-between items-center gap-4">
                        <Link href="/privacy-policy" className="text-xs font-black uppercase tracking-widest italic hover:underline" style={{ color: themeColor }}>
                            ← View Privacy Policy
                        </Link>
                    </motion.div>

                    {/* Footer legal note */}
                    <motion.div 
                        variants={itemVariants}
                        className="pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 gap-4"
                    >
                        <span>Last Updated: June 2026</span>
                     
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
