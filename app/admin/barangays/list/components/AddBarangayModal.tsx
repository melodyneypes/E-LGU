"use client";

import { useState } from "react";
import { X, Save, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { addBarangay, updateBarangay } from "../actions";

interface AddBarangayModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void | Promise<void>;
    editingItem?: any;
    themeColor?: string;
}

export function AddBarangayModal({ 
    isOpen, 
    onClose, 
    onSuccess,
    editingItem, 
    themeColor = "#2563eb" 
}: AddBarangayModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        
        try {
            const result = editingItem
                ? await updateBarangay(editingItem.id, formData)
                : await addBarangay(formData);

            if (result.success) {
                toast.success(`Barangay "${formData.get("name")}" ${editingItem ? "updated" : "added"} successfully!`);
                onClose();
                if (onSuccess) {
                    await onSuccess();
                }
            } else {
                toast.error(result.error || "Action failed");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl w-full max-w-2xl border border-slate-200 dark:border-[#2a3040] shadow-2xl relative my-8 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-[#2a3040] flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tight flex items-center gap-2">
                            <Building2 className="w-6 h-6" style={{ color: themeColor }} />
                            {editingItem ? "Edit Barangay Hub" : "Register Barangay"}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">
                            {editingItem ? "Update official data" : "Add a new barangay to the system"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar p-6 flex-1">
                    <form id="barangayForm" onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Barangay Name <span className="text-red-500">*</span></label>
                            <Input name="name" defaultValue={editingItem?.name} required placeholder="Enter barangay name" className="text-lg font-bold h-12 rounded-xl" />
                        </div>
                    </form>
                </div>
                
                <div className="flex items-center justify-end p-6 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50 dark:bg-[#1a1f2e] rounded-b-3xl flex-shrink-0">
                    <Button 
                        type="submit" form="barangayForm" disabled={isSubmitting}
                        style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                        className="text-white font-bold uppercase tracking-widest text-xs px-8 py-6 rounded-2xl hover:opacity-90 transition-all cursor-pointer"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {isSubmitting ? "Saving..." : editingItem ? "Save Changes" : "Register Barangay"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
