import { getContent, getContents } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import {
  Play,
  ExternalLink,
  ArrowLeft,
  Globe,
  Calendar,
  Clock,
  Star,
  CheckCircle,
  Shield,
  Plus,
  Share2,
  Users,
  Film,
  Subtitles,
  Wifi,
} from "lucide-react";
import { notFound } from "next/navigation";
import type { Source, Content } from "@/types/content";
import Carousel from "@/components/Carousel";

interface Props {
  params: Promise<{ id: string }>;
}

/* ─── Helpers ─── */

/** Genre color mapping for pill badges */
const GENRE_COLORS: Record<string, string> = {
  "액션": "bg-red-500/20 text-red-300 border-red-500/30",
  "코미디": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "드라마": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "공포": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "SF": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "로맨스": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "스릴러": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "애니메이션": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "범죄": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "다큐멘터리": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "판타지": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "전쟁": "bg-stone-500/20 text-stone-300 border-stone-500/30",
  "서부": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "음악": "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
  "가족": "bg-lime-500/20 text-lime-300 border-lime-500/30",
  "역사": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "미스터리": "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

function getGenreStyle(genre: string): string {
  return GENRE_COLORS[genre] ?? "bg-white/10 text-white/70 border-white/10";
}

/** Format runtime as X시간 Ym */
function formatRuntime(minutes: number): string {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/** Rating badge color: green (7+), yellow (5-7), red (<5) */
function getRatingColor(score: number): string {
  if (score >= 7) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  if (score >= 5) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
  return "bg-red-500/20 text-red-400 border-red-500/40";
}

/** Format vote count with Korean unit */
function formatVoteCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}만명`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}천명`;
  return `${count.toLocaleString()}명`;
}

/** source_name -> badge color mapping */
function getSourceBadgeStyle(sourceName: string): string {
  const name = sourceName.toLowerCase();
  if (name.includes("internet archive")) return "bg-blue-600/20 text-blue-400 border border-blue-500/30";
  if (name.includes("youtube")) return "bg-red-600/20 text-red-400 border border-red-500/30";
  if (name.includes("viki") || name.includes("rakuten")) return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
  if (name.includes("네이버") || name.includes("시리즈온")) return "bg-green-600/20 text-green-400 border border-green-500/30";
  if (name.includes("왓챠") || name.includes("watcha")) return "bg-pink-500/20 text-pink-400 border border-pink-500/30";
  if (name.includes("plex")) return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  return "bg-white/10 text-[#b3b3b3] border border-white/10";
}

/** quality_hint -> badge style */
function getQualityBadgeStyle(quality: string): string {
  const q = quality.toUpperCase();
  if (q === "HD" || q === "1080P" || q === "720P") return "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30";
  return "bg-zinc-600/20 text-zinc-400 border border-zinc-500/30";
}

/** License class display */
function getLicenseInfo(lc: string | null): { label: string; style: string } | null {
  switch (lc) {
    case "public_domain":
      return { label: "공공도메인 무료", style: "bg-blue-600 text-white" };
    case "ad_supported":
      return { label: "광고형 무료", style: "bg-amber-600 text-white" };
    case "institutional":
      return { label: "기관 제공", style: "bg-teal-600 text-white" };
    default:
      return null;
  }
}

/** Audience display */
function getAudienceLabel(audience: string | null): string | null {
  switch (audience) {
    case "children": return "어린이";
    case "family": return "가족";
    case "general": return "전체 관람가";
    default: return null;
  }
}

/* ─── Source Card ─── */

/** Check if source has region restrictions for Korean users */
function getRegionWarning(sourceName: string): string | null {
  const name = sourceName.toLowerCase();
  if (name.includes("tubi")) return "⚠️ Tubi는 미국 전용 서비스입니다. 한국에서는 접속이 제한될 수 있습니다.";
  if (name.includes("youtube")) return null; // YouTube is globally accessible
  return null;
}

