"use client";

import React, { useState } from "react";
import {
    getPosoOfficers,
    addPosoOfficer,
    updatePosoOfficer,
    deletePosoOfficer,
} from "@/app/admin/poso/actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    UserCheck,
    Plus,
    Search,
    Trash2,
    X,
    Save,
    Users,
    Eye,
    EyeOff,
    Edit2,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface OfficerItem {
    id: string;
    name: string | null;
    email: string | null;
    isEmailVerified?: boolean;
    department: string | null;
    createdAt: Date;
}

export default function OfficersPage({
    initialOfficers,
    initialTotalCount,
}: {
    initialOfficers: OfficerItem[];
    initialTotalCount: number;
}) {
    const router = useRouter();
    const [officers, setOfficers] = useState<OfficerItem[]>(initialOfficers);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [isPending, setIsPending] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [showPassword, setShowPassword] = useState(false);

    React.useEffect(() => {
        setOfficers(initialOfficers);
        setTotalCount(initialTotalCount);
    }, [initialOfficers, initialTotalCount]);

    const fetchOfficers = React.useCallback(async (p: number, s: string) => {
        setIsPending(true);
        try {
            const res = await getPosoOfficers({
                page: p,
                pageSize,
                search: s,
            });

            if (res.success && res.officers) {
                setOfficers(res.officers);
                setTotalCount(res.totalCount || 0);
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to load officers.");
        } finally {
            setIsPending(false);
        }
    }, [pageSize]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        setPage(1);
        
        const timeout = setTimeout(() => {
            fetchOfficers(1, val);
        }, 400);
        return () => clearTimeout(timeout);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        fetchOfficers(newPage, search);
    };

    const [editingData, setEditingData] = useState<OfficerItem | null>(null);

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setTimeout(() => {
            setEditingData(null);
            setShowPassword(false);
        }, 200);
    };

    const handleAddNew = () => {
        setEditingData(null);
        setShowPassword(false);
        setIsAddModalOpen(true);
    };

    const handleEdit = (item: OfficerItem) => {
        setEditingData(item);
        setShowPassword(false);
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete officer account "${name}"?`)) return;
        setDeletingId(id);
        try {
            const res = await deletePosoOfficer(id);
            if (!res.success) throw new Error(res.error);
            toast.success("POSO officer account deleted successfully!");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete officer account.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            let res;
            if (editingData) {
                res = await updatePosoOfficer(editingData.id, formData);
            } else {
                res = await addPosoOfficer(formData);
            }

            if (res.success) {
                toast.success(
                    editingData
                        ? "POSO Officer account updated successfully!"
                        : "POSO Officer account created successfully!"
                );
                handleCloseModal();
                router.refresh();
            } else {
                toast.error(res.error || "Failed to save officer account.");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred while saving.");
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <UserCheck className="mr-3 w-10 h-10 text-rose-600" />
                        POSO Traffic Officers Registry
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Manage active POSO traffic enforcers and handheld mobile app login credentials.
                    </p>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl ring-1 ring-slate-200 dark:ring-white/5 relative">
                {/* Glassmorphic Loading Overlay */}
                {isPending && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-[#151b2b]/50 backdrop-blur-sm z-20 flex items-center justify-center">
                        <div className="flex items-center space-x-2 bg-white dark:bg-[#1a1f2e] px-4 py-2 rounded-full shadow-lg border border-slate-200 dark:border-[#2a3040]">
                            <RefreshCw className="w-5 h-5 text-rose-600 animate-spin" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Updating officers...</span>
                        </div>
                    </div>
                )}

                {/* Search & Filter Bar */}
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2a3040]">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-600 transition-colors w-4 h-4" />
                        <Input
                            placeholder="Search officer name, email..."
                            value={search}
                            onChange={handleSearchChange}
                            className="pl-10 h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 focus:ring-rose-500/20 font-medium italic"
                        />
                    </div>

                    <Button
                        onClick={handleAddNew}
                        className="h-11 px-6 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg bg-rose-600 hover:bg-rose-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add New POSO Officer
                    </Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 dark:bg-[#1a1f2e] border-y border-slate-200 dark:border-[#2a3040]">
                                <TableHead className="w-[260px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                    Officer Name
                                </TableHead>
                                <TableHead className="w-[280px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Email / Login Username
                                </TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Email Verified
                                </TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Department
                                </TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Role
                                </TableHead>
                                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-8">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {officers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <Users className="w-12 h-12 mb-3 stroke-[1.5]" />
                                            <p className="font-bold text-slate-700 dark:text-slate-300">
                                                No POSO Officers Registered
                                            </p>
                                            <p className="text-xs mt-1">
                                                Click &quot;Add New POSO Officer&quot; to register handheld enforcer credentials.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                officers.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        className="group hover:bg-rose-50/20 dark:hover:bg-rose-950/10 transition-colors border-b border-slate-200 dark:border-[#2a3040]"
                                    >
                                        <TableCell className="pl-8 py-5 font-black text-sm text-slate-900 dark:text-white italic uppercase">
                                            {item.name || "N/A"}
                                        </TableCell>

                                        <TableCell className="font-semibold text-xs text-slate-600 dark:text-slate-400">
                                            {item.email}
                                        </TableCell>

                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase italic w-fit ${
                                                    item.isEmailVerified !== false
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                                                }`}
                                            >
                                                {item.isEmailVerified !== false ? "VERIFIED" : "UNVERIFIED"}
                                            </span>
                                        </TableCell>

                                        <TableCell className="font-bold text-xs text-slate-700 dark:text-slate-300">
                                            {item.department || "POSO"}
                                        </TableCell>

                                        <TableCell>
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase italic bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                                                POSO OFFICER
                                            </span>
                                        </TableCell>

                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(item)}
                                                    className="h-9 w-9 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(item.id, item.name || "Officer")}
                                                    disabled={deletingId === item.id}
                                                    className="h-9 w-9 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                <div className="p-6 border-t border-slate-200 dark:border-[#2a3040] flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500">
                        Showing {officers.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
                        {Math.min(page * pageSize, totalCount)} of {totalCount} officers
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1 || isPending}
                            onClick={() => handlePageChange(page - 1)}
                            className="h-9 px-3 font-bold text-xs"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                        </Button>
                        <span className="text-xs font-black px-3 py-1 bg-slate-100 dark:bg-[#1a1f2e] rounded-lg">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages || isPending}
                            onClick={() => handlePageChange(page + 1)}
                            className="h-9 px-3 font-bold text-xs"
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 overflow-hidden bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl">
                    <div className="relative flex flex-col">
                        {/* Header */}
                        <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-[#2a3040] bg-rose-50/40 dark:bg-rose-950/20 flex flex-row items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-rose-600 text-white shadow-lg shadow-rose-600/30">
                                    <UserCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {editingData ? "Edit POSO Officer Account" : "Register POSO Officer"}
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                        {editingData ? "Update officer profile and login credentials." : "Create mobile app login account for traffic enforcers."}
                                    </DialogDescription>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleCloseModal}
                                className="h-10 w-10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </DialogHeader>

                        {/* Form */}
                        <div className="p-8">
                            <form key={editingData?.id || "new-officer-form"} id="officerForm" onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Officer Full Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={editingData?.name || ""}
                                        required
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="e.g. Officer Juan Dela Cruz"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Email / App Username <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        defaultValue={editingData?.email || ""}
                                        required
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="officer.juandelacruz@mapandan.gov.ph"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Password {editingData ? <span className="text-xs text-slate-400 font-normal">(Leave blank to keep unchanged)</span> : <span className="text-red-500">*</span>}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            required={!editingData}
                                            className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11 pr-10"
                                            placeholder={editingData ? "•••••••••••• (Unchanged)" : "••••••••••••"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white dark:bg-[#0f1117] border-t border-slate-200 dark:border-[#2a3040] flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseModal}
                                className="h-11 px-6 rounded-xl border-slate-200 dark:border-slate-700 font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                form="officerForm"
                                disabled={loading}
                                className="h-11 px-6 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 bg-rose-600 hover:bg-rose-700"
                            >
                                {loading ? (
                                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                <span>{editingData ? "Update Account" : "Create Officer Account"}</span>
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
