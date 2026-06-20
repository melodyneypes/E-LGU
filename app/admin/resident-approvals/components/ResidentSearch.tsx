import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, Loader2 } from "lucide-react";
import { searchResidents, getHeadlessResidents } from "../../actions";

type SearchResult = {
    id: string;
    firstName: string;
    lastName: string;
    barangay: string;
    age?: number | null;
};

interface ResidentSearchProps {
    onSelect: (resident: SearchResult) => void;
    placeholder?: string;
    excludeIds?: string[];
    suggestEmpty?: boolean;
}

export function ResidentSearch({ 
    onSelect, 
    placeholder = "Search resident...", 
    excludeIds = [],
    suggestEmpty = false
}: ResidentSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Pagination states
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Handles clicking outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchResults = async (searchQuery: string, pageNum: number, isNewSearch: boolean) => {
        if (loading) return;
        setLoading(true);
        try {
            const res = (searchQuery === "" && suggestEmpty)
                ? await getHeadlessResidents(pageNum, 5)
                : await searchResidents(searchQuery, pageNum, 5);
            if (res.success && res.data) {
                const fetched = res.data as SearchResult[];
                const filtered = fetched.filter(r => !excludeIds.includes(r.id));
                if (isNewSearch) {
                    setResults(filtered);
                } else {
                    setResults(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const uniqueFetched = filtered.filter(f => !existingIds.has(f.id));
                        return [...prev, ...uniqueFetched];
                    });
                }
                setHasMore(fetched.length === 5);
            } else {
                if (isNewSearch) setResults([]);
                setHasMore(false);
            }
        } catch (err) {
            console.error("Fetch residents error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        setPage(1);
        setHasMore(true);

        const delayDebounceFn = setTimeout(() => {
            fetchResults(query, 1, true);
        }, query ? 300 : 0);

        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, isOpen]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        if (container.scrollHeight - container.scrollTop <= container.clientHeight + 30) {
            if (hasMore && !loading) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchResults(query, nextPage, false);
            }
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    className="pl-10 h-9 text-xs"
                />
            </div>
            
            {isOpen && (
                <div 
                    onScroll={handleScroll}
                    className="absolute z-[110] w-full mt-1 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-xl shadow-2xl max-h-48 overflow-y-auto"
                >
                    {results.length > 0 ? (
                        <>
                            {results.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(r);
                                        setQuery("");
                                        setIsOpen(false);
                                        setResults([]);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 border-b border-slate-100 dark:border-[#2a3040] last:border-0"
                                >
                                    <User className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <p className="text-xs font-bold">{r.firstName} {r.lastName}</p>
                                        <p className="text-[10px] text-slate-500 uppercase">{r.barangay}</p>
                                    </div>
                                </button>
                            ))}
                            {loading && (
                                <div className="p-2 text-center flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold border-t border-slate-100 dark:border-[#2a3040]">
                                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                    Loading more...
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-4 text-center text-xs text-slate-500 font-bold flex flex-col items-center justify-center gap-2">
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    <span>Searching...</span>
                                </>
                            ) : (
                                <span>No residents found.</span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
