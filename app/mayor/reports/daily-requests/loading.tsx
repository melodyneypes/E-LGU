export default function MayorDailyRequestsLoading() {
    return (
        <div className="p-8 w-full space-y-8 animate-in fade-in duration-500 min-h-screen bg-slate-50 dark:bg-[#0c111d]">
            <div className="space-y-4 max-w-7xl mx-auto">
                <div className="h-4 w-36 bg-slate-200 dark:bg-[#1e2330] rounded animate-pulse" />
                <div className="space-y-2">
                    <div className="h-9 w-64 bg-slate-200 dark:bg-[#1e2330] rounded-xl animate-pulse" />
                    <div className="h-4 w-96 bg-slate-200 dark:bg-[#1e2330] rounded animate-pulse" />
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-24 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl animate-pulse" />
                    ))}
                </div>

                <div className="h-20 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl animate-pulse" />

                <div className="h-96 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl animate-pulse" />
            </div>
        </div>
    );
}
