"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { upsertPastMayor, deletePastMayor } from "./actions";
import { useRouter } from "next/navigation";

// Reusable Auto-Expanding Textarea Component
interface AutoGrowingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
}

function AutoGrowingTextarea({ value, onChange, className, ...props }: AutoGrowingTextareaProps) {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const adjustHeight = React.useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, []);

    React.useEffect(() => {
        adjustHeight();
    }, [value, adjustHeight]);

    React.useEffect(() => {
        window.addEventListener("resize", adjustHeight);
        return () => {
            window.removeEventListener("resize", adjustHeight);
        };
    }, [adjustHeight]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
                if (onChange) onChange(e);
                adjustHeight();
            }}
            className={className}
            {...props}
        />
    );
}

interface PastMayorsClientProps {
    initialMayors: any[];
    isBarangayAdmin?: boolean;
    themeColor?: string;
}

export function PastMayorsClient({ initialMayors, isBarangayAdmin, themeColor = "#2563eb" }: PastMayorsClientProps) {
    const router = useRouter();
    const [mayors, setMayors] = useState(initialMayors);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingMayor, setEditingMayor] = useState<any | null>(null);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    useEffect(() => {
        setMayors(initialMayors);
    }, [initialMayors]);

    const handleDelete = async (id: string) => {
        if (!confirm(`Are you sure you want to delete this specific ${isBarangayAdmin ? "captain" : "mayor"} record?`)) return;

        const result = await deletePastMayor(id);
        if (result.success) {
            toast.success(`${isBarangayAdmin ? "Past Captain" : "Past Mayor"} removed`);
            setMayors(mayors.filter(s => s.id !== id));
        } else {
            toast.error("Failed to delete record");
        }
    };

    const handleEdit = (mayor: any) => {
        setEditingMayor(mayor);
        setShowAddModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                        {isBarangayAdmin ? "Past Captains Timeline" : "Historical Leaders"}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                        {isBarangayAdmin ? "Manage the timeline of honorable captains who served." : "Manage the timeline of honorable mayors who served."}
                    </p>
                </div>
                <Button 
                    onClick={() => { setEditingMayor(null); setShowAddModal(true); }} 
                    className="text-white rounded-full px-6 gap-2 border-none self-start sm:self-center h-11 active:scale-[0.98] transition-all"
                    style={{ 
                        backgroundColor: themeColor,
                        boxShadow: `0 8px 20px -5px ${themeColor}40` 
                    }}
                >
                    <Plus className="w-4 h-4" />
                    {isBarangayAdmin ? "Add Captain" : "Add Leader"}
                </Button>
            </div>

            {mayors.length === 0 ? (
                <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 font-medium">No results found for {isBarangayAdmin ? "past captains" : "past mayors"}.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {mayors.map((mayor) => {
                        const isHovered = hoveredCard === mayor.id;
                        return (
                            <Card 
                                key={mayor.id} 
                                onMouseEnter={() => setHoveredCard(mayor.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                                className="border border-slate-200 dark:border-slate-850/80 shadow-md hover:shadow-xl overflow-hidden group transition-all duration-300 rounded-2xl relative aspect-[3/4] cursor-pointer"
                                style={{ 
                                    borderColor: isHovered ? themeColor : undefined,
                                    transform: isHovered ? "translateY(-4px)" : "translateY(0)"
                                }}
                            >
                                {/* Floating Action Buttons (Shown on Hover) */}
                                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button 
                                        type="button" 
                                        onClick={() => handleEdit(mayor)} 
                                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200/50 dark:border-slate-800 active:scale-90 transition-all hover:opacity-90"
                                        style={isHovered ? { color: themeColor } : undefined}
                                        title="Edit Profile"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handleDelete(mayor.id)} 
                                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 text-red-500 hover:text-red-650 shadow-md border border-slate-200/50 dark:border-slate-800 active:scale-90 transition-all"
                                        title="Delete Profile"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Main Card Image & Info */}
                                <div className="w-full h-full relative">
                                    {mayor.imageUrl ? (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={mayor.imageUrl} alt={mayor.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-50 dark:bg-slate-900/40 text-slate-400 pointer-events-none">
                                            <ImageIcon className="w-8 h-8 mb-2 opacity-25" />
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-45">No Portrait</span>
                                        </div>
                                    )}
                                    
                                    {/* Text Overlay */}
                                    <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 flex flex-col pointer-events-none">
                                        <span className="text-[9px] font-black uppercase tracking-widest drop-shadow-md" style={{ color: themeColor }}>
                                            {mayor.termStart} - {mayor.termEnd}
                                        </span>
                                        <span className="text-white font-black uppercase tracking-tighter text-sm md:text-base drop-shadow-lg leading-tight mt-0.5">
                                            {mayor.name}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <MayorEditorModal
                isOpen={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setEditingMayor(null);
                    router.refresh();
                }}
                initialData={editingMayor}
                isBarangayAdmin={isBarangayAdmin}
                themeColor={themeColor}
            />
        </div>
    );
}

function MayorEditorModal({ 
    isOpen, 
    onClose, 
    initialData, 
    isBarangayAdmin,
    themeColor 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    initialData: any, 
    isBarangayAdmin?: boolean,
    themeColor: string 
}) {
    const [isSaving, setIsSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.imageUrl || null);
    const [isUploaderHovered, setIsUploaderHovered] = useState(false);

    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        termStart: initialData?.termStart || "",
        termEnd: initialData?.termEnd || "",
        description: initialData?.description || "",
        order: initialData?.order || 0,
        imageUrl: initialData?.imageUrl || "",
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: initialData?.name || "",
                termStart: initialData?.termStart || "",
                termEnd: initialData?.termEnd || "",
                description: initialData?.description || "",
                order: initialData?.order || 0,
                imageUrl: initialData?.imageUrl || "",
            });
            setPreviewUrl(initialData?.imageUrl || null);
            setImageFile(null);
        }
    }, [isOpen, initialData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return toast.error("Name is required");

        const data = new FormData();
        data.append("name", formData.name);
        data.append("termStart", formData.termStart);
        data.append("termEnd", formData.termEnd);
        data.append("description", formData.description);
        data.append("order", formData.order.toString());
        data.append("imageUrl", formData.imageUrl);

        if (imageFile) {
            data.append("past-mayor", imageFile);
        }

        setIsSaving(true);
        try {
            const result = await upsertPastMayor(initialData?.id || null, data);
            if (result.success) {
                toast.success(initialData ? "Updated successfully!" : "Added successfully!");
                onClose();
            } else {
                toast.error(`Failed: ${result.error}`);
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl">
                <div className="flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
                    <DialogHeader className="p-6 pb-4 bg-slate-50/50 dark:bg-[#151b2b] sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040]">
                        <div className="flex items-center space-x-3 mb-1">
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {initialData 
                                      ? (isBarangayAdmin ? "Edit Captain Profile" : "Edit Mayor Profile") 
                                      : (isBarangayAdmin ? "Add Past Captain" : "Add Past Mayor")}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                    {isBarangayAdmin 
                                      ? "Record the legacy of those who served our barangay." 
                                      : "Record the legacy of those who served our municipality."}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form id="mayorForm" onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left side form fields */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">
                                        Full Name
                                    </Label>
                                    <Input
                                        placeholder="e.g. Hon. Juan De La Cruz"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] font-bold"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-bold">
                                            Term Start
                                        </Label>
                                        <Input
                                            placeholder="1990"
                                            required
                                            value={formData.termStart}
                                            onChange={(e) => setFormData({ ...formData, termStart: e.target.value })}
                                            className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-bold">
                                            Term End
                                        </Label>
                                        <Input
                                            placeholder="1995"
                                            required
                                            value={formData.termEnd}
                                            onChange={(e) => setFormData({ ...formData, termEnd: e.target.value })}
                                            className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">
                                        Display Order
                                    </Label>
                                    <Input
                                        type="number"
                                        value={formData.order}
                                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                    />
                                    <p className="text-[10px] text-slate-500 italic">Determines the position in the public timeline.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">
                                        Key Highlights
                                    </Label>
                                    <AutoGrowingTextarea
                                        placeholder="• Accomplishment one&#10;• Accomplishment two"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full min-h-[160px] p-4 rounded-xl border border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-[#1a1f2e] text-sm outline-none leading-relaxed text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 shadow-inner font-medium resize-none overflow-hidden"
                                    />
                                    <p className="text-[9px] text-slate-400 font-medium">Tip: Use bullet points (•) for consistency.</p>
                                </div>
                            </div>

                            {/* Right side Portrait Upload */}
                            <div className="space-y-6">
                                <Label className="text-slate-700 dark:text-slate-300 font-bold block text-center">Portrait Photo</Label>
                                <div 
                                    onClick={() => document.getElementById('mayorImageFileInput')?.click()}
                                    onMouseEnter={() => setIsUploaderHovered(true)}
                                    onMouseLeave={() => setIsUploaderHovered(false)}
                                    className="aspect-[3/4] rounded-2xl bg-slate-50 dark:bg-[#1a1f2e] overflow-hidden relative border-2 border-dashed border-slate-300 dark:border-[#2a3040] group cursor-pointer transition-all shadow-inner flex items-center justify-center mx-auto w-full max-w-[280px]"
                                    style={{ 
                                        borderColor: isUploaderHovered ? themeColor : undefined 
                                    }}
                                >
                                    {previewUrl || formData.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={previewUrl || formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-slate-400 flex flex-col items-center">
                                            <span className="text-xs uppercase font-black tracking-widest opacity-50">Upload Portrait</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                        <Button type="button" variant="secondary" size="sm" className="font-bold">Change Image</Button>
                                    </div>
                                    <input
                                        id="mayorImageFileInput"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>

                    <DialogFooter className="p-6 pt-0 bg-white dark:bg-[#0f1117] border-none shrink-0">
                        <Button
                            type="submit"
                            form="mayorForm"
                            disabled={isSaving}
                            className="w-full h-12 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] border-none"
                            style={{ 
                                backgroundColor: themeColor,
                                boxShadow: `0 10px 20px -5px ${themeColor}40`
                            }}
                        >
                            {isSaving ? (
                                "Saving..."
                            ) : (
                                initialData ? "Update Record" : "Add Record"
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
