from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db
from app.models.content import Content
from app.schemas.content import ContentListResponse, ContentResponse
from app.services.search_service import SearchService

router = APIRouter(prefix="/api/contents", tags=["contents"])


@router.get("/genres", response_model=list[str])
async def list_genres(db: AsyncSession = Depends(get_db)):
    """데이터베이스의 모든 고유 장르 목록 반환"""
    service = SearchService(db)
    return await service.get_all_genres()


@router.get("/countries", response_model=list[str])
async def list_countries(db: AsyncSession = Depends(get_db)):
    """데이터베이스의 모든 고유 국가 코드 목록 반환"""
    service = SearchService(db)
    return await service.get_all_countries()


@router.get("/trending", response_model=ContentListResponse)
async def trending_contents(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """인기 트렌딩 콘텐츠 (popularity 기준 상위)"""
    offset = (page - 1) * page_size
    total_result = await db.execute(select(func.count()).select_from(Content))
    total = total_result.scalar_one()

    result = await db.execute(
        select(Content)
        .options(selectinload(Content.sources))
        .order_by(Content.popularity.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()
    total_pages = (total + page_size - 1) // page_size

    return ContentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/top-rated", response_model=ContentListResponse)
async def top_rated_contents(
    min_votes: int = 50,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """평점 높은 콘텐츠 (최소 투표 수 이상)"""
    offset = (page - 1) * page_size
    base_filter = Content.vote_count >= min_votes
    total_result = await db.execute(
        select(func.count()).select_from(Content).where(base_filter)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Content)
        .options(selectinload(Content.sources))
        .where(base_filter)
        .order_by(Content.vote_average.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()
    total_pages = (total + page_size - 1) // page_size

    return ContentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/by-country/{country_code}", response_model=ContentListResponse)
async def contents_by_country(
    country_code: str,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """국가별 콘텐츠 필터 (JSON 배열 내 정확한 국가 코드 매칭)"""
    offset = (page - 1) * page_size
    # Exact match within JSON array: '["KR"]' or '["US", "KR"]'
    country_filter = Content.country.like(f'%"{country_code}"%')
    total_result = await db.execute(
        select(func.count()).select_from(Content).where(country_filter)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Content)
        .options(selectinload(Content.sources))
        .where(country_filter)
        .order_by(Content.title)
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()
    total_pages = (total + page_size - 1) // page_size

    return ContentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/", response_model=ContentListResponse)
async def list_contents(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    total_result = await db.execute(select(func.count()).select_from(Content))
    total = total_result.scalar_one()

    result = await db.execute(
        select(Content)
        .options(selectinload(Content.sources))
        .offset(offset)
        .limit(page_size)
        .order_by(Content.title)
    )
    items = result.scalars().all()
    total_pages = (total + page_size - 1) // page_size

    return ContentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{content_id}", response_model=ContentResponse)
async def get_content(content_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Content)
        .options(selectinload(Content.sources))
        .where(Content.id == content_id)
    )
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다.")
    return content
