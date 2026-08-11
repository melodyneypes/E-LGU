"use client";

import React from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

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
    title = "Delete Record",
    description = "Are you sure you want to delete this record? This action cannot be undone.",
    confirmText = "Delete",
    cancelText = "Cancel",
    isLoading = false,
}: ConfirmDeleteModalProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
            <AlertDialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl transition-colors">
                <AlertDialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center gap-3">
                    <div className="p-3 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                            {title}
                        </AlertDialogTitle>
                        <span className="text-[10px] font-black uppercase italic tracking-wider text-red-500 block mt-0.5">
                            Destructive Action
                        </span>
                    </div>
                </AlertDialogHeader>

                <div className="p-6 pt-4 space-y-4">
                    <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed">
                        {description}
                    </AlertDialogDescription>

                    <AlertDialogFooter className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#2a3040]">
                        <AlertDialogCancel
                            disabled={isLoading}
                            onClick={onClose}
                            className="h-10 px-5 rounded-xl text-xs font-bold border-slate-200 dark:border-[#2a3040] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {cancelText}
                        </AlertDialogCancel>

                        <AlertDialogAction
                            disabled={isLoading}
                            onClick={async (e) => {
                                e.preventDefault();
                                await onConfirm();
                            }}
                            className="h-10 px-5 rounded-xl text-xs font-black uppercase italic tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Deleting...</span>
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    <span>{confirmText}</span>
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
