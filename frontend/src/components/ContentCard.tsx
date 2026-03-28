"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, ExternalLink, Info } from "lucide-react";
import type { Content } from "@/types/content";
import { PLACEHOLDER_POSTER } from "@/lib/constants";

interface ContentCardProps {
  content: Content;
  isFocused?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function ContentCard({ content, isFocused = false, size = "md" }: ContentCardProps) {
  const hasInApp = content.sources.some((s) => s.watch_mode === "in_app" && s.stream_url);
  const hasExternal = content.sources.some((s) => s.watch_mode === "external" && s.external_url);

  const widthClass = size === "sm" ? "w-32" : size === "lg" ? "w-52" : "w-40";

  return (
    <Link
      href={`/content/${content.id}`}
      className={`group relative block ${widthClass} shrink-0 rounded-md overflow-hidden
        transition-all duration-200 cursor-pointer
        ${isFocused ? "scale-110 ring-2 ring-[#e50914] shadow-2xl z-10" : "hover:scale-105 hover:z-10"}`}
      data-focusable="true"
      tabIndex={0}
    >
      {/* 포스터 */}
      <div className="relative aspect-[2/3] bg-[#1f1f1f]">
        <Image
          src={content.poster_url ?? PLACEHOLDER_POSTER}
          alt={content.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 128px, 160px"
          unoptimized={!content.poster_url}
        />

        {/* 호버 오버레이 */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
          {hasInApp && (
            <span className="flex items-center gap-1 text-xs bg-[#e50914] text-white px-2 py-1 rounded-full font-medium">
              <Play size={10} fill="white" /> 직접 재생
            </span>
          )}
          {hasExternal && (
            <span className="flex items-center gap-1 text-xs bg-white/20 text-white px-2 py-1 rounded-full">
              <ExternalLink size={10} /> 외부 연결
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-white/80">
            <Info size={10} /> 상세 보기
          </span>
        </div>

        {/* 라이선스 배지 */}
        {content.license_class === "public_domain" && (
          <span className="absolute top-1 left-1 text-[10px] bg-blue-600/80 text-white px-1.5 py-0.5 rounded font-medium">
            공공도메인
          </span>
        )}
      </div>

      {/* 정보 */}
      <div className="bg-[#1a1a1a] p-2">
        <p className="text-white text-xs font-medium truncate">{content.title}</p>
        <p className="text-[#b3b3b3] text-[10px] mt-0.5">
          {content.year && <span>{content.year}</span>}
          {content.genres?.[0] && <span> · {content.genres[0]}</span>}
        </p>
      </div>
    </Link>
  );
}
