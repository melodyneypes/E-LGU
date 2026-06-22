"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface PrivacyPolicyClientProps {
    themeColor: string;
}

export function PrivacyPolicyClient({ themeColor }: PrivacyPolicyClientProps) {
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
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: themeColor }} />
                    LGU Privacy Compliance
                </motion.span>
                <motion.h1 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="text-4xl sm:text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white"
                >
                    Privacy <span style={{ color: themeColor }}>Policy</span>
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium italic mt-3 max-w-xl mx-auto"
                >
                    Please review our data protection policies detailing your rights under Philippine laws and how we process and secure your municipal portal data.
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
                    {/* Privacy Pillar Cards */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                                <ShieldCheck className="w-5 h-5 text-blue-500" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2">R.A. 10173 Compliance</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium italic">
                                Strict alignment with the Data Privacy Act of 2012 ensures your information is protected with maximum security safeguards.
                            </p>
                        </div>
                        <div className="p-5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2">Data Processing Integrity</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium italic">
                                Information collected is only used for municipal taxes, permit verification, and transaction requests. We never sell your data.
                            </p>
                        </div>
                    </motion.div>

                    {/* Detailed Sections */}
                    <motion.div variants={itemVariants} className="space-y-6">
                        <div className="space-y-3">
                            <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                                1. Scope of Personal Data Collected
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic pl-3.5">
                                The Municipal Government of Mapandan collects personal and corporate data required for online community tax certificates (Cedula), civil registry filings, and business permits. This includes full name, birth date, contact number, complete address, occupation, tax details, corporate registration copies, government IDs, and declared annual income or gross capitalization.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                                2. Purpose of Collection and Processing
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic pl-3.5">
                                All personal and business data gathered is strictly utilized to authenticate user identities, calculate precise taxation parameters, verify municipal licensing requisites, maintain transparent public records, and approve or deny requests filed through this digital system.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                                3. Safety Safeguards and Retention Policies
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic pl-3.5">
                                We employ modern encryption protocols, access permissions, and periodic logs to protect your files from unauthorized breaches. Database records are securely archived inside Mapandan LGU servers in accordance with national archival laws for local audit and validation cycles.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                                4. Your Rights under Philippine Privacy Law
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic pl-3.5">
                                You are entitled to inquire about your personal data records, request correction of erroneous values, object to certain processing types, or file disputes if you suspect data mishandling, directly contacting the LGU Data Protection Officer (DPO).
                            </p>
                        </div>
                    </motion.div>

                    {/* Navigation Link to Terms */}
                    <motion.div variants={itemVariants} className="pt-4 flex justify-between items-center gap-4">
                        <Link href="/terms" className="text-xs font-black uppercase tracking-widest italic hover:underline" style={{ color: themeColor }}>
                            View Terms of Service →
                        </Link>
                    </motion.div>

                    {/* Footer legal note */}
                    <motion.div 
                        variants={itemVariants}
                        className="pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 gap-4"
                    >
                        
                       
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
