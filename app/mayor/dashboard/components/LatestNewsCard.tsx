import Link from "next/link";
import Image from "next/image";
import { Newspaper, ArrowRight, ImageIcon } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  author: string | null;
  category: string;
  imageUrl: string | null;
  isPublished: boolean;
  publishDate: Date;
}

interface LatestNewsCardProps {
  news: NewsItem[];
  rowSpan?: number;
}

export function LatestNewsCard({ news, rowSpan = 1 }: LatestNewsCardProps) {
  return (
    <div
      className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col justify-between h-full transition-all duration-300"
      style={{ minHeight: `${420 + (rowSpan - 1) * 140}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-[#2a3040]/50 pb-4">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-500" />
            <span>Latest News</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
            Latest {news.length} published articles
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 flex flex-col justify-between divide-y divide-slate-100 dark:divide-[#2a3040]/50">
        {news.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-[#2a3040]">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
              <Newspaper className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 italic">No News Articles Yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">Published news and press releases will be listed here.</p>
          </div>
        ) : (
          news.map((item) => {
            const dateStr = new Date(item.publishDate).toLocaleDateString("en-US", {
              timeZone: "Asia/Manila",
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Link
                key={item.id}
                href="/admin/news"
                className="flex-1 flex items-center gap-4 py-3 group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 -mx-2 px-3 rounded-xl transition-colors"
              >
                {/* Thumbnail / Placeholder */}
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1e2330] overflow-hidden shrink-0 flex items-center justify-center relative border border-slate-200/50 dark:border-[#2a3040]/50">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {/* Title + Category */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium">
                    {item.category} {item.author ? `· ${item.author}` : ""} · {dateStr}
                  </p>
                </div>

                {/* Status Dot */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="text-[10px] font-bold uppercase italic text-slate-400">
                    {item.isPublished ? "Published" : "Draft"}
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
          href="/admin/news"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-2 hover:opacity-90 cursor-pointer"
        >
          <span>View All News</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
