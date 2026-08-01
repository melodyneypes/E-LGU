export default function Loading() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-blue-600/30 border-t-blue-600 animate-spin" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 italic">
                    Loading News...
                </p>
            </div>
        </div>
    );
}
