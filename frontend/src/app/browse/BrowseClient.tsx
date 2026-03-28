"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import FilterBar from "@/components/FilterBar";
import ContentCard from "@/components/ContentCard";
import { searchContents } from "@/lib/api";
import type { Content, SearchParams } from "@/types/content";
import { ChevronLeft, ChevronRight, Loader2, Play, Shield } from "lucide-react";

export default function BrowseClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState<Content[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const getParams = useCallback((): SearchParams => ({
    q: searchParams.get("q") ?? undefined,
    genre: searchParams.get("genre") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    watch_mode: searchParams.get("watch_mode") ?? undefined,
    verified_only: searchParams.get("verified_only") === "true" ? true : undefined,
    sort_by: searchParams.get("sort_by") ?? "title",
    page: Number(searchParams.get("page") ?? 1),
    page_size: 24,
  }), [searchParams]);

  useEffect(() => {
    const params = getParams();
    setLoading(true);
    searchContents(params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [getParams]);

  const updateParams = (updates: SearchParams) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v !== undefined && v !== "") p.set(k, String(v));
      else p.delete(k);
    });
    router.push(`/browse?${p.toString()}`);
  };

  const currentPage = Number(searchParams.get("page") ?? 1);
  const params = getParams();

  return (
    <div className="bg-[#141414] min-h-screen px-4 md:px-12 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">영화 · 애니 탐색</h1>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 max-w-md">
              <SearchBar
                defaultValue={params.q ?? ""}
                onSearch={(q) => updateParams({ ...params, q, page: 1 })}
              />
            </div>
            <FilterBar params={params} onChange={(p) => updateParams(p)} />
          </div>
          {/* Toggle filters */}
          <div className="flex flex-wrap gap-3">
            <ToggleButton
              active={params.watch_mode === "in_app"}
              icon={<Play size={13} fill={params.watch_mode === "in_app" ? "currentColor" : "none"} />}
              label="재생 가능만"
              onClick={() =>
                updateParams({
                  ...params,
                  watch_mode: params.watch_mode === "in_app" ? undefined : "in_app",
                  page: 1,
                })
              }
            />
            <ToggleButton
              active={params.verified_only === true}
              icon={<Shield size={13} />}
              label="검증된 소스만"
              onClick={() =>
                updateParams({
                  ...params,
                  verified_only: params.verified_only ? undefined : true,
                  page: 1,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-[#b3b3b3] text-sm">
          {loading ? "검색 중..." : `총 ${total.toLocaleString()}개`}
          {params.q && <span className="ml-1">— &quot;{params.q}&quot;</span>}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 size={32} className="animate-spin text-[#e50914]" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-[#b3b3b3]">
          <p className="text-lg">검색 결과가 없습니다</p>
          <p className="text-sm mt-2">다른 검색어나 필터를 시도해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {items.map((item) => (
            <ContentCard key={item.id} content={item} size="sm" />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => updateParams({ ...params, page: currentPage - 1 })}
            disabled={currentPage <= 1}
            className="p-2 rounded text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-[#b3b3b3] text-sm">{currentPage} / {totalPages}</span>
          <button
            onClick={() => updateParams({ ...params, page: currentPage + 1 })}
            disabled={currentPage >= totalPages}
            className="p-2 rounded text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

function ToggleButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
        active
          ? "bg-[#e50914] border-[#e50914] text-white shadow-md shadow-[#e50914]/20"
          : "bg-transparent border-[#3d3d3d] text-[#b3b3b3] hover:border-[#6b7280] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
