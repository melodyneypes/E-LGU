"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    ArrowRight,
    Sparkles,
    Building2,
    Info,
    ShieldCheck,
    Coins,
    ChevronDown,
    FileText
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserBreadcrumb } from "@/components/shared/UserBreadcrumb";

interface TransactionType {
    id: string;
    code: string;
    name: string;
    description: string | null;
    category: string | null;
    level: number;
    baseFee: number;
    deliveryFee: number;
    requiredDocs: any;
}

interface ServicesClientProps {
    initialServices: TransactionType[];
    themeColor: string;
}

export default function ServicesClient({ initialServices, themeColor }: ServicesClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCode, setExpandedCode] = useState<string | null>("TREASURER");

    // 1. Group dynamically strictly based on the database 'category' field!
    const categoriesMap = new Map<string, TransactionType[]>();
    initialServices.forEach(s => {
        const cat = s.category ? s.category.toUpperCase() : "GENERAL";
        if (!categoriesMap.has(cat)) {
            categoriesMap.set(cat, []);
        }
        categoriesMap.get(cat)!.push(s);
    });

    // 2. Dynamic document checklist aggregation and deduplication helper
    const extractUnifiedChecklist = (types: TransactionType[]): string[] => {
        const uniqueDocs = new Set<string>();
        types.forEach(t => {
            let docs: string[] = [];
            if (Array.isArray(t.requiredDocs)) {
                docs = t.requiredDocs as string[];
            } else if (typeof t.requiredDocs === "string") {
                try {
                    docs = JSON.parse(t.requiredDocs);
                } catch {
                    docs = [];
                }
            } else if (t.requiredDocs && typeof t.requiredDocs === "object") {
                try {
                    docs = Object.values(t.requiredDocs) as string[];
                } catch {
                    docs = [];
                }
            }
            docs.forEach(d => {
                if (d && typeof d === "string") {
                    uniqueDocs.add(d.trim());
                }
            });
        });
        return Array.from(uniqueDocs);
    };

    // 3. Construct unified dynamic services list based on category groups
    const servicesData = [];

    const slugify = (text: string): string => {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
    };

    for (const [categoryName, items] of categoriesMap.entries()) {
        const categoryDocs = extractUnifiedChecklist(items);

        let title = "";
        let department = "";
        let description = "";
        let link = "";
        let icon = FileText;
        let accentBg = "bg-blue-500/10 dark:bg-blue-500/5";
        let borderColor = "border-blue-500/10 dark:border-blue-500/5";
        let buttonShadow = "shadow-blue-500/10";

        if (categoryName === "TREASURER" || categoryName === "CEDULA" || categoryName === "TREASURY") {
            title = "Community Tax Certificate Services";
            department = "Treasury Office";
            description = "Secure your official Community Tax Certificate (CTC) online for personal clearance or corporate registration with dynamic municipal rate assessment.";
            link = "/user/services/cedula-appointment";
            icon = Coins;
            accentBg = "bg-blue-500/10 dark:bg-blue-500/5";
            borderColor = "border-blue-500/10 dark:border-blue-500/5";
            buttonShadow = "shadow-blue-500/10";
        } else if (categoryName === "BPLO") {
            title = "BPLO SERVICES";
            department = "BPLO Office";
            description = "Apply for a new municipal business permit or renew your existing enterprise operation license online with digital checklist validation.";
            link = "/user/services/business-permit";
            icon = Building2;
            accentBg = "bg-emerald-500/10 dark:bg-emerald-500/5";
            borderColor = "border-emerald-500/10 dark:border-emerald-500/5";
            buttonShadow = "shadow-emerald-500/10";
        } else if (categoryName === "CIVIL REGISTRY" || categoryName === "CIVIL-REGISTRY") {
            title = "CIVIL REGISTRY SERVICES";
            department = "Registrar Office";
            description = "Apply for birth, marriage, and death registrations or certified true copies online with secure digital verification.";
            link = "/user/services/civil-registry";
            icon = FileText;
            accentBg = "bg-rose-500/10 dark:bg-rose-500/5";
            borderColor = "border-rose-500/10 dark:border-rose-500/5";
            buttonShadow = "shadow-rose-500/10";
        } else if (categoryName === "BUILDING" || categoryName === "BUILDING_PERMIT" || categoryName === "BUILDING-PERMIT") {
            title = "BUILDING PERMIT SERVICES";
            department = "Engineering Office";
            description = "Apply for building permits and standard structural clearance clearances online.";
            link = "/user/services/building-permit";
            icon = Building2;
            accentBg = "bg-amber-500/10 dark:bg-amber-500/5";
            borderColor = "border-amber-500/10 dark:border-amber-500/5";
            buttonShadow = "shadow-amber-500/10";
        } else {
            // General or other office categories dynamically added to the DB in the future
            title = `${categoryName} SERVICES`;
            department = `${categoryName} Office`;
            description = items[0]?.description || "Access official municipality gateways and submit your digital applications securely.";
            link = `/user/services/${slugify(categoryName)}`;
            icon = FileText;
        }

        servicesData.push({
            title: title,
            code: categoryName, // Bind toggle expansion state to Category Name
            alias: title,
            category: categoryName,
            department: department,
            description: description,
            link: link,
            servicesList: items, // Isolated list of services for this category
            requirements: categoryDocs.length > 0 ? categoryDocs : [
                "Valid Government ID",
                "Official Supporting Documents"
            ],
            icon: icon,
            accentBg: accentBg,
            borderColor: borderColor,
            buttonShadow: buttonShadow
        });
    }

    // Filter services based on search query
    const filteredServices = servicesData.filter(service => {
        return (
            service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.department.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const toggleAccordion = (code: string) => {
        setExpandedCode(expandedCode === code ? null : code);
    };

    // Reactively and smoothly scroll the expanded card to the center of the screen
    useEffect(() => {
        if (expandedCode) {
            const element = document.getElementById(`service-card-${expandedCode}`);
            if (element) {
                const timer = setTimeout(() => {
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }, 150); // 150ms delay perfectly aligns with Framer Motion's height expansion
                return () => clearTimeout(timer);
            }
        }
    }, [expandedCode]);

    return (
        <div className="space-y-8 md:space-y-10">
            {/* Elegant Floating Glass Breadcrumbs */}
            <div className="flex items-center justify-between">
                <UserBreadcrumb themeColor={themeColor} />
            </div>

            {/* Premium Header/Banner with Ambient Gradient Backdrop */}
            <div className="relative overflow-hidden bg-slate-900 dark:bg-[#0c1017] p-6 md:p-14 rounded-2xl md:rounded-[3rem] border border-slate-800 dark:border-white/5 text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div
                    className="absolute top-0 right-0 w-96 h-96 blur-[120px] rounded-full opacity-20 pointer-events-none -mr-40 -mt-40 transition-colors duration-700"
                    style={{ backgroundColor: themeColor }}
                />

                <div className="space-y-3 md:space-y-4 max-w-2xl relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70 italic">EMapandan Citizen Suite</span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
                        Municipal <span style={{ color: themeColor }}>Services</span>
                    </h1>

                    <p className="text-slate-300 font-medium text-xs md:text-sm leading-relaxed max-w-xl italic">
                        Access official municipality gateways. Expand service items below to view requirements and file your digital applications securely.
                    </p>
                </div>

                <div className="hidden lg:block relative z-10">
                    <div className="w-36 h-36 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform duration-500">
                        <div className="absolute inset-0 bg-gradient-to-tr opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundImage: `linear-gradient(to top right, ${themeColor}, transparent)` }} />
                        <ShieldCheck className="w-10 h-10 mb-2 opacity-80" style={{ color: themeColor }} />
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-tight">Secured Gateways</p>
                    </div>
                </div>
            </div>

            {/* Compact Search Bar Row */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between border-b border-slate-100 dark:border-white/5 pb-6">
                <div className="relative flex-1 max-w-md group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search service portals, requirements..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 h-11 bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-white/10 transition-all shadow-[0_10px_30px_-15px_rgba(0,0,0,0.03)]"
                    />
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">
                    {filteredServices.length} categories available
                </div>
            </div>

            {/* Accordion Container List */}
            <div className="space-y-4 max-w-4xl mx-auto">
                <AnimatePresence mode="popLayout">
                    {filteredServices.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-16 text-center bg-slate-50 dark:bg-white/[0.01] rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5"
                        >
                            <Info className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">No Matching Services</h3>
                            <p className="text-slate-500 font-medium text-xs mt-1 italic">Try adjusting your keywords or lookups.</p>
                        </motion.div>
                    ) : (
                        filteredServices.map((service, idx) => {
                            const Icon = service.icon;
                            const isExpanded = expandedCode === service.code;

                            return (
                                <motion.div
                                    key={service.code}
                                    id={`service-card-${service.code}`}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                                    className={`group bg-white dark:bg-[#0c1017] rounded-2xl md:rounded-3xl border ${isExpanded ? "border-slate-300 dark:border-white/10 shadow-[0_15px_45px_-15px_rgba(0,0,0,0.03)]" : "border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10"} transition-all duration-300 overflow-hidden`}
                                >
                                    {/* Accordion Header */}
                                    <button
                                        onClick={() => toggleAccordion(service.code)}
                                        className="w-full p-5 md:p-8 flex items-center justify-between text-left gap-4 md:gap-6 focus:outline-none"
                                    >
                                        <div className="flex items-center gap-3 md:gap-6">
                                            <div className={`w-10 h-10 md:w-11 md:h-11 ${service.accentBg} border ${service.borderColor} rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                                                <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: themeColor }} />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic block leading-none">{service.department}</span>
                                                <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-tight">
                                                    {service.title}
                                                </h3>
                                            </div>
                                        </div>

                                        <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </motion.div>
                                    </button>

                                    {/* Accordion Content Panel */}
                                    <AnimatePresence initial={false}>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.005]"
                                            >
                                                <div className="p-5 md:p-8 space-y-6 md:space-y-8">
                                                    {/* Description */}
                                                    <p className="text-xs font-semibold italic leading-relaxed text-slate-500 dark:text-slate-400">
                                                        {service.description}
                                                    </p>

                                                    {/* Services and specific requirements */}
                                                    <div className="space-y-4">
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 italic block leading-none">Available Services & Requirements</span>
                                                        <div className="space-y-3">
                                                            {service.servicesList.map((item: any) => {
                                                                let docs: string[] = [];
                                                                if (Array.isArray(item.requiredDocs)) {
                                                                    docs = item.requiredDocs as string[];
                                                                } else if (typeof item.requiredDocs === "string") {
                                                                    try {
                                                                        docs = JSON.parse(item.requiredDocs);
                                                                    } catch {
                                                                        docs = [];
                                                                    }
                                                                } else if (item.requiredDocs && typeof item.requiredDocs === "object") {
                                                                    try {
                                                                        docs = Object.values(item.requiredDocs) as string[];
                                                                    } catch {
                                                                        docs = [];
                                                                    }
                                                                }
                                                                const serviceDocs = docs.map(d => d.trim()).filter(Boolean);

                                                                return (
                                                                    <div key={item.id} className="p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-200/60 dark:border-white/5 rounded-xl space-y-2.5">
                                                                        <div className="flex items-center justify-between gap-4">
                                                                            <h4 className="text-xs md:text-sm font-black uppercase text-slate-800 dark:text-slate-200 tracking-tight italic">
                                                                                {item.name}
                                                                            </h4>
                                                                        </div>

                                                                        {serviceDocs.length > 0 ? (
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-1 pt-1 border-t border-slate-100 dark:border-white/5">
                                                                                {serviceDocs.map((doc, docIdx) => (
                                                                                    <div key={docIdx} className="flex items-center gap-2">
                                                                                        <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center shrink-0">
                                                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                                                                                        </div>
                                                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic truncate leading-snug">
                                                                                            {doc}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-[10px] font-bold italic text-slate-400/80 pl-1 pt-1 border-t border-slate-100 dark:border-white/5">No specific files required.</p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Footer button row */}
                                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">verified digital gateway</span>
                                                        </div>

                                                        <Button asChild className={`h-10 px-5 text-white rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all active:scale-95 shadow-md ${service.buttonShadow} gap-2`} style={{ backgroundColor: themeColor }}>
                                                            <Link href={service.link}>
                                                                Filing Portal
                                                                <ArrowRight className="w-3.5 h-3.5" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
