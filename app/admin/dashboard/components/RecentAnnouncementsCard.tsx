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
}

const priorityColors: Record<string, string> = {
  Urgent: "bg-red-500/10 text-red-500",
  Important: "bg-amber-500/10 text-amber-500",
  Normal: "bg-blue-500/10 text-blue-500",
};

export function RecentAnnouncementsCard({ announcements }: RecentAnnouncementsCardProps) {
  return (
    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-500" />
            <span>Recent Announcements</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
            Latest {announcements.length} published announcements
          </p>
        </div>

        <Link
          href="/admin/announcement"
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#1e2330] border border-slate-200/50 dark:border-[#2a3040]/50 rounded-xl text-xs font-black uppercase italic tracking-wider text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shadow-sm"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* List */}
      <div className="space-y-0 divide-y divide-slate-100 dark:divide-[#2a3040]/50">
        {announcements.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 text-sm italic py-10">
            No announcements found.
          </p>
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
              <div
                key={item.id}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 group"
              >
                {/* Priority Badge */}
                <div className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase italic tracking-wider ${priorityClass}`}>
                  {item.priority}
                </div>

                {/* Title + Category */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
