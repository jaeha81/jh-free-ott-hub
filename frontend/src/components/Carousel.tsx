"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ContentCard from "./ContentCard";
import type { Content } from "@/types/content";

interface CarouselProps {
  title: string;
  items: Content[];
  /** Link for "more" button, e.g. /browse?genre=SF or /browse?country=KR */
  moreHref?: string;
}

export default function Carousel({ title, items, moreHref }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollPage, setScrollPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);

    // Calculate page indicator
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setScrollPage(0);
      setTotalPages(1);
    } else {
      const pages = Math.ceil(scrollWidth / clientWidth);
      setTotalPages(pages);
      setScrollPage(Math.round((scrollLeft / maxScroll) * (pages - 1)));
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="py-4">
      {/* Title row */}
      <div className="flex items-baseline justify-between px-6 md:px-12 mb-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <span className="text-[#808080] text-sm">({items.length})</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Page dots */}
          {totalPages > 1 && (
            <div className="hidden md:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <div
                  key={i}
                  className={`h-0.5 rounded-full transition-all duration-300 ${
                    i === scrollPage ? "w-4 bg-white" : "w-2 bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}
          {moreHref && (
            <Link
              href={moreHref}
              className="text-[#b3b3b3] hover:text-white text-sm transition-colors whitespace-nowrap"
            >
              더보기 &gt;
            </Link>
          )}
        </div>
      </div>

      <div className="relative group/carousel">
        {/* Left gradient fade */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-12 md:w-16 z-10 pointer-events-none
            bg-gradient-to-r from-[#141414] to-transparent transition-opacity duration-300
            ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
        />

        {/* Left button */}
        <button
          onClick={() => scroll("left")}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-20 md:w-12 md:h-24
            bg-black/60 hover:bg-black/80 backdrop-blur-sm
            rounded-r-lg
            text-white transition-all duration-300
            flex items-center justify-center
            ${canScrollLeft ? "opacity-0 group-hover/carousel:opacity-100" : "opacity-0 pointer-events-none"}`}
          aria-label="이전"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Card list -- scroll-snap for touch/swipe */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar px-6 md:px-12
            scroll-smooth snap-x snap-mandatory"
        >
          {items.map((item) => (
            <div key={item.id} className="snap-start">
              <ContentCard content={item} />
            </div>
          ))}
        </div>

        {/* Right button */}
        <button
          onClick={() => scroll("right")}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-20 md:w-12 md:h-24
            bg-black/60 hover:bg-black/80 backdrop-blur-sm
            rounded-l-lg
            text-white transition-all duration-300
            flex items-center justify-center
            ${canScrollRight ? "opacity-0 group-hover/carousel:opacity-100" : "opacity-0 pointer-events-none"}`}
          aria-label="다음"
        >
          <ChevronRight size={24} />
        </button>

        {/* Right gradient fade */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-12 md:w-16 z-10 pointer-events-none
            bg-gradient-to-l from-[#141414] to-transparent transition-opacity duration-300
            ${canScrollRight ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    </section>
  );
}
