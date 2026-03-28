"use client";

import { useState, useEffect } from "react";
import { Globe, Subtitles, Wifi, Monitor, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

interface AppSettings {
  language: string;
  subtitleLang: string;
  autoSubtitle: boolean;
  quality: string;
  dpadEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: "ko",
  subtitleLang: "ko",
  autoSubtitle: true,
  quality: "auto",
  dpadEnabled: true,
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem("jh-ott-settings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem("jh-ott-settings", JSON.stringify(settings));
}

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-5 border-b border-white/5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-[#e50914]">{icon}</div>
        <div>
          <p className="text-white font-medium text-sm">{label}</p>
          <p className="text-[#6b7280] text-xs mt-0.5">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white/10 text-white text-sm rounded-md px-3 py-1.5 border border-white/10
        focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] outline-none cursor-pointer
        appearance-none min-w-[120px]"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? "bg-[#e50914]" : "bg-white/20"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-[#141414] min-h-screen">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="text-[#b3b3b3] hover:text-white transition-colors"
            data-focusable="true"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-white text-2xl font-bold">설정</h1>
          {saved && (
            <span className="ml-auto flex items-center gap-1 text-green-400 text-xs animate-pulse">
              <Check size={14} /> 저장됨
            </span>
          )}
        </div>

        {/* 언어 설정 */}
        <section className="mb-8">
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
            언어 및 자막
          </h2>
          <div className="bg-white/5 rounded-lg px-4">
            <SettingRow
              icon={<Globe size={18} />}
              label="인터페이스 언어"
              description="메뉴 및 UI 표시 언어"
            >
              <Select
                value={settings.language}
                onChange={(v) => update("language", v)}
                options={[
                  { value: "ko", label: "한국어" },
                  { value: "en", label: "English" },
                  { value: "ja", label: "日本語" },
                ]}
              />
            </SettingRow>

            <SettingRow
              icon={<Subtitles size={18} />}
              label="기본 자막 언어"
              description="영상 재생 시 기본으로 표시할 자막"
            >
              <Select
                value={settings.subtitleLang}
                onChange={(v) => update("subtitleLang", v)}
                options={[
                  { value: "ko", label: "한국어" },
                  { value: "en", label: "English" },
                  { value: "ja", label: "日本語" },
                  { value: "none", label: "자막 없음" },
                ]}
              />
            </SettingRow>

            <SettingRow
              icon={<Subtitles size={18} />}
              label="자동 자막 번역"
              description="자막이 없는 영상에서 자동 번역 시도 (실험적)"
            >
              <Toggle
                checked={settings.autoSubtitle}
                onChange={(v) => update("autoSubtitle", v)}
              />
            </SettingRow>
          </div>
        </section>

        {/* 재생 설정 */}
        <section className="mb-8">
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
            재생
          </h2>
          <div className="bg-white/5 rounded-lg px-4">
            <SettingRow
              icon={<Wifi size={18} />}
              label="화질 설정"
              description="네트워크 상태에 따른 기본 화질"
            >
              <Select
                value={settings.quality}
                onChange={(v) => update("quality", v)}
                options={[
                  { value: "auto", label: "자동" },
                  { value: "hd", label: "고화질 (HD)" },
                  { value: "sd", label: "표준 (SD)" },
                  { value: "low", label: "저화질 (절약)" },
                ]}
              />
            </SettingRow>

            <SettingRow
              icon={<Monitor size={18} />}
              label="TV/리모컨 모드"
              description="방향키 네비게이션 활성화 (D-pad)"
            >
              <Toggle
                checked={settings.dpadEnabled}
                onChange={(v) => update("dpadEnabled", v)}
              />
            </SettingRow>
          </div>
        </section>

        {/* 정보 */}
        <section>
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
            정보
          </h2>
          <div className="bg-white/5 rounded-lg p-4 text-[#6b7280] text-xs space-y-2">
            <p>JH Free OTT Hub v0.1.0 (MVP)</p>
            <p>이 서비스는 공공도메인 및 합법 무료 콘텐츠만 제공합니다.</p>
            <p>Internet Archive, Tubi, Rakuten Viki 등의 공식 소스를 연결합니다.</p>
            <p className="text-[#4b5563] mt-4">
              저작권 침해 콘텐츠는 포함하지 않으며, VPN 우회나 DRM 우회를 지원하지 않습니다.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
