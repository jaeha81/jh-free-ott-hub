import httpx

from app.core.config import settings

TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"


class TMDbService:
    def __init__(self):
        self.base_url = settings.tmdb_base_url
        self.api_key = settings.tmdb_api_key
        self.headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}

    def _params(self, **kwargs) -> dict:
        params = {"api_key": self.api_key, "language": "ko-KR"}
        params.update(kwargs)
        return params

    async def search_movies(self, query: str, page: int = 1) -> dict:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.base_url}/search/movie",
                params=self._params(query=query, page=page),
            )
            resp.raise_for_status()
            return resp.json()

    async def get_movie_detail(self, tmdb_id: int) -> dict:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.base_url}/movie/{tmdb_id}",
                params=self._params(),
            )
            resp.raise_for_status()
            return resp.json()

    async def discover_movies(
        self,
        page: int = 1,
        sort_by: str = "popularity.desc",
        with_genres: str | None = None,
        primary_release_year: int | None = None,
        vote_count_gte: int | None = None,
    ) -> dict:
        extra: dict = {}
        if with_genres:
            extra["with_genres"] = with_genres
        if primary_release_year:
            extra["primary_release_year"] = primary_release_year
        if vote_count_gte:
            extra["vote_count.gte"] = vote_count_gte

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.base_url}/discover/movie",
                params=self._params(sort_by=sort_by, page=page, **extra),
            )
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    def build_poster_url(poster_path: str | None) -> str | None:
        if not poster_path:
            return None
        return f"{TMDB_IMAGE_BASE}{poster_path}"

    @staticmethod
    def extract_genres(genre_ids: list[int] | None, genres: list[dict] | None) -> list[str]:
        GENRE_MAP = {
            28: "액션", 12: "어드벤처", 16: "애니메이션", 35: "코미디",
            80: "범죄", 99: "다큐멘터리", 18: "드라마", 10751: "가족",
            14: "판타지", 36: "역사", 27: "공포", 10402: "음악",
            9648: "미스터리", 10749: "로맨스", 878: "SF", 10770: "TV영화",
            53: "스릴러", 10752: "전쟁", 37: "서부",
        }
        if genres:
            return [g["name"] for g in genres]
        if genre_ids:
            return [GENRE_MAP.get(gid, str(gid)) for gid in genre_ids]
        return []
