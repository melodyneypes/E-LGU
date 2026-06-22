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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Scan } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { assignUserRFID } from "../actions";

interface AssignRFIDModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    rfid?: string | null;
  } | null;
  themeColor?: string | null;
}

export function AssignRFIDModal({
  isOpen,
  onClose,
  user,
  themeColor,
}: AssignRFIDModalProps) {
  const [loading, setLoading] = useState(false);
  const [rfidValue, setRfidValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRfidValue(user?.rfid || "");
      // Auto-focus input for scanning
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await assignUserRFID(user.id, rfidValue);
      if (res.success) {
        toast.success("RFID tag assigned successfully!");
        onClose();
      } else {
        toast.error(res.error || "Failed to assign RFID");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!user.rfid) return;
    if (!confirm("Are you sure you want to unassign/remove the RFID tag for this user?")) return;
    
    setLoading(true);
    try {
      const res = await assignUserRFID(user.id, null);
      if (res.success) {
        toast.success("RFID tag removed successfully!");
        onClose();
      } else {
        toast.error(res.error || "Failed to remove RFID");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-slate-100 dark:border-white/5 bg-white dark:bg-[#0c111d] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 bg-slate-50 dark:bg-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="p-2 rounded-xl"
              style={{
                backgroundColor: themeColor ? `${themeColor}1A` : undefined,
              }}
            >
              <CreditCard
                className="w-5 h-5"
                style={{ color: themeColor ?? undefined }}
              />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
              RFID{" "}
              <span style={{ color: themeColor ?? undefined }}>
                Configuration
              </span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium italic">
            Assign a physical RFID Card / Fob to authorize this account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target User</div>
              <div className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase">{user.name || "Unnamed"}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-primary italic mt-1">{user.role.replace("_", " ")}</div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="rfid"
                className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400 flex items-center justify-between"
              >
                <span>RFID Card Number</span>
                <span className="text-[9px] font-black text-emerald-500 flex items-center gap-1">
                  <Scan className="w-3 h-3 animate-pulse" /> Ready to scan tag
                </span>
              </Label>
              <Input
                id="rfid"
                ref={inputRef}
                value={rfidValue}
                onChange={(e) => setRfidValue(e.target.value)}
                placeholder="Scan Card or Enter RFID UID..."
                className="!h-14 !w-full rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/5 italic font-bold text-center tracking-widest text-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 px-3 uppercase"
                autoComplete="off"
              />
              <p className="text-[10px] text-slate-400 italic">
                Tip: Place cursor in the box and scan the card using your physical RFID scanner, or type it manually.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
            {user.rfid && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={loading}
                className="h-12 rounded-xl font-black uppercase italic tracking-widest text-[10px] border-red-200 dark:border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-1"
              >
                Unassign RFID
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: themeColor ?? undefined }}
              className="h-12 rounded-xl font-black uppercase italic tracking-widest text-[10px] text-white hover:opacity-90 transition-all flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save RFID"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