function SourceCard({ source, contentId, contentTitle }: { source: Source; contentId: string; contentTitle?: string }) {
  const isInApp = source.watch_mode === "in_app" && source.stream_url;
  const isExternal = source.watch_mode === "external" && source.external_url;
  const regionWarning = getRegionWarning(source.source_name);
  const isYouTube = source.source_name.toLowerCase().includes("youtube");

  return (
    <div className="group relative bg-[#1a1a1a] hover:bg-[#222] border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all duration-200">
      {/* Region restriction warning */}
      {regionWarning && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          {regionWarning}
        </div>
      )}

      {/* Top row: Source name + badges */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`text-sm font-bold px-3 py-1 rounded-lg ${getSourceBadgeStyle(source.source_name)}`}>
          {source.source_name}
        </span>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            source.watch_mode === "in_app"
              ? "bg-green-600/20 text-green-400"
              : "bg-blue-600/20 text-blue-400"
          }`}
        >
          {source.watch_mode === "in_app" ? "직접 재생" : "외부 연결"}
        </span>
        {source.quality_hint && (
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${getQualityBadgeStyle(source.quality_hint)}`}>
            {source.quality_hint}
          </span>
        )}
        {source.is_verified && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle size={13} />
            검증됨
          </span>
        )}
      </div>

      {/* Details row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-[#808080] mb-3">
        {source.subtitle_languages && source.subtitle_languages.length > 0 && (
          <span className="flex items-center gap-1">
            <Subtitles size={12} />
            {source.subtitle_languages.join(", ")}
          </span>
        )}
        {source.region_hint && (
          <span className="flex items-center gap-1">
            <Globe size={12} />
            {source.region_hint === "global" ? "전 세계" : source.region_hint === "asia" ? "아시아" : source.region_hint === "us_only" ? "미국 전용" : source.region_hint}
          </span>
        )}
        {source.availability_note && (
          <span className="flex items-center gap-1">
            <Wifi size={12} />
            {source.availability_note}
          </span>
        )}
        {source.last_checked_at && (
          <span className="text-[#555]">
            마지막 확인: {new Date(source.last_checked_at).toLocaleDateString("ko-KR")}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {isInApp && (
          <Link
            href={`/player/${contentId}`}
            className="inline-flex items-center gap-2 bg-white text-black px-5 py-2 rounded-lg font-bold text-sm hover:bg-white/90 transition-colors"
          >
            <Play size={14} fill="black" />
            지금 재생
          </Link>
        )}
        {isExternal && (
          <a
            href={source.external_url!}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
              isYouTube
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-[#e50914] text-white hover:bg-[#f40612]"
            }`}
          >
            {isYouTube ? <Play size={14} fill="white" /> : <ExternalLink size={14} />}
            {isYouTube ? "YouTube에서 검색" : `${source.source_name}에서 보기`}
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Rating Badge ─── */

function RatingBadge({ voteAverage, voteCount }: { voteAverage: number; voteCount?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-lg border ${getRatingColor(voteAverage)}`}>
        <Star size={14} fill="currentColor" />
        {voteAverage.toFixed(1)}
      </span>
      {voteCount !== undefined && voteCount > 0 && (
        <span className="text-xs text-[#808080]">
          ({formatVoteCount(voteCount)})
        </span>
      )}
    </div>
  );
}

/* ─── Main Page ─── */

export default async function ContentDetailPage({ params }: Props) {
  const { id } = await params;

  let content: Content;
  try {
    content = await getContent(id);
  } catch {
    notFound();
  }

  // Fetch all contents for similar recommendations
  let allContents: Content[] = [];
  try {
    const result = await getContents(1, 120);
    allContents = result.items;
  } catch {
    // Silently fail - similar section just won't show
  }

  // Find similar content: shares at least 1 genre, exclude self, max 12
  const similarContents = allContents
    .filter(
      (c) =>
        c.id !== content.id &&
        content.genres &&
        c.genres &&
        c.genres.some((g) => content.genres!.includes(g))
    )
    .slice(0, 12);

  const inAppSources = content.sources.filter((s) => s.watch_mode === "in_app" && s.stream_url);
  const externalSources = content.sources.filter((s) => s.watch_mode === "external" && s.external_url);
  const verifiedCount = content.sources.filter((s) => s.is_verified).length;
  const licenseInfo = getLicenseInfo(content.license_class);
  const audienceLabel = getAudienceLabel(content.audience);

  return (
    <div className="bg-[#141414] min-h-screen">
      {/* ═══════ Hero Section ═══════ */}
      <div className="relative w-full h-[50vh] md:h-[65vh] overflow-hidden">
        {/* Backdrop image */}
        {content.poster_url && (
          <Image
            src={content.poster_url}
            alt=""
            fill
            className="object-cover object-top scale-105"
            sizes="100vw"
            priority
            unoptimized
          />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 via-[#141414]/40 to-transparent" />

        {/* Back button */}
        <div className="absolute top-6 left-4 md:left-12 z-20">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full transition-colors"
          >
            <ArrowLeft size={16} />
            탐색으로 돌아가기
          </Link>
        </div>

        {/* Hero content overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-12 pb-8 z-10">
          <div className="flex items-end gap-6 md:gap-8 max-w-6xl">
            {/* Poster thumbnail */}
            <div className="hidden md:block shrink-0">
              <div className="relative w-40 lg:w-48 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
                <Image
                  src={content.poster_url ?? "/placeholder-poster.svg"}
                  alt={content.title}
                  fill
                  className="object-cover"
                  sizes="192px"
                  unoptimized={!content.poster_url}
                />
              </div>
            </div>

            {/* Title + metadata */}
            <div className="flex-1 min-w-0">
              {/* License badge */}
              {licenseInfo && (
                <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-md mb-3 ${licenseInfo.style}`}>
                  {licenseInfo.label}
                </span>
              )}

              {/* Title */}
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-1 leading-tight tracking-tight">
                {content.title}
              </h1>
              {content.original_title && content.original_title !== content.title && (
                <p className="text-white/50 text-sm md:text-base mb-3">{content.original_title}</p>
              )}

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                {/* Rating */}
                {content.vote_average !== undefined && content.vote_average > 0 && (
                  <RatingBadge voteAverage={content.vote_average} voteCount={content.vote_count} />
                )}

                {/* Year */}
                {content.year && (
                  <span className="flex items-center gap-1 text-white/60">
                    <Calendar size={14} />
                    {content.year}
                  </span>
                )}

                {/* Runtime */}
                {content.runtime && content.runtime > 0 && (
                  <span className="flex items-center gap-1 text-white/60">
                    <Clock size={14} />
                    {formatRuntime(content.runtime)}
                  </span>
                )}

                {/* Audience */}
                {audienceLabel && (
                  <span className="flex items-center gap-1 text-white/60 bg-white/10 px-2 py-0.5 rounded text-xs">
                    <Users size={12} />
                    {audienceLabel}
                  </span>
                )}

                {/* Countries */}
                {content.country?.map((c) => (
                  <span key={c} className="flex items-center gap-1 text-white/60">
                    <Globe size={14} />
                    {c}
                  </span>
                ))}
              </div>

              {/* Genre tags */}
              {content.genres && content.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {content.genres.map((genre) => (
                    <span
                      key={genre}
                      className={`text-xs font-medium px-3 py-1 rounded-full border ${getGenreStyle(genre)}`}
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                {inAppSources[0] && (
                  <Link
                    href={`/player/${content.id}`}
                    className="flex items-center gap-2 bg-white text-black px-7 py-3 rounded-lg font-bold text-base hover:bg-white/90 transition-all duration-200 shadow-lg shadow-white/10"
                  >
                    <Play size={18} fill="black" />
                    재생
                  </Link>
                )}
                {externalSources[0] && (
                  <a
                    href={externalSources[0].external_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#e50914] text-white px-6 py-3 rounded-lg font-semibold text-base hover:bg-[#f40612] transition-all duration-200 shadow-lg shadow-[#e50914]/20"
                  >
                    <ExternalLink size={16} />
                    {externalSources[0].source_name}에서 보기
                  </a>
                )}
                <button
                  className="flex items-center gap-2 bg-white/10 text-white px-5 py-3 rounded-lg font-medium text-sm hover:bg-white/20 transition-colors border border-white/10"
                  title="찜 목록에 추가 (준비 중)"
                >
                  <Plus size={16} />
                  내 목록
                </button>
                <button
                  className="flex items-center justify-center w-11 h-11 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors border border-white/10"
                  title="공유 (준비 중)"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Content Body ═══════ */}
      <div className="px-4 md:px-12 py-8 max-w-6xl">
        {/* Synopsis */}
        {content.synopsis && (
          <section className="mb-10">
            <h2 className="text-white font-semibold text-lg mb-3 flex items-center gap-2">
              <Film size={18} />
              작품 소개
            </h2>
            <p className="text-[#b3b3b3] text-sm md:text-base leading-relaxed max-w-3xl">
              {content.synopsis}
            </p>
          </section>
        )}

        {/* Content Info Grid */}
        <section className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column: Details */}
            <div className="bg-[#1a1a1a] rounded-xl p-5 border border-white/5">
              <h3 className="text-white font-semibold text-sm mb-4">작품 정보</h3>
              <dl className="space-y-3 text-sm">
                {content.title && (
                  <div className="flex gap-3">
                    <dt className="text-[#808080] shrink-0 w-20">제목</dt>
                    <dd className="text-white">{content.title}</dd>
                  </div>
                )}
                {content.original_title && content.original_title !== content.title && (
                  <div className="flex gap-3">
                    <dt className="text-[#808080] shrink-0 w-20">원제</dt>
                    <dd className="text-white/80">{content.original_title}</dd>
                  </div>
                )}
                {content.year && (
                  <div className="flex gap-3">
                    <dt className="text-[#808080] shrink-0 w-20">개봉 연도</dt>
                    <dd className="text-white/80">{content.year}</dd>
                  </div>
                )}
                {content.runtime && content.runtime > 0 && (
                  <div className="flex gap-3">
                    <dt className="text-[#808080] shrink-0 w-20">상영 시간</dt>
                    <dd className="text-white/80">{formatRuntime(content.runtime)}</dd>
                  </div>
                )}
                {content.country && content.country.length > 0 && (
                  <div className="flex gap-3">
                    <dt className="text-[#808080] shrink-0 w-20">제작 국가</dt>
                    <dd className="text-white/80">{content.country.join(", ")}</dd>
                  </div>
                )}
                {content.genres && content.genres.length > 0 && (
                  <div className="flex gap-3">
                    <dt className="text-[#808080] shrink-0 w-20">장르</dt>
                    <dd className="text-white/80">{content.genres.join(", ")}</dd>
                  </div>
                )}
                {audienceLabel && (
                  <div className="flex gap-3">
                    <dt className="text-[#808080] shrink-0 w-20">관람 등급</dt>
                    <dd className="text-white/80">{audienceLabel}</dd>
                  </div>
                )}
                {licenseInfo && (
                  <div className="flex gap-3">
                    <dt className="text-[#808080] shrink-0 w-20">라이선스</dt>
                    <dd className="text-white/80">{licenseInfo.label}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Right column: Stats */}
            <div className="bg-[#1a1a1a] rounded-xl p-5 border border-white/5">
              <h3 className="text-white font-semibold text-sm mb-4">평가 및 통계</h3>
              <div className="space-y-4">
                {/* Rating big display */}
                {content.vote_average !== undefined && content.vote_average > 0 && (
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-16 h-16 rounded-xl border-2 ${
                      content.vote_average >= 7 ? "border-emerald-500/50 bg-emerald-500/10" :
                      content.vote_average >= 5 ? "border-amber-500/50 bg-amber-500/10" :
                      "border-red-500/50 bg-red-500/10"
                    }`}>
                      <span className={`text-2xl font-black ${
                        content.vote_average >= 7 ? "text-emerald-400" :
                        content.vote_average >= 5 ? "text-amber-400" :
                        "text-red-400"
                      }`}>
                        {content.vote_average.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={star <= Math.round(content.vote_average! / 2) ? "text-amber-400" : "text-[#333]"}
                            fill={star <= Math.round(content.vote_average! / 2) ? "currentColor" : "none"}
                          />
                        ))}
                      </div>
                      {content.vote_count !== undefined && content.vote_count > 0 && (
                        <p className="text-xs text-[#808080]">{formatVoteCount(content.vote_count)} 평가</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Popularity */}
                {content.popularity !== undefined && content.popularity > 0 && (
                  <div>
                    <p className="text-[#808080] text-xs mb-1.5">인기도</p>
                    <div className="w-full h-2 bg-[#333] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#e50914] to-[#ff6b6b] rounded-full transition-all"
                        style={{ width: `${Math.min(content.popularity, 100)}%` }}
                      />
                    </div>
                    <p className="text-[#666] text-[10px] mt-1">{content.popularity.toFixed(1)}</p>
                  </div>
                )}

                {/* Source stats */}
                <div className="pt-3 border-t border-white/5">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xl font-bold text-white">{content.sources.length}</p>
                      <p className="text-[10px] text-[#808080]">시청 소스</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-emerald-400">{verifiedCount}</p>
                      <p className="text-[10px] text-[#808080]">검증됨</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-400">{inAppSources.length}</p>
                      <p className="text-[10px] text-[#808080]">직접 재생</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ Sources Section ═══════ */}
        {content.sources.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-white font-semibold text-lg">시청 방법</h2>
              <span className="text-[#808080] text-sm">{content.sources.length}개 소스</span>
              {verifiedCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <Shield size={12} />
                  {verifiedCount}개 검증됨
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {content.sources.map((source) => (
                <SourceCard key={source.id} source={source} contentId={content.id} contentTitle={content.title} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ═══════ Similar Content Carousel ═══════ */}
      {similarContents.length > 0 && (
        <div className="pb-12">
          <Carousel title="비슷한 작품" items={similarContents} />
        </div>
      )}
    </div>
  );
}
