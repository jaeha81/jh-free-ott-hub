"""
TMDb에서 vote_average, vote_count, runtime, popularity를 가져와 DB 업데이트.
"""
import os
import sys
import sqlite3
import time

import httpx
from dotenv import load_dotenv

# .env 로드
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(os.path.abspath(ENV_PATH))

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "free_ott_hub.db"))
TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE_URL = os.getenv("TMDB_BASE_URL", "https://api.themoviedb.org/3")
RATE_LIMIT_SEC = 0.25


def main():
    if not TMDB_API_KEY:
        print("[ERROR] TMDB_API_KEY not found in .env")
        sys.exit(1)

    if not os.path.exists(DB_PATH):
        print(f"[ERROR] DB not found: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # tmdb_id가 있는 콘텐츠 조회
    cursor.execute("SELECT id, tmdb_id, title FROM contents WHERE tmdb_id IS NOT NULL")
    rows = cursor.fetchall()
    print(f"[INFO] TMDb ID 보유 콘텐츠: {len(rows)}건")

    updated = 0
    failed = 0

    with httpx.Client(timeout=10) as client:
        for content_id, tmdb_id, title in rows:
            try:
                resp = client.get(
                    f"{TMDB_BASE_URL}/movie/{tmdb_id}",
                    params={"api_key": TMDB_API_KEY, "language": "ko-KR"},
                )
                resp.raise_for_status()
                data = resp.json()

                vote_average = data.get("vote_average", 0) or 0
                vote_count = data.get("vote_count", 0) or 0
                runtime = data.get("runtime", 0) or 0
                popularity = data.get("popularity", 0) or 0

                cursor.execute(
                    """UPDATE contents
                       SET vote_average = ?, vote_count = ?, runtime = ?, popularity = ?
                       WHERE id = ?""",
                    (vote_average, vote_count, runtime, popularity, content_id),
                )
                updated += 1
                print(f"  [OK] {title} (tmdb:{tmdb_id}) -> rating={vote_average}, votes={vote_count}, runtime={runtime}min, pop={popularity}")

            except Exception as e:
                failed += 1
                print(f"  [FAIL] {title} (tmdb:{tmdb_id}): {e}")

            time.sleep(RATE_LIMIT_SEC)

    conn.commit()
    conn.close()
    print(f"\n[DONE] updated={updated}, failed={failed}")


if __name__ == "__main__":
    main()
