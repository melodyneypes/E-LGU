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
}

export function LatestNewsCard({ news }: LatestNewsCardProps) {
  return (
    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-500" />
            <span>Latest News</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
            Latest {news.length} published articles
          </p>
        </div>

        <Link
          href="/admin/news"
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#1e2330] border border-slate-200/50 dark:border-[#2a3040]/50 rounded-xl text-xs font-black uppercase italic tracking-wider text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* List */}
      <div className="space-y-0 divide-y divide-slate-100 dark:divide-[#2a3040]/50">
        {news.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 text-sm italic py-10">
            No news articles found.
          </p>
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
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 -mx-3 px-3 rounded-xl transition-colors"
              >
                {/* Thumbnail */}
                <div className="shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#1e2330] border border-slate-200/50 dark:border-[#2a3040]/50 overflow-hidden flex items-center justify-center">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  )}
                </div>

                {/* Title + Meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium">
                    {item.author ? `by ${item.author}` : "Staff"} · {item.category} · {dateStr}
                  </p>
                </div>

                {/* Status */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.isPublished ? "bg-emerald-500" : "bg-amber-400"}`} />
                  <span className="text-[10px] font-bold uppercase italic text-slate-400">
                    {item.isPublished ? "Live" : "Draft"}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
