from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.schemas.content import ContentListResponse
from app.services.search_service import SearchService

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/", response_model=ContentListResponse)
async def search_contents(
    q: str | None = Query(None, description="검색어"),
    genre: str | None = Query(None, description="장르 필터"),
    country: str | None = Query(None, description="국가 필터"),
    subtitle_lang: str | None = Query(None, description="자막 언어 필터"),
    watch_mode: str | None = Query(None, description="in_app 또는 external"),
    verified_only: bool = Query(False, description="검증된 스트림만 필터"),
    sort_by: str = Query("title", description="정렬 기준: title | year | recent | latest | rating | popularity"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = SearchService(db)
    return await service.search(
        q=q,
        genre=genre,
        country=country,
        subtitle_lang=subtitle_lang,
        watch_mode=watch_mode,
        verified_only=verified_only,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )
