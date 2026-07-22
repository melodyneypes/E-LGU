"use client";

import { HotlinesProvider, Hotline } from "./providers/HotlinesProvider";
import {
    HotlinesCards,
    HotlinesFilters,
    HotlinesTable,
    AddHotlineModal
} from "./components";
import { Phone } from "lucide-react";

interface HotlinesPageProps {
    initialData: Hotline[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    status?: string;
}

export function HotlinesPage({
    initialData,
    totalCount = 0,
    page = 1,
    pageSize = 10,
    search = "",
    category = "All",
    status = "All"
}: HotlinesPageProps) {
    return (
        <HotlinesProvider
            initialData={initialData}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            category={category}
            status={status}
        >
            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                            <Phone className="mr-3 w-10 h-10" style={{ color: 'var(--primary-theme)' }} />
                            Emergency & Hotlines
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage and organize important contact numbers for public service and emergencies.</p>
                    </div>
                </div>

                <HotlinesCards />

                <div 
                    style={{ boxShadow: '0 25px 50px -12px color-mix(in srgb, var(--primary-theme) 10%, transparent)' }}
                    className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden ring-1 ring-slate-200 dark:ring-white/5"
                >
                    <HotlinesFilters />
                    <HotlinesTable />
                </div>

                <AddHotlineModal />
            </div>
        </HotlinesProvider>
    );
}
