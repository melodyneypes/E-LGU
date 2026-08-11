"use client";

import React, { useState, useEffect } from "react";
import { useRegistry } from "./RegistryProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Eye, EyeOff, Loader2 } from "lucide-react";
import { updateMarketPersonnel } from "../actions";

export function EditPersonnelModal() {
    const { isEditOpen, setIsEditOpen, editingPersonnel, themeColor, triggerRefresh } = useRegistry();

    const [role, setRole] = useState<"VENDOR" | "COLLECTOR">("VENDOR");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!editingPersonnel) return;
        setRole((editingPersonnel.role as any) || "VENDOR");
        setPassword("");
    }, [editingPersonnel]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPersonnel) return;

        setLoading(true);
        const res = await updateMarketPersonnel(editingPersonnel.id, {
            role,
            ...(password.trim() ? { password: password.trim() } : {}),
        });

        setLoading(false);
        if (res.success) {
            setIsEditOpen(false);
            triggerRefresh();
        } else {
            alert(res.error || "Failed to update personnel account");
        }
    };

    if (!editingPersonnel) return null;

    return (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center gap-3">
                    <div
                        className="p-3 rounded-2xl text-white shadow-md shrink-0"
                        style={{ backgroundColor: themeColor }}
                    >
                        <Edit className="w-5 h-5" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                            Edit Personnel ({editingPersonnel.name})
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 font-medium italic">
                            Update account role or set a new password.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} autoComplete="off" className="p-6 space-y-4">
                    {/* Readonly Name */}
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Personnel Name</Label>
                        <Input
                            value={editingPersonnel.name || ""}
                            readOnly
                            disabled
                            className="h-10 rounded-xl bg-slate-100 dark:bg-[#0f1117]/50 border-slate-200 dark:border-[#2a3040] text-xs font-bold text-slate-500"
                        />
                    </div>

                    {/* Readonly Email */}
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Email Address</Label>
                        <Input
                            value={editingPersonnel.email || ""}
                            readOnly
                            disabled
                            className="h-10 rounded-xl bg-slate-100 dark:bg-[#0f1117]/50 border-slate-200 dark:border-[#2a3040] text-xs text-slate-500"
                        />
                    </div>

                    {/* Role Selector (ONLY VENDOR & COLLECTOR) */}
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Personnel Role *</Label>
                        <Select value={role} onValueChange={(v) => setRole(v as any)}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] text-xs font-bold uppercase">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                <SelectItem value="VENDOR" className="text-xs font-bold uppercase">
                                    Market Stall Vendor
                                </SelectItem>
                                <SelectItem value="COLLECTOR" className="text-xs font-bold uppercase">
                                    Ticket & Fee Collector
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Optional New Password */}
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">New Password (Optional)</Label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Leave blank to keep current password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] text-xs pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#2a3040]">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditOpen(false)}
                            className="h-10 px-4 rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-10 px-5 rounded-xl text-xs font-black uppercase italic tracking-wider text-white shadow-lg cursor-pointer"
                            style={{ backgroundColor: themeColor }}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
