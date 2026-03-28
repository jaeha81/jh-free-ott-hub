"""
외부 소스(Tubi/Viki) 시드 데이터 삽입 스크립트
- SQLite DB에 직접 삽입 (sqlite3 모듈 사용)
- 실행: python -m app.tasks.seed_external (backend/ 디렉토리에서)
"""

import json
import sqlite3
import sys
import uuid
from datetime import datetime
from pathlib import Path

# DB 경로
DB_PATH = Path(__file__).resolve().parents[2] / "free_ott_hub.db"

EXTERNAL_ENTRIES = [
    {
        "content": {
            "title": "The Man from Earth",
            "original_title": "The Man from Earth",
            "year": 2007,
            "country": json.dumps(["US"]),
            "genres": json.dumps(["SF", "\ub4dc\ub77c\ub9c8"]),
            "synopsis": "An impromptu goodbye party for Professor John Oldman becomes a mysterious interrogation after the retiring scholar reveals to his colleagues he is an immortal who has walked the earth for 14,000 years.",
            "poster_url": None,
            "tmdb_id": None,
            "audience": "general",
            "license_class": "ad_supported",
        },
        "source": {
            "source_name": "Tubi",
            "watch_mode": "external",
            "external_url": "https://tubitv.com/movies/460650/the-man-from-earth",
            "stream_url": None,
            "quality_hint": "HD",
            "subtitle_languages": json.dumps([]),
            "availability_note": "Tubi - free with ads",
            "region_hint": "global",
            "is_verified": False,
        },
    },
    {
        "content": {
            "title": "Tae Guk Gi: Brotherhood of War",
            "original_title": "\ud0dc\uadf9\uae30 \ud718\ub0a0\ub9ac\uba70",
            "year": 2004,
            "country": json.dumps(["KR"]),
            "genres": json.dumps(["\uc804\uc7c1", "\ub4dc\ub77c\ub9c8"]),
            "synopsis": "When two brothers are forced to fight in the Korean War, the elder decides to take the riskiest missions if it will help shield his younger brother from battle.",
            "poster_url": None,
            "tmdb_id": None,
            "audience": "general",
            "license_class": "ad_supported",
        },
        "source": {
            "source_name": "Viki",
            "watch_mode": "external",
            "external_url": "https://www.viki.com/movies/37360c",
            "stream_url": None,
            "quality_hint": "HD",
            "subtitle_languages": json.dumps(["en", "ko"]),
            "availability_note": "Viki - free with ads (Asia content)",
            "region_hint": "asia",
            "is_verified": False,
        },
    },
    {
        "content": {
            "title": "Parasite",
            "original_title": "\uae30\uc0dd\ucda9",
            "year": 2019,
            "country": json.dumps(["KR"]),
            "genres": json.dumps(["\ub4dc\ub77c\ub9c8", "\uc2a4\ub9b4\ub7ec"]),
            "synopsis": "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
            "poster_url": None,
            "tmdb_id": None,
            "audience": "general",
            "license_class": "ad_supported",
        },
        "source": {
            "source_name": "Tubi",
            "watch_mode": "external",
            "external_url": "https://tubitv.com/movies/631498/parasite",
            "stream_url": None,
            "quality_hint": "HD",
            "subtitle_languages": json.dumps(["en"]),
            "availability_note": "Tubi - free with ads (if available)",
            "region_hint": "global",
            "is_verified": False,
        },
    },
    {
        "content": {
            "title": "Crouching Tiger, Hidden Dragon",
            "original_title": "\uc640\ud638\uc7a5\ub8e1",
            "year": 2000,
            "country": json.dumps(["CN", "TW", "HK", "US"]),
            "genres": json.dumps(["\uc561\uc158", "\ubb34\ud601", "\ub4dc\ub77c\ub9c8"]),
            "synopsis": "A young Chinese warrior steals a sword from a famed swordsman and then escapes into a world of romantic adventure with a mysterious bandit.",
            "poster_url": None,
            "tmdb_id": None,
            "audience": "general",
            "license_class": "ad_supported",
        },
        "source": {
            "source_name": "Tubi",
            "watch_mode": "external",
            "external_url": "https://tubitv.com/movies/498710/crouching-tiger-hidden-dragon",
            "stream_url": None,
            "quality_hint": "HD",
            "subtitle_languages": json.dumps(["en"]),
            "availability_note": "Tubi - free with ads",
            "region_hint": "global",
            "is_verified": False,
        },
    },
    {
        "content": {
            "title": "Ip Man",
            "original_title": "\uc5fd\ubb38",
            "year": 2008,
            "country": json.dumps(["CN", "HK"]),
            "genres": json.dumps(["\uc561\uc158", "\ubb34\ud611", "\ub4dc\ub77c\ub9c8"]),
            "synopsis": "During the Japanese invasion of China, a master of the martial art Ip Man is forced to leave his home when his city is occupied. He eventually sets up a Wing Chun school.",
            "poster_url": None,
            "tmdb_id": None,
            "audience": "general",
            "license_class": "ad_supported",
        },
        "source": {
            "source_name": "Tubi",
            "watch_mode": "external",
            "external_url": "https://tubitv.com/movies/597758/ip-man",
            "stream_url": None,
            "quality_hint": "HD",
            "subtitle_languages": json.dumps(["en"]),
            "availability_note": "Tubi - free with ads",
            "region_hint": "global",
            "is_verified": False,
        },
    },
]


