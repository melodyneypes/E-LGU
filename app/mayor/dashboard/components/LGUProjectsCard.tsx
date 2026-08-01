import Link from "next/link";
import { Hammer, ArrowRight, MapPin } from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  category: string;
  status: string;
  location: string;
  progress: number;
}

interface LGUProjectsCardProps {
  projects: ProjectItem[];
  rowSpan?: number;
}

const statusStyles: Record<string, string> = {
  Ongoing: "bg-blue-500/10 text-blue-600",
  Completed: "bg-emerald-500/10 text-emerald-600",
  Planning: "bg-amber-500/10 text-amber-600",
  "On Hold": "bg-red-500/10 text-red-500",
};

function getProgressColor(progress: number) {
  if (progress >= 75) return "bg-emerald-500";
  if (progress >= 25) return "bg-amber-500";
  return "bg-red-500";
}

export function LGUProjectsCard({ projects, rowSpan = 1 }: LGUProjectsCardProps) {
  return (
    <div
      className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col justify-between h-full transition-all duration-300"
      style={{ minHeight: `${420 + (rowSpan - 1) * 140}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-[#2a3040]/50 pb-4">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <Hammer className="w-5 h-5 text-purple-500" />
            <span>LGU Projects</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
            {projects.length} active infrastructure projects
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 flex flex-col justify-between divide-y divide-slate-100 dark:divide-[#2a3040]/50">
        {projects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-[#2a3040]">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3">
              <Hammer className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 italic">No Active Projects</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">Infrastructure and development projects will be displayed here.</p>
          </div>
        ) : (
          projects.map((item) => {
            const badgeClass = statusStyles[item.status] || statusStyles.Ongoing;
            const barColor = getProgressColor(item.progress);

            return (
              <Link
                key={item.id}
                href="/mayor/projects"
                className="block py-4 group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 -mx-3 px-3 rounded-xl transition-colors border-b border-slate-100 dark:border-[#2a3040]/50 last:border-0"
              >
                {/* Title + Status */}
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {item.title}
                  </p>
                  <div className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase italic tracking-wider ${badgeClass}`}>
                    {item.status}
                  </div>
                </div>

                {/* Location + Category */}
                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium flex items-center gap-1 mb-2.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {item.location} · {item.category}
                </p>

                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-[#1e2330] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${Math.min(item.progress, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 italic w-9 text-right">
                    {item.progress}%
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
          href="/mayor/projects"
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-2 hover:opacity-90 cursor-pointer"
        >
          <span>View All Projects</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
