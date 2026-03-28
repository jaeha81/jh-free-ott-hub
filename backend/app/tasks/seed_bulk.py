"""
TMDb API를 활용하여 대량의 무료/합법 영화 콘텐츠를 시드하는 스크립트.

추가 대상:
1. Tubi 무료 영화 (인기작 위주)
2. Viki 아시아 영화/드라마
3. Archive.org 공공도메인 추가 발굴
4. TMDb에서 인기 클래식/공공도메인 영화 discover

사용법: PYTHONIOENCODING=utf-8 python -m app.tasks.seed_bulk
"""

import asyncio
import sqlite3
import os
import sys
import uuid
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    import httpx
except ImportError:
    print("httpx required: pip install httpx")
    sys.exit(1)

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE = "https://image.tmdb.org/t/p/w500"
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "free_ott_hub.db")

GENRE_MAP = {
    28: "액션", 12: "어드벤처", 16: "애니메이션", 35: "코미디",
    80: "범죄", 99: "다큐멘터리", 18: "드라마", 10751: "가족",
    14: "판타지", 36: "역사", 27: "공포", 10402: "음악",
    9648: "미스터리", 10749: "로맨스", 878: "SF", 10770: "TV영화",
    53: "스릴러", 10752: "전쟁", 37: "서부",
}

COUNTRY_MAP = {
    "en": "US", "ko": "KR", "ja": "JP", "zh": "CN", "fr": "FR",
    "de": "DE", "it": "IT", "es": "ES", "ru": "RU", "hi": "IN",
    "pt": "BR", "sv": "SE", "da": "DK", "no": "NO", "fi": "FI",
    "pl": "PL", "nl": "NL", "tr": "TR", "th": "TH", "ar": "SA",
}

