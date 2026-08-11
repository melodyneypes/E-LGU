"use client";

import React, { useState } from "react";
import { useRegistry } from "./RegistryProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { createMarketPersonnel } from "../actions";

export function AddPersonnelModal() {
    const { isAddOpen, setIsAddOpen, themeColor, triggerRefresh } = useRegistry();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"VENDOR" | "COLLECTOR">("VENDOR");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !password.trim()) {
            alert("Please fill in all required fields.");
            return;
        }

        setLoading(true);
        const res = await createMarketPersonnel({
            name,
            email,
            password,
            role,
        });

        setLoading(false);
        if (res.success) {
            setIsAddOpen(false);
            setName("");
            setEmail("");
            setPassword("");
            setRole("VENDOR");
            triggerRefresh();
        } else {
            alert(res.error || "Failed to register personnel");
        }
    };

    return (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center gap-3">
                    <div
                        className="p-3 rounded-2xl text-white shadow-md shrink-0"
                        style={{ backgroundColor: themeColor }}
                    >
                        <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                            Add Market Personnel
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 font-medium italic">
                            Provision a new Market Stall Vendor or Ticket Collector account.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} autoComplete="off" className="p-6 space-y-4">
                    {/* Full Name */}
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Full Name *</Label>
                        <Input
                            placeholder="e.g. Juan Dela Cruz"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="off"
                            required
                            className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] text-xs"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Email Address *</Label>
                        <Input
                            type="email"
                            placeholder="juan@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="off"
                            required
                            className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] text-xs"
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

                    {/* Password */}
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Password *</Label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                required
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
                            onClick={() => setIsAddOpen(false)}
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
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Personnel"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
