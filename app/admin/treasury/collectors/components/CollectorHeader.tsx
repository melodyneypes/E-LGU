"use client";

import React from "react";
import { useCollectors } from "./CollectorProvider";
import { Plus, Search, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function CollectorHeader() {
    const {
        collectors,
        themeColor,
        search,
        setSearch,
        rfidFilter,
        setRfidFilter,
        setIsAddOpen,
    } = useCollectors();

    const totalCount = collectors.length;
    const rfidCount = collectors.filter((c) => Boolean(c.rfid)).length;
    const noRfidCount = totalCount - rfidCount;

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-6 lg:p-8 rounded-[2.5rem] shadow-xl">
                <div className="flex items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                        style={{ backgroundColor: themeColor }}
                    >
                        <Ticket className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                            Field Collector <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold not-italic">Treasury Registry</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-0.5">
                            {totalCount} total ticket collectors · {rfidCount} RFID badges active · {noRfidCount} pending RFID card
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => setIsAddOpen(true)}
                    className="h-12 px-6 rounded-2xl text-xs font-black uppercase italic tracking-wider shadow-lg flex items-center gap-2 text-white transition-all active:scale-95 cursor-pointer shrink-0"
                    style={{ backgroundColor: themeColor }}
                >
                    <Plus className="w-4 h-4" />
                    <span>Register New Collector</span>
                </Button>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-4 rounded-2xl shadow-md">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search collector name or email..."
                            className="pl-10 h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-medium"
                        />
                    </div>

                    <Select value={rfidFilter} onValueChange={(val: any) => setRfidFilter(val)}>
                        <SelectTrigger className="h-10 w-full sm:w-44 text-xs bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold">
                            <SelectValue placeholder="RFID Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl">
                            <SelectItem value="ALL">All Collectors</SelectItem>
                            <SelectItem value="WITH_RFID">With Active RFID</SelectItem>
                            <SelectItem value="WITHOUT_RFID">No RFID Badge</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
