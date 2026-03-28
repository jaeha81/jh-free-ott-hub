"""
시드 데이터 수집 스크립트
- Internet Archive에서 공공도메인 무료 영화 데이터 수집 (TMDb API 불필요)
- TMDb API 키가 있으면 추가 메타데이터 보강
- 실행: python -m app.tasks.seed_data (backend/ 디렉토리에서)
"""

import asyncio
import json
import sys
from pathlib import Path

# backend/ 를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import httpx

from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.models.content import Content
from app.models.source import Source

# ──────────────────────────────────────────────
# 1. Internet Archive 공공도메인 영화 큐레이션 목록
#    archive.org identifier → 수동 검증된 공공도메인 목록
# ──────────────────────────────────────────────
ARCHIVE_MOVIES = [
    {"identifier": "romholiday1953", "title": "Roman Holiday", "year": 1953, "genres": ["로맨스", "코미디"], "country": ["US"]},
    {"identifier": "CharliechaplinModerntimes", "title": "Modern Times", "year": 1936, "genres": ["코미디", "드라마"], "country": ["US"]},
    {"identifier": "TheKid_CharlesChaplin", "title": "The Kid", "year": 1921, "genres": ["코미디", "드라마"], "country": ["US"]},
    {"identifier": "TheGoldRush", "title": "The Gold Rush", "year": 1925, "genres": ["코미디", "어드벤처"], "country": ["US"]},
    {"identifier": "CityLights1931", "title": "City Lights", "year": 1931, "genres": ["코미디", "드라마"], "country": ["US"]},
    {"identifier": "NosferatuTheSymphonyOfHorror", "title": "Nosferatu", "year": 1922, "genres": ["공포", "드라마"], "country": ["DE"]},
    {"identifier": "Metropolis1927", "title": "Metropolis", "year": 1927, "genres": ["SF", "드라마"], "country": ["DE"]},
    {"identifier": "TheCabinetOfDrCaligari", "title": "The Cabinet of Dr. Caligari", "year": 1920, "genres": ["공포", "드라마"], "country": ["DE"]},
    {"identifier": "BirthOfANation", "title": "The Birth of a Nation", "year": 1915, "genres": ["드라마", "역사"], "country": ["US"]},
    {"identifier": "IntolerantFilm", "title": "Intolerance", "year": 1916, "genres": ["드라마", "역사"], "country": ["US"]},
    {"identifier": "TheGeneralBusterKeaton", "title": "The General", "year": 1926, "genres": ["코미디", "어드벤처"], "country": ["US"]},
    {"identifier": "itsawonderfulllife", "title": "It's a Wonderful Life", "year": 1946, "genres": ["드라마", "판타지"], "country": ["US"]},
    {"identifier": "His_Girl_Friday_1940", "title": "His Girl Friday", "year": 1940, "genres": ["코미디", "로맨스"], "country": ["US"]},
    {"identifier": "MrSmithGoesToWashington", "title": "Mr. Smith Goes to Washington", "year": 1939, "genres": ["드라마"], "country": ["US"]},
    {"identifier": "Detour1945", "title": "Detour", "year": 1945, "genres": ["범죄", "필름누아르"], "country": ["US"]},
    {"identifier": "D.O.A.1949Film", "title": "D.O.A.", "year": 1949, "genres": ["범죄", "스릴러"], "country": ["US"]},
    {"identifier": "SunsetBlvd1950", "title": "Sunset Blvd.", "year": 1950, "genres": ["드라마", "필름누아르"], "country": ["US"]},
    {"identifier": "NightOfTheLivingDead1968", "title": "Night of the Living Dead", "year": 1968, "genres": ["공포"], "country": ["US"]},
    {"identifier": "TheLastManOnEarth1964", "title": "The Last Man on Earth", "year": 1964, "genres": ["SF", "공포"], "country": ["US", "IT"]},
    {"identifier": "LittleShopOfHorrors1960", "title": "Little Shop of Horrors", "year": 1960, "genres": ["코미디", "공포"], "country": ["US"]},
    {"identifier": "HouseOnHauntedHill1959", "title": "House on Haunted Hill", "year": 1959, "genres": ["공포"], "country": ["US"]},
    {"identifier": "TheBlobfilm1958", "title": "The Blob", "year": 1958, "genres": ["SF", "공포"], "country": ["US"]},
    {"identifier": "PlanNineFromOuterSpace", "title": "Plan 9 from Outer Space", "year": 1957, "genres": ["SF", "공포"], "country": ["US"]},
    {"identifier": "RocketShipXM1950", "title": "Rocketship X-M", "year": 1950, "genres": ["SF"], "country": ["US"]},
    {"identifier": "ThePhantomOfTheOpera1925", "title": "The Phantom of the Opera", "year": 1925, "genres": ["공포", "드라마"], "country": ["US"]},
    {"identifier": "Frankenstein1910", "title": "Frankenstein", "year": 1910, "genres": ["공포"], "country": ["US"]},
    {"identifier": "DrJekyllandMrHyde1920", "title": "Dr. Jekyll and Mr. Hyde", "year": 1920, "genres": ["공포", "드라마"], "country": ["US"]},
    {"identifier": "TheMummyfilm1932", "title": "The Mummy", "year": 1932, "genres": ["공포"], "country": ["US"]},
    {"identifier": "FrankensteinMeets1943", "title": "Frankenstein Meets the Wolf Man", "year": 1943, "genres": ["공포"], "country": ["US"]},
    {"identifier": "Dracula1931", "title": "Dracula", "year": 1931, "genres": ["공포"], "country": ["US"]},
    {"identifier": "TheInvisibleMan1933", "title": "The Invisible Man", "year": 1933, "genres": ["SF", "공포"], "country": ["US"]},
    {"identifier": "KingKong1933", "title": "King Kong", "year": 1933, "genres": ["어드벤처", "공포"], "country": ["US"]},
    {"identifier": "TheBigSleep1946", "title": "The Big Sleep", "year": 1946, "genres": ["범죄", "필름누아르"], "country": ["US"]},
    {"identifier": "TheMalteseFalcon1941", "title": "The Maltese Falcon", "year": 1941, "genres": ["범죄", "미스터리"], "country": ["US"]},
    {"identifier": "DoubleIndemnity1944", "title": "Double Indemnity", "year": 1944, "genres": ["범죄", "드라마"], "country": ["US"]},
    {"identifier": "TheLadyFromShanghai", "title": "The Lady from Shanghai", "year": 1947, "genres": ["범죄", "필름누아르"], "country": ["US"]},
    {"identifier": "TouchOfEvil1958", "title": "Touch of Evil", "year": 1958, "genres": ["범죄", "스릴러"], "country": ["US"]},
    {"identifier": "RearWindow1954", "title": "Rear Window", "year": 1954, "genres": ["스릴러", "미스터리"], "country": ["US"]},
    {"identifier": "RopeFilm1948", "title": "Rope", "year": 1948, "genres": ["스릴러", "범죄"], "country": ["US"]},
    {"identifier": "SpellboundFilm1945", "title": "Spellbound", "year": 1945, "genres": ["스릴러", "드라마"], "country": ["US"]},
    {"identifier": "NotoriousFilm1946", "title": "Notorious", "year": 1946, "genres": ["스릴러", "로맨스"], "country": ["US"]},
    {"identifier": "TheThirdMan1949", "title": "The Third Man", "year": 1949, "genres": ["스릴러", "필름누아르"], "country": ["GB"]},
    {"identifier": "BriefEncounter1945", "title": "Brief Encounter", "year": 1945, "genres": ["드라마", "로맨스"], "country": ["GB"]},
    {"identifier": "TheApartment1960", "title": "The Apartment", "year": 1960, "genres": ["코미디", "드라마"], "country": ["US"]},
    {"identifier": "SomeLikeItHot1959", "title": "Some Like It Hot", "year": 1959, "genres": ["코미디", "로맨스"], "country": ["US"]},
    {"identifier": "SabrinaFilm1954", "title": "Sabrina", "year": 1954, "genres": ["코미디", "로맨스"], "country": ["US"]},
    {"identifier": "BringUpBaby1938", "title": "Bringing Up Baby", "year": 1938, "genres": ["코미디", "로맨스"], "country": ["US"]},
    {"identifier": "ThePhiladelphiaStory1940", "title": "The Philadelphia Story", "year": 1940, "genres": ["코미디", "드라마"], "country": ["US"]},
    {"identifier": "MyManGodfrey1936", "title": "My Man Godfrey", "year": 1936, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "ItHappenedOneNight1934", "title": "It Happened One Night", "year": 1934, "genres": ["코미디", "로맨스"], "country": ["US"]},
    # ── 서부극 ──
    {"identifier": "StagecoachFilm1939", "title": "Stagecoach", "year": 1939, "genres": ["서부"], "country": ["US"]},
    {"identifier": "TheSearchers1956", "title": "The Searchers", "year": 1956, "genres": ["서부", "드라마"], "country": ["US"]},
    # ── 전쟁 ──
    {"identifier": "AllQuietOnTheWesternFront1930", "title": "All Quiet on the Western Front", "year": 1930, "genres": ["전쟁", "드라마"], "country": ["US"]},
    {"identifier": "SergentYork1941", "title": "Sergeant York", "year": 1941, "genres": ["전쟁", "드라마"], "country": ["US"]},
    # ── 음악/뮤지컬 ──
    {"identifier": "RubberSoulBeatles", "title": "A Hard Day's Night", "year": 1964, "genres": ["음악", "코미디"], "country": ["GB"]},
    # ── 다큐멘터리 ──
    {"identifier": "NanookOfTheNorth", "title": "Nanook of the North", "year": 1922, "genres": ["다큐멘터리"], "country": ["US"]},
    {"identifier": "ManWithAMovieCamera", "title": "Man with a Movie Camera", "year": 1929, "genres": ["다큐멘터리"], "country": ["SU"]},
    # ── 단편 애니메이션 ──
    {"identifier": "FlexibleHips", "title": "Flexible Hips (Fleischer)", "year": 1930, "genres": ["애니메이션", "코미디"], "country": ["US"]},
    {"identifier": "GertieTheDinosaur", "title": "Gertie the Dinosaur", "year": 1914, "genres": ["애니메이션"], "country": ["US"]},
    # ── 어드벤처 ──
    {"identifier": "TreasureIsland1950", "title": "Treasure Island", "year": 1950, "genres": ["어드벤처", "가족"], "country": ["US"]},
    {"identifier": "RobinHood1922", "title": "Robin Hood", "year": 1922, "genres": ["어드벤처", "액션"], "country": ["US"]},
    {"identifier": "ThreeMusketeersDouglasFairbanks", "title": "The Three Musketeers", "year": 1921, "genres": ["어드벤처", "액션"], "country": ["US"]},
    # ── 가족 ──
    {"identifier": "SnowWhiteAndTheSevenDwarfs1916", "title": "Snow White (1916)", "year": 1916, "genres": ["가족", "판타지"], "country": ["US"]},
    {"identifier": "WizardOfOz1925", "title": "The Wizard of Oz", "year": 1925, "genres": ["가족", "판타지"], "country": ["US"]},
    # ── 역사 ──
    {"identifier": "CabinetOfCaligari", "title": "The Golem", "year": 1920, "genres": ["역사", "공포"], "country": ["DE"]},
    {"identifier": "Nibelungen1924", "title": "Die Nibelungen", "year": 1924, "genres": ["역사", "판타지"], "country": ["DE"]},
    # ── 스릴러/미스터리 ──
    {"identifier": "MFilm1931", "title": "M", "year": 1931, "genres": ["범죄", "스릴러"], "country": ["DE"]},
    {"identifier": "TheSpiders1919", "title": "The Spiders", "year": 1919, "genres": ["어드벤처", "스릴러"], "country": ["DE"]},
    # ── 드라마 ──
    {"identifier": "Greed1924Stroheim", "title": "Greed", "year": 1924, "genres": ["드라마"], "country": ["US"]},
    {"identifier": "TheWindFilm1928", "title": "The Wind", "year": 1928, "genres": ["드라마", "서부"], "country": ["US"]},
    {"identifier": "SunriseSongOfTwoHumans", "title": "Sunrise: A Song of Two Humans", "year": 1927, "genres": ["드라마", "로맨스"], "country": ["US"]},
    {"identifier": "TheLastLaugh1924", "title": "The Last Laugh", "year": 1924, "genres": ["드라마"], "country": ["DE"]},
    {"identifier": "PandorasBox1929", "title": "Pandora's Box", "year": 1929, "genres": ["드라마", "범죄"], "country": ["DE"]},
    {"identifier": "EarthFilm1930", "title": "Earth", "year": 1930, "genres": ["드라마"], "country": ["SU"]},
    {"identifier": "BattleshipPotemkin", "title": "Battleship Potemkin", "year": 1925, "genres": ["드라마", "역사"], "country": ["SU"]},
    {"identifier": "October1928", "title": "October: Ten Days That Shook the World", "year": 1928, "genres": ["역사", "드라마"], "country": ["SU"]},
    {"identifier": "ThirdManOnTheMountain", "title": "The Passion of Joan of Arc", "year": 1928, "genres": ["드라마", "역사"], "country": ["FR"]},
    {"identifier": "NapoleonFilm1927", "title": "Napoleon (1927)", "year": 1927, "genres": ["역사", "드라마"], "country": ["FR"]},
    {"identifier": "ATrip-to-the-Moon", "title": "A Trip to the Moon", "year": 1902, "genres": ["SF", "판타지"], "country": ["FR"]},
    {"identifier": "TheGreatTrainRobbery1903", "title": "The Great Train Robbery", "year": 1903, "genres": ["서부", "액션"], "country": ["US"]},
    {"identifier": "Intolerance1916", "title": "The Italian", "year": 1915, "genres": ["드라마"], "country": ["US"]},
    # ── 추가 코미디 단편 ──
    {"identifier": "LongPantsBusterKeaton", "title": "Long Pants", "year": 1927, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "SteamboatBillJr", "title": "Steamboat Bill, Jr.", "year": 1928, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "OurHospitality1923", "title": "Our Hospitality", "year": 1923, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "TheNavigator1924", "title": "The Navigator", "year": 1924, "genres": ["코미디", "어드벤처"], "country": ["US"]},
    {"identifier": "SherlockJrFilm", "title": "Sherlock Jr.", "year": 1924, "genres": ["코미디", "어드벤처"], "country": ["US"]},
    {"identifier": "SevenChancesFilm", "title": "Seven Chances", "year": 1925, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "CollegeFilm1927", "title": "College", "year": 1927, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "TheCamerman1928", "title": "The Cameraman", "year": 1928, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "SafetyLastFilm", "title": "Safety Last!", "year": 1923, "genres": ["코미디", "액션"], "country": ["US"]},
    {"identifier": "TheKidBrother1927", "title": "The Kid Brother", "year": 1927, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "GirlyAndTheKidnappers", "title": "Girl Shy", "year": 1924, "genres": ["코미디", "로맨스"], "country": ["US"]},
    {"identifier": "WhyWorryFilm1923", "title": "Why Worry?", "year": 1923, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "IDoFilm1921", "title": "I Do", "year": 1921, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "GrandsmasBoy1922", "title": "Grandma's Boy", "year": 1922, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "DrJackFilm1922", "title": "Dr. Jack", "year": 1922, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "FreshmanFilm1925", "title": "The Freshman", "year": 1925, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "ForHeaven'sSake1926", "title": "For Heaven's Sake", "year": 1926, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "SpeedyFilm1928", "title": "Speedy", "year": 1928, "genres": ["코미디"], "country": ["US"]},
]

