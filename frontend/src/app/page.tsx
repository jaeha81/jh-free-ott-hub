import { getContents } from "@/lib/api";
import HeroBanner from "@/components/HeroBanner";
import Carousel from "@/components/Carousel";
import type { Content } from "@/types/content";

export default async function HomePage() {
  let contents: Content[] = [];
  try {
    const result = await getContents(1, 80);
    contents = result.items;
  } catch {
    // 백엔드 미실행 시 빈 상태 표시
  }

  // 검증된 인앱 스트림 항목을 히어로로 우선 선택
  const verifiedInApp = contents.filter((c) =>
    c.sources.some((s) => s.watch_mode === "in_app" && s.is_verified && s.stream_url)
  );
  const hero = verifiedInApp[0] ?? contents.find((c) => c.sources.some((s) => s.watch_mode === "in_app")) ?? contents[0] ?? null;

  // 장르별 분류
  const byGenre = (genre: string) =>
    contents.filter((c) => c.genres?.includes(genre)).slice(0, 20);

  const horror = byGenre("공포");
  const comedy = byGenre("코미디");
  const thriller = byGenre("스릴러");
  const scifi = byGenre("SF");
  const drama = byGenre("드라마");
  const animation = byGenre("애니메이션");
  const inApp = contents.filter((c) => c.sources.some((s) => s.watch_mode === "in_app")).slice(0, 20);

  return (
    <div className="bg-[#141414] min-h-screen">
      {/* 히어로 배너 */}
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

      {/* 카테고리 캐러셀 */}
      <div className="-mt-8 relative z-10 pb-12">
        {inApp.length > 0 && <Carousel title="▶ 지금 바로 재생 가능" items={inApp} />}
        {horror.length > 0 && <Carousel title="공포 · 스릴러" items={horror} />}
        {comedy.length > 0 && <Carousel title="코미디 · 로맨스" items={comedy} />}
        {scifi.length > 0 && <Carousel title="SF · 판타지" items={scifi} />}
        {drama.length > 0 && <Carousel title="드라마 · 역사" items={drama} />}
        {animation.length > 0 && <Carousel title="애니메이션" items={animation} />}
        {thriller.length > 0 && <Carousel title="미스터리 · 범죄" items={thriller} />}
        {contents.length > 0 && <Carousel title="전체 컬렉션" items={contents.slice(0, 20)} />}
      </div>
    </div>
  );
}
