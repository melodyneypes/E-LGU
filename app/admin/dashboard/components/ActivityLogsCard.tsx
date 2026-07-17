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

export function ActivityLogsCard({ logs }: ActivityLogsCardProps) {
  return (
    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-500" />
            <span>Activity Logs</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
            Real-time updates across systems
          </p>
        </div>

      </div>

      {/* Timeline List */}
      <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-slate-100 dark:before:bg-[#2a3040]/50">
        {logs.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 text-sm italic py-10">
            No recent activity found.
          </p>
        ) : (
          logs.map((log) => {
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
