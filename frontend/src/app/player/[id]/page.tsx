import { getContent } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, ExternalLink, AlertTriangle, Tv } from "lucide-react";
import { notFound } from "next/navigation";
import type { Content, Source } from "@/types/content";
import PlayerView from "./PlayerView";

interface Props {
  params: Promise<{ id: string }>;
}

/* ─── External Source Card (server component) ─── */

function ExternalSourceCard({ source }: { source: Source }) {
  const platformColors: Record<string, string> = {
    tubi: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30",
    viki: "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30",
    rakuten: "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30",
    plex: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30",
  };

  const name = source.source_name.toLowerCase();
  const style =
    Object.entries(platformColors).find(([k]) => name.includes(k))?.[1] ??
    "bg-white/10 text-white/70 border-white/20 hover:bg-white/20";

  return (
    <a
      href={source.external_url!}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 px-5 py-3 rounded-lg border transition-all duration-200 ${style}`}
    >
      <ExternalLink size={16} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{source.source_name}</p>
        {source.quality_hint && (
          <span className="text-[10px] opacity-70 uppercase">{source.quality_hint}</span>
        )}
      </div>
      {source.region_hint && (
        <span className="text-[10px] opacity-60">
          {source.region_hint === "global" ? "전 세계" : source.region_hint}
        </span>
      )}
    </a>
  );
}

/* ─── Main Page (Server Component) ─── */

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;

  let content: Content;
  try {
    content = await getContent(id);
  } catch {
    notFound();
  }

  // Find best in_app source: prefer verified, then any
  const inAppSource =
    content.sources.find((s) => s.watch_mode === "in_app" && s.stream_url && s.is_verified) ??
    content.sources.find((s) => s.watch_mode === "in_app" && s.stream_url);

  const externalSources = content.sources.filter(
    (s) => s.watch_mode === "external" && s.external_url
  );

  const isVerified = inAppSource?.is_verified ?? false;

  /* ─── No in_app source: show external links ─── */
  if (!inAppSource) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <Tv size={36} className="text-[#808080]" />
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">{content.title}</h1>
          <p className="text-[#808080] text-sm mb-8">
            이 콘텐츠는 직접 재생을 지원하지 않습니다.
            <br />
            아래 외부 플랫폼에서 시청할 수 있습니다.
          </p>

          {externalSources.length > 0 && (
            <div className="space-y-3 mb-8">
              {externalSources.map((source) => (
                <ExternalSourceCard key={source.id} source={source} />
              ))}
            </div>
          )}

          {externalSources.length === 0 && (
            <p className="text-[#555] text-sm mb-8">현재 이용 가능한 소스가 없습니다.</p>
          )}

          <Link
            href={`/content/${id}`}
            className="inline-flex items-center gap-2 text-[#b3b3b3] hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={14} />
            상세 페이지로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Has in_app source: render full player ─── */
  return (
    <PlayerView
      contentId={id}
      title={content.title}
      year={content.year}
      genres={content.genres}
      streamUrl={inAppSource.stream_url!}
      sourceName={inAppSource.source_name}
      qualityHint={inAppSource.quality_hint ?? undefined}
      archiveUrl={inAppSource.external_url ?? undefined}
      availabilityNote={inAppSource.availability_note ?? undefined}
      isVerified={isVerified}
      externalSources={externalSources}
    />
  );
}
