"use client";

import { EventsProvider, Event, useEvents } from "./providers/EventsProvider";
import {
    EventsCards,
    EventsFilters,
    EventsTable,
    AddEventModal
} from "./components";
import { Calendar } from "lucide-react";
import type { CSSProperties } from "react";

interface EventsPageProps {
    initialData: Event[];
    totalCount: number;
    page: number;
    pageSize: number;
    search: string;
    category: string;
    currentBarangay?: string;
    activeBarangays?: string[];
}

export function EventsPage({
    initialData,
    totalCount,
    page,
    pageSize,
    search,
    category,
    currentBarangay,
    activeBarangays,
}: EventsPageProps) {
    return (
        <EventsProvider
            initialData={initialData}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            category={category}
            currentBarangay={currentBarangay}
            activeBarangays={activeBarangays}
        >
            <EventsPageContent />
        </EventsProvider>
    );
}

function EventsPageContent() {
    const { themeColor } = useEvents();

    return (
        <div
            className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ "--primary-theme": themeColor } as CSSProperties}
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <Calendar className="mr-3 w-10 h-10 text-blue-600" />
                        Events Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        Coordinate and showcase local festivals, community gatherings, and municipal activities.
                    </p>
                </div>
            </div>

            <EventsCards />

            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
                <EventsFilters />
                <EventsTable />
            </div>

            <AddEventModal />
        </div>
    );
}
