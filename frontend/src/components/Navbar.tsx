"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, Film, Home, Settings } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#141414]" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <nav className="flex items-center gap-6 px-6 md:px-12 h-16">
        {/* 로고 */}
        <Link href="/" className="text-[#e50914] font-black text-2xl tracking-tight shrink-0">
          JH<span className="text-white">OTT</span>
        </Link>

        {/* 메뉴 */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <NavLink href="/" label="홈" icon={<Home size={14} />} active={pathname === "/"} />
          <NavLink href="/browse" label="탐색" icon={<Film size={14} />} active={pathname === "/browse"} />
        </div>

        <div className="flex-1" />

        {/* 검색 + 설정 */}
        <Link
          href="/browse"
          className="p-2 text-[#b3b3b3] hover:text-white transition-colors"
          title="검색"
        >
          <Search size={20} />
        </Link>
        <Link
          href="/settings"
          className="p-2 text-[#b3b3b3] hover:text-white transition-colors"
          title="설정"
        >
          <Settings size={20} />
        </Link>

        {/* 모바일 메뉴 */}
        <div className="flex md:hidden items-center gap-4 text-sm">
          <Link href="/" className={pathname === "/" ? "text-white" : "text-[#b3b3b3]"}>홈</Link>
          <Link href="/browse" className={pathname === "/browse" ? "text-white" : "text-[#b3b3b3]"}>탐색</Link>
        </div>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 transition-colors hover:text-white ${
        active ? "text-white font-medium" : "text-[#b3b3b3]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
