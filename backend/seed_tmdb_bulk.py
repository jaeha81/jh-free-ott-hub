"""Bulk seed movies from TMDb API into the local SQLite database."""

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

LANG_COUNTRY = {
    "en": "US", "ko": "KR", "ja": "JP", "zh": "CN", "fr": "FR",
    "de": "DE", "it": "IT", "es": "ES", "hi": "IN", "th": "TH",
    "tr": "TR", "ru": "RU", "pt": "BR", "sv": "SE", "da": "DK",
    "nl": "NL", "ar": "SA", "pl": "PL", "ta": "IN", "te": "IN", "ml": "IN"
}

ASIAN_LANGS = {"ko", "ja", "zh", "th", "hi", "ta", "te", "ml"}

# Categories to fetch
CATEGORIES = [
    # Popular all-time
    *[{"name": f"Popular p{p}", "endpoint": "/discover/movie", "params": {"sort_by": "popularity.desc", "page": p}} for p in range(1, 11)],
    # Top rated
    *[{"name": f"TopRated p{p}", "endpoint": "/movie/top_rated", "params": {"page": p}} for p in range(1, 6)],
    # Korean
    *[{"name": f"Korean p{p}", "endpoint": "/discover/movie", "params": {"with_original_language": "ko", "sort_by": "popularity.desc", "page": p}} for p in range(1, 6)],
    # Japanese
    *[{"name": f"Japanese p{p}", "endpoint": "/discover/movie", "params": {"with_original_language": "ja", "sort_by": "popularity.desc", "page": p}} for p in range(1, 6)],
    # Chinese
    *[{"name": f"Chinese p{p}", "endpoint": "/discover/movie", "params": {"with_original_language": "zh", "sort_by": "popularity.desc", "page": p}} for p in range(1, 4)],
    # Hindi
    *[{"name": f"Hindi p{p}", "endpoint": "/discover/movie", "params": {"with_original_language": "hi", "sort_by": "popularity.desc", "page": p}} for p in range(1, 4)],
    # Thai
    *[{"name": f"Thai p{p}", "endpoint": "/discover/movie", "params": {"with_original_language": "th", "sort_by": "popularity.desc", "page": p}} for p in range(1, 4)],
    # French
    *[{"name": f"French p{p}", "endpoint": "/discover/movie", "params": {"with_original_language": "fr", "sort_by": "popularity.desc", "page": p}} for p in range(1, 4)],
    # Spanish
    *[{"name": f"Spanish p{p}", "endpoint": "/discover/movie", "params": {"with_original_language": "es", "sort_by": "popularity.desc", "page": p}} for p in range(1, 4)],
    # German
    *[{"name": f"German p{p}", "endpoint": "/discover/movie", "params": {"with_original_language": "de", "sort_by": "popularity.desc", "page": p}} for p in range(1, 3)],
    # Italian
    *[{"name": f"Italian p{p}", "endpoint": "/discover/movie", "params": {"with_original_language": "it", "sort_by": "popularity.desc", "page": p}} for p in range(1, 3)],
    # Turkish
    *[{"name": f"Turkish p{p}", "endpoint": "/discover/movie", "params": {"with_original_language": "tr", "sort_by": "popularity.desc", "page": p}} for p in range(1, 3)],
    # Horror
    *[{"name": f"Horror p{p}", "endpoint": "/discover/movie", "params": {"with_genres": "27", "sort_by": "popularity.desc", "page": p}} for p in range(1, 4)],
    # Animation
    *[{"name": f"Animation p{p}", "endpoint": "/discover/movie", "params": {"with_genres": "16", "sort_by": "popularity.desc", "page": p}} for p in range(1, 4)],
    # Documentary
    *[{"name": f"Documentary p{p}", "endpoint": "/discover/movie", "params": {"with_genres": "99", "sort_by": "popularity.desc", "page": p}} for p in range(1, 4)],
    # Action
    *[{"name": f"Action p{p}", "endpoint": "/discover/movie", "params": {"with_genres": "28", "sort_by": "popularity.desc", "page": p}} for p in range(1, 6)],
    # Comedy
    *[{"name": f"Comedy p{p}", "endpoint": "/discover/movie", "params": {"with_genres": "35", "sort_by": "popularity.desc", "page": p}} for p in range(1, 4)],
    # Romance
    *[{"name": f"Romance p{p}", "endpoint": "/discover/movie", "params": {"with_genres": "10749", "sort_by": "popularity.desc", "page": p}} for p in range(1, 4)],
    # War
    *[{"name": f"War p{p}", "endpoint": "/discover/movie", "params": {"with_genres": "10752", "sort_by": "popularity.desc", "page": p}} for p in range(1, 3)],
    # Western
    *[{"name": f"Western p{p}", "endpoint": "/discover/movie", "params": {"with_genres": "37", "sort_by": "popularity.desc", "page": p}} for p in range(1, 3)],
    # 2020s
    *[{"name": f"2020s p{p}", "endpoint": "/discover/movie", "params": {"primary_release_date.gte": "2020-01-01", "sort_by": "popularity.desc", "page": p}} for p in range(1, 6)],
    # 2010s
    *[{"name": f"2010s p{p}", "endpoint": "/discover/movie", "params": {"primary_release_date.gte": "2010-01-01", "primary_release_date.lte": "2019-12-31", "sort_by": "popularity.desc", "page": p}} for p in range(1, 6)],
]


