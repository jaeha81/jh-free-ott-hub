"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ContentCard from "./ContentCard";
import type { Content } from "@/types/content";

interface CarouselProps {
  title: string;
  items: Content[];
}

export default function Carousel({ title, items }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="py-4">
      <h2 className="text-white font-semibold text-lg px-6 md:px-12 mb-3">{title}</h2>

      <div className="relative group/carousel">
        {/* 왼쪽 버튼 */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-full px-2
            bg-gradient-to-r from-black/80 to-transparent
            text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity
            flex items-center justify-center"
          aria-label="이전"
        >
          <ChevronLeft size={28} />
        </button>

        {/* 카드 목록 */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar px-6 md:px-12 scroll-smooth"
        >
          {items.map((item) => (
            <ContentCard key={item.id} content={item} />
          ))}
        </div>

        {/* 오른쪽 버튼 */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-full px-2
            bg-gradient-to-l from-black/80 to-transparent
            text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity
            flex items-center justify-center"
          aria-label="다음"
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </section>
  );
}
