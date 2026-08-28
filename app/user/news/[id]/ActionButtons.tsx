"use client";

import { Printer } from "lucide-react";
import ShareButton from "./ShareButton";

export default function ActionButtons() {
    const handlePrint = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    return (
        <div className="flex items-center gap-4">
            <button
                onClick={handlePrint}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                title="Print Article"
            >
                <Printer className="w-4 h-4" />
            </button>
            <ShareButton />
        </div>
    );
}
