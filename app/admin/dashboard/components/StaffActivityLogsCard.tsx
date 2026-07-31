"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ShieldCheck, UserCheck, Building2 } from "lucide-react";

export interface StaffActivityItem {
  id: string;
  userId?: string;
  userName: string;
  userRole?: string;
  department?: string;
  action: string;
  module: string;
  details: string;
  time: string;
  createdAt: string;
}

interface StaffActivityLogsCardProps {
  initialLogs?: StaffActivityItem[];
  maxItems?: number;
}

function maskName(rawName: string): string {
  if (!rawName || typeof rawName !== "string") return rawName || "";
  const trimmed = rawName.trim();
  if (trimmed.includes("@")) {
    const parts = trimmed.split("@");
    return parts[0].length > 2 ? `${parts[0].slice(0, 3)}***@${parts[1]}` : rawName;
  }
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) return trimmed;
  const firstName = words.slice(0, -1).join(" ");
  const lastInitial = words[words.length - 1][0]?.toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

export function StaffActivityLogsCard({ initialLogs = [], maxItems = 7 }: StaffActivityLogsCardProps) {
  const [logs, setLogs] = useState<StaffActivityItem[]>(initialLogs);

  // Sync state with initialLogs prop when server re-renders
  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  const refreshLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/staff-activity-logs", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) {
          console.log("[StaffActivityLogsCard] Realtime updated logs count:", data.logs.length);
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch staff logs silently:", err);
    }
  }, []);

  useEffect(() => {
    console.log("[StaffActivityLogsCard] Connecting to SSE stream...");
    const eventSource = new EventSource("/api/admin/activity-logs/stream");
    let debounceTimer: NodeJS.Timeout | null = null;

    const handleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshLogs();
      }, 300);
    };

    eventSource.onmessage = (event) => {
      if (event.data === "refresh") {
        handleRefresh();
      }
    };

    eventSource.onerror = (err) => {
      console.warn("[StaffActivityLogsCard] SSE stream reconnecting...", err);
    };

    // Window focus & custom event listeners for instant zero-polling updates
    window.addEventListener("focus", handleRefresh);
    window.addEventListener("staff_activity_updated", handleRefresh);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      eventSource.close();
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("staff_activity_updated", handleRefresh);
    };
  }, [refreshLogs]);

  return (
    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pr-20">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            <span>Staff Audit Logs</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Employee Operational Audit Trail
          </p>
        </div>
      </div>

      {/* Timeline List */}
      <div className="relative before:absolute before:inset-y-0 before:left-[23px] before:w-[2px] before:bg-slate-100 dark:before:bg-[#2a3040]/50 flex-1 flex flex-col justify-between py-1">
        {logs.length === 0 ? (
          <div className="text-center py-12 space-y-2 flex-1 flex flex-col items-center justify-center">
            <UserCheck className="w-8 h-8 mx-auto text-slate-400 opacity-40" />
            <p className="text-slate-400 dark:text-slate-500 text-xs italic">
              No staff activities recorded yet.
            </p>
          </div>
        ) : (
          logs.slice(0, maxItems).map((log) => (
            <div key={log.id} className="relative pl-14 flex-1 flex items-start py-1.5 group">
              {/* Timeline Icon */}
              <div className="absolute left-0 top-1 w-11 h-11 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Building2 className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-black text-slate-900 dark:text-white text-sm truncate">{log.userName}</span>
                    {log.department && (
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider border border-indigo-500/20">
                        {log.department}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 italic shrink-0">
                    {(() => {
                      const rawStr = String(log.createdAt || "").trim();
                      const createdDate = new Date(rawStr);
                      if (isNaN(createdDate.getTime())) return log.time;
                      let dateMs = createdDate.getTime();
                      const nowMs = Date.now();
                      if (dateMs > nowMs + 60000) {
                        dateMs -= 8 * 60 * 60 * 1000;
                      }
                      const sec = Math.floor((nowMs - dateMs) / 1000);
                      if (sec < 60) return "Just now";
                      const min = Math.floor(sec / 60);
                      if (min < 60) return `${min} min${min > 1 ? "s" : ""} ago`;
                      const hr = Math.floor(min / 60);
                      if (hr < 24) return `${hr} hr${hr > 1 ? "s" : ""} ago`;
                      const day = Math.floor(hr / 24);
                      return `${day} day${day > 1 ? "s" : ""} ago`;
                    })()}
                  </span>
                </div>

                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-snug break-words">
                  <span className="font-black text-indigo-500 dark:text-indigo-400 mr-1 uppercase italic">{log.action}</span>
                  {log.details}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
