"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useNews } from "../providers/NewsProvider";
import { useNewsForm } from "../hooks/useNewsForm";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image as ImageIcon, X, Loader2, Newspaper, Info, Calendar } from "lucide-react";

const categories = ["Announcement", "Local News", "Advisory", "Project Update", "Other"];

export function AddNewsModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, currentBarangay, themeColor } = useNews();
    const { handleSubmit, loading } = useNewsForm();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isImageRemoved, setIsImageRemoved] = useState<boolean>(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("Local News");
    const [otherCategory, setOtherCategory] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isAddModalOpen) {
            setIsImageRemoved(false);
            // Reset and sync image preview to active article data
            setImagePreview(editingData?.imageUrl || null);

            if (editingData?.category) {
                if (categories.includes(editingData.category)) {
                    setSelectedCategory(editingData.category);
                    setOtherCategory("");
                } else {
                    setSelectedCategory("Other");
                    setOtherCategory(editingData.category);
                }
            } else if (!editingData) {
                setSelectedCategory("Local News");
                setOtherCategory("");
            }

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } else {
            setImagePreview(null);
            setIsImageRemoved(false);
        }
    }, [editingData, isAddModalOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsImageRemoved(false);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const formatDateForInput = (dateInput: Date | string | undefined) => {
        if (!dateInput) return "";
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(date.getTime())) return "";
        const offset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offset);
        return localDate.toISOString().slice(0, 16);
    };

    return (
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) {
                setEditingData(null);
                setImagePreview(null);
                setSelectedCategory("Local News");
                setOtherCategory("");
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        }}>
            <DialogContent showCloseButton={false} className="sm:max-w-5xl p-0 overflow-hidden bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-[2.5rem]">
                <div className="flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
                    <DialogHeader
                        className="p-6 pb-4 sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040] relative overflow-hidden flex flex-row items-center justify-between"
                        style={{ backgroundColor: `${themeColor}14` }}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: themeColor, boxShadow: `0 12px 30px -12px ${themeColor}` }}>
                                <Newspaper className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                                    {editingData ? "Edit News Article" : "Publish News Article"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium italic text-sm">
                                    Keep the community informed with the latest local news and stories.
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

                    <div className="p-10 overflow-y-auto custom-scrollbar">
                        <form id="newsForm" onSubmit={handleSubmit} className="space-y-10">
                            {/* Hidden input to retain existing imageUrl when updating without a new file */}
                            <input
                                type="hidden"
                                name="imageUrl"
                                value={imagePreview && !imagePreview.startsWith("blob:") && !imagePreview.startsWith("data:") ? imagePreview : ""}
                            />
                            {/* Explicit flag to tell server the image was deleted if imagePreview is null and editingData had an image */}
                            <input
                                type="hidden"
                                name="imageRemoved"
                                value={!imagePreview && editingData?.imageUrl ? "true" : "false"}
                            />
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                {/* Left Column: Article Logic */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-2" style={{ color: themeColor }}>
                                        <Info className="w-4 h-4" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Article Information</h3>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Headline Title</Label>
                                        <Input
                                            name="title"
                                            required
                                            defaultValue={editingData?.title || ""}
                                            placeholder="e.g. Mapandan Suspends Classes During Typhoon"
                                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 rounded-xl font-bold italic"
                                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 min-w-0">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Category</Label>
                                            <AnimatePresence mode="wait">
                                                {selectedCategory !== "Other" ? (
                                                    <motion.div
                                                        key="select-cat"
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="w-full"
                                                    >
                                                        <Select
                                                            name="category_trigger"
                                                            value={selectedCategory}
                                                            onValueChange={(val) => {
                                                                setSelectedCategory(val);
                                                                if (val === "Other") setOtherCategory("");
                                                            }}
                                                        >
                                                            <SelectTrigger
                                                                className="!w-full !h-14 min-h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-black uppercase tracking-widest text-[9px] focus:ring-2"
                                                                style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                                            >
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent position="popper" className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                                                {categories.map(cat => (
                                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="input-cat"
                                                        initial={{ opacity: 0, x: 10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="relative"
                                                    >
                                                        <Input
                                                            required
                                                            autoFocus
                                                            value={otherCategory}
                                                            onChange={(e) => setOtherCategory(e.target.value)}
                                                            placeholder="Specify Category..."
                                                            className="h-14 rounded-xl font-bold italic pr-12"
                                                            style={{
                                                                backgroundColor: `${themeColor}1a`,
                                                                borderColor: themeColor
                                                            }}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedCategory("Local News");
                                                                setOtherCategory("");
                                                            }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                                                            style={{ color: themeColor }}
                                                            title="Back to Dropdown"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            <input
                                                type="hidden"
                                                name="category"
                                                value={selectedCategory === "Other" ? otherCategory : selectedCategory}
                                            />
                                            {(currentBarangay || editingData?.barangay) && (
                                                <input
                                                    type="hidden"
                                                    name="barangay"
                                                    value={editingData?.barangay || currentBarangay || ""}
                                                />
                                            )}
                                        </div>
                                        <div className="space-y-2 min-w-0">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Author</Label>
                                            <Input
                                                name="author"
                                                defaultValue={editingData?.author || "Municipal Office"}
                                                placeholder="e.g. Mayor's Office"
                                                className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <Calendar className="w-3 h-3" /> Publish Date
                                        </Label>
                                        <Input
                                            type="datetime-local"
                                            name="publishDate"
                                            required
                                            defaultValue={formatDateForInput(editingData?.publishDate || new Date().toISOString())}
                                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold"
                                        />
                                    </div>

                                    <div className="space-y-2 flex-grow">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Article Content</Label>
                                        <Textarea
                                            name="content"
                                            required
                                            defaultValue={editingData?.content || ""}
                                            placeholder="Write the full news story here..."
                                            className="min-h-[200px] bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 rounded-2xl p-5 font-medium italic resize-none"
                                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Media */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-2" style={{ color: themeColor }}>
                                        <ImageIcon className="w-4 h-4" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Featured Image</h3>
                                    </div>

                                    <div className="space-y-2">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="group relative h-80 rounded-[2rem] border-2 border-dashed bg-slate-50 dark:bg-[#1a1f2e] transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center p-2"
                                            style={{ borderColor: `${themeColor}30` }}
                                        >
                                            {imagePreview ? (
                                                <>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-[1.8rem]" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button type="button" variant="secondary" size="sm" className="font-bold rounded-xl">Change Image</Button>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-4 right-4 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setImagePreview(null);
                                                            setIsImageRemoved(true);
                                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                                        }}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="text-center p-6 space-y-3">
                                                    <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${themeColor}1a`, color: themeColor }}>
                                                        <ImageIcon className="w-8 h-8" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wide">Upload Featured Image</p>
                                                        <p className="text-xs text-slate-400 font-medium italic mt-1">PNG, JPG or WEBP up to 5MB</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            name="image"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                        <input
                                            type="hidden"
                                            name="imageRemoved"
                                            value={isImageRemoved ? "true" : "false"}
                                        />
                                        {editingData?.imageUrl && imagePreview === editingData.imageUrl && !isImageRemoved && (
                                            <input type="hidden" name="imageUrl" value={editingData.imageUrl} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    <DialogFooter className="p-6 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b]/50">
                        <div className="flex items-center justify-end space-x-3 w-full">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddModalOpen(false)}
                                className="h-12 px-6 rounded-xl font-bold border-slate-200 dark:border-[#2a3040]"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                form="newsForm"
                                disabled={loading}
                                style={{ backgroundColor: themeColor }}
                                className="h-12 px-8 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center space-x-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>{editingData ? "Update News Article" : "Publish News"}</span>
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
