import Link from "next/link";
import { Megaphone, ArrowRight, Pin } from "lucide-react";

interface AnnouncementItem {
  id: string;
  title: string;
  priority: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
}

interface RecentAnnouncementsCardProps {
  announcements: AnnouncementItem[];
  rowSpan?: number;
}

const priorityColors: Record<string, string> = {
  Urgent: "bg-red-500/10 text-red-500",
  Important: "bg-amber-500/10 text-amber-500",
  Normal: "bg-blue-500/10 text-blue-500",
};

export function RecentAnnouncementsCard({ announcements, rowSpan = 1 }: RecentAnnouncementsCardProps) {
  return (
    <div
      className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col justify-between h-full transition-all duration-300"
      style={{ minHeight: `${420 + (rowSpan - 1) * 140}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-[#2a3040]/50 pb-4">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-500" />
            <span>Recent Announcements</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
            Latest {announcements.length} published announcements
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 flex flex-col justify-between divide-y divide-slate-100 dark:divide-[#2a3040]/50">
        {announcements.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-[#2a3040]">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
              <Megaphone className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 italic">No Announcements Published</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">New announcements for residents will appear here.</p>
          </div>
        ) : (
          announcements.map((item) => {
            const priorityClass = priorityColors[item.priority] || priorityColors.Normal;
            const dateStr = new Date(item.createdAt).toLocaleDateString("en-US", {
              timeZone: "Asia/Manila",
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Link
                key={item.id}
                href="/admin/announcements"
                className="flex-1 flex items-center gap-4 py-3 group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 -mx-2 px-3 rounded-xl transition-colors"
              >
                {/* Priority Badge */}
                <div className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase italic tracking-wider ${priorityClass}`}>
                  {item.priority}
                </div>

                {/* Title + Category */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {item.isActive && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium">
                    {item.category} · {dateStr}
                  </p>
                </div>

                {/* Status Dot */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                  <span className="text-[10px] font-bold uppercase italic text-slate-400">
                    {item.isActive ? "Active" : "Expired"}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Bottom Right View All Action Button */}
      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-[#2a3040]/30 mt-4">
        <Link
          href="/admin/announcements"
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-2 hover:opacity-90 cursor-pointer"
        >
          <span>View All Announcements</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
