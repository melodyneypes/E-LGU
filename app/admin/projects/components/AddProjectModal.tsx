"use client";

import { useProjects } from "../providers/ProjectsProvider";
import { useProjectsForm } from "../hooks/useProjectsForm";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FolderKanban, Upload, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useState, useRef, useEffect, type CSSProperties } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export function AddProjectModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, themeColor } = useProjects();
    const { handleSubmit, loading } = useProjectsForm();

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const categories = ["Infrastructure", "Health", "Education", "Social Services", "Economic", "Environment", "Other"];
    const statuses = ["Planned", "Ongoing", "Completed", "Suspended"];

    useEffect(() => {
        if (editingData?.imageUrl) {
            setImagePreview(editingData.imageUrl);
        } else {
            setImagePreview(null);
        }
        setSelectedFile(null);
    }, [editingData, isAddModalOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size should be less than 5MB");
                return;
            }
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const clearImage = () => {
        setImagePreview(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        await handleSubmit(e, selectedFile);
    };

    return (
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) {
                setTimeout(() => {
                    setEditingData(null);
                    clearImage();
                }, 200);
            }
        }}>
            <DialogContent showCloseButton={false} className="sm:max-w-5xl p-0 overflow-hidden bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl">
                <div className="relative flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
                    <DialogHeader
                        className="p-6 pb-4 sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040] flex flex-row items-center justify-between"
                        style={{ backgroundColor: `${themeColor}14` }}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg shadow-lg" style={{ backgroundColor: themeColor, boxShadow: `0 12px 30px -12px ${themeColor}` }}>
                                <FolderKanban className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {editingData ? "Edit Project" : "Add New Project"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                    Fill in the details to track and display this municipal project.
                                </DialogDescription>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsAddModalOpen(false)}
                            className="h-10 w-10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 z-50 shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </DialogHeader>

                    <div className="p-8 pb-28 overflow-y-auto custom-scrollbar">
                        <form key={editingData?.id || "new-project-form"} id="projectForm" onSubmit={onSubmit} className="space-y-8">
                            {/* Image Upload Area */}
                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Project Image / Render</Label>
                                <div
                                    className="relative group flex justify-center items-center w-full h-48 sm:h-64 rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden cursor-pointer bg-slate-50 dark:bg-slate-800/50"
                                    style={{ borderColor: imagePreview ? `${themeColor}80` : `${themeColor}40`, backgroundColor: imagePreview ? `${themeColor}0d` : undefined }}
                                    onClick={() => !imagePreview && fileInputRef.current?.click()}
                                >
                                    <Input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                    />

                                    {imagePreview ? (
                                        <>
                                            <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                                    className="font-bold rounded-lg"
                                                >
                                                    <Upload className="w-4 h-4 mr-2" /> Change Image
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    onClick={(e) => { e.stopPropagation(); clearImage(); }}
                                                    className="font-bold rounded-lg"
                                                >
                                                    <X className="w-4 h-4 mr-2" /> Remove
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-6 flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${themeColor}1a` }}>
                                                <ImageIcon className="w-6 h-6" style={{ color: themeColor }} />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Click to upload image</p>
                                            <p className="text-xs text-slate-500">SVG, PNG, JPG or GIF (max. 5MB)</p>
                                        </div>
                                    )}
                                </div>
                                {editingData?.imageUrl && imagePreview === editingData.imageUrl && (
                                    <input type="hidden" name="imageUrl" value={editingData.imageUrl} />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">Project Title</Label>
                                    <Input
                                        name="title"
                                        required
                                        defaultValue={editingData?.title ?? ""}
                                        placeholder=""
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2"
                                        style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                    />
                                </div>

                                <div className="space-y-2 min-w-0">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">Category</Label>
                                    <Select name="category" defaultValue={editingData?.category || categories[0]}>
                                        <SelectTrigger
                                            className="!w-full !h-12 min-h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                        >
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 min-w-0">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">Status</Label>
                                    <Select name="status" defaultValue={editingData?.status || statuses[0]}>
                                        <SelectTrigger
                                            className="!w-full !h-12 min-h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                        >
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            {statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">Location / Barangay</Label>
                                    <Input
                                        name="location"
                                        required
                                        defaultValue={editingData?.location ?? ""}
                                        placeholder="Where is this project located?"
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">Budget Allocation (Optional)</Label>
                                    <Input
                                        name="budget"
                                        defaultValue={editingData?.budget ?? ""}
                                        placeholder="e.g. ₱ 5,000,000.00"
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">Contractor/Agency (Optional)</Label>
                                    <Input
                                        name="contractor"
                                        defaultValue={editingData?.contractor ?? ""}
                                        placeholder="e.g. DPWH or XYZ Construction"
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">Start Date</Label>
                                    <Input
                                        type="date"
                                        name="startDate"
                                        defaultValue={(() => {
                                            if (!editingData?.startDate) return "";
                                            try {
                                                const d = new Date(editingData.startDate);
                                                return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
                                            } catch {
                                                return "";
                                            }
                                        })()}
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] [color-scheme:light] dark:[color-scheme:dark]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">Target/End Date</Label>
                                    <Input
                                        type="date"
                                        name="endDate"
                                        defaultValue={(() => {
                                            if (!editingData?.endDate) return "";
                                            try {
                                                const d = new Date(editingData.endDate);
                                                return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
                                            } catch {
                                                return "";
                                            }
                                        })()}
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] [color-scheme:light] dark:[color-scheme:dark]"
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <Label className="text-slate-700 dark:text-slate-300 font-bold">Status Progress (%)</Label>
                                    </div>
                                    <Input
                                        type="number"
                                        name="progress"
                                        min="0"
                                        max="100"
                                        defaultValue={editingData?.progress ?? 0}
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] font-bold text-center"
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-bold">Project Description</Label>
                                    <Textarea
                                        name="description"
                                        required
                                        defaultValue={editingData?.description ?? ""}
                                        placeholder="Describe the scope, goals, and impact of this project..."
                                        className="min-h-[120px] bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] resize-y"
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="absolute left-0 right-0 bottom-0 z-50 p-6 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#0f1117] dark:via-[#0f1117]/95 border-t border-slate-100 dark:border-white/5">
                        <Button
                            type="submit"
                            form="projectForm"
                            disabled={loading}
                            className="w-full h-12 text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                            style={{ backgroundColor: themeColor, boxShadow: `0 12px 30px -10px ${themeColor}` }}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Saving...</span>
                                </div>
                            ) : (
                                <span>{editingData ? "Update Project" : "Publish Project"}</span>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
