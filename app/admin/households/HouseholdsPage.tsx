"use client";

import { useHousehold } from "./providers";
import {
    HouseholdCards,
    HouseholdFilters,
    HouseholdTable,
    AddHouseholdModal,
    HouseholdMapView
} from "./components";
import { Button } from "@/components/ui/button";
import { Plus, Map } from "lucide-react";

export function HouseholdsPage() {
    const { setIsAddModalOpen, viewMode } = useHousehold();

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <Map className="mr-3 w-10 h-10" style={{ color: 'var(--primary-theme)' }} />
                        Household Map
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
                        Manage and visualize every household in the municipality for resource distribution, risk assessment, and census tracking.
                    </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-6 rounded-xl font-bold transition-all hover:scale-[1.02]"
                    >
                        <Plus className="w-5 h-5 mr-2" /> Add Household
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
                <HouseholdCards />

                <div 
                    style={{ boxShadow: '0 25px 50px -12px color-mix(in srgb, var(--primary-theme) 10%, transparent)' }}
                    className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden ring-1 ring-slate-200 dark:ring-white/5"
                >
                    <HouseholdFilters />


                    {viewMode === "map" ? (
                        <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
                            <HouseholdMapView />
                        </div>
                    ) : (
                        <div className="mt-6 animate-in fade-in duration-500">
                            <HouseholdTable />
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <AddHouseholdModal />
        </div>
    );
}