# ── Tubi 인기 무료 영화 (실제 Tubi에서 무료 시청 가능한 유명 작품들) ──
TUBI_MOVIES = [
    # 액션/스릴러
    {"title": "The Terminator", "year": 1984, "tmdb_search": "The Terminator"},
    {"title": "Escape from New York", "year": 1981, "tmdb_search": "Escape from New York"},
    {"title": "Total Recall", "year": 1990, "tmdb_search": "Total Recall 1990"},
    {"title": "Bloodsport", "year": 1988, "tmdb_search": "Bloodsport"},
    {"title": "Kickboxer", "year": 1989, "tmdb_search": "Kickboxer 1989"},
    {"title": "Enter the Dragon", "year": 1973, "tmdb_search": "Enter the Dragon"},
    {"title": "Hard Target", "year": 1993, "tmdb_search": "Hard Target"},
    {"title": "Under Siege", "year": 1992, "tmdb_search": "Under Siege"},
    {"title": "Cobra", "year": 1986, "tmdb_search": "Cobra 1986"},
    {"title": "Demolition Man", "year": 1993, "tmdb_search": "Demolition Man"},
    {"title": "Predator 2", "year": 1990, "tmdb_search": "Predator 2"},
    {"title": "The Running Man", "year": 1987, "tmdb_search": "The Running Man 1987"},
    {"title": "Commando", "year": 1985, "tmdb_search": "Commando 1985"},
    {"title": "Road House", "year": 1989, "tmdb_search": "Road House 1989"},
    {"title": "Point Break", "year": 1991, "tmdb_search": "Point Break 1991"},
    # 공포
    {"title": "Hellraiser", "year": 1987, "tmdb_search": "Hellraiser 1987"},
    {"title": "The Texas Chain Saw Massacre", "year": 1974, "tmdb_search": "The Texas Chain Saw Massacre"},
    {"title": "Child's Play", "year": 1988, "tmdb_search": "Child's Play 1988"},
    {"title": "Leprechaun", "year": 1993, "tmdb_search": "Leprechaun 1993"},
    {"title": "Critters", "year": 1986, "tmdb_search": "Critters"},
    {"title": "Pumpkinhead", "year": 1988, "tmdb_search": "Pumpkinhead"},
    {"title": "Re-Animator", "year": 1985, "tmdb_search": "Re-Animator"},
    {"title": "The Fly", "year": 1986, "tmdb_search": "The Fly 1986"},
    # 드라마/코미디
    {"title": "Rain Man", "year": 1988, "tmdb_search": "Rain Man"},
    {"title": "Donnie Darko", "year": 2001, "tmdb_search": "Donnie Darko"},
    {"title": "American Beauty", "year": 1999, "tmdb_search": "American Beauty"},
    {"title": "The Usual Suspects", "year": 1995, "tmdb_search": "The Usual Suspects"},
    {"title": "Trainspotting", "year": 1996, "tmdb_search": "Trainspotting"},
    {"title": "Dumb and Dumber", "year": 1994, "tmdb_search": "Dumb and Dumber"},
    {"title": "Ace Ventura: Pet Detective", "year": 1994, "tmdb_search": "Ace Ventura Pet Detective"},
    {"title": "Wayne's World", "year": 1992, "tmdb_search": "Wayne's World"},
    {"title": "The Naked Gun", "year": 1988, "tmdb_search": "The Naked Gun"},
    {"title": "Airplane!", "year": 1980, "tmdb_search": "Airplane!"},
    {"title": "Caddyshack", "year": 1980, "tmdb_search": "Caddyshack"},
    # SF
    {"title": "They Live", "year": 1988, "tmdb_search": "They Live"},
    {"title": "Starship Troopers", "year": 1997, "tmdb_search": "Starship Troopers"},
    {"title": "Species", "year": 1995, "tmdb_search": "Species"},
    {"title": "Event Horizon", "year": 1997, "tmdb_search": "Event Horizon"},
    {"title": "Cube", "year": 1997, "tmdb_search": "Cube 1997"},
    # 전쟁/역사
    {"title": "Platoon", "year": 1986, "tmdb_search": "Platoon"},
    {"title": "Apocalypse Now", "year": 1979, "tmdb_search": "Apocalypse Now"},
    {"title": "Full Metal Jacket", "year": 1987, "tmdb_search": "Full Metal Jacket"},
    # 추가 인기작
    {"title": "Kill Bill: Vol. 1", "year": 2003, "tmdb_search": "Kill Bill Vol. 1"},
    {"title": "Kill Bill: Vol. 2", "year": 2004, "tmdb_search": "Kill Bill Vol. 2"},
    {"title": "Pulp Fiction", "year": 1994, "tmdb_search": "Pulp Fiction"},
    {"title": "Fight Club", "year": 1999, "tmdb_search": "Fight Club"},
    {"title": "The Shawshank Redemption", "year": 1994, "tmdb_search": "The Shawshank Redemption"},
    {"title": "Se7en", "year": 1995, "tmdb_search": "Se7en"},
    {"title": "The Silence of the Lambs", "year": 1991, "tmdb_search": "The Silence of the Lambs"},
    {"title": "Goodfellas", "year": 1990, "tmdb_search": "Goodfellas"},
    {"title": "Scarface", "year": 1983, "tmdb_search": "Scarface 1983"},
    {"title": "The Godfather", "year": 1972, "tmdb_search": "The Godfather"},
    {"title": "Taxi Driver", "year": 1976, "tmdb_search": "Taxi Driver"},
    {"title": "A Clockwork Orange", "year": 1971, "tmdb_search": "A Clockwork Orange"},
    {"title": "2001: A Space Odyssey", "year": 1968, "tmdb_search": "2001 A Space Odyssey"},
    {"title": "Blade Runner", "year": 1982, "tmdb_search": "Blade Runner 1982"},
    {"title": "Alien", "year": 1979, "tmdb_search": "Alien 1979"},
    {"title": "The Shining", "year": 1980, "tmdb_search": "The Shining 1980"},
    {"title": "The Exorcist", "year": 1973, "tmdb_search": "The Exorcist"},
    {"title": "Jaws", "year": 1975, "tmdb_search": "Jaws"},
    {"title": "Rocky", "year": 1976, "tmdb_search": "Rocky 1976"},
    {"title": "Mad Max", "year": 1979, "tmdb_search": "Mad Max 1979"},
    {"title": "Robocop", "year": 1987, "tmdb_search": "Robocop 1987"},
    {"title": "Die Hard", "year": 1988, "tmdb_search": "Die Hard"},
    {"title": "Lethal Weapon", "year": 1987, "tmdb_search": "Lethal Weapon"},
    {"title": "Beverly Hills Cop", "year": 1984, "tmdb_search": "Beverly Hills Cop"},
    {"title": "Back to the Future", "year": 1985, "tmdb_search": "Back to the Future"},
    {"title": "Ghostbusters", "year": 1984, "tmdb_search": "Ghostbusters 1984"},
    {"title": "Indiana Jones and the Raiders of the Lost Ark", "year": 1981, "tmdb_search": "Raiders of the Lost Ark"},
    {"title": "E.T. the Extra-Terrestrial", "year": 1982, "tmdb_search": "E.T. the Extra-Terrestrial"},
    {"title": "The Breakfast Club", "year": 1985, "tmdb_search": "The Breakfast Club"},
    {"title": "Ferris Bueller's Day Off", "year": 1986, "tmdb_search": "Ferris Bueller's Day Off"},
    {"title": "Schindler's List", "year": 1993, "tmdb_search": "Schindler's List"},
    {"title": "Forrest Gump", "year": 1994, "tmdb_search": "Forrest Gump"},
    {"title": "The Matrix", "year": 1999, "tmdb_search": "The Matrix"},
    {"title": "Memento", "year": 2000, "tmdb_search": "Memento"},
    {"title": "Requiem for a Dream", "year": 2000, "tmdb_search": "Requiem for a Dream"},
    {"title": "City of God", "year": 2002, "tmdb_search": "City of God"},
    {"title": "Amélie", "year": 2001, "tmdb_search": "Amelie"},
    {"title": "Pan's Labyrinth", "year": 2006, "tmdb_search": "Pan's Labyrinth"},
    {"title": "The Lives of Others", "year": 2006, "tmdb_search": "The Lives of Others"},
    {"title": "Cinema Paradiso", "year": 1988, "tmdb_search": "Cinema Paradiso"},
    {"title": "Life Is Beautiful", "year": 1997, "tmdb_search": "Life Is Beautiful"},
    {"title": "The Intouchables", "year": 2011, "tmdb_search": "The Intouchables"},
    {"title": "Amélie", "year": 2001, "tmdb_search": "Amelie"},
]

