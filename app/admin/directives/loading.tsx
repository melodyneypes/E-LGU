export default function DirectivesLoading() {
    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto min-h-screen bg-slate-50 dark:bg-[#0c111d] animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2a3040] pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-[#1e2330]" />
                    <div className="space-y-2">
                        <div className="h-7 w-72 bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
                        <div className="h-4 w-96 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
                    </div>
                </div>
                <div className="h-12 w-52 bg-slate-200 dark:bg-[#1e2330] rounded-2xl" />
            </div>

            {/* Filter Bar Skeleton */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    <div className="h-10 flex-1 bg-slate-100 dark:bg-[#1e2330] rounded-2xl" />
                    <div className="flex gap-3">
                        <div className="h-10 w-36 bg-slate-100 dark:bg-[#1e2330] rounded-2xl" />
                        <div className="h-10 w-36 bg-slate-100 dark:bg-[#1e2330] rounded-2xl" />
                        <div className="h-10 w-36 bg-slate-100 dark:bg-[#1e2330] rounded-2xl" />
                    </div>
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-[#2a3040]">
                    <div className="h-5 w-48 bg-slate-200 dark:bg-[#1e2330] rounded" />
                </div>
                <div className="divide-y divide-slate-100 dark:divide-[#2a3040]">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-6 flex items-center justify-between gap-4">
                            <div className="space-y-2 flex-1">
                                <div className="h-5 w-3/4 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
                                <div className="h-3.5 w-1/3 bg-slate-200 dark:bg-[#1e2330] rounded" />
                            </div>
                            <div className="h-7 w-28 bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
                            <div className="h-7 w-32 bg-slate-200 dark:bg-[#1e2330] rounded-2xl" />
                            <div className="h-7 w-24 bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
                            <div className="h-9 w-20 bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
