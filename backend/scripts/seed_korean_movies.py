"""한국영화 대량 시딩 - TMDb Discover API 활용"""

import sqlite3
import json
import time
import uuid
import urllib.request
import urllib.parse
from datetime import datetime

TMDB_API_KEY = "e2abfa5b1a215a5424d877bc1ee9e5c1"
TMDB_BASE = "https://api.themoviedb.org/3"
DB_PATH = "D:/ai프로젝트/jh-free-ott-hub/backend/free_ott_hub.db"

GENRE_MAP = {
    28: "액션", 12: "어드벤처", 16: "애니메이션", 35: "코미디", 80: "범죄",
    99: "다큐멘터리", 18: "드라마", 10751: "가족", 14: "판타지", 36: "역사",
    27: "공포", 10402: "음악", 9648: "미스터리", 10749: "로맨스", 878: "SF",
    53: "스릴러", 10752: "전쟁", 37: "서부", 10770: "TV영화"
}

# Korean movie categories - extensive coverage
CATEGORIES = [
    # 한국영화 인기순 (20페이지 = ~400편)
    *[{"name": f"KR Popular p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 21)],
    # 한국영화 평점순
    *[{"name": f"KR TopRated p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "sort_by": "vote_average.desc", "vote_count.gte": "50", "page": p}}
      for p in range(1, 11)],
    # 한국영화 최신 (2020~2026)
    *[{"name": f"KR Recent p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "primary_release_date.gte": "2020-01-01", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 11)],
    # 한국영화 2010년대
    *[{"name": f"KR 2010s p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "primary_release_date.gte": "2010-01-01", "primary_release_date.lte": "2019-12-31", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 11)],
    # 한국영화 2000년대
    *[{"name": f"KR 2000s p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "primary_release_date.gte": "2000-01-01", "primary_release_date.lte": "2009-12-31", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 6)],
    # 한국 액션영화
    *[{"name": f"KR Action p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "with_genres": "28", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 6)],
    # 한국 드라마영화
    *[{"name": f"KR Drama p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "with_genres": "18", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 6)],
    # 한국 스릴러
    *[{"name": f"KR Thriller p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "with_genres": "53", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 6)],
    # 한국 코미디
    *[{"name": f"KR Comedy p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "with_genres": "35", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 4)],
    # 한국 로맨스
    *[{"name": f"KR Romance p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "with_genres": "10749", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 4)],
    # 한국 공포
    *[{"name": f"KR Horror p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "with_genres": "27", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 4)],
    # 한국 범죄
    *[{"name": f"KR Crime p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "with_genres": "80", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 4)],
    # 한국 애니메이션
    *[{"name": f"KR Animation p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "with_genres": "16", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 3)],
    # 한국 SF
    *[{"name": f"KR SciFi p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "with_genres": "878", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 3)],
    # 한국 전쟁
    *[{"name": f"KR War p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "with_genres": "10752", "sort_by": "popularity.desc", "page": p}}
      for p in range(1, 3)],
    # 매출순 (revenue)
    *[{"name": f"KR Revenue p{p}", "endpoint": "/discover/movie",
       "params": {"with_original_language": "ko", "sort_by": "revenue.desc", "page": p}}
      for p in range(1, 6)],
]


def tmdb_get(endpoint, params):
    params["api_key"] = TMDB_API_KEY
    params["language"] = "ko-KR"
    url = f"{TMDB_BASE}{endpoint}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def db_connect():
    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def db_execute_batch(rows_contents, rows_sources, retries=5):
    for attempt in range(retries):
        try:
            conn = db_connect()
            cur = conn.cursor()
            for row in rows_contents:
                cur.execute("""
                    INSERT OR IGNORE INTO contents (id, title, original_title, year, country, genres, synopsis, poster_url, tmdb_id, audience, license_class, vote_average, vote_count, runtime, popularity, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, row)
            for row in rows_sources:
                cur.execute("""
                    INSERT OR IGNORE INTO sources (id, content_id, source_name, watch_mode, external_url, stream_url, quality_hint, subtitle_languages, availability_note, region_hint, is_verified, last_checked_at, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, row)
            conn.commit()
            conn.close()
            return True
        except sqlite3.OperationalError as e:
            if "locked" in str(e) and attempt < retries - 1:
                print(f"    DB locked, retry {attempt+1}/{retries}...")
                time.sleep(2 * (attempt + 1))
                try:
                    conn.close()
                except:
                    pass
            else:
                print(f"    DB ERROR: {e}")
                try:
                    conn.close()
                except:
                    pass
                return False
    return False


def get_movie_details(tmdb_id):
    """Get runtime from TMDb movie details."""
    try:
        data = tmdb_get(f"/movie/{tmdb_id}", {})
        return data.get("runtime", 0) or 0
    except:
        return 0


def main():
    conn = db_connect()
    cur = conn.cursor()
    cur.execute("SELECT tmdb_id FROM contents WHERE tmdb_id IS NOT NULL")
    existing_ids = set(r[0] for r in cur.fetchall())
    conn.close()
    print(f"기존 영화(tmdb_id 보유): {len(existing_ids)}편")

    added = 0
    skipped = 0
    errors = 0
    seen_this_run = set()

    total_cats = len(CATEGORIES)
    for idx, cat in enumerate(CATEGORIES, 1):
        name = cat["name"]
        print(f"\n[{idx}/{total_cats}] {name}")

        try:
            data = tmdb_get(cat["endpoint"], dict(cat["params"]))
        except Exception as e:
            print(f"  ERROR: {e}")
            errors += 1
            time.sleep(0.5)
            continue

        results = data.get("results", [])
        print(f"  결과: {len(results)}편")

        batch_contents = []
        batch_sources = []

        for movie in results:
            tmdb_id = movie.get("id")
            if not tmdb_id or tmdb_id in existing_ids or tmdb_id in seen_this_run:
                skipped += 1
                continue

            seen_this_run.add(tmdb_id)

            title = movie.get("title", "")
            original_title = movie.get("original_title", "")
            release_date = movie.get("release_date", "")
            year = int(release_date[:4]) if release_date and len(release_date) >= 4 else None
            genre_ids = movie.get("genre_ids", [])
            genres = [GENRE_MAP.get(g, str(g)) for g in genre_ids]
            synopsis = movie.get("overview", "")
            poster_path = movie.get("poster_path", "")
            poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else ""
            vote_avg = movie.get("vote_average", 0) or 0
            vote_cnt = movie.get("vote_count", 0) or 0
            popularity = movie.get("popularity", 0) or 0

            license_class = "ad_supported"
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            content_id = str(uuid.uuid4())

            batch_contents.append((
                content_id, title, original_title, year,
                json.dumps(["KR"]), json.dumps(genres, ensure_ascii=False),
                synopsis, poster_url, tmdb_id,
                "general", license_class, vote_avg, vote_cnt, 0, popularity, now, now
            ))

            encoded_title = urllib.parse.quote(title)
            external_url = f"https://www.viki.com/search?q={encoded_title}"
            source_id = str(uuid.uuid4())

            batch_sources.append((
                source_id, content_id, "Viki", "external",
                external_url, None, "HD", "[]",
                "Viki에서 무료 시청 가능 (광고 포함)", "asia", 0, None, now
            ))

        if batch_contents:
            ok = db_execute_batch(batch_contents, batch_sources)
            if ok:
                added += len(batch_contents)
                print(f"  ✅ {len(batch_contents)}편 추가")
            else:
                errors += len(batch_contents)

        time.sleep(0.25)

    # Fetch runtime for newly added movies (sample)
    print(f"\n{'='*50}")
    print(f"한국영화 시딩 완료!")
    print(f"  추가: {added}편")
    print(f"  스킵: {skipped}편 (이미 존재)")
    print(f"  오류: {errors}편")

    # Verify final count
    conn = db_connect()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM contents WHERE country LIKE '%KR%'")
    kr_total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM contents")
    total = cur.fetchone()[0]
    conn.close()
    print(f"\n  한국영화 총: {kr_total}편")
    print(f"  전체 콘텐츠: {total}편")


if __name__ == "__main__":
    main()