# ── Viki 아시아 무료 영화/드라마 ──
VIKI_MOVIES = [
    {"title": "My Sassy Girl", "year": 2001, "tmdb_search": "My Sassy Girl 2001"},
    {"title": "A Moment to Remember", "year": 2004, "tmdb_search": "A Moment to Remember"},
    {"title": "The Classic", "year": 2003, "tmdb_search": "The Classic 2003"},
    {"title": "Oldboy", "year": 2003, "tmdb_search": "Oldboy 2003"},
    {"title": "Memories of Murder", "year": 2003, "tmdb_search": "Memories of Murder"},
    {"title": "A Tale of Two Sisters", "year": 2003, "tmdb_search": "A Tale of Two Sisters"},
    {"title": "The Host", "year": 2006, "tmdb_search": "The Host 2006"},
    {"title": "Train to Busan", "year": 2016, "tmdb_search": "Train to Busan"},
    {"title": "Spirited Away", "year": 2001, "tmdb_search": "Spirited Away"},
    {"title": "Your Name", "year": 2016, "tmdb_search": "Your Name 2016"},
    {"title": "Ringu", "year": 1998, "tmdb_search": "Ringu 1998"},
    {"title": "Battle Royale", "year": 2000, "tmdb_search": "Battle Royale 2000"},
    {"title": "Infernal Affairs", "year": 2002, "tmdb_search": "Infernal Affairs"},
    {"title": "In the Mood for Love", "year": 2000, "tmdb_search": "In the Mood for Love"},
    {"title": "Chungking Express", "year": 1994, "tmdb_search": "Chungking Express"},
    {"title": "Joint Security Area", "year": 2000, "tmdb_search": "Joint Security Area"},
    {"title": "Spring, Summer, Fall, Winter... and Spring", "year": 2003, "tmdb_search": "Spring Summer Fall Winter and Spring"},
    {"title": "3-Iron", "year": 2004, "tmdb_search": "3-Iron 2004"},
    {"title": "Departures", "year": 2008, "tmdb_search": "Departures 2008"},
    {"title": "Rashomon", "year": 1950, "tmdb_search": "Rashomon"},
    {"title": "Seven Samurai", "year": 1954, "tmdb_search": "Seven Samurai"},
    {"title": "Ikiru", "year": 1952, "tmdb_search": "Ikiru"},
    {"title": "Tokyo Story", "year": 1953, "tmdb_search": "Tokyo Story"},
    {"title": "Harakiri", "year": 1962, "tmdb_search": "Harakiri 1962"},
    {"title": "Yojimbo", "year": 1961, "tmdb_search": "Yojimbo"},
    # 중국
    {"title": "Hero", "year": 2002, "tmdb_search": "Hero 2002 Zhang Yimou"},
    {"title": "House of Flying Daggers", "year": 2004, "tmdb_search": "House of Flying Daggers"},
    {"title": "Kung Fu Hustle", "year": 2004, "tmdb_search": "Kung Fu Hustle"},
    {"title": "Farewell My Concubine", "year": 1993, "tmdb_search": "Farewell My Concubine"},
    {"title": "Raise the Red Lantern", "year": 1991, "tmdb_search": "Raise the Red Lantern"},
    {"title": "A Better Tomorrow", "year": 1986, "tmdb_search": "A Better Tomorrow 1986"},
    {"title": "The Killer", "year": 1989, "tmdb_search": "The Killer 1989 John Woo"},
    {"title": "Hard Boiled", "year": 1992, "tmdb_search": "Hard Boiled 1992"},
    {"title": "Shaolin Soccer", "year": 2001, "tmdb_search": "Shaolin Soccer"},
    {"title": "Drunken Master", "year": 1978, "tmdb_search": "Drunken Master"},
    # 대만
    {"title": "Eat Drink Man Woman", "year": 1994, "tmdb_search": "Eat Drink Man Woman"},
    {"title": "Yi Yi", "year": 2000, "tmdb_search": "Yi Yi"},
    {"title": "A City of Sadness", "year": 1989, "tmdb_search": "A City of Sadness"},
    {"title": "The Wayward Cloud", "year": 2005, "tmdb_search": "The Wayward Cloud"},
    {"title": "You Are the Apple of My Eye", "year": 2011, "tmdb_search": "You Are the Apple of My Eye"},
    {"title": "Cape No. 7", "year": 2008, "tmdb_search": "Cape No. 7"},
    # 일본 추가
    {"title": "Princess Mononoke", "year": 1997, "tmdb_search": "Princess Mononoke"},
    {"title": "Akira", "year": 1988, "tmdb_search": "Akira 1988"},
    {"title": "Grave of the Fireflies", "year": 1988, "tmdb_search": "Grave of the Fireflies"},
    {"title": "Perfect Blue", "year": 1997, "tmdb_search": "Perfect Blue"},
    {"title": "Paprika", "year": 2006, "tmdb_search": "Paprika 2006"},
    {"title": "Tampopo", "year": 1985, "tmdb_search": "Tampopo"},
    {"title": "Audition", "year": 1999, "tmdb_search": "Audition 1999"},
    {"title": "Shall We Dance?", "year": 1996, "tmdb_search": "Shall We Dance 1996"},
    {"title": "13 Assassins", "year": 2010, "tmdb_search": "13 Assassins"},
    {"title": "Confessions", "year": 2010, "tmdb_search": "Confessions 2010"},
    {"title": "Shoplifters", "year": 2018, "tmdb_search": "Shoplifters 2018"},
    # 태국
    {"title": "Ong-Bak", "year": 2003, "tmdb_search": "Ong-Bak"},
    {"title": "Tom-Yum-Goong", "year": 2005, "tmdb_search": "Tom Yum Goong"},
    {"title": "Shutter", "year": 2004, "tmdb_search": "Shutter 2004"},
    {"title": "Uncle Boonmee Who Can Recall His Past Lives", "year": 2010, "tmdb_search": "Uncle Boonmee"},
    {"title": "Bad Genius", "year": 2017, "tmdb_search": "Bad Genius 2017"},
    {"title": "Tropical Malady", "year": 2004, "tmdb_search": "Tropical Malady"},
    # 인도
    {"title": "Lagaan", "year": 2001, "tmdb_search": "Lagaan"},
    {"title": "3 Idiots", "year": 2009, "tmdb_search": "3 Idiots"},
    {"title": "Dangal", "year": 2016, "tmdb_search": "Dangal"},
    {"title": "PK", "year": 2014, "tmdb_search": "PK 2014"},
    {"title": "Baahubali: The Beginning", "year": 2015, "tmdb_search": "Baahubali The Beginning"},
    {"title": "Gangs of Wasseypur", "year": 2012, "tmdb_search": "Gangs of Wasseypur"},
    {"title": "Drishyam", "year": 2015, "tmdb_search": "Drishyam 2015"},
    {"title": "Tumbbad", "year": 2018, "tmdb_search": "Tumbbad"},
    {"title": "Andhadhun", "year": 2018, "tmdb_search": "Andhadhun"},
    {"title": "RRR", "year": 2022, "tmdb_search": "RRR 2022"},
    # 한국 추가
    {"title": "The Handmaiden", "year": 2016, "tmdb_search": "The Handmaiden"},
    {"title": "Burning", "year": 2018, "tmdb_search": "Burning 2018 Lee Chang-dong"},
    {"title": "Mother", "year": 2009, "tmdb_search": "Mother 2009 Bong"},
    {"title": "I Saw the Devil", "year": 2010, "tmdb_search": "I Saw the Devil"},
    {"title": "The Wailing", "year": 2016, "tmdb_search": "The Wailing 2016"},
    {"title": "A Taxi Driver", "year": 2017, "tmdb_search": "A Taxi Driver 2017"},
    {"title": "Silenced", "year": 2011, "tmdb_search": "Silenced 2011"},
    {"title": "Miracle in Cell No. 7", "year": 2013, "tmdb_search": "Miracle in Cell No. 7 2013"},
    {"title": "Extreme Job", "year": 2019, "tmdb_search": "Extreme Job 2019"},
    {"title": "The Man Standing Next", "year": 2020, "tmdb_search": "The Man Standing Next"},
]

