import { getContent } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { Play, ExternalLink, ArrowLeft, Globe, Calendar, Tag, CheckCircle, Shield } from "lucide-react";
import { notFound } from "next/navigation";
import type { Source } from "@/types/content";

interface Props {
  params: Promise<{ id: string }>;
}

/** source_name -> badge color mapping */
function getSourceBadgeStyle(sourceName: string): string {
  const name = sourceName.toLowerCase();
  if (name.includes("internet archive")) return "bg-blue-600/20 text-blue-400 border border-blue-500/30";
  if (name.includes("tubi")) return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
  if (name.includes("viki") || name.includes("rakuten")) return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
  if (name.includes("plex")) return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  return "bg-white/10 text-[#b3b3b3] border border-white/10";
}

/** quality_hint -> badge style */
function getQualityBadgeStyle(quality: string): string {
  const q = quality.toUpperCase();
  if (q === "HD" || q === "1080P" || q === "720P") return "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30";
  if (q === "SD" || q === "480P") return "bg-zinc-600/20 text-zinc-400 border border-zinc-500/30";
  return "bg-zinc-600/20 text-zinc-400 border border-zinc-500/30";
}

function SourceRow({ source, contentId }: { source: Source; contentId: string }) {
  const isInApp = source.watch_mode === "in_app" && source.stream_url;
  const isExternal = source.watch_mode === "external" && source.external_url;

  return (
    <div className="group flex items-center gap-3 bg-[#1f1f1f] hover:bg-[#262626] rounded-lg p-3.5 text-sm transition-colors">
      {/* Watch mode badge */}
      <span
        className={`shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full ${
          source.watch_mode === "in_app"
            ? "bg-green-600/20 text-green-400"
            : "bg-blue-600/20 text-blue-400"
        }`}
      >
        {source.watch_mode === "in_app" ? "직접 재생" : "외부 연결"}
      </span>

      {/* Source name with color badge */}
      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md ${getSourceBadgeStyle(source.source_name)}`}>
        {source.source_name}
      </span>

      {/* Quality hint badge */}
      {source.quality_hint && (
        <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${getQualityBadgeStyle(source.quality_hint)}`}>
          {source.quality_hint}
        </span>
      )}

      {/* Verified badge */}
      {source.is_verified && (
        <span className="shrink-0 flex items-center gap-1 text-[10px] text-emerald-400" title="검증된 소스">
          <CheckCircle size={12} />
          <span className="hidden sm:inline">검증됨</span>
        </span>
      )}

      {/* Availability note */}
      {source.availability_note && (
        <span className="text-[#6b7280] text-xs hidden md:block">{source.availability_note}</span>
      )}

      {/* Action button - pushed to the right */}
      <div className="ml-auto shrink-0">
        {isInApp && (
          <Link
            href={`/player/${contentId}`}
            className="flex items-center gap-1.5 bg-white text-black px-3.5 py-1.5 rounded-md font-bold text-xs hover:bg-white/90 transition-colors"
          >
            <Play size={12} fill="black" />
            재생
          </Link>
        )}
        {isExternal && (
          <a
            href={source.external_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link relative flex items-center gap-1.5 bg-[#e50914] text-white px-3.5 py-1.5 rounded-md font-semibold text-xs hover:bg-[#f40612] transition-colors"
          >
            <ExternalLink size={12} />
            이동
            {/* Tooltip on hover */}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#333] text-white text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover/link:opacity-100 transition-opacity pointer-events-none shadow-lg">
              외부 사이트로 이동합니다
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#333]" />
            </span>
          </a>
        )}
      </div>
    </div>
  );
}

export default async function ContentDetailPage({ params }: Props) {
  const { id } = await params;

  let content;
  try {
    content = await getContent(id);
  } catch {
    notFound();
  }

  const inAppSources = content.sources.filter((s) => s.watch_mode === "in_app" && s.stream_url);
  const externalSources = content.sources.filter((s) => s.watch_mode === "external" && s.external_url);
  const verifiedCount = content.sources.filter((s) => s.is_verified).length;

  return (
    <div className="bg-[#141414] min-h-screen">
      {/* 배경 블러 */}
      <div
        className="absolute top-16 left-0 right-0 h-96 bg-cover bg-center opacity-20 blur-2xl pointer-events-none"
        style={{ backgroundImage: content.poster_url ? `url(${content.poster_url})` : undefined }}
      />

      <div className="relative z-10 px-4 md:px-12 py-8">
        {/* 뒤로가기 */}
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 text-[#b3b3b3] hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          탐색으로 돌아가기
        </Link>

        <div className="flex flex-col md:flex-row gap-8">
          {/* 포스터 */}
          <div className="shrink-0">
            <div className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden bg-[#1f1f1f] shadow-2xl">
              <Image
                src={content.poster_url ?? "/placeholder-poster.svg"}
                alt={content.title}
                fill
                className="object-cover"
                sizes="256px"
                unoptimized={!content.poster_url}
              />
            </div>
          </div>

          {/* 정보 */}
          <div className="flex-1">
            {content.license_class === "public_domain" && (
              <span className="inline-block text-xs bg-blue-600 text-white px-2 py-1 rounded mb-3 font-medium">
                공공도메인 무료 재생
              </span>
            )}

            <h1 className="text-3xl md:text-4xl font-black text-white mb-1">{content.title}</h1>
            {content.original_title && content.original_title !== content.title && (
              <p className="text-[#b3b3b3] text-sm mb-4">{content.original_title}</p>
            )}

            {/* 메타 정보 */}
            <div className="flex flex-wrap gap-3 mb-5 text-sm text-[#b3b3b3]">
              {content.year && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} /> {content.year}
                </span>
              )}
              {content.country?.map((c) => (
                <span key={c} className="flex items-center gap-1">
                  <Globe size={13} /> {c}
                </span>
              ))}
              {content.genres?.map((g) => (
                <span key={g} className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-xs">
                  <Tag size={10} /> {g}
                </span>
              ))}
            </div>

            {/* 시놉시스 */}
            {content.synopsis && (
              <p className="text-[#b3b3b3] text-sm leading-relaxed mb-6 max-w-2xl line-clamp-3 md:line-clamp-none">
                {content.synopsis}
              </p>
            )}

            {/* 주요 재생 버튼 */}
            <div className="flex flex-wrap gap-3 mb-8">
              {inAppSources[0] && (
                <Link
                  href={`/player/${content.id}`}
                  className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-md font-bold text-sm hover:bg-white/90 transition-colors"
                >
                  <Play size={16} fill="black" />
                  재생
                </Link>
              )}
              {externalSources[0] && (
                <a
                  href={externalSources[0].external_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/main relative flex items-center gap-2 bg-[#e50914] text-white px-5 py-2.5 rounded-md font-semibold text-sm hover:bg-[#f40612] transition-colors"
                >
                  <ExternalLink size={15} />
                  {externalSources[0].source_name}에서 보기
                  {/* Tooltip */}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#333] text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover/main:opacity-100 transition-opacity pointer-events-none shadow-lg">
                    외부 사이트로 이동합니다
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#333]" />
                  </span>
                </a>
              )}
            </div>

            {/* 소스 목록 */}
            {content.sources.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-white font-semibold text-sm">시청 방법</h3>
                  <span className="text-[#6b7280] text-xs">{content.sources.length}개 소스</span>
                  {verifiedCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs">
                      <Shield size={12} />
                      {verifiedCount}개 검증됨
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {content.sources.map((source) => (
                    <SourceRow key={source.id} source={source} contentId={content.id} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
