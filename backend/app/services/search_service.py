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

        if q:
            stmt = stmt.where(
                or_(
                    Content.title.ilike(f"%{q}%"),
                    Content.original_title.ilike(f"%{q}%"),
                    Content.synopsis.ilike(f"%{q}%"),
                )
            )
        if genre:
            stmt = stmt.where(Content.genres.ilike(f"%{genre}%"))
        if country:
            stmt = stmt.where(Content.country.ilike(f"%{country}%"))
        needs_join = subtitle_lang or watch_mode or verified_only
        if needs_join:
            stmt = stmt.join(Source, Source.content_id == Content.id)
            if subtitle_lang:
                stmt = stmt.where(Source.subtitle_languages.ilike(f"%{subtitle_lang}%"))
            if watch_mode:
                stmt = stmt.where(Source.watch_mode == watch_mode)
            if verified_only:
                stmt = stmt.where(Source.is_verified.is_(True))
            stmt = stmt.distinct()

        if sort_by == "year":
            stmt = stmt.order_by(Content.year.desc().nulls_last())
        elif sort_by == "recent":
            stmt = stmt.order_by(Content.created_at.desc())
        else:
            stmt = stmt.order_by(Content.title)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

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
