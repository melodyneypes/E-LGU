"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Unlock, AlertTriangle } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { activateUser } from "../actions";

type UserWithProfile = {
  id: string;
  name: string | null;
  email: string | null;
  isEmailVerified: boolean;
};

interface ActivateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithProfile | null;
}

export function ActivateUserModal({
  isOpen,
  onClose,
  user,
}: ActivateUserModalProps) {
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleActivate = async () => {
    setLoading(true);
    try {
      const res = await activateUser(user.id);
      if (res.success) {
        toast.success(`User ${user.name || user.email} account activated and unlocked successfully!`);
        onClose();
      } else {
        toast.error(res.error || "Failed to activate user");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] rounded-[2rem] border-slate-100 dark:border-white/5 bg-white dark:bg-[#0c111d] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 bg-amber-500/10 dark:bg-amber-500/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Unlock className="w-5 h-5 animate-bounce" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              Unlock <span className="text-amber-500">Account</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium italic">
            You are about to restore access for a deactivated user.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400">Target User</span>
              <span className="font-bold text-slate-900 dark:text-white uppercase mt-0.5">{user.name || "Unnamed User"}</span>
              <span className="text-xs text-slate-500 mt-0.5">{user.email}</span>
            </div>
            
            <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/50 dark:border-white/5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-normal">
                This action will reset their rejection count to <span className="font-extrabold text-amber-600 dark:text-amber-400">0</span> and mark their email as <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Verified</span>.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onClose}
              className="w-full sm:w-1/2 h-12 rounded-xl font-bold uppercase tracking-wider text-xs border-slate-200 dark:border-white/10 dark:bg-white/5 text-slate-700 dark:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={handleActivate}
              className="w-full sm:w-1/2 h-12 rounded-xl font-black uppercase italic tracking-widest text-xs transition-all shadow-xl hover:scale-[1.02] active:scale-95 text-white bg-amber-500 hover:bg-amber-600 border-0"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Unlock Account"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
