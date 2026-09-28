"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
    FileWarning, 
    ArrowLeft, 
    Printer, 
    Download, 
    Search, 
    Filter, 
    Clock, 
    Layers, 
    ShieldAlert,
    ExternalLink,
    RefreshCw,
    CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAccountableFormIncidentsAction } from "@/app/admin/transactions/treasury-incident-actions";

interface IncidentItem {
    id: string;
    action: string;
    entityName: string;
    description: string;
    transactionId: string | null;
    formType: string;
    incidentType: string;
    damagedSeriesNumber: string;
    replacedSeriesNumber: string;
    reasonDetails: string | null;
    counterName: string | null;
    reportedBy: string;
    reportedRole: string;
    createdAt: string | Date;
}

interface Props {
    initialIncidents: IncidentItem[];
}

export default function AccountableFormsView({ initialIncidents }: Props) {
    const [incidents, setIncidents] = useState<IncidentItem[]>(initialIncidents);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Refresh incidents on demand
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const res = await getAccountableFormIncidentsAction();
            if (res.success && res.data) {
                setIncidents(res.data as any);
                toast.success("Incident records updated");
            } else {
                toast.error(res.error || "Failed to update incidents");
            }
        } catch (_e) {
            toast.error("Failed to refresh records");
        } finally {
            setIsRefreshing(false);
        }
    };

    // Export to CSV for COA Compliance Liquidation
    const handleExportCSV = () => {
        if (!incidents.length) {
            toast.error("No incident logs available to export.");
            return;
        }

        const headers = ["Timestamp", "Form Classification", "Incident Category", "Spoiled Serial #", "Replacement Serial #", "Remarks", "Counter", "Reported By", "Transaction ID"];
        const rows = incidents.map(item => [
            format(new Date(item.createdAt), "yyyy-MM-dd HH:mm:ss"),
            `"${(item.formType || "").replace(/"/g, '""')}"`,
            item.incidentType,
            item.damagedSeriesNumber,
            item.replacedSeriesNumber,
            `"${(item.reasonDetails || "").replace(/"/g, '""')}"`,
            `"${(item.counterName || "Unassigned").replace(/"/g, '""')}"`,
            `"${item.reportedBy}"`,
            item.transactionId || "N/A"
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `COA_Spoiled_Accountable_Forms_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("COA Incident Report exported successfully!");
    };

    // Filtered Incidents
    const filteredIncidents = useMemo(() => {
        return incidents.filter(item => {
            const term = search.toLowerCase();
            const matchesSearch = 
                item.damagedSeriesNumber.toLowerCase().includes(term) ||
                item.replacedSeriesNumber.toLowerCase().includes(term) ||
                item.formType.toLowerCase().includes(term) ||
                item.reportedBy.toLowerCase().includes(term) ||
                (item.reasonDetails && item.reasonDetails.toLowerCase().includes(term));

            const matchesCategory = categoryFilter === "ALL" || item.incidentType === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [incidents, search, categoryFilter]);

    // KPI Metrics
    const stats = useMemo(() => {
        const total = incidents.length;
        const paperJams = incidents.filter(i => i.incidentType === "PAPER_JAM").length;
        const misfeeds = incidents.filter(i => i.incidentType === "PRINTER_MISFEED").length;
        const damagedLeaves = incidents.filter(i => i.incidentType === "DAMAGED_LEAF").length;
        const others = total - (paperJams + misfeeds + damagedLeaves);

        return { total, paperJams, misfeeds, damagedLeaves, others };
    }, [incidents]);

    const getIncidentBadge = (type: string) => {
        switch (type) {
            case "PAPER_JAM":
                return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-black text-[10px] uppercase">Paper Jam</Badge>;
            case "PRINTER_MISFEED":
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-black text-[10px] uppercase">Printer Misfeed</Badge>;
            case "INK_SMUDGE":
                return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-black text-[10px] uppercase">Ink Smudge</Badge>;
            case "DAMAGED_LEAF":
                return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-black text-[10px] uppercase">Torn / Damaged</Badge>;
            default:
                return <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 font-black text-[10px] uppercase">{type.replace(/_/g, " ")}</Badge>;
        }
    };

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            {/* Header / Sub-Nav */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <Link href="/admin/treasury">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5">
                                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Accountable Forms & Spoiled Stubs Log
                                </h1>
                                <Badge className="bg-primary/10 text-primary border-primary/20 font-mono font-bold text-[10px]">
                                    COA AUDIT READY
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Comprehensive audit trail of paper jams, damaged stubs, and replacement serial numbers issued across Treasury counters.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end lg:self-auto">
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="h-11 rounded-2xl border-slate-200 dark:border-white/10 font-bold text-xs flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-primary" : "text-slate-400"}`} />
                        Sync Records
                    </Button>
                    <Button
                        onClick={handleExportCSV}
                        className="h-11 rounded-2xl bg-primary text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export COA CSV
                    </Button>
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#151b2b] p-5 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Spoiled Forms</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Logged by Treasury Cashiers</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                        <FileWarning className="w-6 h-6 text-rose-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-5 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paper Jams</p>
                        <h3 className="text-3xl font-black text-amber-500 mt-1">{stats.paperJams}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Mechanical roller incidents</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Printer className="w-6 h-6 text-amber-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-5 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Misfeeds / Alignment</p>
                        <h3 className="text-3xl font-black text-blue-500 mt-1">{stats.misfeeds}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Tray feeding errors</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Layers className="w-6 h-6 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-5 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Torn / Booklet Flaws</p>
                        <h3 className="text-3xl font-black text-emerald-500 mt-1">{stats.damagedLeaves}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Perforated leaf damage</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <ShieldAlert className="w-6 h-6 text-emerald-500" />
                    </div>
                </div>
            </div>

            {/* Main Content Table & Filters */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                {/* Search & Category Filter Toolbar */}
                <div className="p-5 border-b border-slate-200 dark:border-[#2a3040] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#151b2b]">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search by serial #, staff email, classification, or remark..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-11 pl-10 rounded-2xl bg-white dark:bg-[#1a2234] border-slate-200 dark:border-white/10 text-xs font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="h-11 px-3.5 rounded-2xl bg-white dark:bg-[#1a2234] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="PAPER_JAM">Paper Jam</option>
                            <option value="PRINTER_MISFEED">Printer Misfeed</option>
                            <option value="INK_SMUDGE">Ink Smudge</option>
                            <option value="DAMAGED_LEAF">Torn / Damaged Leaf</option>
                            <option value="ENCODING_ERROR">Encoding Error</option>
                        </select>
                    </div>
                </div>

                {/* Table View */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/60 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="py-4 px-6">Timestamp & Counter</th>
                                <th className="py-4 px-6">Classification</th>
                                <th className="py-4 px-6">Category</th>
                                <th className="py-4 px-6">Damaged Serial # (Spoiled)</th>
                                <th className="py-4 px-6">Replacement Serial # (Active)</th>
                                <th className="py-4 px-6">Remarks & Officer</th>
                                <th className="py-4 px-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                            {filteredIncidents.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-14 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                No accountable form incidents found
                                            </p>
                                            <p className="text-xs text-slate-400 max-w-sm">
                                                All accountable forms and stubs are in clean order. Any reported paper jams will automatically appear here.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredIncidents.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="space-y-0.5">
                                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    {format(new Date(item.createdAt), "MMM dd, yyyy · hh:mm a")}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    Counter: <span className="font-bold text-slate-600 dark:text-slate-300">{item.counterName || "Main Treasury"}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-4 px-6">
                                            <Badge variant="outline" className="font-bold border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-[11px] bg-slate-50 dark:bg-white/5">
                                                {item.formType}
                                            </Badge>
                                        </td>

                                        <td className="py-4 px-6">
                                            {getIncidentBadge(item.incidentType)}
                                        </td>

                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono font-black text-xs line-through tracking-wider">
                                                {item.damagedSeriesNumber}
                                            </span>
                                        </td>

                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-black text-xs tracking-wider">
                                                {item.replacedSeriesNumber}
                                            </span>
                                        </td>

                                        <td className="py-4 px-6 max-w-[260px]">
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate" title={item.reasonDetails || "No remarks provided"}>
                                                    {item.reasonDetails || <span className="text-slate-400 italic">No remarks provided</span>}
                                                </p>
                                                <p className="text-[10px] text-slate-400 truncate">
                                                    By: <span className="font-bold text-slate-500 dark:text-slate-400">{item.reportedBy}</span>
                                                </p>
                                            </div>
                                        </td>

                                        <td className="py-4 px-6 text-right">
                                            {item.transactionId ? (
                                                <Link href={`/admin/treasury/${item.transactionId}`}>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        className="h-8 rounded-xl text-primary font-bold text-xs hover:bg-primary/10 flex items-center gap-1.5 ml-auto"
                                                    >
                                                        View Tx
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">Standalone</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Count */}
                <div className="p-4 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <p>Showing <span className="font-bold text-slate-800 dark:text-white">{filteredIncidents.length}</span> of {incidents.length} incident record(s)</p>
                    <p className="text-[11px] italic">Official Municipal Audit Registry · Compliant with COA Circular No. 92-382</p>
                </div>
            </div>
        </div>
    );
}
