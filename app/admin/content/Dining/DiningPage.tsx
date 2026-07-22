"use client";

import { motion } from "framer-motion";
import { DiningProvider, Dining } from "./providers/DiningProvider";
import { DiningCards } from "./components/cards";
import { DiningFilters } from "./components/filters";
import { DiningTable } from "./components/table";
import { AddDiningModal } from "./components/AddDiningModal";

interface DiningPageProps {
    diningData: Dining[];
    totalCount: number;
    page: number;
    pageSize: number;
    search: string;
    cuisine: string;
    status: string;
    currentBarangay?: string;
    activeBarangays?: string[];
}

function DiningDashboard() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Dining Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage all local restaurants and eateries in Mapandan.</p>
                    </motion.div>
                </div>
            </div>

            <DiningCards />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden"
            >
                <DiningFilters />
                <DiningTable />
            </motion.div>

            <AddDiningModal />
        </div>
    );
}

export default function DiningPage({
    diningData,
    totalCount,
    page,
    pageSize,
    search,
    cuisine,
    status,
    currentBarangay,
    activeBarangays = [],
}: DiningPageProps) {
    return (
        <DiningProvider
            initialData={diningData}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            cuisine={cuisine}
            status={status}
            currentBarangay={currentBarangay}
            activeBarangays={activeBarangays}
        >
            <DiningDashboard />
        </DiningProvider>
    );
}
