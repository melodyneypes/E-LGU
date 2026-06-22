"use client";

import { useState } from "react";
import { X, Save, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createBarangayAdmin } from "../../../actions";

interface AddBarangayAdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    barangays: string[];
    themeColor?: string;
}

export function AddBarangayAdminModal({ isOpen, onClose, barangays, themeColor = "#2563eb" }: AddBarangayAdminModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [selectedBarangay, setSelectedBarangay] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const managedBarangay = formData.get("managedBarangay") as string;

        if (!name || !email || !password || !managedBarangay) {
            toast.error("All fields are required.");
            setIsSubmitting(false);
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters.");
            setIsSubmitting(false);
            return;
        }

        try {
            const result = await createBarangayAdmin(formData);
            if (result.success) {
                toast.success(`Admin for ${managedBarangay} created successfully!`);
                onClose();
            } else {
                toast.error(result.error || "Failed to create admin.");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const filteredBarangays = barangays.filter(b =>
        b.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl w-full max-w-lg border border-slate-200 dark:border-[#2a3040] shadow-2xl relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-[#2a3040] flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tight flex items-center gap-2">
                            <Shield className="w-6 h-6" style={{ color: themeColor }} />
                            Register Barangay Admin
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">
                            Create a new admin account for a barangay
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto custom-scrollbar p-6 flex-1">
                    <form id="adminForm" onSubmit={handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                name="name"
                                required
                                placeholder="E.g. Juan Dela Cruz"
                                className="font-bold h-12 rounded-xl"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <Input
                                name="email"
                                type="email"
                                required
                                autoComplete="new-email"
                                placeholder="admin@barangay.com"
                                className="font-bold h-12 rounded-xl"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                Temporary Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    autoComplete="new-password"
                                    placeholder="Min. 6 characters"
                                    className="font-bold h-12 rounded-xl pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">The admin can change this password after their first login.</p>
                        </div>

                        {/* Barangay Selector */}
                        <div className="space-y-2 relative">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                Assign to Barangay <span className="text-red-500">*</span>
                            </label>
                            {barangays.length === 0 ? (
                                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium">
                                    No barangays found. Please add a barangay first in the &quot;Add/Edit Barangays&quot; section.
                                </div>
                            ) : (
                                <div className="relative">
                                    <input type="hidden" name="managedBarangay" value={selectedBarangay} required />
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="w-full h-12 rounded-xl border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#1a1f2e] text-slate-900 dark:text-white font-bold px-4 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <span>{selectedBarangay || "Select a Barangay"}</span>
                                        <span className="text-xs text-slate-400">▼</span>
                                    </button>

                                    {isDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-[110]" onClick={() => setIsDropdownOpen(false)} />
                                            <div className="absolute z-[120] bottom-full left-0 right-0 mb-2 p-3 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-xl flex flex-col gap-2 max-h-60 overflow-hidden">
                                                <div className="relative flex-shrink-0">
                                                    <input
                                                        type="text"
                                                        placeholder="Search barangay..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>

                                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 max-h-40">
                                                    {filteredBarangays.length === 0 ? (
                                                        <div className="p-3 text-center text-xs text-slate-400 italic">No barangays match search.</div>
                                                    ) : (
                                                        filteredBarangays.map((b) => (
                                                            <button
                                                                key={b}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedBarangay(b);
                                                                    setIsDropdownOpen(false);
                                                                    setSearchQuery("");
                                                                }}
                                                                className="w-full text-left p-3 rounded-xl text-xs font-bold text-slate-750 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-[#0f1117] hover:text-slate-900 dark:hover:text-white transition-colors"
                                                            >
                                                                {b}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end p-6 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50 dark:bg-[#1a1f2e] rounded-b-3xl flex-shrink-0">
                    <Button
                        type="submit"
                        form="adminForm"
                        disabled={isSubmitting || barangays.length === 0}
                        style={{ backgroundColor: themeColor, boxShadow: `0 20px 25px -5px ${themeColor}33` }}
                        className="hover:opacity-90 text-white font-bold uppercase tracking-widest text-xs px-8 py-6 rounded-2xl transition-all duration-200"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {isSubmitting ? "Creating..." : "Create Admin Account"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
