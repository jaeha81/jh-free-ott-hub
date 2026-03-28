import { getContent } from "@/lib/api";
import Player from "@/components/Player";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;

  let content;
  try {
    content = await getContent(id);
  } catch {
    notFound();
  }

  const inAppSource = content.sources.find((s) => s.watch_mode === "in_app" && s.stream_url);

  if (!inAppSource) {
    return (
      <div className="bg-[#141414] min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-[#b3b3b3] mb-4">이 콘텐츠는 외부 플랫폼에서만 시청 가능합니다.</p>
        {content.sources[0]?.external_url && (
          <a
            href={content.sources[0].external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#e50914] text-white px-5 py-2.5 rounded-md font-semibold text-sm"
          >
            <ExternalLink size={15} />
            {content.sources[0].source_name}에서 보기
          </a>
        )}
        <Link href={`/content/${id}`} className="mt-4 text-[#b3b3b3] hover:text-white text-sm">
          ← 상세 페이지로
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen flex flex-col">
      {/* 플레이어 */}
      <div className="w-full max-w-6xl mx-auto px-2 md:px-6 pt-4">
        <Player
          streamUrl={inAppSource.stream_url!}
          title={content.title}
        />
      </div>

      {/* 영화 정보 */}
      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-4">
        <Link
          href={`/content/${id}`}
          className="inline-flex items-center gap-2 text-[#b3b3b3] hover:text-white text-sm mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          상세 정보
        </Link>

        <h1 className="text-white text-xl font-bold">{content.title}</h1>
        <div className="flex gap-3 mt-1 text-sm text-[#b3b3b3]">
          {content.year && <span>{content.year}</span>}
          {content.genres?.[0] && <span>{content.genres[0]}</span>}
          <span className="bg-blue-600/20 text-blue-400 px-1.5 rounded text-xs font-medium">
            {inAppSource.source_name}
          </span>
          <span className="text-[#6b7280] text-xs">
            {inAppSource.availability_note}
          </span>
        </div>
      </div>
    </div>
  );
}
