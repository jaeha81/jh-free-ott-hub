from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db
from app.models.content import Content
from app.schemas.content import ContentListResponse, ContentResponse

router = APIRouter(prefix="/api/contents", tags=["contents"])


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
