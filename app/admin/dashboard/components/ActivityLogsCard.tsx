"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Activity, UserPlus, FileText, CheckCircle2, AlertTriangle, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

export function ActivityLogsCard({ logs: initialLogs, selectedBarangay = "" }: ActivityLogsCardProps) {
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
    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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
            Real-time Supabase Section Listener Active
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest italic">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Live Sync</span>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-slate-100 dark:before:bg-[#2a3040]/50">
        {currentLogs.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 text-sm italic py-10">
            No recent activity found.
          </p>
        ) : (
          currentLogs.map((log) => {
            const Icon = typeIcons[log.type];
            const colorClass = typeColors[log.type];

            return (
              <div key={log.id} className="relative pl-12 group">
                {/* Timeline Node Icon */}
                <div className={`absolute left-0 top-0.5 w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-normal">
                    <span className="font-bold text-slate-900 dark:text-white mr-1.5">{log.user}</span>
                    {log.action}
                    <span className="font-bold text-slate-900 dark:text-white ml-1.5">{log.details}</span>
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1 italic">
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

