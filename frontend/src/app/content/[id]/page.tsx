import { getContent } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { Play, ExternalLink, ArrowLeft, Globe, Calendar, Tag } from "lucide-react";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
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

            {/* 재생 버튼 */}
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
                  className="flex items-center gap-2 bg-[#e50914] text-white px-5 py-2.5 rounded-md font-semibold text-sm hover:bg-[#f40612] transition-colors"
                >
                  <ExternalLink size={15} />
                  {externalSources[0].source_name}에서 보기
                </a>
              )}
            </div>

            {/* 소스 목록 */}
            {content.sources.length > 0 && (
              <div>
                <h3 className="text-white font-semibold text-sm mb-3">시청 방법</h3>
                <div className="flex flex-col gap-2">
                  {content.sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center gap-3 bg-[#1f1f1f] rounded-lg p-3 text-sm"
                    >
                      <span
                        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                          source.watch_mode === "in_app"
                            ? "bg-green-600/20 text-green-400"
                            : "bg-blue-600/20 text-blue-400"
                        }`}
                      >
                        {source.watch_mode === "in_app" ? "직접 재생" : "외부 연결"}
                      </span>
                      <span className="text-white font-medium">{source.source_name}</span>
                      {source.quality_hint && (
                        <span className="text-[#6b7280] text-xs">{source.quality_hint}</span>
                      )}
                      {source.availability_note && (
                        <span className="text-[#6b7280] text-xs ml-auto">{source.availability_note}</span>
                      )}
                      {source.watch_mode === "external" && source.external_url && (
                        <a
                          href={source.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-[#e50914] hover:text-red-400 transition-colors"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
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
