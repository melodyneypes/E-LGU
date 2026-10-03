"use client";

import { useSession } from "next-auth/react";
import { useHousehold } from "../providers/HouseholdProvider";
import { Input } from "@/components/ui/input";
import { Search, Map, List } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function HouseholdFilters() {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;

    const {
        searchQuery,
        setSearchQuery,
        selectedBarangay,
        setSelectedBarangay,
        selectedRiskLevel,
        setSelectedRiskLevel,
        households,
        viewMode,
        setViewMode
    } = useHousehold();

    // Extract unique barangays
    const barangays = Array.from(new Set(households.map(h => h.barangay))).sort();

    // Default standard barangays if DB is empty
    const defaultBarangays = ["{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}"];
    const displayBarangays = barangays.length > 0 ? barangays : defaultBarangays;

    const riskLevels = ["Safe", "Low Risk", "Moderate Risk", "High Risk", "Flood Prone", "Landslide Prone"];

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative max-w-md w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Search by Head of Family..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-sm rounded-xl focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>

                {/* Barangay Filter (only for Main Admin) */}
                {role !== "BARANGAY_ADMIN" && (
                    <Select value={selectedBarangay} onValueChange={setSelectedBarangay}>
                        <SelectTrigger className="w-full sm:w-[200px] h-12 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-sm rounded-xl">
                            <SelectValue placeholder="All Barangays" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectItem value="All">All Barangays</SelectItem>
                            {displayBarangays.map((barangay) => (
                                <SelectItem key={barangay} value={barangay}>{barangay}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Risk Level Filter */}
                <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
                    <SelectTrigger className="w-full sm:w-[200px] h-12 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-sm rounded-xl">
                        <SelectValue placeholder="All Risk Levels" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                        <SelectItem value="All">All Risk Levels</SelectItem>
                        {riskLevels.map((risk) => (
                            <SelectItem key={risk} value={risk}>{risk}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* View Toggle */}
            <div className="flex bg-slate-100 dark:bg-[#151b2b] p-1 rounded-xl shadow-inner shrink-0 self-start md:self-auto">
                <Button
                    variant="ghost"
                    onClick={() => setViewMode("map")}
                    className={`px-4 h-10 rounded-lg font-bold flex items-center transition-all ${viewMode === "map"
                            ? "bg-white dark:bg-blue-600 hover:bg-white hover:text-slate-900 text-blue-600 dark:text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-[#2a3040]/50"
                        }`}
                >
                    <Map className="w-4 h-4 mr-2" /> Map View
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setViewMode("list")}
                    className={`px-4 h-10 rounded-lg font-bold flex items-center transition-all ${viewMode === "list"
                            ? "bg-white dark:bg-blue-600 hover:bg-white hover:text-slate-900 text-blue-600 dark:text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-[#2a3040]/50"
                        }`}
                >
                    <List className="w-4 h-4 mr-2" /> List View
                </Button>
            </div>
        </div>
    );
}
