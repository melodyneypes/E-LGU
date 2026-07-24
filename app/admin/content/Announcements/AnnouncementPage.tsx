"use client";

import { AnnouncementProvider, Announcement } from "./providers/AnnouncementProvider";
import { AnnouncementCards } from "./components/AnnouncementCards";
import { AnnouncementFilters } from "./components/AnnouncementFilters";
import { AnnouncementTable } from "./components/AnnouncementTable";
import { AddAnnouncementModal } from "./components/AddAnnouncementModal";
import { Megaphone } from "lucide-react";

interface AnnouncementPageProps {
    initialData: Announcement[];
    totalCount: number;
    page: number;
    pageSize: number;
    search: string;
    category: string;
    priority: string;
    currentBarangay?: string;
    activeBarangays?: string[];
    hideCategory?: boolean;
}

export function AnnouncementPage({
    initialData,
    totalCount,
    page,
    pageSize,
    search,
    category,
    priority,
    currentBarangay,
    activeBarangays,
    hideCategory,
}: AnnouncementPageProps) {
    return (
        <AnnouncementProvider
            initialData={initialData}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            category={category}
            priority={priority}
            currentBarangay={currentBarangay}
            activeBarangays={activeBarangays}
            hideCategory={hideCategory}
        >
            <AnnouncementPageContent />
        </AnnouncementProvider>
    );
}

function AnnouncementPageContent() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <Megaphone className="mr-3 w-10 h-10 text-blue-600" />
                        Announcement Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        Broadcast major municipality updates, emergency alerts, and public advisories.
                    </p>
                </div>
            </div>

            <AnnouncementCards />

            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
                <AnnouncementFilters />
                <AnnouncementTable />
            </div>

            <AddAnnouncementModal />
        </div>
    );
}
