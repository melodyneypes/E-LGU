"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ShieldCheck, UserCheck, CheckCircle2, FileSpreadsheet, Radio, Building2 } from "lucide-react";

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
}

export function StaffActivityLogsCard({ initialLogs = [] }: StaffActivityLogsCardProps) {
  const [logs, setLogs] = useState<StaffActivityItem[]>(initialLogs);

  const refreshLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/staff-activity-logs", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch staff logs:", err);
    }
  }, []);

  useEffect(() => {
    refreshLogs();
    console.log("[StaffActivityLogsCard] Connecting to live SSE stream...");
    const eventSource = new EventSource("/api/admin/activity-logs/stream");
    let debounceTimer: NodeJS.Timeout | null = null;

    eventSource.onmessage = (event) => {
      if (event.data === "refresh") {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          refreshLogs();
        }, 300);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("[StaffActivityLogsCard] SSE stream reconnecting...", err);
    };

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      eventSource.close();
    };
  }, []);

  return (
    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest italic">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Staff Audit</span>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-5 relative before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-slate-100 dark:before:bg-[#2a3040]/50 flex-1">
        {logs.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <UserCheck className="w-8 h-8 mx-auto text-slate-400 opacity-40" />
            <p className="text-slate-400 dark:text-slate-500 text-xs italic">
              No staff activities recorded yet.
            </p>
          </div>
        ) : (
          logs.slice(0, 7).map((log) => (
            <div key={log.id} className="relative pl-12 group">
              {/* Timeline Icon */}
              <div className="absolute left-0 top-0.5 w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Building2 className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{log.userName}</span>
                  {log.department && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[9px] font-bold uppercase">
                      {log.department}
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug">
                  <span className="font-bold text-indigo-500 dark:text-indigo-400 mr-1">{log.action}</span>
                  {log.details}
                </p>

                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1 italic">
                  {log.time}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
