"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  SkipBack,
  SkipForward,
  Settings,
} from "lucide-react";
import type { Source } from "@/types/content";

interface PlayerViewProps {
  contentId: string;
  title: string;
  year: number | null;
  genres: string[] | null;
  streamUrl: string;
  sourceName: string;
  qualityHint?: string;
  archiveUrl?: string;
  availabilityNote?: string;
  isVerified: boolean;
  externalSources: Source[];
}

/* ─── Time Formatter ─── */

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ─── Main Client Component ─── */

export default function PlayerView({
  contentId,
  title,
  year,
  genres,
  streamUrl,
  sourceName,
  qualityHint,
  archiveUrl,
  availabilityNote,
  isVerified,
  externalSources,
}: PlayerViewProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  /* State */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isHls, setIsHls] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [seekPreview, setSeekPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  /* ─── Load Video ─── */

  const loadVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

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
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError("HLS 스트림을 불러오는 데 실패했습니다.");
              setLoading(false);
            }
          });
          hlsRef.current = hls;
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = streamUrl;
        } else {
          setError("이 브라우저에서 HLS 재생을 지원하지 않습니다.");
          setLoading(false);
        }
      });
    } else {
      video.src = streamUrl;
      video.load();
    }
  }, [streamUrl]);

  useEffect(() => {
    loadVideo();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [loadVideo]);

  /* ─── Video Event Listeners ─── */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedData = () => {
      setLoading(false);
      setDuration(video.duration);
      video.play().catch(() => {});
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Update buffered
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const onDurationChange = () => setDuration(video.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      setError("영상을 불러오는 데 실패했습니다. 서버 상태를 확인해주세요.");
      setLoading(false);
    };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);

    return () => {
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, []);

  /* ─── Auto-hide controls ─── */

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (playing && !isDragging) {
      hideTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing, isDragging]);

  useEffect(() => {
    resetHideTimer();
  }, [playing, resetHideTimer]);

  /* ─── Fullscreen change listener ─── */

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  /* ─── Controls ─── */

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const changeVolume = useCallback((v: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, v));
    video.volume = clamped;
    setVolume(clamped);
    if (clamped === 0) {
      video.muted = true;
      setMuted(true);
    } else if (video.muted) {
      video.muted = false;
      setMuted(false);
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  }, []);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, time));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  const goBack = useCallback(() => {
    router.push(`/content/${contentId}`);
  }, [router, contentId]);

  /* ─── Keyboard Shortcuts ─── */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Escape":
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            goBack();
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(-10);
          resetHideTimer();
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(10);
          resetHideTimer();
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(volume + 0.1);
          resetHideTimer();
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(volume - 0.1);
          resetHideTimer();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "j":
          e.preventDefault();
          seek(-10);
          resetHideTimer();
          break;
        case "l":
          e.preventDefault();
          seek(10);
          resetHideTimer();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, toggleFullscreen, goBack, seek, changeVolume, toggleMute, volume, resetHideTimer]);

  /* ─── Progress Bar Interactions ─── */

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar || !isFinite(duration)) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar || !isFinite(duration)) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setSeekPreview(formatTime(ratio * duration));
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    loadVideo();
  };

  /* ─── Quality Label ─── */

  const qualityLabel =
    qualityHint?.toUpperCase() ||
    (streamUrl.includes("4k") ? "4K" : streamUrl.includes("1080") ? "HD" : "SD");

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;

  /* ─── Render ─── */

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black select-none overflow-hidden"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => {
        if (playing) setShowControls(false);
      }}
    >
      {/* ═══════ Video Element ═══════ */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain bg-black"
        playsInline
        onClick={togglePlay}
        style={{ display: error ? "none" : "block" }}
      />

      {/* ═══════ Loading Overlay ═══════ */}
      {loading && !error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/60">
          <Loader2 size={56} className="text-[#e50914] animate-spin" />
          <p className="text-white/80 text-sm font-medium">영상을 불러오는 중...</p>
          <p className="text-white/40 text-xs">{sourceName}에서 스트리밍 준비 중</p>
        </div>
      )}

      {/* ═══════ Error Overlay ═══════ */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/95">
          <AlertCircle size={56} className="text-[#e50914]" />
          <p className="text-white/80 text-sm text-center max-w-sm">{error}</p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <RotateCcw size={15} />
              다시 시도 {retryCount > 0 && `(${retryCount})`}
            </button>

            {archiveUrl && (
              <a
                href={archiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#e50914] hover:bg-[#c40812] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <ExternalLink size={15} />
                Archive.org에서 보기
              </a>
            )}
          </div>

          <button
            onClick={goBack}
            className="mt-2 text-white/40 hover:text-white/70 text-xs transition-colors"
          >
            상세 페이지로 돌아가기
          </button>
        </div>
      )}

      {/* ═══════ Center Play/Pause Indicator ═══════ */}
      {!error && !loading && !playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 transition-opacity"
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
            <Play size={36} className="text-white ml-1" fill="white" />
          </div>
        </button>
      )}

      {/* ═══════ Top Bar ═══════ */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-4 pb-16 px-4 md:px-8">
          <div className="flex items-center gap-4">
            {/* Back button */}
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              title="뒤로가기 (Esc)"
            >
              <ArrowLeft size={22} />
            </button>

            {/* Title & metadata */}
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-lg md:text-xl font-bold truncate">{title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {year && <span className="text-white/50 text-xs">{year}</span>}
                {genres?.[0] && (
                  <span className="text-white/50 text-xs">{genres.slice(0, 2).join(" / ")}</span>
                )}
              </div>
            </div>

            {/* Right badges */}
            <div className="flex items-center gap-2 shrink-0">
              {!isVerified && (
                <span className="flex items-center gap-1 text-amber-400 text-[10px] bg-amber-500/10 px-2 py-1 rounded">
                  <AlertTriangle size={11} />
                  미검증
                </span>
              )}
              <span className="text-[10px] bg-white/15 text-white/80 px-2 py-1 rounded font-medium backdrop-blur-sm">
                {qualityLabel}
              </span>
              <span className="text-[10px] bg-white/15 text-white/80 px-2 py-1 rounded backdrop-blur-sm">
                {isHls ? "HLS" : "MP4"}
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                {sourceName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Bottom Controls ═══════ */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20 pb-4 px-4 md:px-8">
          {/* Progress Bar */}
          <div
            ref={progressRef}
            className="group/progress relative w-full h-1.5 hover:h-3 bg-white/20 rounded-full cursor-pointer mb-4 transition-all duration-150"
            onClick={handleProgressClick}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setSeekPreview(null)}
          >
            {/* Buffered */}
            <div
              className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all"
              style={{ width: `${bufferedProgress}%` }}
            />
            {/* Progress */}
            <div
              className="absolute inset-y-0 left-0 bg-[#e50914] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Scrub handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#e50914] rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
            {/* Seek preview tooltip */}
            {seekPreview && (
              <div className="absolute -top-8 bg-black/90 text-white text-[10px] px-2 py-1 rounded pointer-events-none"
                style={{ left: `${progress}%`, transform: "translateX(-50%)" }}
              >
                {seekPreview}
              </div>
            )}
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-[#e50914] transition-colors"
              title={playing ? "일시정지 (Space)" : "재생 (Space)"}
            >
              {playing ? <Pause size={24} /> : <Play size={24} fill="white" />}
            </button>

            {/* Skip Back */}
            <button
              onClick={() => seek(-10)}
              className="text-white/70 hover:text-white transition-colors"
              title="10초 뒤로 (←)"
            >
              <SkipBack size={20} />
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => seek(10)}
              className="text-white/70 hover:text-white transition-colors"
              title="10초 앞으로 (→)"
            >
              <SkipForward size={20} />
            </button>

            {/* Volume */}
            <div
              className="relative flex items-center gap-1"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={toggleMute}
                className="text-white/70 hover:text-white transition-colors"
                title={muted ? "음소거 해제 (M)" : "음소거 (M)"}
              >
                {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  showVolumeSlider ? "w-20 opacity-100" : "w-0 opacity-0"
                }`}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={(e) => changeVolume(parseFloat(e.target.value))}
                  className="w-full h-1 accent-[#e50914] cursor-pointer"
                />
              </div>
            </div>

            {/* Time */}
            <div className="text-white/60 text-xs tabular-nums select-none ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* External link to archive */}
            {archiveUrl && (
              <a
                href={archiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/50 hover:text-white transition-colors"
                title="원본 페이지에서 보기"
              >
                <ExternalLink size={18} />
              </a>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white/70 hover:text-white transition-colors"
              title={isFullscreen ? "전체화면 종료" : "전체화면 (F)"}
            >
              {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-white/25">
            <span>Space: 재생/일시정지</span>
            <span>F: 전체화면</span>
            <span>Esc: 뒤로가기</span>
            <span>←→: 10초 탐색</span>
            <span>↑↓: 볼륨</span>
            <span>M: 음소거</span>
          </div>
        </div>
      </div>

      {/* ═══════ Unverified Warning Banner ═══════ */}
      {!isVerified && !error && (
        <div
          className={`absolute top-16 left-4 right-4 md:left-8 md:right-8 z-10 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2 bg-amber-900/40 border border-amber-600/20 text-amber-400/80 px-4 py-2 rounded-lg text-xs backdrop-blur-sm">
            <AlertTriangle size={13} className="shrink-0" />
            <span>이 스트림은 아직 검증되지 않았습니다. 재생이 실패할 수 있습니다.</span>
            {archiveUrl && (
              <a
                href={archiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto shrink-0 text-amber-300 hover:text-amber-100 underline"
              >
                Archive.org에서 직접 보기
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
