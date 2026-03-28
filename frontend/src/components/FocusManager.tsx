"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * D-pad 포커스 매니저
 * - 방향키(ArrowUp/Down/Left/Right)로 카드 및 UI 요소 탐색
 * - Enter로 선택/클릭
 * - Escape로 뒤로가기
 * - TV 리모컨 및 키보드 동시 대응
 */
export default function FocusManager() {
  const currentIndex = useRef(0);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-focusable="true"], a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0"
      );
    });
  }, []);

  const focusElement = useCallback((el: HTMLElement) => {
    // 기존 포커스 링 제거
    document.querySelectorAll("[data-tv-focused]").forEach((prev) => {
      prev.removeAttribute("data-tv-focused");
      (prev as HTMLElement).style.outline = "";
      (prev as HTMLElement).style.outlineOffset = "";
    });

    // 새 요소 포커스
    el.setAttribute("data-tv-focused", "true");
    el.style.outline = "2px solid #e50914";
    el.style.outlineOffset = "2px";
    el.focus({ preventScroll: false });

    // 뷰포트 안에 있도록 스크롤
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, []);

  const findNearest = useCallback(
    (direction: "up" | "down" | "left" | "right", elements: HTMLElement[], current: HTMLElement): HTMLElement | null => {
      const rect = current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      let best: HTMLElement | null = null;
      let bestDist = Infinity;

      for (const el of elements) {
        if (el === current) continue;
        const r = el.getBoundingClientRect();
        const ex = r.left + r.width / 2;
        const ey = r.top + r.height / 2;
        const dx = ex - cx;
        const dy = ey - cy;

        let isValidDirection = false;
        switch (direction) {
          case "up":
            isValidDirection = dy < -10;
            break;
          case "down":
            isValidDirection = dy > 10;
            break;
          case "left":
            isValidDirection = dx < -10;
            break;
          case "right":
            isValidDirection = dx > 10;
            break;
        }

        if (!isValidDirection) continue;

        // 방향축 거리 우선, 직교축 거리 가중치 낮게
        let dist: number;
        if (direction === "up" || direction === "down") {
          dist = Math.abs(dy) + Math.abs(dx) * 0.3;
        } else {
          dist = Math.abs(dx) + Math.abs(dy) * 0.3;
        }

        if (dist < bestDist) {
          bestDist = dist;
          best = el;
        }
      }

      return best;
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      // 현재 포커스된 요소 찾기
      const focused = document.activeElement as HTMLElement;
      const current = elements.includes(focused)
        ? focused
        : document.querySelector<HTMLElement>("[data-tv-focused]") ?? elements[0];

      const idx = elements.indexOf(current);
      if (idx >= 0) currentIndex.current = idx;

      let target: HTMLElement | null = null;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          target = findNearest("up", elements, current);
          break;
        case "ArrowDown":
          e.preventDefault();
          target = findNearest("down", elements, current);
          break;
        case "ArrowLeft":
          e.preventDefault();
          target = findNearest("left", elements, current);
          // 좌우가 없으면 이전 요소로 fallback
          if (!target && idx > 0) target = elements[idx - 1];
          break;
        case "ArrowRight":
          e.preventDefault();
          target = findNearest("right", elements, current);
          // 좌우가 없으면 다음 요소로 fallback
          if (!target && idx < elements.length - 1) target = elements[idx + 1];
          break;
        case "Enter":
          e.preventDefault();
          current?.click();
          return;
        case "Escape":
        case "Backspace":
          // 뒤로가기
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            window.history.back();
          }
          return;
        default:
          return;
      }

      if (target) {
        currentIndex.current = elements.indexOf(target);
        focusElement(target);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [getFocusableElements, findNearest, focusElement]);

  // CSS 스타일 주입 (TV 포커스 링)
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      [data-tv-focused] {
        outline: 2px solid #e50914 !important;
        outline-offset: 2px !important;
        z-index: 50;
        position: relative;
      }
      [data-focusable="true"]:focus-visible {
        outline: 2px solid #e50914;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return null; // 렌더링 요소 없음 — 이벤트 리스너만 등록
}
