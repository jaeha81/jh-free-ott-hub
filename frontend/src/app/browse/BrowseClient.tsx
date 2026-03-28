"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import ContentCard from "@/components/ContentCard";
import { searchContents } from "@/lib/api";
import { GENRES, COUNTRIES, SORT_OPTIONS } from "@/lib/constants";
import type { Content, SearchParams } from "@/types/content";
import { Loader2, Play, Shield, ChevronDown, SlidersHorizontal, X } from "lucide-react";

const PAGE_SIZE = 24;

export default function BrowseClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState<Content[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Track whether this is an "append" load or a fresh search
  const isAppendRef = useRef(false);

  // ---- Read URL params into SearchParams ----
  const getParams = useCallback(
    (page?: number): SearchParams => ({
      q: searchParams.get("q") ?? undefined,
      genre: searchParams.get("genre") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      watch_mode: searchParams.get("watch_mode") ?? undefined,
      verified_only:
        searchParams.get("verified_only") === "true" ? true : undefined,
      sort_by: searchParams.get("sort_by") ?? "popularity",
      page: page ?? Number(searchParams.get("page") ?? 1),
      page_size: PAGE_SIZE,
    }),
    [searchParams],
  );

  // ---- Push URL params (replaces pagination-only pushes too) ----
  const updateURL = useCallback(
    (updates: Partial<SearchParams>) => {
      const p = new URLSearchParams(searchParams.toString());

      // merge
      const merged: Record<string, string | undefined> = {};
      // current
      searchParams.forEach((v, k) => {
        merged[k] = v;
      });
      // overrides
      Object.entries(updates).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== false) {
          merged[k] = String(v);
        } else {
          delete merged[k];
        }
      });

      const next = new URLSearchParams();
      Object.entries(merged).forEach(([k, v]) => {
        if (v !== undefined && v !== "") next.set(k, v);
      });

      router.push(`/browse?${next.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // ---- Fetch data when URL changes ----
  useEffect(() => {
    const params = getParams();
    const page = params.page ?? 1;

    if (isAppendRef.current) {
      // Load more mode
      setLoadingMore(true);
      searchContents(params)
        .then((res) => {
          setItems((prev) => [...prev, ...res.items]);
          setTotal(res.total);
          setTotalPages(res.total_pages);
          setCurrentPage(page);
        })
        .catch(() => {})
        .finally(() => {
          setLoadingMore(false);
          isAppendRef.current = false;
        });
    } else {
      // Fresh search
      setLoading(true);
      searchContents(params)
        .then((res) => {
          setItems(res.items);
          setTotal(res.total);
          setTotalPages(res.total_pages);
          setCurrentPage(page);
        })
        .catch(() => {
          setItems([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    }
  }, [getParams]);

  // ---- Helper: update a filter (resets page to 1) ----
  const setFilter = (key: keyof SearchParams, value: string | boolean | undefined) => {
    isAppendRef.current = false;
    updateURL({ [key]: value, page: undefined } as Partial<SearchParams>);
  };

  // ---- Helper: toggle chip ----
  const toggleChip = (key: "genre" | "country", value: string) => {
    const current = searchParams.get(key);
    setFilter(key, current === value ? undefined : value);
  };

  // ---- Load more ----
  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    isAppendRef.current = true;
    updateURL({ page: nextPage });
  };

  // ---- Clear all filters ----
  const clearAllFilters = () => {
    isAppendRef.current = false;
    router.push("/browse", { scroll: false });
  };

  const params = getParams();
  const activeGenre = params.genre;
  const activeCountry = params.country;
  const activeSortBy = params.sort_by ?? "popularity";
  const hasActiveFilters = !!(
    params.genre ||
    params.country ||
    params.watch_mode ||
    params.verified_only ||
    params.q
  );
  const hasMore = currentPage < totalPages;

  return (
    <div className="bg-[#141414] min-h-screen">
      {/* ===== HEADER / SEARCH ===== */}
      <div className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md border-b border-white/5">
        <div className="px-4 md:px-12 py-4">
          {/* Title + Search row */}
          <div className="flex items-center gap-4 mb-3">
            <h1 className="text-xl md:text-2xl font-bold text-white whitespace-nowrap">
              탐색
            </h1>
            <div className="flex-1 max-w-xl">
              <SearchBar
                defaultValue={params.q ?? ""}
                onSearch={(q) => setFilter("q", q || undefined)}
                autoFocus={false}
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all
                ${showFilters
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-transparent border-[#3d3d3d] text-[#b3b3b3] hover:text-white hover:border-[#6b7280]"
                }`}
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">필터</span>
            </button>
          </div>

          {/* ===== FILTER PANEL ===== */}
          {showFilters && (
            <div className="space-y-3 pb-1 animate-in slide-in-from-top-2 duration-200">
              {/* Genre chips */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#808080] mb-1.5 font-medium">
                  장르
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map((g) => (
                    <ChipButton
                      key={g}
                      label={g}
                      active={activeGenre === g}
                      onClick={() => toggleChip("genre", g)}
                    />
                  ))}
                </div>
              </div>

              {/* Country chips */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#808080] mb-1.5 font-medium">
                  국가
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {COUNTRIES.map((c) => (
                    <ChipButton
                      key={c.code}
                      label={`${c.flag} ${c.label}`}
                      active={activeCountry === c.code}
                      onClick={() => toggleChip("country", c.code)}
                    />
                  ))}
                </div>
              </div>

              {/* Sort + toggle filters row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Sort options */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#808080] font-medium">
                    정렬
                  </span>
                  {SORT_OPTIONS.map((s) => (
                    <ChipButton
                      key={s.value}
                      label={s.label}
                      active={activeSortBy === s.value}
                      onClick={() => setFilter("sort_by", s.value)}
                      variant="sort"
                    />
                  ))}
                </div>

                <div className="w-px h-5 bg-white/10 mx-1" />

                {/* Toggle buttons */}
                <ToggleButton
                  active={params.watch_mode === "in_app"}
                  icon={
                    <Play
                      size={12}
                      fill={
                        params.watch_mode === "in_app" ? "currentColor" : "none"
                      }
                    />
                  }
                  label="재생 가능"
                  onClick={() =>
                    setFilter(
                      "watch_mode",
                      params.watch_mode === "in_app" ? undefined : "in_app",
                    )
                  }
                />
                <ToggleButton
                  active={params.verified_only === true}
                  icon={<Shield size={12} />}
                  label="검증됨"
                  onClick={() =>
                    setFilter(
                      "verified_only",
                      params.verified_only ? undefined : true,
                    )
                  }
                />

                {/* Clear all */}
                {hasActiveFilters && (
                  <>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <button
                      onClick={clearAllFilters}
                      className="flex items-center gap-1 text-[11px] text-[#e50914] hover:text-red-400 transition-colors px-2 py-1 rounded border border-[#e50914]/30 hover:border-[#e50914]"
                    >
                      <X size={12} />
                      초기화
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== RESULTS ===== */}
      <div className="px-4 md:px-12 py-6">
        {/* Result count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-[#b3b3b3] text-sm">
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" />
                검색 중...
              </span>
            ) : (
              <>
                총{" "}
                <span className="text-white font-semibold">
                  {total.toLocaleString()}
                </span>
                개
                {params.q && (
                  <span className="ml-1 text-[#808080]">
                    &mdash; &ldquo;{params.q}&rdquo;
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        {/* Skeleton / Empty / Grid */}
        {loading ? (
          <SkeletonGrid />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-4">
              {items.map((item) => (
                <ContentCard key={item.id} content={item} size="sm" />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="group flex items-center gap-2 px-8 py-3 rounded-lg
                    bg-[#1f1f1f] border border-[#3d3d3d] text-white text-sm font-medium
                    hover:bg-[#2d2d2d] hover:border-[#e50914] active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loadingMore ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ChevronDown
                      size={16}
                      className="group-hover:translate-y-0.5 transition-transform"
                    />
                  )}
                  {loadingMore ? "불러오는 중..." : "더보기"}
                  <span className="text-[#808080] text-xs ml-1">
                    ({currentPage}/{totalPages})
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ========== Sub-components ==========

function ChipButton({
  label,
  active,
  onClick,
  variant = "filter",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: "filter" | "sort";
}) {
  const baseStyle =
    variant === "sort"
      ? active
        ? "bg-white text-[#141414] border-white font-semibold"
        : "bg-transparent border-[#3d3d3d] text-[#b3b3b3] hover:border-[#808080] hover:text-white"
      : active
        ? "bg-[#e50914] border-[#e50914] text-white font-semibold shadow-sm shadow-[#e50914]/20"
        : "bg-[#1f1f1f] border-[#3d3d3d] text-[#b3b3b3] hover:border-[#808080] hover:text-white hover:bg-[#2d2d2d]";

  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all duration-150 ${baseStyle}`}
    >
      {label}
    </button>
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
      className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
        active
          ? "bg-[#e50914] border-[#e50914] text-white shadow-sm shadow-[#e50914]/20"
          : "bg-transparent border-[#3d3d3d] text-[#b3b3b3] hover:border-[#6b7280] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-4">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] bg-[#1f1f1f] rounded-md" />
          <div className="mt-2 space-y-1.5 px-0.5">
            <div className="h-3 bg-[#1f1f1f] rounded w-3/4" />
            <div className="h-2.5 bg-[#1f1f1f] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-[#b3b3b3]">
      <div className="text-5xl mb-4 opacity-30">{"\uD83C\uDFAC"}</div>
      <p className="text-lg font-medium text-white/80">
        검색 결과가 없습니다
      </p>
      <p className="text-sm mt-2 text-[#808080]">
        다른 검색어나 필터를 시도해보세요
      </p>
    </div>
  );
}
