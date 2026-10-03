"use client";

import { useHotlines } from "../providers/HotlinesProvider";
import { useHotlinesForm } from "../hooks/useHotlinesForm";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Phone, X, Save } from "lucide-react";
import lguConfig from "@/config/lgu.config.json";

export function AddHotlineModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, themeColor } = useHotlines();
    const { handleSubmit, loading } = useHotlinesForm();

    const handleClose = () => {
        setIsAddModalOpen(false);
        setTimeout(() => {
            setEditingData(null);
        }, 200);
    };

    return (
        <Dialog
            open={isAddModalOpen}
            onOpenChange={(open) => {
                setIsAddModalOpen(open);
                if (!open) {
                    setTimeout(() => {
                        setEditingData(null);
                    }, 200);
                }
            }}
        >
            <DialogContent showCloseButton={false} className="sm:max-w-4xl p-0 overflow-hidden bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl">
                <div className="relative flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
                    {/* Header */}
                    <DialogHeader
                        className="p-6 pb-4 sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040] flex flex-row items-center justify-between"
                        style={{ backgroundColor: `${themeColor}14` }}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg shadow-lg" style={{ backgroundColor: themeColor, boxShadow: `0 12px 30px -12px ${themeColor}` }}>
                                <Phone className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {editingData ? "Edit Hotline Entry" : "Add New Hotline"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                    Add important contact numbers for emergency response or public service.
                                </DialogDescription>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleClose}
                            className="h-10 w-10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 z-50 shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </DialogHeader>

                    {/* Scrollable Form Body */}
                    <div className="p-8 pb-28 overflow-y-auto custom-scrollbar">
                        <form key={editingData?.id || "new-hotline-form"} id="hotlineForm" onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Agency / Department Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={editingData?.name || ""}
                                        required
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="e.g. Municipal Police Station"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="category" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Category <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="category"
                                        name="category"
                                        defaultValue={editingData?.category || ""}
                                        required
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="e.g. Police, Fire, Medical, RHU, LGU"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="mobileNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Mobile Number
                                    </Label>
                                    <Input
                                        id="mobileNumber"
                                        name="mobileNumber"
                                        defaultValue={editingData?.mobileNumber || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder={lguConfig.contact.hotlines.police}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="telephone" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Telephone / Landline
                                    </Label>
                                    <Input
                                        id="telephone"
                                        name="telephone"
                                        defaultValue={editingData?.telephone || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder={lguConfig.contact.hotlines.fire}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="address" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Address / Location
                                    </Label>
                                    <Input
                                        id="address"
                                        name="address"
                                        defaultValue={editingData?.address || ""}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder={lguConfig.contact.address}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="order" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                        Display Priority / Order
                                    </Label>
                                    <Input
                                        id="order"
                                        name="order"
                                        type="number"
                                        defaultValue={editingData?.order ?? 1}
                                        className="bg-white dark:bg-[#0f1117] border-slate-300 dark:border-[#2a3040] text-slate-900 dark:text-white h-11"
                                        placeholder="1"
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-6 sticky bottom-0 bg-white dark:bg-[#0f1117] border-t border-slate-200 dark:border-[#2a3040] flex justify-end gap-3 z-50">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="h-11 px-6 rounded-xl border-slate-200 dark:border-slate-700 font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="hotlineForm"
                            disabled={loading}
                            className="h-11 px-6 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
                            style={{ backgroundColor: themeColor }}
                        >
                            {loading ? (
                                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span>{editingData ? "Update Hotline" : "Save Hotline"}</span>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