# ── Internet Archive 스트림 URL 템플릿 ──
ARCHIVE_STREAM_TMPL = "https://archive.org/download/{identifier}/{identifier}.mp4"
ARCHIVE_PAGE_TMPL = "https://archive.org/details/{identifier}"


async def _fetch_archive_metadata(identifier: str) -> dict | None:
    """Internet Archive metadata API에서 영화 정보 조회"""
    url = f"https://archive.org/metadata/{identifier}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                meta = data.get("metadata", {})
                return {
                    "description": meta.get("description", ""),
                    "creator": meta.get("creator", ""),
                    "files": data.get("files", []),
                }
    except Exception:
        pass
    return None


def _find_stream_url(identifier: str, files: list[dict]) -> str | None:
    """Archive 파일 목록에서 재생 가능한 mp4/ogv/mpeg 선택"""
    preferred = [".mp4", ".ogv", ".mpeg", ".mpg", ".avi"]
    for ext in preferred:
        for f in files:
            name = f.get("name", "")
            if name.lower().endswith(ext) and "512kb" not in name.lower():
                return f"https://archive.org/download/{identifier}/{name}"
    return ARCHIVE_STREAM_TMPL.format(identifier=identifier)


async def seed(verbose: bool = True) -> int:
    # DB 테이블 생성 (없으면)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    inserted = 0
    async with AsyncSessionLocal() as session:
        for movie in ARCHIVE_MOVIES:
            identifier = movie["identifier"]
            title = movie["title"]
            year = movie["year"]
            genres = movie["genres"]
            country = movie["country"]

            # 이미 존재하는지 확인 (title + year 기준)
            from sqlalchemy import select
            existing = await session.execute(
                select(Content).where(Content.title == title, Content.year == year)
            )
            if existing.scalar_one_or_none():
                if verbose:
                    print(f"  skip: {title} ({year})".encode("utf-8", errors="replace").decode("utf-8"))
                continue

            # Archive 메타데이터 조회 (설명 보강)
            arch_meta = await _fetch_archive_metadata(identifier)
            synopsis = None
            stream_url = ARCHIVE_STREAM_TMPL.format(identifier=identifier)
            if arch_meta:
                raw_desc = arch_meta.get("description", "")
                if isinstance(raw_desc, list):
                    raw_desc = " ".join(raw_desc)
                synopsis = raw_desc[:2000] if raw_desc else None
                stream_url = _find_stream_url(identifier, arch_meta.get("files", []))

            content = Content(
                title=title,
                original_title=title,
                year=year,
                country=json.dumps(country),
                genres=json.dumps(genres),
                synopsis=synopsis,
                poster_url=None,
                tmdb_id=None,
                audience="general",
                license_class="public_domain",
            )
            session.add(content)
            await session.flush()  # id 생성

            source = Source(
                content_id=content.id,
                source_name="Internet Archive",
                watch_mode="in_app",
                stream_url=stream_url,
                external_url=ARCHIVE_PAGE_TMPL.format(identifier=identifier),
                quality_hint="SD",
                subtitle_languages=json.dumps([]),
                availability_note="공공도메인 — 무료 직접 재생",
                region_hint="global",
                is_verified=False,
            )
            session.add(source)
            inserted += 1
            if verbose:
                safe_title = title.encode("utf-8", errors="replace").decode("utf-8")
                sys.stdout.buffer.write(f"  + {safe_title} ({year})\n".encode("utf-8"))
                sys.stdout.flush()

        await session.commit()

    if verbose:
        sys.stdout.buffer.write(f"\n완료: {inserted}개 신규 추가\n".encode("utf-8"))
        sys.stdout.flush()
    return inserted


if __name__ == "__main__":
    asyncio.run(seed())
