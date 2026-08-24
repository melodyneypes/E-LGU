export default function CaptainDirectiveSingleLoading() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500 min-h-screen bg-slate-50 dark:bg-[#0c111d]">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="h-10 w-48 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-2xl animate-pulse" />

                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-8 space-y-6 animate-pulse">
                    <div className="flex gap-2">
                        <div className="h-6 w-24 bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
                        <div className="h-6 w-24 bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
                    </div>
                    <div className="h-8 w-3/4 bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
                    <div className="h-20 bg-slate-100 dark:bg-[#121622] rounded-2xl" />
                    <div className="h-48 bg-slate-100 dark:bg-[#121622] rounded-2xl" />
                    <div className="h-96 bg-slate-200 dark:bg-[#1e2330] rounded-2xl" />
                </div>
            </div>
        </div>
    );
}
