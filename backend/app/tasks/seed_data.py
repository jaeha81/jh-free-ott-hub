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
    # ── 채플린 / feature_films 검증 식별자 ──
    {"identifier": "HisNewJobCharlesChaplin-1915", "title": "His New Job", "year": 1915, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "charlie_chaplin_film_fest", "title": "Charlie Chaplin Film Festival", "year": 1920, "genres": ["코미디"], "country": ["US"]},

    # ── 스크루볼 코미디 / feature_films 검증 식별자 ──
    {"identifier": "his_girl_friday", "title": "His Girl Friday", "year": 1940, "genres": ["코미디", "로맨스"], "country": ["US"]},
    {"identifier": "ItHappenedOneNight", "title": "It Happened One Night", "year": 1934, "genres": ["코미디", "로맨스"], "country": ["US"]},
    {"identifier": "BringUpBaby", "title": "Bringing Up Baby", "year": 1938, "genres": ["코미디", "로맨스"], "country": ["US"]},
    {"identifier": "utopia", "title": "Utopia (Atoll K)", "year": 1951, "genres": ["코미디"], "country": ["FR"]},

    # ── 공포 / feature_films 검증 식별자 ──
    {"identifier": "house_on_haunted_hill_ipod", "title": "House on Haunted Hill", "year": 1959, "genres": ["공포"], "country": ["US"]},
    {"identifier": "NightOfTheLivingDead1968", "title": "Night of the Living Dead", "year": 1968, "genres": ["공포"], "country": ["US"]},
    {"identifier": "PlanNineFromOuterSpace", "title": "Plan 9 from Outer Space", "year": 1957, "genres": ["SF", "공포"], "country": ["US"]},
    {"identifier": "BlobThe1958", "title": "The Blob", "year": 1958, "genres": ["SF", "공포"], "country": ["US"]},
    {"identifier": "dementia13", "title": "Dementia 13", "year": 1963, "genres": ["공포", "스릴러"], "country": ["US"]},
    {"identifier": "attack_of_the_50ft_woman", "title": "Attack of the 50 Foot Woman", "year": 1958, "genres": ["SF", "공포"], "country": ["US"]},
    {"identifier": "little_shop_of_horrors_1960", "title": "Little Shop of Horrors", "year": 1960, "genres": ["코미디", "공포"], "country": ["US"]},

    # ── SF / feature_films 검증 식별자 ──
    {"identifier": "VoyagetothePlanetofPrehistoricWomen", "title": "Voyage to the Planet of Prehistoric Women", "year": 1968, "genres": ["SF", "어드벤처"], "country": ["US"]},

    # ── 필름누아르 / feature_films 검증 식별자 ──
    {"identifier": "detour_1945", "title": "Detour", "year": 1945, "genres": ["범죄", "필름누아르"], "country": ["US"]},
    {"identifier": "DOA_1949", "title": "D.O.A.", "year": 1949, "genres": ["범죄", "스릴러"], "country": ["US"]},
    {"identifier": "NotoriousFilm1946", "title": "Notorious", "year": 1946, "genres": ["스릴러", "로맨스"], "country": ["US"]},

    # ── 히치콕 / feature_films 검증 식별자 ──
    {"identifier": "RearWindow", "title": "Rear Window", "year": 1954, "genres": ["스릴러", "미스터리"], "country": ["US"]},

    # ── 가족/어드벤처 / feature_films 검증 식별자 ──
    {"identifier": "JungleBook", "title": "The Jungle Book", "year": 1942, "genres": ["어드벤처", "가족"], "country": ["US"]},
    {"identifier": "The_Pied_Piper_of_Hamelin", "title": "The Pied Piper of Hamelin", "year": 1957, "genres": ["가족", "판타지"], "country": ["US"]},

    # ── 무술 / feature_films 검증 식별자 ──
    {"identifier": "Return_of_the_Kung_Fu_Dragon", "title": "Return of the Kung Fu Dragon", "year": 1976, "genres": ["액션", "무술"], "country": ["TW"]},
    {"identifier": "TheFastandtheFuriousJohnIreland1954goofyrip", "title": "The Fast and the Furious", "year": 1954, "genres": ["액션", "드라마"], "country": ["US"]},

    # ── 애니메이션/뮤지컬 / feature_films 검증 식별자 ──
    {"identifier": "Sita_Sings_the_Blues", "title": "Sita Sings the Blues", "year": 2008, "genres": ["애니메이션", "뮤지컬"], "country": ["US"]},

    # ── 마약 계몽 / feature_films ──
    {"identifier": "reefer_madness1938", "title": "Reefer Madness", "year": 1936, "genres": ["드라마"], "country": ["US"]},

    # ── 무성영화 (silent_films) 검증 식별자 ──
    {"identifier": "TheBirthOfANation", "title": "The Birth of a Nation", "year": 1915, "genres": ["드라마", "역사"], "country": ["US"]},
    {"identifier": "BusterKeatonTheGeneral", "title": "The General", "year": 1926, "genres": ["코미디", "어드벤처"], "country": ["US"]},
    {"identifier": "SafetyLast", "title": "Safety Last!", "year": 1923, "genres": ["코미디", "액션"], "country": ["US"]},
    {"identifier": "nosferatu", "title": "Nosferatu", "year": 1922, "genres": ["공포", "드라마"], "country": ["DE"]},
    {"identifier": "metropolis", "title": "Metropolis", "year": 1927, "genres": ["SF", "드라마"], "country": ["DE"]},
    {"identifier": "cabinet_of_dr_caligari", "title": "The Cabinet of Dr. Caligari", "year": 1920, "genres": ["공포", "드라마"], "country": ["DE"]},
    {"identifier": "trip_to_the_moon", "title": "A Trip to the Moon", "year": 1902, "genres": ["SF", "판타지"], "country": ["FR"]},
    {"identifier": "battleship_potemkin", "title": "Battleship Potemkin", "year": 1925, "genres": ["드라마", "역사"], "country": ["SU"]},
    {"identifier": "sunrise_a_song_of_two_humans", "title": "Sunrise: A Song of Two Humans", "year": 1927, "genres": ["드라마", "로맨스"], "country": ["US"]},

    # ── 추가 무성 코미디 ──
    {"identifier": "SteamboatBillJr", "title": "Steamboat Bill, Jr.", "year": 1928, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "OurHospitality", "title": "Our Hospitality", "year": 1923, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "TheNavigator1924", "title": "The Navigator", "year": 1924, "genres": ["코미디", "어드벤처"], "country": ["US"]},
    {"identifier": "SherlockJr", "title": "Sherlock Jr.", "year": 1924, "genres": ["코미디", "어드벤처"], "country": ["US"]},
    {"identifier": "SevenChances", "title": "Seven Chances", "year": 1925, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "College1927", "title": "College", "year": 1927, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "TheCameraman1928", "title": "The Cameraman", "year": 1928, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "GrandmassBoy1922", "title": "Grandma's Boy", "year": 1922, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "DrJack1922", "title": "Dr. Jack", "year": 1922, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "TheFreshman1925", "title": "The Freshman", "year": 1925, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "Speedy1928", "title": "Speedy", "year": 1928, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "GirlShy1924", "title": "Girl Shy", "year": 1924, "genres": ["코미디", "로맨스"], "country": ["US"]},
    {"identifier": "WhyWorry1923", "title": "Why Worry?", "year": 1923, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "TheKidBrother1927", "title": "The Kid Brother", "year": 1927, "genres": ["코미디"], "country": ["US"]},

    # ── 독일 표현주의 / 유럽 무성 ──
    {"identifier": "PandorasBox1929", "title": "Pandora's Box", "year": 1929, "genres": ["드라마", "범죄"], "country": ["DE"]},
    {"identifier": "TheLastLaugh1924", "title": "The Last Laugh", "year": 1924, "genres": ["드라마"], "country": ["DE"]},
    {"identifier": "Nibelungen1924", "title": "Die Nibelungen", "year": 1924, "genres": ["역사", "판타지"], "country": ["DE"]},
    {"identifier": "MFilm1931", "title": "M", "year": 1931, "genres": ["범죄", "스릴러"], "country": ["DE"]},
    {"identifier": "October1928", "title": "October: Ten Days That Shook the World", "year": 1928, "genres": ["역사", "드라마"], "country": ["SU"]},
    {"identifier": "ManWithAMovieCamera", "title": "Man with a Movie Camera", "year": 1929, "genres": ["다큐멘터리"], "country": ["SU"]},
    {"identifier": "EarthFilm1930", "title": "Earth", "year": 1930, "genres": ["드라마"], "country": ["SU"]},
    {"identifier": "NapoleonFilm1927", "title": "Napoleon", "year": 1927, "genres": ["역사", "드라마"], "country": ["FR"]},

    # ── 다큐멘터리 ──
    {"identifier": "NanookOfTheNorth", "title": "Nanook of the North", "year": 1922, "genres": ["다큐멘터리"], "country": ["US"]},

    # ── 무성 공포/드라마 ──
    {"identifier": "ThePhantomOfTheOpera1925", "title": "The Phantom of the Opera", "year": 1925, "genres": ["공포", "드라마"], "country": ["US"]},
    {"identifier": "Frankenstein1910", "title": "Frankenstein", "year": 1910, "genres": ["공포"], "country": ["US"]},
    {"identifier": "DrJekyllandMrHyde1920", "title": "Dr. Jekyll and Mr. Hyde", "year": 1920, "genres": ["공포", "드라마"], "country": ["US"]},
    {"identifier": "TheGreatTrainRobbery1903", "title": "The Great Train Robbery", "year": 1903, "genres": ["서부", "액션"], "country": ["US"]},
    {"identifier": "RobinHood1922", "title": "Robin Hood", "year": 1922, "genres": ["어드벤처", "액션"], "country": ["US"]},
    {"identifier": "ThreeMusketeersDouglasFairbanks", "title": "The Three Musketeers", "year": 1921, "genres": ["어드벤처", "액션"], "country": ["US"]},
    {"identifier": "Greed1924", "title": "Greed", "year": 1924, "genres": ["드라마"], "country": ["US"]},
    {"identifier": "TheWind1928", "title": "The Wind", "year": 1928, "genres": ["드라마", "서부"], "country": ["US"]},
    {"identifier": "PassionOfJoanOfArc1928", "title": "The Passion of Joan of Arc", "year": 1928, "genres": ["드라마", "역사"], "country": ["FR"]},

    # ── 유성 영화 초기 (1930-1950) ──
    {"identifier": "AllQuietOnTheWesternFront1930", "title": "All Quiet on the Western Front", "year": 1930, "genres": ["전쟁", "드라마"], "country": ["US"]},
    {"identifier": "MyManGodfrey1936", "title": "My Man Godfrey", "year": 1936, "genres": ["코미디"], "country": ["US"]},
    {"identifier": "ThePhiladelphiaStory1940", "title": "The Philadelphia Story", "year": 1940, "genres": ["코미디", "드라마"], "country": ["US"]},
    {"identifier": "SergentYork1941", "title": "Sergeant York", "year": 1941, "genres": ["전쟁", "드라마"], "country": ["US"]},
    {"identifier": "TheMalteseFalcon1941", "title": "The Maltese Falcon", "year": 1941, "genres": ["범죄", "미스터리"], "country": ["US"]},
    {"identifier": "DoubleIndemnity1944", "title": "Double Indemnity", "year": 1944, "genres": ["범죄", "드라마"], "country": ["US"]},
    {"identifier": "SpellboundFilm1945", "title": "Spellbound", "year": 1945, "genres": ["스릴러", "드라마"], "country": ["US"]},
    {"identifier": "BriefEncounter1945", "title": "Brief Encounter", "year": 1945, "genres": ["드라마", "로맨스"], "country": ["GB"]},
    {"identifier": "TheBigSleep1946", "title": "The Big Sleep", "year": 1946, "genres": ["범죄", "필름누아르"], "country": ["US"]},
    {"identifier": "TheLadyFromShanghai", "title": "The Lady from Shanghai", "year": 1947, "genres": ["범죄", "필름누아르"], "country": ["US"]},
    {"identifier": "TheThirdMan1949", "title": "The Third Man", "year": 1949, "genres": ["스릴러", "필름누아르"], "country": ["GB"]},
    {"identifier": "RocketShipXM1950", "title": "Rocketship X-M", "year": 1950, "genres": ["SF"], "country": ["US"]},
    {"identifier": "TouchOfEvil1958", "title": "Touch of Evil", "year": 1958, "genres": ["범죄", "스릴러"], "country": ["US"]},
    {"identifier": "SomeLikeItHot1959", "title": "Some Like It Hot", "year": 1959, "genres": ["코미디", "로맨스"], "country": ["US"]},
    {"identifier": "TheApartment1960", "title": "The Apartment", "year": 1960, "genres": ["코미디", "드라마"], "country": ["US"]},

    # ── 어드벤처/가족 (1940-1960) ──
    {"identifier": "TreasureIsland1950", "title": "Treasure Island", "year": 1950, "genres": ["어드벤처", "가족"], "country": ["US"]},
    {"identifier": "WizardOfOz1925", "title": "The Wizard of Oz", "year": 1925, "genres": ["가족", "판타지"], "country": ["US"]},
    {"identifier": "SnowWhite1916", "title": "Snow White", "year": 1916, "genres": ["가족", "판타지"], "country": ["US"]},
    {"identifier": "TheLastManOnEarth1964", "title": "The Last Man on Earth", "year": 1964, "genres": ["SF", "공포"], "country": ["US", "IT"]},

    # ── 애니메이션 (animationandcartoons) ──
    {"identifier": "GertieTheDinosaur", "title": "Gertie the Dinosaur", "year": 1914, "genres": ["애니메이션"], "country": ["US"]},
    {"identifier": "fleischer_betty_boop_collection", "title": "Betty Boop Collection", "year": 1932, "genres": ["애니메이션", "코미디"], "country": ["US"]},
    {"identifier": "popeye_the_sailor", "title": "Popeye the Sailor", "year": 1933, "genres": ["애니메이션", "코미디"], "country": ["US"]},
    {"identifier": "superman_cartoons", "title": "Superman Cartoons (Fleischer)", "year": 1941, "genres": ["애니메이션", "액션"], "country": ["US"]},
    {"identifier": "out_of_the_inkwell", "title": "Out of the Inkwell", "year": 1920, "genres": ["애니메이션", "코미디"], "country": ["US"]},
    {"identifier": "koko_the_clown", "title": "Ko-Ko the Clown", "year": 1923, "genres": ["애니메이션", "코미디"], "country": ["US"]},
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
