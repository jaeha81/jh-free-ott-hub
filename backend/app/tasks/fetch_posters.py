"""
TMDb API를 사용하여 모든 콘텐츠의 포스터 URL을 일괄 업데이트하는 스크립트.

사용법:
  1. .env 파일에 TMDb API 키 설정:
     TMDB_API_KEY=your_actual_api_key
  2. 실행:
     python -m app.tasks.fetch_posters

TMDb API 키 발급: https://developer.themoviedb.org/docs/getting-started
  - 무료 계정 생성 → Settings → API → Create API Key
"""

import asyncio
import sqlite3
import os
import sys

# 프로젝트 루트를 path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    import httpx
except ImportError:
    print("httpx가 필요합니다: pip install httpx")
    sys.exit(1)

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "free_ott_hub.db")


async def fetch_posters():
    # API 키 로드
    api_key = os.environ.get("TMDB_API_KEY", "")

    # .env 파일에서 로드 시도
    if not api_key or api_key == "your_tmdb_api_key_here":
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("TMDB_API_KEY="):
                        api_key = line.strip().split("=", 1)[1].strip()
                        break

    if not api_key or api_key == "your_tmdb_api_key_here":
        print("❌ TMDb API 키가 설정되지 않았습니다.")
        print("   1. https://developer.themoviedb.org 에서 무료 계정 생성")
        print("   2. Settings → API → Create API Key")
        print("   3. backend/.env 파일에 TMDB_API_KEY=발급받은키 입력")
        print("   4. 이 스크립트 다시 실행")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 포스터가 없거나 archive.org 기본 아이콘인 항목 조회
    cur.execute("""
        SELECT id, title, year, tmdb_id
        FROM contents
        WHERE poster_url IS NULL
           OR poster_url LIKE '%archive.org/services/img%'
        ORDER BY title
    """)
    rows = cur.fetchall()
    print(f"📋 포스터 업데이트 대상: {len(rows)}개")

    updated = 0
    failed = []

    async with httpx.AsyncClient(timeout=10) as client:
        for i, (content_id, title, year, tmdb_id) in enumerate(rows):
            try:
                poster_path = None

                # tmdb_id가 있으면 직접 조회
                if tmdb_id:
                    resp = await client.get(
                        f"{TMDB_BASE}/movie/{tmdb_id}",
                        params={"api_key": api_key},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        poster_path = data.get("poster_path")

                # tmdb_id 없으면 검색
                if not poster_path:
                    params = {"api_key": api_key, "query": title}
                    if year:
                        params["year"] = year
                    resp = await client.get(
                        f"{TMDB_BASE}/search/movie",
                        params=params,
                    )
                    if resp.status_code == 200:
                        results = resp.json().get("results", [])
                        if results:
                            best = results[0]
                            poster_path = best.get("poster_path")
                            new_tmdb_id = best.get("id")

                            # tmdb_id도 같이 업데이트
                            if new_tmdb_id and not tmdb_id:
                                cur.execute(
                                    "UPDATE contents SET tmdb_id = ? WHERE id = ?",
                                    (new_tmdb_id, content_id),
                                )

                if poster_path:
                    poster_url = f"{TMDB_IMAGE_BASE}{poster_path}"
                    cur.execute(
                        "UPDATE contents SET poster_url = ? WHERE id = ?",
                        (poster_url, content_id),
                    )
                    updated += 1
                    print(f"  ✅ [{i+1}/{len(rows)}] {title} ({year}) → {poster_url}")
                else:
                    failed.append(title)
                    print(f"  ⚠️ [{i+1}/{len(rows)}] {title} ({year}) — 포스터 없음")

                # TMDb rate limit: 40 requests/10s
                await asyncio.sleep(0.3)

            except Exception as e:
                failed.append(title)
                print(f"  ❌ [{i+1}/{len(rows)}] {title} — 오류: {e}")

    conn.commit()
    conn.close()

    print(f"\n{'='*50}")
    print(f"✅ 업데이트 완료: {updated}개")
    print(f"⚠️ 실패: {len(failed)}개")
    if failed:
        print(f"   실패 목록: {', '.join(failed[:10])}{'...' if len(failed) > 10 else ''}")


if __name__ == "__main__":
    asyncio.run(fetch_posters())
