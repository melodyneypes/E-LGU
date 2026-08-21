export default function CaptainHotlinesLoading() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] text-slate-900 dark:text-white transition-colors duration-300">
            {/* Header Skeleton */}
            <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#151b2b]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#2a3040] px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-[#1e2330] animate-pulse" />
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-[#1e2330] animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-4 w-48 rounded-lg bg-slate-200 dark:bg-[#1e2330] animate-pulse" />
                                <div className="h-2.5 w-72 rounded-lg bg-slate-100 dark:bg-[#1a202c] animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-9 w-36 rounded-2xl bg-slate-200 dark:bg-[#1e2330] animate-pulse" />
                        <div className="h-9 w-40 rounded-2xl bg-slate-200 dark:bg-[#1e2330] animate-pulse" />
                    </div>
                </div>
            </header>

            {/* Content Skeleton */}
            <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
                {/* Filter Bar Skeleton */}
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-5 flex items-center justify-between gap-4">
                    <div className="h-10 w-full max-w-md rounded-2xl bg-slate-100 dark:bg-[#1a202c] animate-pulse" />
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-28 rounded-xl bg-slate-100 dark:bg-[#1a202c] animate-pulse" />
                        <div className="h-4 w-32 rounded-lg bg-slate-100 dark:bg-[#1a202c] animate-pulse" />
                    </div>
                </div>

                {/* Table Skeleton */}
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl overflow-hidden shadow-sm">
                    {/* Table Header */}
                    <div className="border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#121622]/70 px-6 py-4 flex items-center gap-6">
                        <div className="h-3 w-28 rounded bg-slate-200 dark:bg-[#2a3040] animate-pulse" />
                        <div className="h-3 w-24 rounded bg-slate-200 dark:bg-[#2a3040] animate-pulse" />
                        <div className="h-3 w-32 rounded bg-slate-200 dark:bg-[#2a3040] animate-pulse" />
                        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-[#2a3040] animate-pulse" />
                        <div className="h-3 w-28 rounded bg-slate-200 dark:bg-[#2a3040] animate-pulse" />
                    </div>

                    {/* Table Rows */}
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div
                            key={i}
                            className="px-6 py-4 flex items-center gap-6 border-b border-slate-100 dark:border-[#2a3040] last:border-0"
                        >
                            <div className="flex items-center gap-3.5 flex-1">
                                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#1e2330] animate-pulse shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3.5 w-40 rounded-lg bg-slate-200 dark:bg-[#1e2330] animate-pulse" />
                                    <div className="h-2.5 w-56 rounded-lg bg-slate-100 dark:bg-[#1a202c] animate-pulse" />
                                </div>
                            </div>
                            <div className="h-6 w-24 rounded-xl bg-slate-100 dark:bg-[#1a202c] animate-pulse" />
                            <div className="h-3 w-20 rounded bg-slate-100 dark:bg-[#1a202c] animate-pulse" />
                            <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-[#1a202c] animate-pulse" />
                            <div className="h-8 w-24 rounded-xl bg-slate-100 dark:bg-[#1a202c] animate-pulse" />
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
