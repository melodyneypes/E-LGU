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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@prisma/client";
import { Loader2, UserPlus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { createUser, getBarangaysList } from "../actions";
import { AVAILABLE_PAGES } from "./availablePages";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor?: string | null;
}

export function AddUserModal({
  isOpen,
  onClose,
  themeColor,
}: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [barangays, setBarangays] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [role, setRole] = useState<UserRole>("USER");

  useEffect(() => {
    if (isOpen) {
      getBarangaysList().then((res) => {
        if (res.success) setBarangays(res.data || []);
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await createUser(formData);
      if (res.success) {
        toast.success("User created successfully!");
        onClose();
      } else {
        toast.error(res.error || "Failed to create user");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[760px] rounded-[2rem] border-slate-100 dark:border-white/5 bg-white dark:bg-[#0c111d] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 bg-slate-50 dark:bg-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="p-2 rounded-xl"
              style={{
                backgroundColor: themeColor ? `${themeColor}1A` : undefined,
              }}
            >
              <UserPlus
                className="w-5 h-5"
                style={{ color: themeColor ?? undefined }}
              />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
              Provision{" "}
              <span style={{ color: themeColor ?? undefined }}>Account</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium italic">
            Create a new administrative or resident account. All admin-created
            accounts are auto-verified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[75vh] md:max-h-[560px] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400"
                >
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. Juan Dela Cruz"
                  required
                  className="!h-12 !w-full rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/5 italic font-medium px-3 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="juan@example.com"
                  required
                  className="!h-12 !w-full rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/5 italic font-medium px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col justify-end gap-2">
                  <Label
                    htmlFor="role"
                    className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400"
                  >
                    Account Role
                  </Label>
                  <Select
                    name="role"
                    defaultValue="USER"
                    onValueChange={(v) => setRole(v as UserRole)}
                  >
                    <SelectTrigger className="!h-12 !w-full rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/5 italic font-medium px-3 text-sm">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>

                    <SelectContent className="rounded-xl border-slate-100 dark:border-white/10 bg-white dark:bg-[#151b2b]">
                      <SelectItem value="USER">Resident / User</SelectItem>
                      <SelectItem value="ADMIN">System Admin</SelectItem>
                      <SelectItem value="CONTENT_ADMIN">Content Admin</SelectItem>
                      <SelectItem value="BARANGAY_ADMIN">
                        Barangay Admin
                      </SelectItem>
                      <SelectItem value="TREASURY_STAFF">
                        Treasury Staff
                      </SelectItem>
                      <SelectItem value="ADMIN_AIDE">Admin Aide</SelectItem>
                      <SelectItem value="RIDER">Logistics Rider</SelectItem>
                      <SelectItem value="ENGINEER">Municipal Engineer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col justify-end gap-2">
                  <Label
                    htmlFor="password"
                    className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400"
                  >
                    Account Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="!h-12 !w-full rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/5 italic font-medium px-3 text-sm"
                  />
                </div>
              </div>

              {role === "BARANGAY_ADMIN" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label
                    htmlFor="managedBarangay"
                    className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400"
                  >
                    Managed Barangay
                  </Label>
                  <Select name="managedBarangay" required>
                    <SelectTrigger className="!h-12 !w-full rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/5 italic font-medium px-3 text-sm">
                      <SelectValue placeholder="Select Barangay" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 dark:border-white/10 bg-white dark:bg-[#151b2b]">
                      {barangays.map((b) => (
                        <SelectItem key={b.id} value={b.name}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="department"
                  className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400"
                >
                  Assigned Department
                </Label>
                <Input
                  id="department"
                  name="department"
                  placeholder="e.g. Treasury, BPLO, Civil Registry"
                  className="!h-12 !w-full rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/5 italic font-medium px-3 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400">
                  Accessible Pages (Custom Override)
                </Label>
                <div className="border border-slate-200 dark:border-white/10 rounded-xl p-5 bg-slate-50/50 dark:bg-[#0f121d] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {AVAILABLE_PAGES.map((page) => (
                    <label
                      key={page.path}
                      className="flex items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        name="accessiblePages"
                        value={page.path}
                        className="mt-1 rounded border-slate-300 dark:border-white/10 text-primary focus:ring-primary h-4 w-4 transition-colors shrink-0"
                        style={{ accentColor: themeColor ?? undefined }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold leading-tight truncate">{page.label}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">{page.category}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 pt-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 shrink-0">
            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: themeColor ?? undefined }}
              className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest text-xs transition-all shadow-xl hover:scale-[1.02] active:scale-95 text-white hover:opacity-90 border-0"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Create User Account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
