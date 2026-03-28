"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AlertCircle, Loader2, Volume2, VolumeX, Maximize, RotateCcw, ExternalLink } from "lucide-react";

interface PlayerProps {
  streamUrl: string;
  title: string;
  subtitleUrl?: string;
  qualityHint?: string;
  archiveUrl?: string;
}

export default function Player({ streamUrl, title, subtitleUrl, qualityHint, archiveUrl }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHls, setIsHls] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const loadVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setLoading(true);

    const isHlsUrl =
      streamUrl.includes(".m3u8") || streamUrl.includes("hls") || streamUrl.includes("playlist");
    setIsHls(isHlsUrl);

    if (isHlsUrl) {
      import("hls.js").then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            startLevel: -1,
          });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError("HLS 스트림을 불러오는 데 실패했습니다.");
              setLoading(false);
            }
          });
          return () => hls.destroy();
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = streamUrl;
        }
      });
    } else {
      video.src = streamUrl;

      video.onloadeddata = () => {
        setLoading(false);
        setDuration(video.duration);
      };

      video.onerror = () => {
        setError("영상을 불러오는 데 실패했습니다. Archive.org 서버 상태를 확인해주세요.");
        setLoading(false);
      };

      video.ontimeupdate = () => setCurrentTime(video.currentTime);
      video.ondurationchange = () => setDuration(video.duration);
    }
  }, [streamUrl]);

  useEffect(() => {
    loadVideo();
  }, [loadVideo]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    loadVideo();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setMuted(video.muted);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const qualityLabel = qualityHint?.toUpperCase() || (streamUrl.includes("4k") ? "4K" : streamUrl.includes("1080") ? "HD" : "SD");
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div ref={containerRef} className="relative w-full bg-black aspect-video rounded-md overflow-hidden group">
      {/* 로딩 오버레이 */}
      {loading && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80">
          <Loader2 size={48} className="text-[#e50914] animate-spin" />
          <p className="text-[#b3b3b3] text-sm">영상을 불러오는 중...</p>
          <p className="text-[#6b7280] text-xs">Archive.org에서 스트리밍 준비 중</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/90 text-[#b3b3b3]">
          <AlertCircle size={48} className="text-[#e50914]" />
          <p className="text-sm text-center max-w-xs">{error}</p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm transition-colors"
            >
              <RotateCcw size={14} />
              다시 시도 {retryCount > 0 && `(${retryCount})`}
            </button>

            {archiveUrl && (
              <a
                href={archiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#e50914] hover:bg-[#c40812] text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                <ExternalLink size={14} />
                Archive.org에서 보기
              </a>
            )}
          </div>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#6b7280] hover:text-[#b3b3b3] transition-colors"
          >
            직접 스트림 URL 열기
          </a>
        </div>
      )}

      {/* 비디오 */}
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        className="w-full h-full"
        title={title}
        style={{ display: error ? "none" : "block" }}
      >
        {subtitleUrl && (
          <track kind="subtitles" src={subtitleUrl} srcLang="ko" label="한국어 자막" default />
        )}
        브라우저가 비디오 재생을 지원하지 않습니다.
      </video>

      {/* 상단 정보 오버레이 */}
      {!error && (
        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between
          bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium truncate max-w-[200px] md:max-w-none">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded font-medium backdrop-blur-sm">
              {qualityLabel}
            </span>
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded backdrop-blur-sm">
              {isHls ? "HLS" : "MP4"}
            </span>
          </div>
        </div>
      )}

      {/* 하단 커스텀 컨트롤 (네이티브 위에 추가) */}
      {!error && !loading && duration > 0 && (
        <div className="absolute bottom-14 left-0 right-0 px-3 flex items-center gap-3
          opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          <span className="text-white text-xs tabular-nums">{formatTime(currentTime)}</span>
          <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#e50914] rounded-full transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <span className="text-white text-xs tabular-nums">{formatTime(duration)}</span>
          <button onClick={toggleMute} className="text-white hover:text-[#e50914] transition-colors" title={muted ? "음소거 해제" : "음소거"}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button onClick={toggleFullscreen} className="text-white hover:text-[#e50914] transition-colors" title="전체화면">
            <Maximize size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
