"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Edit,
  Filter,
  Mail,
  Search,
  Trash2,
  Unlock,
  User as UserIcon,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { AddUserModal } from "./AddUserModal";
import { EditUserModal } from "./EditUserModal";
import { ActivateUserModal } from "./ActivateUserModal";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deleteUser } from "../actions";

import { UserRole } from "@prisma/client";

type UserWithProfile = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  isEmailVerified: boolean;
  role: UserRole;
  rejectionCount?: number;
  department?: string | null;
  createdAt: Date;
  residentProfile: {
    id: string;
    registrationStatus: string;
  } | null;
};

export function UsersPage({
  users,
  themeColor,
}: {
  users: UserWithProfile[];
  themeColor?: string | null;
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit & Delete states and handlings
  const [selectedUserToEdit, setSelectedUserToEdit] =
    useState<UserWithProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [selectedUserToActivate, setSelectedUserToActivate] =
    useState<UserWithProfile | null>(null);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);

  const handleEditClick = (user: UserWithProfile) => {
    setSelectedUserToEdit(user);
    setIsEditModalOpen(true);
  };

  const handleActivateClick = (user: UserWithProfile) => {
    setSelectedUserToActivate(user);
    setIsActivateModalOpen(true);
  };

  const handleDeleteClick = async (userId: string) => {
    if (
      !confirm(
        "Are you absolutely sure you want to delete this user account? This action is permanent and cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const res = await deleteUser(userId);
      if (res.success) {
        toast.success("User account deleted successfully!");
      } else {
        toast.error(res.error || "Failed to delete user");
      }
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  // Search, Filter, Sort, and Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedVerification, setSelectedVerification] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Toggle sorting direction
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  // Advanced Live Filtering
  const filteredUsers = users.filter((user) => {
    const nameMatch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const emailMatch =
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const matchesSearch = searchQuery === "" || nameMatch || emailMatch;

    const matchesRole = selectedRole === "ALL" || user.role === selectedRole;

    const matchesVerification =
      selectedVerification === "ALL" ||
      (selectedVerification === "VERIFIED" && user.isEmailVerified) ||
      (selectedVerification === "UNVERIFIED" && !user.isEmailVerified);

    return matchesSearch && matchesRole && matchesVerification;
  });

  // Date Sorting
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  // Pagination Calculations
  const totalItems = sortedUsers.length;

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const activePage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-slate-900 dark:text-white">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
            User Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Control and monitor user accounts, verification status, and linked
            profiles.
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-100 dark:bg-blue-500/20 rounded-2xl">
            <UserIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Total Users</h3>
            <p className="text-3xl font-black">{users.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
          <div className="p-4 bg-green-100 dark:bg-green-500/20 rounded-2xl">
            <BadgeCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Verified</h3>
            <p className="text-3xl font-black">
              {users.filter((u) => u.isEmailVerified).length}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
          <div className="p-4 bg-amber-100 dark:bg-amber-500/20 rounded-2xl">
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">
              Pending Approval
            </h3>
            <p className="text-3xl font-black">
              {users.filter((u) => !u.isEmailVerified).length}
            </p>
          </div>
        </div>
      </div>

      {/* Premium Action Toolbar (Relocated Provision User button here!) */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white dark:bg-[#151b2b] p-4 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm">
        <div className="flex flex-col md:flex-row flex-wrap items-center gap-4 w-full lg:w-auto flex-1">
          <div className="relative w-full sm:w-[220px] lg:w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 !h-12 !w-full bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] focus-visible:ring-0 rounded-xl transition-all font-black italic text-[10px] uppercase tracking-wider"
            />
          </div>

          <div className="w-full sm:w-[220px] lg:w-[260px]">
            <Select
              value={selectedRole}
              onValueChange={(val) => {
                setSelectedRole(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="!w-full !h-12 bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl flex items-center text-[10px] font-black uppercase italic tracking-wider px-3">
                <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>

              <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl">
                <SelectItem
                  value="ALL"
                  className="text-[10px] font-black uppercase italic"
                >
                  All Roles
                </SelectItem>
                <SelectItem
                  value="USER"
                  className="text-[10px] font-black uppercase italic"
                >
                  Resident / User
                </SelectItem>
                <SelectItem
                  value="ADMIN"
                  className="text-[10px] font-black uppercase italic"
                >
                  System Admin
                </SelectItem>
                <SelectItem
                  value="CONTENT_ADMIN"
                  className="text-[10px] font-black uppercase italic"
                >
                  Content Admin
                </SelectItem>
                <SelectItem
                  value="BARANGAY_ADMIN"
                  className="text-[10px] font-black uppercase italic"
                >
                  Barangay Admin
                </SelectItem>
                <SelectItem
                  value="TREASURY_STAFF"
                  className="text-[10px] font-black uppercase italic"
                >
                  Treasury Staff
                </SelectItem>
                <SelectItem
                  value="ADMIN_AIDE"
                  className="text-[10px] font-black uppercase italic"
                >
                  Admin Aide
                </SelectItem>
                <SelectItem
                  value="RIDER"
                  className="text-[10px] font-black uppercase italic"
                >
                  Logistics Rider
                </SelectItem>
                <SelectItem
                  value="ENGINEER"
                  className="text-[10px] font-black uppercase italic"
                >
                  Municipal Engineer
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[220px] lg:w-[260px]">
            <Select
              value={selectedVerification}
              onValueChange={(val) => {
                setSelectedVerification(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="!w-full !h-12 bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl flex items-center text-[10px] font-black uppercase italic tracking-wider px-3">
                <BadgeCheck className="w-3.5 h-3.5 mr-2 text-slate-400" />
                <SelectValue placeholder="All Verification" />
              </SelectTrigger>

              <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl">
                <SelectItem
                  value="ALL"
                  className="text-[10px] font-black uppercase italic"
                >
                  All Verification
                </SelectItem>
                <SelectItem
                  value="VERIFIED"
                  className="text-[10px] font-black uppercase italic"
                >
                  Verified Only
                </SelectItem>
                <SelectItem
                  value="UNVERIFIED"
                  className="text-[10px] font-black uppercase italic"
                >
                  Unverified Only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="h-12 px-6 rounded-xl bg-primary text-white font-black uppercase italic tracking-widest text-[10px] shadow-lg shadow-primary/10 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-2 w-full lg:w-auto shrink-0 justify-center"
        >
          <UserPlus className="w-4 h-4 animate-pulse" />
          Add New User
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-2xl shadow-blue-500/5 overflow-hidden ring-1 ring-slate-200 dark:ring-white/5">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold py-5">User Details</TableHead>
              <TableHead className="font-bold">Verification Status</TableHead>
              <TableHead className="font-bold">Role & Departments</TableHead>
              <TableHead className="font-bold">Resident Profile</TableHead>
              <TableHead
                onClick={toggleSortOrder}
                className="font-bold cursor-pointer select-none group/sort hover:text-primary transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Joined Date</span>
                  {sortOrder === "desc" ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover/sort:text-primary transition-colors" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover/sort:text-primary transition-colors" />
                  )}
                </div>
              </TableHead>
              <TableHead className="font-bold text-right pr-8">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="h-40 text-center text-slate-500 font-medium italic uppercase tracking-widest text-[10px]"
                >
                  {users.length === 0
                    ? "No user accounts found in database."
                    : "No user accounts match your filters / search criteria."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50"
                >
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white uppercase leading-tight">
                        {user.name || "Unnamed User"}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3 text-blue-500" /> {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {user.isEmailVerified ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200 font-black uppercase text-[10px] w-fit italic tracking-tighter">
                          <BadgeCheck className="w-3 h-3 mr-1" /> Verified
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-slate-50 text-slate-400 border-slate-200 font-black uppercase text-[10px] w-fit italic tracking-tighter"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Unverified
                        </Badge>
                      )}
                      {user.emailVerified && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          at {format(new Date(user.emailVerified), "PPP p")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      {/* Role Badge */}
                      {(() => {
                        let style =
                          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                        if (user.role === "ADMIN")
                          style =
                            "bg-rose-500/10 text-rose-500 border-rose-500/20";
                        else if (user.role === "ADMIN_AIDE")
                          style =
                            "bg-purple-500/10 text-purple-500 border-purple-500/20";
                        else if (user.role === "TREASURY_STAFF")
                          style =
                            "bg-blue-500/10 text-blue-500 border-blue-500/20";
                        else if (user.role === "BARANGAY_ADMIN")
                          style =
                            "bg-teal-500/10 text-teal-500 border-teal-500/20";
                        else if (user.role === "CONTENT_ADMIN")
                          style =
                            "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
                        else if (user.role === "ENGINEER")
                          style =
                            "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                        else if (user.role === "RIDER")
                          style =
                            "bg-amber-500/10 text-amber-500 border-amber-500/20";

                        return (
                          <Badge
                            variant="outline"
                            className={`font-black uppercase text-[9px] w-fit italic tracking-wider py-0.5 px-2 ${style}`}
                          >
                            {user.role.replace("_", " ")}
                          </Badge>
                        );
                      })()}

                      {/* Department Sub-Pill */}
                      {user.department ? (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {(() => {
                            const depUpper = user.department.toUpperCase();
                            let label = user.department;
                            let style =
                              "bg-slate-100/50 text-slate-500 dark:bg-white/5 dark:text-slate-400";
                            if (
                              depUpper.includes("TREASURY") ||
                              depUpper.includes("TREASURER")
                            ) {
                              label = `🏦 ${user.department}`;
                              style =
                                "bg-blue-500/5 text-blue-500 dark:bg-blue-500/10";
                            } else if (depUpper.includes("BPLO")) {
                              label = `📄 ${user.department}`;
                              style =
                                "bg-violet-500/5 text-violet-500 dark:bg-violet-500/10";
                            } else if (
                              depUpper.includes("LCR") ||
                              depUpper.includes("CIVIL") ||
                              depUpper.includes("REGISTRY")
                            ) {
                              label = `👥 ${user.department}`;
                              style =
                                "bg-pink-500/5 text-pink-500 dark:bg-pink-500/10";
                            }

                            return (
                              <span
                                className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border border-transparent dark:border-white/5 ${style}`}
                              >
                                {label}
                              </span>
                            );
                          })()}
                        </div>
                      ) : ["ADMIN", "ADMIN_AIDE", "TREASURY_STAFF"].includes(
                          user.role,
                        ) ? (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic font-medium mt-0.5">
                          No Dept Assigned
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.residentProfile ? (
                      <Badge
                        variant="outline"
                        className={`font-black uppercase text-[10px] italic tracking-tighter ${
                          user.residentProfile.registrationStatus === "APPROVED"
                            ? "bg-blue-50 text-blue-600 border-blue-200"
                            : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}
                      >
                        {user.residentProfile.registrationStatus} PROFILE
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400 italic font-medium">
                        No Resident Profile
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 font-bold text-xs uppercase">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      {user.rejectionCount !== undefined && user.rejectionCount >= 3 && !user.isEmailVerified && (
                        <Button
                          variant="outline"
                          onClick={() => handleActivateClick(user)}
                          className="h-8 w-8 p-0 rounded-lg border-green-200 hover:bg-green-50 dark:hover:bg-green-500/10 hover:text-green-500 transition-all shadow-sm bg-transparent text-green-600 dark:border-green-500/30"
                          title="Activate and Unlock User Account"
                        >
                          <Unlock className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => handleEditClick(user)}
                        className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-[#2a3040] hover:bg-slate-50 dark:hover:bg-white/5 hover:text-blue-500 transition-all shadow-sm bg-transparent"
                        title="Edit User Account"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDeleteClick(user.id)}
                        className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-[#2a3040] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-all shadow-sm bg-transparent"
                        title="Delete User Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Premium Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
            Showing{" "}
            <span className="text-slate-900 dark:text-white font-black">
              {totalItems === 0 ? 0 : startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="text-slate-900 dark:text-white font-black">
              {endIndex}
            </span>{" "}
            of{" "}
            <span className="text-slate-900 dark:text-white font-black">
              {totalItems}
            </span>{" "}
            users
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                Users/page
              </span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(val) => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[90px] bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl text-[10px] font-black uppercase italic tracking-wider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl">
                  <SelectItem
                    value="10"
                    className="text-[10px] font-black uppercase italic"
                  >
                    10
                  </SelectItem>
                  <SelectItem
                    value="20"
                    className="text-[10px] font-black uppercase italic"
                  >
                    20
                  </SelectItem>
                  <SelectItem
                    value="50"
                    className="text-[10px] font-black uppercase italic"
                  >
                    50
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={activePage === 1}
              className="h-10 px-4 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 text-[10px] font-black uppercase italic tracking-widest transition-all"
            >
              <ChevronLeft className="w-4 h-4 mr-1.5" /> Prev
            </Button>

            {/* Page number buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = pageNum === activePage;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "w-10 h-10 rounded-xl font-black text-[10px] uppercase italic tracking-wider transition-all",
                      isCurrent
                        ? "bg-primary text-white shadow-md shadow-primary/20 scale-105 hover:bg-primary"
                        : "bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-[#2a3040] text-slate-700 dark:text-slate-200",
                    )}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={activePage === totalPages}
              className="h-10 px-4 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 text-[10px] font-black uppercase italic tracking-widest transition-all"
            >
              Next <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        themeColor={themeColor}
      />
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUserToEdit(null);
        }}
        user={selectedUserToEdit}
        themeColor={themeColor}
      />
      <ActivateUserModal
        isOpen={isActivateModalOpen}
        onClose={() => {
          setIsActivateModalOpen(false);
          setSelectedUserToActivate(null);
        }}
        user={selectedUserToActivate}
      />
    </div>
  );
}