# ── Archive.org 추가 공공도메인 영화 ──
ARCHIVE_MOVIES = [
    {"title": "The Hunchback of Notre Dame", "year": 1923, "identifier": "TheHunchbackOfNotreDame1923"},
    {"title": "Phantom of the Opera", "year": 1925, "identifier": "ThePhantomoftheOpera"},
    {"title": "The Man Who Laughs", "year": 1928, "identifier": "TheManWhoLaughs"},
    {"title": "Steamboat Willie", "year": 1928, "identifier": "steamboat-willie"},
    {"title": "Faust", "year": 1926, "identifier": "Faust1926"},
    {"title": "Wings", "year": 1927, "identifier": "Wings1927"},
    {"title": "Voyage to the Bottom of the Sea", "year": 1961, "identifier": "VoyageToTheBottomOfTheSea1961"},
    {"title": "The Iron Mask", "year": 1929, "identifier": "TheIronMask1929"},
    {"title": "Scarface", "year": 1932, "identifier": "Scarface1932"},
    {"title": "Freaks", "year": 1932, "identifier": "Freaks1932"},
    {"title": "White Zombie", "year": 1932, "identifier": "WhiteZombie1932"},
    {"title": "The Most Dangerous Game", "year": 1932, "identifier": "TheMostDangerousGame1932"},
    {"title": "Carnival of Souls", "year": 1962, "identifier": "CarnivalOfSouls1962"},
    {"title": "Dementia 13", "year": 1963, "identifier": "Dementia13"},
    {"title": "The Terror", "year": 1963, "identifier": "TheTerror"},
    {"title": "Attack of the 50 Foot Woman", "year": 1958, "identifier": "AttackOfThe50FootWoman1958"},
    {"title": "The Brain That Wouldn't Die", "year": 1962, "identifier": "TheBrainThatWouldntDie"},
    {"title": "Charade", "year": 1963, "identifier": "Charade1963"},
    {"title": "Suddenly", "year": 1954, "identifier": "Suddenly1954"},
    {"title": "The Stranger", "year": 1946, "identifier": "TheStranger1946"},
    {"title": "Algiers", "year": 1938, "identifier": "Algiers1938"},
    {"title": "Kansas City Confidential", "year": 1952, "identifier": "KansasCityConfidential"},
    {"title": "Quicksand", "year": 1950, "identifier": "Quicksand1950"},
    {"title": "Too Late for Tears", "year": 1949, "identifier": "TooLateForTears1949"},
    {"title": "The Strange Love of Martha Ivers", "year": 1946, "identifier": "TheStrangeLoveOfMarthaIvers"},
    {"title": "Topper", "year": 1937, "identifier": "Topper1937"},
    {"title": "My Favorite Brunette", "year": 1947, "identifier": "MyFavoriteBrunette1947"},
    {"title": "The Little Shop of Horrors", "year": 1960, "identifier": "TheLittleShopOfHorrors1960"},
    {"title": "Voyage to the Planet of Prehistoric Women", "year": 1968, "identifier": "VoyageToThePlanetOfPrehistoricWomen"},
    {"title": "Santa Claus Conquers the Martians", "year": 1964, "identifier": "SantaClausConquersTheMartians"},
]