def seed_external():
    """Tubi/Viki 외부 소스 데이터를 SQLite DB에 직접 삽입"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    inserted = 0
    now = datetime.utcnow().isoformat()

    for entry in EXTERNAL_ENTRIES:
        c = entry["content"]
        s = entry["source"]

        # 중복 체크 (title + year)
        cursor.execute(
            "SELECT id FROM contents WHERE title = ? AND year = ?",
            (c["title"], c["year"]),
        )
        existing = cursor.fetchone()

        if existing:
            content_id = existing[0]
            msg = f"  skip content (exists): {c['title']} ({c['year']})\n"
            sys.stdout.buffer.write(msg.encode("utf-8"))
            sys.stdout.flush()
        else:
            content_id = str(uuid.uuid4())
            cursor.execute(
                """INSERT INTO contents
                   (id, title, original_title, year, country, genres, synopsis,
                    poster_url, tmdb_id, audience, license_class, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    content_id,
                    c["title"],
                    c["original_title"],
                    c["year"],
                    c["country"],
                    c["genres"],
                    c["synopsis"],
                    c["poster_url"],
                    c["tmdb_id"],
                    c["audience"],
                    c["license_class"],
                    now,
                    now,
                ),
            )
            msg = f"  + content: {c['title']} ({c['year']})\n"
            sys.stdout.buffer.write(msg.encode("utf-8"))
            sys.stdout.flush()

        # 소스 중복 체크 (content_id + source_name + external_url)
        cursor.execute(
            "SELECT id FROM sources WHERE content_id = ? AND source_name = ? AND external_url = ?",
            (content_id, s["source_name"], s["external_url"]),
        )
        existing_source = cursor.fetchone()

        if existing_source:
            msg = f"  skip source (exists): {s['source_name']} for {c['title']}\n"
            sys.stdout.buffer.write(msg.encode("utf-8"))
            sys.stdout.flush()
            continue

        source_id = str(uuid.uuid4())
        cursor.execute(
            """INSERT INTO sources
               (id, content_id, source_name, watch_mode, external_url, stream_url,
                quality_hint, subtitle_languages, availability_note, region_hint,
                is_verified, last_checked_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                source_id,
                content_id,
                s["source_name"],
                s["watch_mode"],
                s["external_url"],
                s["stream_url"],
                s["quality_hint"],
                s["subtitle_languages"],
                s["availability_note"],
                s["region_hint"],
                0,  # is_verified = False
                None,  # last_checked_at
                now,
            ),
        )
        inserted += 1
        msg = f"  + source: {s['source_name']} -> {s['external_url']}\n"
        sys.stdout.buffer.write(msg.encode("utf-8"))
        sys.stdout.flush()

    conn.commit()
    conn.close()

    summary = f"\n완료: {inserted}개 외부 소스 추가\n"
    sys.stdout.buffer.write(summary.encode("utf-8"))
    sys.stdout.flush()
    return inserted


if __name__ == "__main__":
    seed_external()
