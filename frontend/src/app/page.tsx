import {
  getContents,
  getTrendingContents,
  getTopRatedContents,
  getContentsByCountry,
  searchByGenre,
} from "@/lib/api";
import HeroBanner from "@/components/HeroBanner";
import Carousel from "@/components/Carousel";
import type { Content, ContentListResponse } from "@/types/content";

/** Safely resolve a promise — returns empty list on failure */
async function safe(p: Promise<ContentListResponse>): Promise<Content[]> {
  try {
    const res = await p;
    return res.items;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  // ── Parallel API calls: each section fetches only 20 items ──
  const [
    trending,
    topRated,
    korean,
    hollywood,
    japanese,
    chinese,
    indian,
    thai,
    french,
    spanish,
    german,
    action,
    comedy,
    horror,
    romance,
    newest,
  ] = await Promise.all([
    safe(getTrendingContents(1, 20)),
    safe(getTopRatedContents(1, 20, 50)),
    safe(getContentsByCountry("KR", 1, 20)),
    safe(getContentsByCountry("US", 1, 20)),
    safe(getContentsByCountry("JP", 1, 20)),
    safe(getContentsByCountry("CN", 1, 20)),
    safe(getContentsByCountry("IN", 1, 20)),
    safe(getContentsByCountry("TH", 1, 20)),
    safe(getContentsByCountry("FR", 1, 20)),
    safe(getContentsByCountry("ES", 1, 20)),
    safe(getContentsByCountry("DE", 1, 20)),
    safe(searchByGenre("액션", 1, 20)),
    safe(searchByGenre("코미디", 1, 20)),
    safe(searchByGenre("공포", 1, 20)),
    safe(searchByGenre("로맨스", 1, 20)),
    safe(getContents(1, 20)),
  ]);

  // ── Hero: pick from trending, fallback to newest ──
  const hero = trending[0] ?? newest[0] ?? null;

  // ── Section definitions ──
  const sections: { title: string; items: Content[]; moreHref?: string }[] = [
    { title: "\uD83D\uDD25 지금 뜨는 콘텐츠", items: trending, moreHref: "/browse" },
    { title: "\u2B50 최고 평점", items: topRated, moreHref: "/browse?sort_by=rating" },
    { title: "\uD83C\uDDF0\uD83C\uDDF7 한국영화", items: korean, moreHref: "/browse?country=KR" },
    { title: "\uD83C\uDDFA\uD83C\uDDF8 헐리우드", items: hollywood, moreHref: "/browse?country=US" },
    { title: "\uD83C\uDDEF\uD83C\uDDF5 일본영화", items: japanese, moreHref: "/browse?country=JP" },
    { title: "\uD83C\uDDE8\uD83C\uDDF3 중국영화", items: chinese, moreHref: "/browse?country=CN" },
    { title: "\uD83C\uDDEE\uD83C\uDDF3 인도영화", items: indian, moreHref: "/browse?country=IN" },
    { title: "\uD83C\uDDF9\uD83C\uDDED 태국영화", items: thai, moreHref: "/browse?country=TH" },
    { title: "\uD83C\uDDEB\uD83C\uDDF7 프랑스영화", items: french, moreHref: "/browse?country=FR" },
    { title: "\uD83C\uDDEA\uD83C\uDDF8 스페인영화", items: spanish, moreHref: "/browse?country=ES" },
    { title: "\uD83C\uDDE9\uD83C\uDDEA 독일영화", items: german, moreHref: "/browse?country=DE" },
    { title: "\uD83D\uDCA5 액션", items: action, moreHref: "/browse?genre=액션" },
    { title: "\uD83D\uDE02 코미디", items: comedy, moreHref: "/browse?genre=코미디" },
    { title: "\uD83D\uDC7B 공포", items: horror, moreHref: "/browse?genre=공포" },
    { title: "\uD83D\uDC95 로맨스", items: romance, moreHref: "/browse?genre=로맨스" },
    { title: "\uD83C\uDD95 최신 콘텐츠", items: newest, moreHref: "/browse?sort_by=newest" },
  ];

  return (
    <div className="bg-[#141414] min-h-screen">
      {/* Hero Banner */}
      {hero ? (
        <HeroBanner content={hero} />
      ) : (
        <div className="flex items-center justify-center h-[400px] text-[#b3b3b3]">
          <div className="text-center">
            <p className="text-lg mb-2">백엔드 서버에 연결 중...</p>
            <p className="text-sm">uvicorn app.main:app 을 실행해주세요</p>
          </div>
        </div>
      )}

      {/* Category Carousels */}
      <div className="-mt-8 relative z-10 pb-12">
        {sections.map(
          (section) =>
            section.items.length > 0 && (
              <Carousel
                key={section.title}
                title={section.title}
                items={section.items}
                moreHref={section.moreHref}
              />
            )
        )}
      </div>
    </div>
  );
}
