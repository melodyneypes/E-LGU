"use client";

import { useState } from "react";
import { Plus, MapPin, Mail, Shield, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";
import { AddBarangayAdminModal } from "./components/AddBarangayAdminModal";
import { EditBarangayAdminModal } from "./components/EditBarangayAdminModal";
import { toggleBarangayAdminVerification, deleteBarangayAdmin, getBarangayAdmins } from "./actions";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";

interface BarangayAdminsWorkspaceProps {
    initialAdmins: any[];
    barangays: string[];
    themeColor?: string;
}

export function BarangayAdminsWorkspace({ initialAdmins, barangays, themeColor = "#2563eb" }: BarangayAdminsWorkspaceProps) {
    const [adminsList, setAdminsList] = useState<any[]>(initialAdmins);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAdminToEdit, setSelectedAdminToEdit] = useState<any | null>(null);
    const [deletingAdmin, setDeletingAdmin] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [verifiedState, setVerifiedState] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        initialAdmins.forEach((admin) => {
            init[admin.id] = !!admin.isEmailVerified;
        });
        return init;
    });
    const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});

    const refreshAdmins = async () => {
        setIsRefreshing(true);
        try {
            // Small artificial pause for aesthetic smooth skeleton transition
            await new Promise((resolve) => setTimeout(resolve, 400));
            const res = await getBarangayAdmins();
            if (res.success && res.data) {
                setAdminsList(res.data);
                const nextVerified: Record<string, boolean> = {};
                res.data.forEach((admin: any) => {
                    nextVerified[admin.id] = !!admin.isEmailVerified;
                });
                setVerifiedState(nextVerified);
            }
        } catch {
            console.error("Failed to refresh barangay admins.");
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingAdmin) return;
        setIsDeleting(true);
        try {
            const res = await deleteBarangayAdmin(deletingAdmin.id);
            if (res.success) {
                toast.success(`Account for "${deletingAdmin.name || deletingAdmin.email}" deleted successfully!`);
                setAdminsList(prev => prev.filter(a => a.id !== deletingAdmin.id));
                setDeletingAdmin(null);
            } else {
                toast.error(res.error || "Failed to delete account.");
            }
        } catch {
            toast.error("An unexpected error occurred during deletion.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleVerification = async (userId: string, nextStatus: boolean, adminName: string) => {
        setVerifiedState(prev => ({ ...prev, [userId]: nextStatus }));
        setPendingIds(prev => ({ ...prev, [userId]: true }));

        try {
            const res = await toggleBarangayAdminVerification(userId, nextStatus);
            if (res.success) {
                toast.success(`${adminName || "Account"} marked as ${nextStatus ? "Verified" : "Unverified"}`);
            } else {
                setVerifiedState(prev => ({ ...prev, [userId]: !nextStatus }));
                toast.error(res.error || "Failed to update verification status.");
            }
        } catch {
            setVerifiedState(prev => ({ ...prev, [userId]: !nextStatus }));
            toast.error("An unexpected error occurred.");
        } finally {
            setPendingIds(prev => ({ ...prev, [userId]: false }));
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Barangay Admin Accounts</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Register and manage admin accounts for each barangay.</p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    style={{ backgroundColor: themeColor, boxShadow: `0 20px 25px -5px ${themeColor}33` }}
                    className="hover:opacity-90 text-white font-bold uppercase tracking-wider text-xs px-6 py-6 rounded-2xl transition-all duration-200 cursor-pointer"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Register Barangay Admin
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-100 dark:bg-blue-500/20 rounded-2xl">
                        <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-slate-500">Total Barangay Admins</h3>
                        <p className="text-3xl font-black">{adminsList.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-green-100 dark:bg-green-500/20 rounded-2xl">
                        <MapPin className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-slate-500">Available Barangays</h3>
                        <p className="text-3xl font-black">{barangays.length}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-2xl shadow-blue-500/5 overflow-hidden ring-1 ring-slate-200 dark:ring-white/5">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold py-5">Admin Details</TableHead>
                            <TableHead className="font-bold">Role</TableHead>
                            <TableHead className="font-bold">Managed Barangay</TableHead>
                            <TableHead className="font-bold">Email Verified</TableHead>
                            <TableHead className="font-bold">Registered On</TableHead>
                            <TableHead className="font-bold text-right pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isRefreshing ? (
                            // Sleek Skeleton Loader Rows
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`} className="border-b border-slate-100 dark:border-[#2a3040]/50 animate-pulse">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
                                            <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded-md" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700/60 rounded-full" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="h-5 w-28 bg-slate-200 dark:bg-slate-700/60 rounded-full" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-10 bg-slate-200 dark:bg-slate-700/60 rounded-full" />
                                            <div className="h-3 w-12 bg-slate-100 dark:bg-slate-800 rounded-md" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700/60 rounded-md" />
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                                            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700/60 rounded-xl" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : adminsList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center text-slate-500">
                                    No Barangay admins or captains registered yet. Click &quot;Register Barangay Official&quot; to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            adminsList.map((admin) => {
                                const isVerified = verifiedState[admin.id] !== undefined ? verifiedState[admin.id] : !!admin.isEmailVerified;
                                const isPending = !!pendingIds[admin.id];

                                return (
                                    <TableRow key={admin.id} className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50">
                                        <TableCell className="py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                                    {admin.name || "Unnamed"}
                                                </span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                    <Mail className="w-3 h-3 text-blue-500" /> {admin.email}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {admin.role === "BARANGAY_CAPTAIN" ? (
                                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-black uppercase text-[10px] italic tracking-wider">
                                                    Barangay Captain
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 font-black uppercase text-[10px] italic tracking-wider">
                                                    Barangay Admin
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 font-black uppercase text-[10px] italic tracking-tighter">
                                                <MapPin className="w-3 h-3 mr-1" />
                                                {admin.managedBarangay || "Not Assigned"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <Switch
                                                    checked={isVerified}
                                                    disabled={isPending}
                                                    onCheckedChange={(checked) => handleToggleVerification(admin.id, checked, admin.name)}
                                                    className="data-[state=checked]:bg-emerald-500"
                                                />
                                                <span className={`text-[10px] font-black uppercase tracking-wider italic ${isVerified ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                                                    {isVerified ? "Verified" : "Unverified"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-500 font-bold text-xs uppercase">
                                            {format(new Date(admin.createdAt), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedAdminToEdit({ ...admin, isEmailVerified: isVerified })}
                                                    className="h-8 px-3 rounded-xl border-slate-200 dark:border-[#2a3040] hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                                                    title="Edit Credentials & Assignment"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                    <span>Edit</span>
                                                </Button>
                                                {/* Hide delete action temporarily */}
                                                {/* <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDeletingAdmin(admin)}
                                                    className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-[#2a3040] hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-all font-bold text-xs flex items-center justify-center cursor-pointer"
                                                    title="Delete Account"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button> */}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Custom Modern Confirm Delete Modal */}
            <ConfirmDeleteModal
                isOpen={!!deletingAdmin}
                onClose={() => setDeletingAdmin(null)}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
                title="Delete Barangay Official Account"
                description={
                    deletingAdmin ? (
                        <span>
                            Are you sure you want to permanently delete the official account for{" "}
                            <strong className="text-slate-900 dark:text-white font-black">
                                &quot;{deletingAdmin.name || deletingAdmin.email}&quot;
                            </strong>{" "}
                            ({deletingAdmin.role === "BARANGAY_CAPTAIN" ? "Barangay Captain" : "Barangay Admin"} of Brgy. {deletingAdmin.managedBarangay || "General"})? This will revoke all dashboard privileges and delete their authentication credentials.
                        </span>
                    ) : undefined
                }
                confirmText="Delete Account"
            />

            {isModalOpen && (
                <AddBarangayAdminModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onAdminAdded={refreshAdmins}
                    barangays={barangays}
                    themeColor={themeColor}
                />
            )}

            {selectedAdminToEdit && (
                <EditBarangayAdminModal
                    isOpen={!!selectedAdminToEdit}
                    onClose={() => setSelectedAdminToEdit(null)}
                    onAdminUpdated={refreshAdmins}
                    admin={selectedAdminToEdit}
                    barangays={barangays}
                    themeColor={themeColor}
                />
            )}
        </div>
    );
}
