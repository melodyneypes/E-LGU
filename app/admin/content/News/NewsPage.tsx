"use client";

import type { CSSProperties } from "react";
import { NewsProvider, News, useNews } from "./providers/NewsProvider";
import {
    NewsCards,
    NewsFilters,
    NewsTable,
    AddNewsModal
} from "./components";
import { Newspaper } from "lucide-react";

interface NewsPageProps {
    initialData: News[];
    totalCount: number;
    page: number;
    pageSize: number;
    search: string;
    category: string;
    currentBarangay?: string;
    activeBarangays?: string[];
}

export function NewsPage({
    initialData,
    totalCount,
    page,
    pageSize,
    search,
    category,
    currentBarangay,
    activeBarangays,
}: NewsPageProps) {
    return (
        <NewsProvider
            initialData={initialData}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            category={category}
            currentBarangay={currentBarangay}
            activeBarangays={activeBarangays}
        >
            <NewsPageContent />
        </NewsProvider>
    );
}

function NewsPageContent() {
    const { themeColor } = useNews();

    return (
        <div
            className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ "--primary-theme": themeColor } as CSSProperties}
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <Newspaper className="mr-3 w-10 h-10 text-blue-600" />
                        News Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        Publish transparent municipal updates, advisories, and public interest stories.
                    </p>
                </div>
            </div>

            <NewsCards />

            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
                <NewsFilters />
                <NewsTable />
            </div>

            <AddNewsModal />
        </div>
    );
}
