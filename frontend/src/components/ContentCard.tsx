"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, ExternalLink, Info, CheckCircle, Clock } from "lucide-react";
import type { Content } from "@/types/content";

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}", KR: "\u{1F1F0}\u{1F1F7}", JP: "\u{1F1EF}\u{1F1F5}",
  CN: "\u{1F1E8}\u{1F1F3}", IN: "\u{1F1EE}\u{1F1F3}", TH: "\u{1F1F9}\u{1F1ED}",
  FR: "\u{1F1EB}\u{1F1F7}", ES: "\u{1F1EA}\u{1F1F8}", DE: "\u{1F1E9}\u{1F1EA}",
  IT: "\u{1F1EE}\u{1F1F9}", TR: "\u{1F1F9}\u{1F1F7}", RU: "\u{1F1F7}\u{1F1FA}",
  BR: "\u{1F1E7}\u{1F1F7}", GB: "\u{1F1EC}\u{1F1E7}", SE: "\u{1F1F8}\u{1F1EA}",
  DK: "\u{1F1E9}\u{1F1F0}", NL: "\u{1F1F3}\u{1F1F1}", PL: "\u{1F1F5}\u{1F1F1}",
  SA: "\u{1F1F8}\u{1F1E6}", TW: "\u{1F1F9}\u{1F1FC}", HK: "\u{1F1ED}\u{1F1F0}",
  SU: "\u{1F1F7}\u{1F1FA}",
};

function getCountryFlag(code: string): string {
  return COUNTRY_FLAGS[code.toUpperCase()] ?? "";
}

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getRatingColor(score: number): string {
  if (score >= 7) return "bg-[#21d07a]";
  if (score >= 5) return "bg-[#d2d531]";
  return "bg-[#db2360]";
}

interface ContentCardProps {
  content: Content;
  isFocused?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function ContentCard({ content, isFocused = false, size = "md" }: ContentCardProps) {
  const verifiedInApp = content.sources.some(
    (s) => s.watch_mode === "in_app" && s.stream_url && s.is_verified
  );
  const hasInApp = content.sources.some((s) => s.watch_mode === "in_app" && s.stream_url);
  const hasExternal = content.sources.some((s) => s.watch_mode === "external" && s.external_url);
  const sourceName = content.sources[0]?.source_name;

  const widthClass = size === "sm" ? "w-32" : size === "lg" ? "w-52" : "w-40";

  const countryFlags = content.country
    ?.map((c) => getCountryFlag(c))
    .filter(Boolean)
    .slice(0, 3)
    .join("") ?? "";

  return (
    <Link
      href={`/content/${content.id}`}
      className={`group relative block ${widthClass} shrink-0 rounded-md overflow-hidden
        transition-all duration-300 ease-out cursor-pointer will-change-transform
        ${isFocused
          ? "scale-110 ring-2 ring-[#e50914] shadow-2xl z-10"
          : "hover:scale-[1.08] hover:z-10 hover:shadow-[0_8px_30px_rgba(0,0,0,0.7)]"
        }`}
      data-focusable="true"
      tabIndex={0}
    >
      {/* 포스터 */}
      <div className="relative aspect-[2/3] bg-[#1f1f1f]">
        {content.poster_url ? (
          <Image
            src={content.poster_url}
            alt={content.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 128px, 160px"
            unoptimized={!content.poster_url?.includes("tmdb")}
          />
        ) : (
          /* 포스터 없을 때 스타일리시한 플레이스홀더 */
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a3a] via-[#1a2a3a] to-[#1a1a2e] flex flex-col items-center justify-center p-3 text-center">
            <div className="text-3xl mb-2 opacity-40">{"\u{1F3AC}"}</div>
            <p className="text-white/70 text-[11px] font-semibold leading-tight line-clamp-3">
              {content.title}
            </p>
            {content.year && (
              <p className="text-white/40 text-[10px] mt-1">{content.year}</p>
            )}
          </div>
        )}

        {/* 호버 오버레이 -- 시놉시스 + 액션 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5 gap-1.5">
          {/* 시놉시스 미리보기 */}
          {content.synopsis && (
            <p className="text-white/80 text-[10px] leading-tight line-clamp-4">
              {content.synopsis.replace(/<[^>]*>/g, "").substring(0, 150)}
            </p>
          )}

          {/* 런타임 + 연도 (호버 시 추가 정보) */}
          <div className="flex items-center gap-1.5 text-[10px] text-white/60">
            {content.year && <span>{content.year}</span>}
            {content.runtime && content.runtime > 0 && (
              <span className="flex items-center gap-0.5">
                <Clock size={8} />
                {formatRuntime(content.runtime)}
              </span>
            )}
            {countryFlags && <span>{countryFlags}</span>}
          </div>

          {/* 액션 배지 */}
          <div className="flex flex-wrap gap-1 mt-auto">
            {verifiedInApp && (
              <span className="flex items-center gap-0.5 text-[10px] bg-[#e50914] text-white px-1.5 py-0.5 rounded-full font-medium">
                <Play size={8} fill="white" /> 재생
              </span>
            )}
            {hasInApp && !verifiedInApp && (
              <span className="flex items-center gap-0.5 text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full">
                <Play size={8} /> 미검증
              </span>
            )}
            {hasExternal && (
              <span className="flex items-center gap-0.5 text-[10px] bg-amber-600/80 text-white px-1.5 py-0.5 rounded-full">
                <ExternalLink size={8} /> {sourceName === "Tubi" ? "Tubi" : sourceName === "Viki" ? "Viki" : "외부"}
              </span>
            )}
            <span className="flex items-center gap-0.5 text-[10px] text-white/60">
              <Info size={8} /> 상세
            </span>
          </div>
        </div>

        {/* 상단 왼쪽 배지 -- 라이선스 */}
        <div className="absolute top-1 left-1 flex flex-col gap-0.5">
          {content.license_class === "public_domain" && (
            <span className="text-[9px] bg-blue-600/90 text-white px-1.5 py-0.5 rounded font-medium">
              공공도메인
            </span>
          )}
          {content.license_class === "ad_supported" && (
            <span className="text-[9px] bg-amber-600/90 text-white px-1.5 py-0.5 rounded font-medium">
              광고형 무료
            </span>
          )}
        </div>

        {/* 상단 오른쪽 -- 평점 배지 또는 검증 체크 */}
        <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5">
          {content.vote_average != null && content.vote_average > 0 ? (
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md ${getRatingColor(content.vote_average)}`}
              title={`${content.vote_average.toFixed(1)} (${content.vote_count ?? 0} votes)`}
            >
              {content.vote_average.toFixed(1).replace(/\.0$/, "")}
            </div>
          ) : verifiedInApp ? (
            <CheckCircle size={14} className="text-green-400 drop-shadow-md" />
          ) : null}
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="bg-[#1a1a1a] p-2">
        <p className="text-white text-xs font-medium truncate">{content.title}</p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {content.year && <span className="text-[#b3b3b3] text-[10px]">{content.year}</span>}
          {content.runtime != null && content.runtime > 0 && (
            <span className="text-[10px] text-[#808080]">{formatRuntime(content.runtime)}</span>
          )}
          {content.genres?.[0] && (
            <span className="text-[10px] text-[#808080] bg-white/5 px-1 rounded">{content.genres[0]}</span>
          )}
          {countryFlags && (
            <span className="text-[10px]">{countryFlags}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