def tmdb_get(endpoint, params):
    """Make a TMDb API request."""
    params["api_key"] = TMDB_API_KEY
    params["language"] = "ko-KR"
    url = f"{TMDB_BASE}{endpoint}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_license_class(year):
    if year and year < 1928:
        return "public_domain"
    elif year and year >= 2000:
        return "ad_supported"
    else:
        return "unknown"


def db_connect():
    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def db_execute_batch(rows_contents, rows_sources, retries=5):
    """Insert a batch of rows with retry logic."""
    for attempt in range(retries):
        try:
            conn = db_connect()
            cur = conn.cursor()
            for row in rows_contents:
                cur.execute("""
                    INSERT OR IGNORE INTO contents (id, title, original_title, year, country, genres, synopsis, poster_url, tmdb_id, audience, license_class, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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


def main():
    # Get existing tmdb_ids
    conn = db_connect()
    cur = conn.cursor()
    cur.execute("SELECT tmdb_id FROM contents WHERE tmdb_id IS NOT NULL")
    existing_ids = set(r[0] for r in cur.fetchall())
    conn.close()
    print(f"Existing movies with tmdb_id: {len(existing_ids)}")

    added = 0
    skipped = 0
    errors = 0
    seen_this_run = set()

    total_cats = len(CATEGORIES)
    for idx, cat in enumerate(CATEGORIES, 1):
        name = cat["name"]
        print(f"\n[{idx}/{total_cats}] Fetching: {name}")

        try:
            data = tmdb_get(cat["endpoint"], dict(cat["params"]))
        except Exception as e:
            print(f"  ERROR fetching: {e}")
            errors += 1
            time.sleep(0.5)
            continue

        results = data.get("results", [])
        print(f"  Got {len(results)} results")

        batch_contents = []
        batch_sources = []

        for movie in results:
            tmdb_id = movie.get("id")
            if not tmdb_id:
                continue
            if tmdb_id in existing_ids or tmdb_id in seen_this_run:
                skipped += 1
                continue

            seen_this_run.add(tmdb_id)

            title = movie.get("title", "")
            original_title = movie.get("original_title", "")
            release_date = movie.get("release_date", "")
            year = int(release_date[:4]) if release_date and len(release_date) >= 4 else None
            lang = movie.get("original_language", "en")
            country = LANG_COUNTRY.get(lang, "US")
            genre_ids = movie.get("genre_ids", [])
            genres = [GENRE_MAP.get(g, str(g)) for g in genre_ids]
            synopsis = movie.get("overview", "")
            poster_path = movie.get("poster_path", "")
            poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else ""

            license_class = get_license_class(year)
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            content_id = str(uuid.uuid4())

            batch_contents.append((
                content_id, title, original_title, year,
                json.dumps([country]), json.dumps(genres, ensure_ascii=False),
                synopsis, poster_url, tmdb_id,
                "general", license_class, now, now
            ))

            is_asian = lang in ASIAN_LANGS
            source_name = "Viki" if is_asian else "Tubi"
            encoded_title = urllib.parse.quote(title)
            if is_asian:
                external_url = f"https://www.viki.com/search?q={encoded_title}"
            else:
                external_url = f"https://tubitv.com/search/{encoded_title}"

            avail_note = f"{source_name}에서 무료 시청 가능 (광고 포함)" if is_asian else f"Free on {source_name} (ad-supported)"
            source_id = str(uuid.uuid4())

            batch_sources.append((
                source_id, content_id, source_name, "external",
                external_url, None, "HD", "[]",
                avail_note, "global", 0, None, now
            ))

        if batch_contents:
            ok = db_execute_batch(batch_contents, batch_sources)
            if ok:
                added += len(batch_contents)
                print(f"  Inserted {len(batch_contents)} new movies")
            else:
                errors += len(batch_contents)
                print(f"  FAILED to insert {len(batch_contents)} movies")

        time.sleep(0.25)

    print(f"\n{'='*50}")
    print(f"DONE!")
    print(f"  Added:   {added}")
    print(f"  Skipped: {skipped} (already existed or duplicate)")
    print(f"  Errors:  {errors}")
    print(f"  Total unique new: {len(seen_this_run)}")


if __name__ == "__main__":
    main()
