"use client";

import { useResident } from "../providers";
import { Resident } from "../providers/ResidentProvider";
import { deleteResident } from "../../actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Search, Phone, BadgeCheck, MoreVertical, Skull, Radio, Eye } from "lucide-react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleResidentDeathStatus } from "../../actions";
import { RFIDCaptureModal } from "./RFIDCaptureModal";
import { ResidentReviewModal } from "./ResidentReviewModal";
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
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function ResidentTable() {
    const {
        residents,
        setResidents,
        searchQuery,
        selectedBarangay,
        selectedGender,
        selectedCategory,
        setEditingData,
        setIsAddModalOpen,
        themeColor,
    } = useResident();

    const filteredResidents = residents.filter((r) => {
        const matchesSearch =
            r.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.barangay.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBarangay = selectedBarangay === "All" || r.barangay === selectedBarangay;
        const matchesGender = selectedGender === "All" || r.gender === selectedGender;
        const matchesCategory = selectedCategory === "All" || 
            (r.category && (r.category.id === selectedCategory || r.category.name === selectedCategory));
            
        return matchesSearch && matchesBarangay && matchesGender && matchesCategory;
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isRFIDModalOpen, setIsRFIDModalOpen] = useState(false);
    const [selectedResident, setSelectedResident] = useState<{id: string, name: string} | null>(null);
    const [reviewResident, setReviewResident] = useState<Resident | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, selectedBarangay, selectedGender, selectedCategory, itemsPerPage]);

    const totalPages = Math.ceil(filteredResidents.length / itemsPerPage);
    const paginatedResidents = filteredResidents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleDelete = async (id: string) => {
        try {
            const response = await deleteResident(id);
            if (response.success) {
                setResidents(prev => prev.filter(r => r.id !== id));
                toast.success("Resident entry deleted successfully!");
            } else {
                toast.error(response.error || "Failed to delete resident entry.");
            }
        } catch {
            toast.error("An error occurred while deleting the resident.");
        }
    };

    const handleEdit = (resident: Resident) => {
        setEditingData(resident);
        setIsAddModalOpen(true);
    };

    const handleToggleIsDead = async (id: string, currentStatus: boolean, name: string) => {
        const newStatus = !currentStatus;
        try {
            const res = await toggleResidentDeathStatus(id, newStatus);
            if (res.success) {
                setResidents(prev => prev.map(r => r.id === id ? { ...r, isDead: newStatus } : r));
                toast.success(`${name} marked as ${newStatus ? 'Deceased' : 'Alive'}.`);
            } else {
                toast.error(res.error || "Failed to update status.");
            }
        } catch {
            toast.error("An error occurred.");
        }
    };

    const openRFIDModal = (id: string, name: string) => {
        setSelectedResident({ id, name });
        setIsRFIDModalOpen(true);
    };

    const openReviewModal = (resident: Resident, e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest("button") || target.closest("[role='menuitem']") || target.closest("[data-state]")) {
            return;
        }
        setReviewResident(resident);
        setIsReviewModalOpen(true);
    };

    const handleStatusChange = (id: string, newStatus: "APPROVED" | "REJECTED", remarks?: string) => {
        setResidents(prev => prev.map(r => r.id === id
            ? { ...r, registrationStatus: newStatus, rejectionRemarks: remarks || r.rejectionRemarks }
            : r
        ));
    };

    return (
        <div className="bg-white dark:bg-[#151b2b] rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200 dark:bg-[#1a1f2e] dark:border-[#2a3040]">
                        <TableRow className="hover:bg-transparent">
                                                <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-5">Profile</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Name</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Category</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Info & Status</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Philhealth</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Degree</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Location</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Contact</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredResidents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-[400px] text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                        <Search className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" />
                                        <p className="text-xl font-bold text-slate-700 dark:text-slate-300">No residents found</p>
                                        <p className="mt-2">Try adjusting your filters or search term.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedResidents.map((resident) => (
                                                    <TableRow key={resident.id}
                                    className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50 transition-colors cursor-pointer"
                                    onClick={(e) => openReviewModal(resident, e)}
                                >
                                    <TableCell className="py-4">
                                        <div className="relative w-12 h-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                                            {(resident.livenessUrl || resident.imageUrl) ? (
                                                <Image src={(resident.livenessUrl || resident.imageUrl) || ""} alt={`${resident.firstName} ${resident.lastName}`} layout="fill" objectFit="cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold uppercase">
                                                    {(resident.firstName && resident.firstName[0]) || ""}{(resident.lastName && resident.lastName[0]) || ""}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                                {resident.lastName}, {resident.firstName} {resident.middleName ? `${resident.middleName[0]}.` : ''} {resident.suffix}
                                            </span>
                                            
                                            {/* Family Relationship Subtext */}
                                            {resident.isHead ? (
                                                <span 
                                                    style={{ color: themeColor }}
                                                    className="text-[10px] font-black uppercase italic mt-0.5 flex items-center gap-1"
                                                >
                                                    <BadgeCheck className="w-2.5 h-2.5" style={{ color: themeColor }} /> Family Head
                                                </span>
                                            ) : resident.headName ? (
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase italic mt-0.5">
                                                    {resident.relationshipToHead || 'Member'} of {resident.headName}
                                                </span>
                                            ) : null}

                                            <div className="flex items-center gap-1 mt-1">
                                                {resident.isSenior && (
                                                    <Badge variant="outline" className="text-[9px] h-4 bg-amber-50 text-amber-600 dark:bg-amber-900/20 border-amber-200 px-1 font-black">SENIOR</Badge>
                                                )}
                                                {resident.isPWD && (
                                                    <Badge variant="outline" className="text-[9px] h-4 bg-purple-50 text-purple-600 dark:bg-purple-900/20 border-purple-200 px-1 font-black">PWD</Badge>
                                                )}
                                                {resident.registrationStatus && (
                                                    <Badge variant="outline" className={`text-[9px] h-4 px-1 font-black uppercase tracking-tighter italic ${
                                                        resident.registrationStatus === 'APPROVED' 
                                                        ? 'bg-green-50 text-green-600 border-green-200' 
                                                        : resident.registrationStatus === 'REJECTED'
                                                        ? 'bg-red-50 text-red-600 border-red-200'
                                                        : 'bg-amber-50 text-amber-600 border-amber-200'
                                                    }`}>
                                                        {resident.registrationStatus}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                            {resident.category ? (
                                                <Badge 
                                                    variant="secondary" 
                                                    style={{ backgroundColor: `${themeColor}1a`, color: themeColor }}
                                                    className="text-[10px] h-4 px-2 font-black uppercase tracking-widest border-transparent"
                                                >
                                                    {resident.category.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">No Category</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs text-slate-500">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{resident.gender} • {resident.civilStatus}</span>
                                            <span>DOB: {new Date(resident.dateOfBirth).toLocaleDateString()}</span>
                                            {resident.is4Ps && <span className="text-green-600 font-bold dark:text-green-400 text-[10px]">4Ps Beneficiary</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            {resident.philhealthNumber ? (
                                                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{resident.philhealthNumber}</span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">N/A</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col max-w-[150px]">
                                            {resident.degreeProgram ? (
                                                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase truncate" title={resident.degreeProgram}>
                                                    {resident.degreeProgram}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs">{resident.barangay}</span>
                                            <span className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[150px]">
                                                {resident.houseNumber} {resident.street} {resident.sitio} {resident.purok}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5 items-start">
                                            {resident.contactNumber ? (
                                                <span className="text-xs font-black flex items-center gap-1"><Phone className="w-3 h-3" style={{ color: themeColor }} /> {resident.contactNumber}</span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">No Contact</span>
                                            )}
                                            {resident.email && (
                                                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{resident.email}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all">
                                                        <MoreVertical className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Management Options</DropdownMenuLabel>
                                                    <DropdownMenuItem 
                                                         onClick={() => { setReviewResident(resident); setIsReviewModalOpen(true); }}
                                                         className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-bold transition-colors group"
                                                     >
                                                         <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:scale-110 transition-transform">
                                                             <Eye className="w-4 h-4 text-slate-500" />
                                                         </div>
                                                         View Details
                                                     </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleEdit(resident)}
                                                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl text-slate-700 dark:text-slate-300 font-bold transition-colors group hover:bg-slate-50 dark:hover:bg-white/5"
                                                    >
                                                        <div 
                                                            style={{ backgroundColor: `${themeColor}1a` }}
                                                            className="p-1.5 rounded-lg group-hover:scale-110 transition-transform"
                                                        >
                                                            <Edit className="w-4 h-4" style={{ color: themeColor }} />
                                                        </div>
                                                        Edit Profile
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem 
                                                        onClick={() => openRFIDModal(resident.id, `${resident.firstName} ${resident.lastName}`)}
                                                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 text-slate-700 dark:text-slate-300 font-bold transition-colors group"
                                                    >
                                                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                                            <Radio className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                        </div>
                                                        Assign RFID Tag
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem 
                                                        onClick={() => handleToggleIsDead(resident.id, resident.isDead, `${resident.firstName} ${resident.lastName}`)}
                                                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl font-bold transition-colors group ${
                                                            resident.isDead 
                                                            ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600' 
                                                            : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        <div className={`p-1.5 rounded-lg group-hover:scale-110 transition-transform ${
                                                            resident.isDead ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'
                                                        }`}>
                                                            <Skull className={`w-4 h-4 ${resident.isDead ? 'text-emerald-600' : 'text-slate-500'}`} />
                                                        </div>
                                                        {resident.isDead ? 'Mark as Alive' : 'Mark as Deceased'}
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 font-bold transition-colors group">
                                                                <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                                </div>
                                                                Delete Record
                                                            </div>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-3xl">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-slate-900 dark:text-white font-black uppercase text-xl italic tracking-tighter">Remove Resident</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-slate-500 font-medium">
                                                                    Are you sure you want to delete the resident record for {resident.firstName} {resident.lastName}? This action cannot be undone and will affect census data.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="gap-3">
                                                                <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-0 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl h-11 px-6 font-bold">Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(resident.id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-11 px-6 font-bold"
                                                                >
                                                                    Delete Record
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="p-6 border-t border-slate-200 dark:border-[#2a3040] flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#151b2b]/50">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span className="hidden sm:inline-block">Rows per page:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                        <SelectTrigger className="h-8 w-[70px] border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117] rounded-lg">
                            <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b]">
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        Showing {Math.min(currentPage * itemsPerPage, filteredResidents.length)} of {filteredResidents.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="h-10 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold"
                        >
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="h-10 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
            <RFIDCaptureModal 
                isOpen={isRFIDModalOpen}
                onClose={() => setIsRFIDModalOpen(false)}
                residentId={selectedResident?.id || ""}
                residentName={selectedResident?.name || ""}
            />
            <ResidentReviewModal
                resident={reviewResident}
                isOpen={isReviewModalOpen}
                onClose={() => { setIsReviewModalOpen(false); setReviewResident(null); }}
                onStatusChange={handleStatusChange}
            />
        </div>
    );
}
