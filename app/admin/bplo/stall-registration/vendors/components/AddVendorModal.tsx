"use client";

import React, { useState } from "react";
import { useVendors } from "./VendorProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Loader2, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createVendor } from "../actions";

export function AddVendorModal() {
    const { isAddOpen, setIsAddOpen, themeColor, triggerRefresh, setVendors } = useVendors();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            toast.error("Please fill in both name and email");
            return;
        }

        setLoading(true);
        try {
            const res = await createVendor({
                name,
                email,
                password: password || undefined,
            });

            if (res.success && res.data) {
                // Instant Optimistic State Update
                setVendors((prev) => [res.data as any, ...prev]);
                toast.success(`Vendor "${name}" registered successfully!`);
                setIsAddOpen(false);
                setName("");
                setEmail("");
                setPassword("");
                triggerRefresh();
            } else {
                toast.error(res.error || "Failed to register vendor");
            }
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent showCloseButton={false} className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl text-white shadow-md" style={{ backgroundColor: themeColor }}>
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                Register Market Vendor
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium italic">
                                Add a new vendor account for market stall assignment.
                            </DialogDescription>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsAddOpen(false)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </DialogHeader>

                <form onSubmit={handleSubmit} autoComplete="off" className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Maria Santos"
                            autoComplete="off"
                            className="h-10 text-xs bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl font-medium"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Email Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. maria.santos@gmail.com"
                            autoComplete="off"
                            className="h-10 text-xs bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl font-medium"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Account Password (Optional)
                        </Label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Defaults to Vendor@123 if blank"
                                autoComplete="new-password"
                                className="h-10 text-xs bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl font-medium pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer p-1"
                                title={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                            Default temporary password: <span className="font-bold text-blue-500">Vendor@123</span>
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#2a3040]">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddOpen(false)}
                            className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 dark:border-[#2a3040]"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-10 px-6 rounded-xl text-xs font-black uppercase italic tracking-wider text-white shadow-lg flex items-center gap-2 cursor-pointer"
                            style={{ backgroundColor: themeColor }}
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>Register Vendor</span>
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