# ── TMDb Discover로 추가 수집할 조건들 ──
DISCOVER_QUERIES = [
    # 1920년대 이전 (확실한 공공도메인)
    {"primary_release_date.lte": "1927-12-31", "sort_by": "vote_count.desc", "vote_count.gte": 50, "page": 1},
    {"primary_release_date.lte": "1927-12-31", "sort_by": "vote_count.desc", "vote_count.gte": 50, "page": 2},
    # 1928-1940 인기 클래식
    {"primary_release_date.gte": "1928-01-01", "primary_release_date.lte": "1940-12-31", "sort_by": "vote_count.desc", "vote_count.gte": 100, "page": 1},
    {"primary_release_date.gte": "1928-01-01", "primary_release_date.lte": "1940-12-31", "sort_by": "vote_count.desc", "vote_count.gte": 100, "page": 2},
    # 1940-1960 인기 클래식
    {"primary_release_date.gte": "1941-01-01", "primary_release_date.lte": "1960-12-31", "sort_by": "vote_count.desc", "vote_count.gte": 200, "page": 1},
    {"primary_release_date.gte": "1941-01-01", "primary_release_date.lte": "1960-12-31", "sort_by": "vote_count.desc", "vote_count.gte": 200, "page": 2},
]


def load_api_key() -> str:
    api_key = os.environ.get("TMDB_API_KEY", "")
    if not api_key or api_key == "your_tmdb_api_key_here":
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("TMDB_API_KEY="):
                        api_key = line.strip().split("=", 1)[1].strip()
                        break
    return api_key


