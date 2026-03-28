"use client";

import { GENRES, COUNTRIES, WATCH_MODES, SORT_OPTIONS } from "@/lib/constants";
import type { SearchParams } from "@/types/content";

interface FilterBarProps {
  params: SearchParams;
  onChange: (params: SearchParams) => void;
}

export default function FilterBar({ params, onChange }: FilterBarProps) {
  const update = (key: keyof SearchParams, value: string) => {
    onChange({ ...params, [key]: value || undefined, page: 1 });
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* 장르 */}
      <Select
        value={params.genre ?? ""}
        onChange={(v) => update("genre", v)}
        placeholder="장르"
        options={GENRES.map((g) => ({ value: g, label: g }))}
      />

      {/* 국가 */}
      <Select
        value={params.country ?? ""}
        onChange={(v) => update("country", v)}
        placeholder="국가"
        options={COUNTRIES.map((c) => ({ value: c.code, label: c.label }))}
      />

      {/* 재생 방식 */}
      <Select
        value={params.watch_mode ?? ""}
        onChange={(v) => update("watch_mode", v)}
        placeholder="재생 방식"
        options={WATCH_MODES}
      />

      {/* 정렬 */}
      <Select
        value={params.sort_by ?? "title"}
        onChange={(v) => update("sort_by", v)}
        placeholder="정렬"
        options={SORT_OPTIONS}
      />

      {/* 필터 초기화 */}
      {(params.genre || params.country || params.watch_mode || params.verified_only) && (
        <button
          onClick={() =>
            onChange({ q: params.q, sort_by: params.sort_by, page: 1, page_size: params.page_size })
          }
          className="text-xs text-[#e50914] hover:text-red-400 transition-colors px-2 py-1.5 rounded border border-[#e50914]/30 hover:border-[#e50914]"
        >
          필터 초기화
        </button>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#2d2d2d] border border-[#3d3d3d] text-sm text-white rounded-md
        px-3 py-2 outline-none focus:border-[#e50914] cursor-pointer transition-colors
        appearance-none min-w-[100px]"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
