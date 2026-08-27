"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title?: string;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

export function ConfirmDeleteModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm deletion",
    description = "Are you sure you want to delete this? This action cannot be undone.",
    confirmText = "Delete",
    cancelText = "Cancel",
    isLoading = false,
}: ConfirmDeleteModalProps) {
    const handleClose = () => {
        if (!isLoading) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent
                showCloseButton={false}
                onPointerDownOutside={(e) => {
                    if (isLoading) e.preventDefault();
                    else handleClose();
                }}
                onEscapeKeyDown={(e) => {
                    if (isLoading) e.preventDefault();
                    else handleClose();
                }}
                className="sm:max-w-md p-6 bg-[#16181d] dark:bg-[#121418] border border-white/[0.08] shadow-2xl rounded-2xl transition-all duration-200 block z-[200]"
            >
                {/* Header with Title and Close X Button */}
                <div className="flex items-center justify-between gap-4 w-full mb-3">
                    <DialogTitle className="text-base font-semibold text-white tracking-normal text-left">
                        {title}
                    </DialogTitle>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Description Body */}
                <DialogDescription className="text-sm text-slate-300 dark:text-slate-300 font-normal leading-relaxed text-left mb-6">
                    {description}
                </DialogDescription>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={isLoading}
                        onClick={handleClose}
                        className="h-10 px-5 rounded-xl text-sm font-medium border border-white/[0.12] bg-[#1f222a] hover:bg-[#282c37] text-white transition-colors cursor-pointer"
                    >
                        {cancelText}
                    </Button>

                    <Button
                        type="button"
                        disabled={isLoading}
                        onClick={async (e) => {
                            e.preventDefault();
                            await onConfirm();
                        }}
                        className="h-10 px-5 rounded-xl text-sm font-medium bg-[#6e2222] hover:bg-[#852a2a] text-white border border-red-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Deleting...</span>
                            </>
                        ) : (
                            <span>{confirmText}</span>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
