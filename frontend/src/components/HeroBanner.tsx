import Link from "next/link";
import { Play, Info } from "lucide-react";
import type { Content } from "@/types/content";

interface HeroBannerProps {
  content: Content;
}

export default function HeroBanner({ content }: HeroBannerProps) {
  const hasVerifiedInApp = content.sources.some(
    (s) => s.watch_mode === "in_app" && s.stream_url && s.is_verified
  );

  return (
    <div className="relative w-full h-[56vw] max-h-[700px] min-h-[400px] overflow-hidden">
      {/* 배경 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: content.poster_url
            ? `url(${content.poster_url})`
            : "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        }}
      />

      {/* 그라디언트 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#141414] to-transparent" />

      {/* 콘텐츠 */}
      <div className="absolute inset-0 flex flex-col justify-end pb-16 px-6 md:px-12">
        <div className="max-w-2xl">
          {content.license_class === "public_domain" && (
            <span className="inline-block text-xs bg-blue-600 text-white px-2 py-1 rounded mb-3 font-medium">
              공공도메인 무료 재생
            </span>
          )}

          <h1 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight">
            {content.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-[#b3b3b3] mb-4">
            {content.year && <span>{content.year}</span>}
            {content.genres?.[0] && (
              <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{content.genres[0]}</span>
            )}
            {content.country?.[0] && <span>{content.country[0]}</span>}
          </div>

          {content.synopsis && (
            <p className="text-[#b3b3b3] text-sm md:text-base line-clamp-3 mb-6 max-w-xl">
              {content.synopsis}
            </p>
          )}

          <div className="flex items-center gap-3">
            {hasVerifiedInApp ? (
              <Link
                href={`/player/${content.id}`}
                className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-md
                  font-bold text-sm hover:bg-white/90 transition-colors"
              >
                <Play size={16} fill="black" />
                재생
              </Link>
            ) : (
              <Link
                href={`/content/${content.id}`}
                className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-md
                  font-bold text-sm hover:bg-white/90 transition-colors"
              >
                <Play size={16} fill="black" />
                외부에서 보기
              </Link>
            )}

            <Link
              href={`/content/${content.id}`}
              className="flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-md
                font-semibold text-sm hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              <Info size={16} />
              상세 정보
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
