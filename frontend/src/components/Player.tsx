"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

interface PlayerProps {
  streamUrl: string;
  title: string;
  subtitleUrl?: string;
}

export default function Player({ streamUrl, title, subtitleUrl }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHls, setIsHls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);

    const isHlsUrl =
      streamUrl.includes(".m3u8") || streamUrl.includes("hls") || streamUrl.includes("playlist");
    setIsHls(isHlsUrl);

    if (isHlsUrl) {
      // HLS 스트림 처리
      import("hls.js").then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({ maxBufferLength: 30 });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) setError("스트림을 불러오는 데 실패했습니다.");
          });
          return () => hls.destroy();
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = streamUrl;
        }
      });
    } else {
      // 일반 MP4 / 직접 재생
      video.src = streamUrl;
      video.onerror = () => setError("영상을 불러오는 데 실패했습니다.");
    }
  }, [streamUrl]);

  return (
    <div className="relative w-full bg-black aspect-video rounded-md overflow-hidden">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#b3b3b3]">
          <AlertCircle size={40} className="text-[#e50914]" />
          <p className="text-sm">{error}</p>
          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#e50914] hover:underline"
          >
            직접 열기
          </a>
        </div>
      ) : (
        <video
          ref={videoRef}
          controls
          autoPlay
          className="w-full h-full"
          title={title}
          crossOrigin="anonymous"
        >
          {subtitleUrl && (
            <track
              kind="subtitles"
              src={subtitleUrl}
              srcLang="ko"
              label="한국어 자막"
              default
            />
          )}
          브라우저가 비디오 재생을 지원하지 않습니다.
        </video>
      )}

      {/* 고화질 표시 */}
      {!error && (
        <div className="absolute top-2 right-2 text-xs bg-black/60 text-[#b3b3b3] px-2 py-0.5 rounded pointer-events-none">
          {isHls ? "HLS" : "MP4"} · SD
        </div>
      )}
    </div>
  );
}
