"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Official {
    id: string;
    name: string;
    position: string;
    imageUrl: string | null;
    category: string;
    barangay?: string | null;
}

export function Government({ officials = [], barangay = "All" }: { officials?: Official[], barangay?: string }) {
    const [activeTab, setActiveTab] = React.useState<"Barangay" | "SK">("Barangay");
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);


    const isFiltered = barangay !== "All";

    // Filtering logic
    const lguOfficials = officials.filter(o => o.category === "LGU" || !o.barangay);
    const barangayOfficials = officials.filter(o => o.category === "Barangay Council" || o.category === "Barangay");
    const skOfficials = officials.filter(o => o.category === "SK Council" || o.category === "SK");

    // Display logic
    const currentList = isFiltered 
        ? (activeTab === "Barangay" ? barangayOfficials : skOfficials)
        : lguOfficials;

    const leader = currentList[0];
    const members = currentList.slice(1);

    const memberRows = React.useMemo(() => {
        const rowSizes = [5, 4, 3, 2, 1];
        const rows: Official[][] = [];
        let currentIndex = 0;
        
        for (const size of rowSizes) {
            if (currentIndex >= members.length) break;
            const row = members.slice(currentIndex, currentIndex + size);
            rows.push(row);
            currentIndex += size;
        }
        
        if (currentIndex < members.length) {
            rows.push(members.slice(currentIndex));
        }
        
        return rows;
    }, [members]);

    if (!officials || officials.length === 0) return null;
    if (currentList.length === 0) return null;
    if (!leader) return null;

    return (
        <section id="leadership" className="pt-8 md:pt-24 pb-12 md:pb-8 px-6 max-w-7xl mx-auto">
            <div className="text-center space-y-4 md:space-y-6 sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-10 md:mb-20">
                <div className="flex items-center justify-center gap-4">
                    <div className="h-px w-8 md:w-12 bg-primary/20" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">The Leadership</span>
                    <div className="h-px w-8 md:w-12 bg-primary/20" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                    {isFiltered ? `${barangay} Officials` : "Municipal Government"}
                </h2>

                {isFiltered && (
                    <div className="flex justify-center p-1.5 bg-slate-100 dark:bg-white/5 rounded-3xl max-w-sm mx-auto mt-10">
                        <button 
                            onClick={() => setActiveTab("Barangay")}
                            className={cn(
                                "flex-1 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === "Barangay" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                        >
                            Barangay Council
                        </button>
                        <button 
                            onClick={() => setActiveTab("SK")}
                            className={cn(
                                "flex-1 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === "SK" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                        >
                            SK Council
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center space-y-6 md:space-y-10">
                {/* Leader Card */}
                <LeaderCard leader={leader} isMobile={isMobile} activeTab={activeTab} />

                {/* Council Members */}
                {isMobile ? (
                    <div className="flex flex-wrap justify-center gap-x-6 md:gap-x-10 gap-y-10 md:gap-y-12 w-full pt-4 md:pt-6">
                        {members.map((member) => (
                            <MemberCard key={member.id} member={member} />
                        ))}
                    </div>
                ) : (
                    <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "100px" }}
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                        }}
                        className="flex flex-col gap-y-10 md:gap-y-12 items-center w-full pt-4 md:pt-6"
                    >
                        {memberRows.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex flex-wrap justify-center gap-x-6 md:gap-x-10 w-full">
                                {row.map((member) => (
                                    <MemberCard key={member.id} member={member} />
                                ))}
                            </div>
                        ))}
                    </motion.div>
                )}

                <div className="pt-12 text-center w-full flex justify-center">
                    <Link
                        href="/user/officials"
                        className="inline-flex items-center justify-center h-12 px-8 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 rounded-full transition-all hover:scale-105"
                    >
                        View Council Directory
                    </Link>
                </div>
            </div>
        </section>
    );
}

function LeaderCard({ leader, isMobile, activeTab }: { leader: Official, isMobile: boolean, activeTab: string }) {
    const [isImageLoading, setIsImageLoading] = React.useState(true);

    const content = (
        <div className="group flex flex-col items-center space-y-6 text-center hover:-translate-y-1 transition-transform">
            <div className="relative">
                <div className="absolute inset-0 bg-primary rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full border-4 border-white dark:border-slate-800 shadow-md md:shadow-2xl overflow-hidden ring-2 md:ring-4 ring-primary/20 bg-slate-100 dark:bg-slate-800">
                    {leader.imageUrl ? (
                        <>
                            <div className={`absolute inset-0 z-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-opacity duration-700 ${isImageLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                            </div>
                            <Image
                                src={leader.imageUrl}
                                alt={leader.name}
                                fill
                                onLoad={() => setIsImageLoading(false)}
                                className={cn(
                                    "object-cover transition-all duration-700",
                                    isImageLoading ? 'opacity-0 blur-sm scale-110' : 'opacity-100 blur-0 scale-100',
                                    "group-hover:scale-110"
                                )}
                            />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-white/5">
                            <User className="w-16 h-16 text-slate-200 dark:text-slate-800" />
                        </div>
                    )}
                </div>
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight group-hover:text-primary transition-colors">{leader.name}</h3>
                <p className="text-primary font-black uppercase tracking-[0.2em] text-xs underline underline-offset-8 decoration-2">{leader.position}</p>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Link href={`/user/leadership/${leader.id}`} className="block">
                {content}
            </Link>
        );
    }

    return (
        <Link href={`/user/leadership/${leader.id}`} className="block">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                key={`${activeTab}-leader`}
            >
                {content}
            </motion.div>
        </Link>
    );
}

function MemberCard({ member }: { member: Official }) {
    const [isImageLoading, setIsImageLoading] = React.useState(true);

    return (
        <Link href={`/user/leadership/${member.id}`} className="block">
            <div className="group flex flex-col items-center space-y-4 text-center w-[140px] sm:w-[160px] md:w-[180px] hover:-translate-y-1 transition-transform">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full border-2 border-white dark:border-slate-800 shadow-sm md:shadow-xl overflow-hidden ring-1 md:ring-2 ring-slate-100 dark:ring-white/5 bg-slate-100 dark:bg-slate-800 transition-all duration-300">
                {member.imageUrl ? (
                    <>
                        <div className={`absolute inset-0 z-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-opacity duration-700 ${isImageLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                        </div>
                        <Image
                            src={member.imageUrl}
                            alt={member.name}
                            fill
                            sizes="(max-width: 768px) 100px, 150px"
                            loading="lazy"
                            onLoad={() => setIsImageLoading(false)}
                            className={cn(
                                "object-cover transition-all duration-700",
                                isImageLoading ? 'opacity-0 blur-sm scale-110' : 'opacity-100 blur-0 scale-100',
                                "group-hover:scale-110"
                            )}
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-white/5">
                        <User className="w-10 h-10 text-slate-200 dark:text-slate-800" />
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <h4 className="text-[11px] sm:text-xs md:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight group-hover:text-primary transition-colors">{member.name.replace('Hon. ', '')}</h4>
                <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{member.position}</p>
            </div>
            </div>
        </Link>
    );
}
