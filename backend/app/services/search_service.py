from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.content import Content
from app.models.source import Source
from app.schemas.content import ContentListResponse


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(
        self,
        q: str | None,
        genre: str | None,
        country: str | None,
        subtitle_lang: str | None,
        watch_mode: str | None,
        verified_only: bool = False,
        sort_by: str = "title",
        page: int = 1,
        page_size: int = 20,
    ) -> ContentListResponse:
        stmt = select(Content).options(selectinload(Content.sources))

        # Text search across title, original_title, synopsis
        if q:
            search_term = f"%{q}%"
            stmt = stmt.where(
                or_(
                    Content.title.ilike(search_term),
                    Content.original_title.ilike(search_term),
                    Content.synopsis.ilike(search_term),
                )
            )

        # Genre filter: exact match within JSON array string
        # Data format: '["드라마", "액션"]' -- match with quoted value
        if genre:
            genre_pattern = f'%"{genre}"%'
            stmt = stmt.where(Content.genres.like(genre_pattern))

        # Country filter: exact match within JSON array string
        # Data format: '["KR"]' -- match with quoted value to avoid partial matches
        if country:
            country_pattern = f'%"{country}"%'
            stmt = stmt.where(Content.country.like(country_pattern))

        # Source-related filters require a join
        needs_join = subtitle_lang or watch_mode or verified_only
        if needs_join:
            stmt = stmt.join(Source, Source.content_id == Content.id)
            if subtitle_lang:
                subtitle_pattern = f'%"{subtitle_lang}"%'
                stmt = stmt.where(Source.subtitle_languages.like(subtitle_pattern))
            if watch_mode:
                stmt = stmt.where(Source.watch_mode == watch_mode)
            if verified_only:
                stmt = stmt.where(Source.is_verified.is_(True))
            stmt = stmt.distinct()

        # Sorting
        if sort_by == "popularity":
            stmt = stmt.order_by(Content.popularity.desc().nulls_last())
        elif sort_by == "rating":
            stmt = stmt.order_by(Content.vote_average.desc().nulls_last())
        elif sort_by == "latest":
            stmt = stmt.order_by(Content.year.desc().nulls_last(), Content.created_at.desc())
        elif sort_by == "year":
            stmt = stmt.order_by(Content.year.desc().nulls_last())
        elif sort_by == "recent":
            stmt = stmt.order_by(Content.created_at.desc())
        elif sort_by == "title":
            stmt = stmt.order_by(Content.title)
        else:
            stmt = stmt.order_by(Content.title)

        # Count total results
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        # Paginate
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        items = result.scalars().unique().all()
        total_pages = (total + page_size - 1) // page_size

        return ContentListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_all_genres(self) -> list[str]:
        """Extract all unique genres from the database.

        Genres are stored as JSON array strings like '["드라마", "액션"]'.
        We fetch all non-null genre values and parse them in Python.
        """
        stmt = select(Content.genres).where(Content.genres.isnot(None)).distinct()
        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        import json

        genre_set: set[str] = set()
        for raw in rows:
            if raw:
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        genre_set.update(g for g in parsed if isinstance(g, str) and g)
                except (json.JSONDecodeError, TypeError):
                    pass
        return sorted(genre_set)

    async def get_all_countries(self) -> list[str]:
        """Extract all unique countries from the database.

        Countries are stored as JSON array strings like '["KR"]'.
        We fetch all non-null country values and parse them in Python.
        """
        stmt = select(Content.country).where(Content.country.isnot(None)).distinct()
        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        import json

        country_set: set[str] = set()
        for raw in rows:
            if raw:
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        country_set.update(c for c in parsed if isinstance(c, str) and c)
                except (json.JSONDecodeError, TypeError):
                    pass
        return sorted(country_set)