def get_existing_titles(cur) -> set:
    cur.execute("SELECT LOWER(title) FROM contents")
    return {r[0] for r in cur.fetchall()}


async def search_tmdb(client, api_key, query, year=None):
    params = {"api_key": api_key, "query": query, "language": "ko-KR"}
    if year:
        params["year"] = year
    resp = await client.get(f"{TMDB_BASE}/search/movie", params=params)
    if resp.status_code == 200:
        results = resp.json().get("results", [])
        return results[0] if results else None
    return None


async def discover_tmdb(client, api_key, extra_params):
    params = {"api_key": api_key, "language": "ko-KR"}
    params.update(extra_params)
    resp = await client.get(f"{TMDB_BASE}/discover/movie", params=params)
    if resp.status_code == 200:
        return resp.json().get("results", [])
    return []


def insert_content(cur, tmdb_data, license_class, existing_titles):
    title = tmdb_data.get("title", "")
    if not title or title.lower() in existing_titles:
        return None

    content_id = str(uuid.uuid4())
    year_str = tmdb_data.get("release_date", "")[:4]
    year = int(year_str) if year_str.isdigit() else None
    genres = [GENRE_MAP.get(gid, "") for gid in tmdb_data.get("genre_ids", [])]
    genres = [g for g in genres if g]
    lang = tmdb_data.get("original_language", "en")
    country = COUNTRY_MAP.get(lang, "US")
    poster_path = tmdb_data.get("poster_path")
    poster_url = f"{TMDB_IMAGE}{poster_path}" if poster_path else None
    synopsis = tmdb_data.get("overview", "")
    tmdb_id = tmdb_data.get("id")

    cur.execute("""
        INSERT INTO contents (id, title, original_title, year, country, genres, synopsis,
                             poster_url, tmdb_id, audience, license_class, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        content_id, title, tmdb_data.get("original_title", title), year,
        json.dumps([country]), json.dumps(genres[:3]),
        synopsis, poster_url, tmdb_id,
        "general", license_class,
        datetime.utcnow().isoformat(), datetime.utcnow().isoformat(),
    ))

    existing_titles.add(title.lower())
    return content_id


def insert_source(cur, content_id, source_name, watch_mode, external_url=None, stream_url=None, quality="SD"):
    source_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    cur.execute("""
        INSERT INTO sources (id, content_id, source_name, watch_mode, external_url, stream_url,
                            quality_hint, subtitle_languages, availability_note, region_hint,
                            is_verified, last_checked_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        source_id, content_id, source_name, watch_mode, external_url, stream_url,
        quality, json.dumps([]), f"{source_name} free streaming", "global",
        False, None, now,
    ))


