"use client";

import { AnnouncementProvider, Announcement, CurrentUserSession } from "@/app/admin/content/Announcements/providers/AnnouncementProvider";
import { AnnouncementCards } from "@/app/admin/content/Announcements/components/AnnouncementCards";
import { AnnouncementFilters } from "@/app/admin/content/Announcements/components/AnnouncementFilters";
import { AnnouncementTable } from "@/app/admin/content/Announcements/components/AnnouncementTable";
import { RHUAddAnnouncementModal } from "./RHUAddAnnouncementModal";
import { Activity } from "lucide-react";

interface RHUAnnouncementPageProps {
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
    currentUser?: CurrentUserSession;
}

export function RHUAnnouncementPage({
    initialData,
    totalCount,
    page,
    pageSize,
    search,
    category,
    priority,
    currentBarangay,
    activeBarangays,
    hideCategory = true,
    currentUser,
}: RHUAnnouncementPageProps) {
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
            currentUser={currentUser}
        >
            <RHUAnnouncementPageContent />
        </AnnouncementProvider>
    );
}

function RHUAnnouncementPageContent() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <Activity className="mr-3 w-10 h-10 text-emerald-500" />
                        RHU Health Advisories
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        Manage Rural Health Unit advisories, immunization drives, and public medical announcements.
                    </p>
                </div>
            </div>

            <AnnouncementCards />

            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
                <AnnouncementFilters />
                <AnnouncementTable />
            </div>

            <RHUAddAnnouncementModal />
        </div>
    );
}
