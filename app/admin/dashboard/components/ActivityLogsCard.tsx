"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Activity, UserPlus, FileText, CheckCircle2, AlertTriangle } from "lucide-react";

interface ActivityLogItem {
  id: string;
  type: "resident" | "transaction" | "payment" | "report";
  user: string;
  action: string;
  details: string;
  time: string;
  createdAt: Date;
}

interface ActivityLogsCardProps {
  logs: ActivityLogItem[];
  selectedBarangay?: string;
  maxItems?: number;
}

const typeIcons = {
  resident: UserPlus,
  transaction: FileText,
  payment: CheckCircle2,
  report: AlertTriangle,
};

const typeColors = {
  resident: "text-blue-500 bg-blue-500/10",
  transaction: "text-purple-500 bg-purple-500/10",
  payment: "text-emerald-500 bg-emerald-500/10",
  report: "text-amber-500 bg-amber-500/10",
};

export function ActivityLogsCard({ logs: initialLogs, selectedBarangay = "", maxItems = 7 }: ActivityLogsCardProps) {
  const [currentLogs, setCurrentLogs] = useState<ActivityLogItem[]>(initialLogs);

  useEffect(() => {
    setCurrentLogs(initialLogs);
  }, [initialLogs]);

  const refreshActivityLogsOnly = useCallback(async () => {
    try {
      const param = selectedBarangay ? `?barangay=${encodeURIComponent(selectedBarangay)}` : "";
      const res = await fetch(`/api/admin/activity-logs${param}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) {
          console.log("[ActivityLogsCard] Updated logs count:", data.logs.length);
          setCurrentLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch fresh activity logs silently:", err);
    }
  }, [selectedBarangay]);

  useEffect(() => {
    console.log("[ActivityLogsCard] Connecting to Supabase Realtime SSE stream...");
    const eventSource = new EventSource("/api/admin/activity-logs/stream");
    let debounceTimer: NodeJS.Timeout | null = null;

    eventSource.onmessage = (event) => {
      if (event.data === "refresh") {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          refreshActivityLogsOnly();
        }, 300);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("[ActivityLogsCard] SSE stream reconnecting...", err);
    };

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      eventSource.close();
    };
  }, [refreshActivityLogsOnly]);

  return (
    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pr-20">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-500" />
            <span>Activity Logs</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Resident Analytics
          </p>
        </div>
      </div>

      {/* Timeline List */}
      <div className="relative before:absolute before:inset-y-0 before:left-[23px] before:w-[2px] before:bg-slate-100 dark:before:bg-[#2a3040]/50 flex-1 flex flex-col justify-between py-1">
        {currentLogs.length === 0 ? (
          <div className="text-center py-12 space-y-2 flex-1 flex flex-col items-center justify-center">
            <Activity className="w-8 h-8 mx-auto text-slate-400 opacity-40" />
            <p className="text-slate-400 dark:text-slate-500 text-xs italic">
              No recent activity found.
            </p>
          </div>
        ) : (
          currentLogs.slice(0, maxItems).map((log) => {
            const Icon = typeIcons[log.type];
            const colorClass = typeColors[log.type];

            return (
              <div key={log.id} className="relative pl-14 flex-1 flex items-start py-1.5 group">
                {/* Timeline Node Icon */}
                <div className={`absolute left-0 top-1 w-11 h-11 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-snug break-words">
                    <span className="font-black text-slate-900 dark:text-white text-xs mr-1">{log.user}</span>
                    <span className="text-slate-500 dark:text-slate-400 italic mr-1">{log.action}</span>
                    <span className="font-black text-rose-500 dark:text-rose-400 uppercase italic">{log.details}</span>
                  </p>

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 italic">
                    {log.time}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

