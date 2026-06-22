"use client";

import { useHousehold } from "../providers/HouseholdProvider";
import { Household } from "../providers/HouseholdProvider";
import { deleteHousehold } from "../../actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, MapPin, Users, Phone, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";

export function HouseholdTable() {
    const {
        households,
        setHouseholds,
        searchQuery,
        selectedBarangay,
        selectedRiskLevel,
        setEditingData,
        setIsAddModalOpen,
        viewMode
    } = useHousehold();

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 30;

    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, selectedBarangay, selectedRiskLevel]);

    // Filter logic
    const filteredHouseholds = households.filter((h) => {
        const headStr = h.headOfFamily || "";
        const barangayStr = h.barangay || "";
        const matchesSearch = headStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
            barangayStr.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBarangay = selectedBarangay === "All" || h.barangay === selectedBarangay;
        const matchesRisk = selectedRiskLevel === "All" || h.riskLevel === selectedRiskLevel;
        return matchesSearch && matchesBarangay && matchesRisk;
    });

    // Do not render table if in map view
    if (viewMode === "map") return null;

    const totalPages = Math.ceil(filteredHouseholds.length / itemsPerPage);
    const paginatedHouseholds = filteredHouseholds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleDelete = async (id: string) => {
        try {
            const response = await deleteHousehold(id);
            if (response.success) {
                setHouseholds(prev => prev.filter(h => h.id !== id));
                toast.success("Household entry deleted successfully!");
            } else {
                toast.error(response.error || "Failed to delete household entry.");
            }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("An error occurred while deleting the household.");
        }
    };

    const handleEdit = (household: Household) => {
        setEditingData(household);
        setIsAddModalOpen(true);
    };

    const getRiskBadgeColor = (risk: string) => {
        switch (risk) {
            case "Safe": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
            case "Low Risk": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
            case "Moderate Risk": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
            case "High Risk": return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800";
            case "Flood Prone": return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800";
            case "Landslide Prone": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
            default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
        }
    };

    return (
        <div className="bg-white dark:bg-[#151b2b] rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200 dark:bg-[#1a1f2e] dark:border-[#2a3040]">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-5">Head of Family</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Location</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Household Size</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Risk Assessment</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredHouseholds.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-[400px] text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                        <MapPin className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" />
                                        <p className="text-xl font-bold text-slate-700 dark:text-slate-300">No households found</p>
                                        <p className="mt-2">Try adjusting your filters or search term.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedHouseholds.map((household) => (
                                <TableRow key={household.id} className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 dark:text-white">{household.headOfFamily}</span>
                                            {household.contactNumber && (
                                                <span className="text-xs text-slate-500 flex items-center mt-1">
                                                    <Phone className="w-3 h-3 mr-1" /> {household.contactNumber}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{household.barangay}</span>
                                            <span className="text-xs font-semibold text-slate-500 mt-1">
                                                {household.latitude !== null && household.longitude !== null ? (
                                                    <span className="font-mono">{household.latitude.toFixed(5)}, {household.longitude.toFixed(5)}</span>
                                                ) : (
                                                    <span className="italic text-amber-600 dark:text-amber-400">Location Not Pinned</span>
                                                )}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="inline-flex items-center justify-center px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-bold text-slate-700 dark:text-slate-300">
                                            <Users className="w-3.5 h-3.5 mr-1.5" />
                                            {household.householdSize}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-2 items-start">
                                            <Badge variant="outline" className={`border ${getRiskBadgeColor(household.riskLevel)}`}>
                                                {household.riskLevel === "Safe" ? <ShieldCheck className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                                                {household.riskLevel}
                                            </Badge>

                                            {household.specialSectors && (
                                                <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                    {household.specialSectors}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 border-slate-200 dark:border-[#2a3040] hover:bg-slate-100 dark:hover:bg-[#2a3040]"
                                                onClick={() => handleEdit(household)}
                                            >
                                                <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-8 border-slate-200 dark:border-[#2a3040] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:border-red-900/30">
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-slate-900 dark:text-white">Remove Household Entry</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-slate-500">
                                                            Are you sure you want to delete the entry for {household.headOfFamily}? This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-0 hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(household.id)}
                                                            className="bg-red-600 hover:bg-red-700 text-white"
                                                        >
                                                            Delete Entry
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 dark:border-[#2a3040] flex items-center justify-between bg-white dark:bg-[#151b2b]">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredHouseholds.length)} of {filteredHouseholds.length} entries
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="h-8 border-slate-200 dark:border-[#2a3040] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a3040]"
                        >
                            Previous
                        </Button>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Page {currentPage} of {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="h-8 border-slate-200 dark:border-[#2a3040] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a3040]"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