async def seed_all():
    api_key = load_api_key()
    if not api_key or api_key == "your_tmdb_api_key_here":
        print("ERROR: TMDb API key not configured")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    existing = get_existing_titles(cur)
    initial_count = len(existing)
    added = 0

    async with httpx.AsyncClient(timeout=15) as client:

        # ── 1. Tubi 영화 추가 ──
        print("\n=== TUBI FREE MOVIES ===")
        for movie in TUBI_MOVIES:
            try:
                data = await search_tmdb(client, api_key, movie["tmdb_search"], movie.get("year"))
                if data:
                    cid = insert_content(cur, data, "ad_supported", existing)
                    if cid:
                        tubi_url = f"https://tubitv.com/search/{movie['title'].replace(' ', '%20')}"
                        insert_source(cur, cid, "Tubi", "external", external_url=tubi_url, quality="HD")
                        added += 1
                        print(f"  + {data['title']} ({data.get('release_date', '?')[:4]})")
                await asyncio.sleep(0.25)
            except Exception as e:
                print(f"  ! {movie['title']}: {e}")

        # ── 2. Viki 아시아 영화 추가 ──
        print("\n=== VIKI ASIAN MOVIES ===")
        for movie in VIKI_MOVIES:
            try:
                data = await search_tmdb(client, api_key, movie["tmdb_search"], movie.get("year"))
                if data:
                    cid = insert_content(cur, data, "ad_supported", existing)
                    if cid:
                        viki_url = f"https://www.viki.com/search?q={movie['title'].replace(' ', '+')}"
                        insert_source(cur, cid, "Viki", "external", external_url=viki_url, quality="HD")
                        added += 1
                        print(f"  + {data['title']} ({data.get('release_date', '?')[:4]})")
                await asyncio.sleep(0.25)
            except Exception as e:
                print(f"  ! {movie['title']}: {e}")

        # ── 3. Archive.org 추가 ──
        print("\n=== ARCHIVE.ORG PUBLIC DOMAIN ===")
        for movie in ARCHIVE_MOVIES:
            try:
                data = await search_tmdb(client, api_key, movie["title"], movie.get("year"))
                if data:
                    cid = insert_content(cur, data, "public_domain", existing)
                    if cid:
                        identifier = movie["identifier"]
                        stream_url = f"https://archive.org/download/{identifier}/{identifier}.mp4"
                        ext_url = f"https://archive.org/details/{identifier}"
                        insert_source(cur, cid, "Internet Archive", "in_app",
                                     external_url=ext_url, stream_url=stream_url, quality="SD")
                        added += 1
                        print(f"  + {data['title']} ({data.get('release_date', '?')[:4]})")
                await asyncio.sleep(0.25)
            except Exception as e:
                print(f"  ! {movie['title']}: {e}")

        # ── 4. TMDb Discover로 클래식 영화 자동 수집 ──
        print("\n=== TMDB DISCOVER (CLASSICS) ===")
        for query_params in DISCOVER_QUERIES:
            try:
                results = await discover_tmdb(client, api_key, query_params)
                for data in results:
                    year_str = data.get("release_date", "")[:4]
                    year = int(year_str) if year_str.isdigit() else 9999
                    # 1928년 이전은 확실한 공공도메인
                    license_class = "public_domain" if year <= 1927 else "unknown"
                    cid = insert_content(cur, data, license_class, existing)
                    if cid:
                        if year <= 1927:
                            # Archive.org에서 찾을 가능성 있는 공공도메인
                            safe_title = data.get("original_title", "").replace(" ", "")
                            ext_url = f"https://archive.org/search?query={data['title'].replace(' ', '+')}"
                            insert_source(cur, cid, "Internet Archive", "in_app",
                                         external_url=ext_url, quality="SD")
                        else:
                            insert_source(cur, cid, "Tubi", "external",
                                         external_url=f"https://tubitv.com/search/{data['title'].replace(' ', '%20')}",
                                         quality="HD")
                        added += 1
                        print(f"  + {data['title']} ({year})")
                await asyncio.sleep(0.3)
            except Exception as e:
                print(f"  ! Discover error: {e}")

    conn.commit()
    conn.close()

    print(f"\n{'='*50}")
    print(f"Initial: {initial_count} | Added: {added} | Total: {initial_count + added}")


if __name__ == "__main__":
    asyncio.run(seed_all())
