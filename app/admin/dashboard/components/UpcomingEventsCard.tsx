import Link from "next/link";
import { CalendarDays, ArrowRight, MapPin, Zap, Clock, History } from "lucide-react";

interface EventItem {
  id: string;
  title: string;
  category: string;
  startDate: Date;
  endDate: Date;
  venueName: string;
  isPublished: boolean;
}

interface UpcomingEventsCardProps {
  events: EventItem[];
  pastEvents: EventItem[];
  rowSpan?: number;
}

export function UpcomingEventsCard({ events, pastEvents, rowSpan = 1 }: UpcomingEventsCardProps) {
  const now = new Date();

  const happeningNow = events.filter(
    (e) => new Date(e.startDate) <= now && new Date(e.endDate) >= now
  );
  const upcoming = events.filter((e) => new Date(e.startDate) > now);

  const hasUpcomingOrLive = happeningNow.length > 0 || upcoming.length > 0;

  const formatDateRange = (start: Date, end: Date) => {
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
    };
    const s = new Date(start).toLocaleDateString("en-US", opts);
    const e = new Date(end).toLocaleDateString("en-US", opts);
    return s === e ? s : `${s} – ${e}`;
  };

  return (
    <div
      className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col justify-between h-full transition-all duration-300"
      style={{ minHeight: `${420 + (rowSpan - 1) * 140}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-[#2a3040]/50 pb-4">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-violet-500" />
            <span>{hasUpcomingOrLive ? "Upcoming Events" : "Recent Events"}</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
            {happeningNow.length > 0
              ? `${happeningNow.length} happening now · ${upcoming.length} upcoming`
              : upcoming.length > 0
                ? `${upcoming.length} upcoming events`
                : `${pastEvents.length} recent past events`}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 flex flex-col justify-between divide-y divide-slate-100 dark:divide-[#2a3040]/50">
        {!hasUpcomingOrLive && pastEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-[#2a3040]">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-3">
              <CalendarDays className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 italic">No Scheduled Events</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">Municipal events and community schedules will be shown here.</p>
          </div>
        ) : (
          <>
            {/* Happening Now */}
            {happeningNow.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 italic">
                    Happening Now
                  </span>
                </div>
                {happeningNow.map((item) => (
                  <Link
                    key={item.id}
                    href="/admin/events"
                    className="flex items-center gap-4 py-4 group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 -mx-3 px-3 rounded-xl transition-colors border-b border-slate-100 dark:border-[#2a3040]/50 last:border-0"
                  >
                    <div className="shrink-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {item.venueName} · {formatDateRange(item.startDate, item.endDate)}
                      </p>
                    </div>
                    <div className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase italic tracking-wider bg-emerald-500/10 text-emerald-600">
                      Live
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div>
                {happeningNow.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 italic">
                      Coming Up
                    </span>
                  </div>
                )}
                {upcoming.map((item) => (
                  <Link
                    key={item.id}
                    href="/admin/events"
                    className="flex items-center gap-4 py-4 group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 -mx-3 px-3 rounded-xl transition-colors border-b border-slate-100 dark:border-[#2a3040]/50 last:border-0"
                  >
                    <div className="shrink-0 w-2 h-2 rounded-full bg-blue-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {item.venueName} · {formatDateRange(item.startDate, item.endDate)}
                      </p>
                    </div>
                    <div className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase italic tracking-wider bg-blue-500/10 text-blue-600">
                      {item.category}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Past Events Fallback — only shows when no upcoming/live events */}
            {!hasUpcomingOrLive && pastEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                    Past Events
                  </span>
                </div>
                {pastEvents.map((item) => (
                  <Link
                    key={item.id}
                    href="/admin/events"
                    className="flex items-center gap-4 py-4 group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 -mx-3 px-3 rounded-xl transition-colors border-b border-slate-100 dark:border-[#2a3040]/50 last:border-0"
                  >
                    <div className="shrink-0 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {item.venueName} · {formatDateRange(item.startDate, item.endDate)}
                      </p>
                    </div>
                    <div className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase italic tracking-wider bg-slate-100 dark:bg-slate-800/50 text-slate-400">
                      Ended
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Right View All Action Button */}
      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-[#2a3040]/30 mt-4">
        <Link
          href="/admin/events"
          className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xs font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-2 hover:opacity-90 cursor-pointer"
        >
          <span>View All Events</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
