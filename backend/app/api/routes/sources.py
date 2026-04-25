from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.source import Source
from app.schemas.source import SourceResponse
from app.services.link_checker import check_url, check_urls_batch

router = APIRouter(prefix="/api/sources", tags=["sources"])


@router.get("/{content_id}", response_model=list[SourceResponse])
async def get_sources(content_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Source).where(Source.content_id == content_id).order_by(Source.source_name)
    )
    sources = result.scalars().all()
    if not sources:
        raise HTTPException(status_code=404, detail="소스를 찾을 수 없습니다.")
    return sources


@router.post("/{source_id}/check-link")
async def check_source_link(source_id: int, db: AsyncSession = Depends(get_db)):
    """단일 소스 URL 유효성 확인."""
    result = await db.execute(select(Source).where(Source.id == source_id))
    source = result.scalar_one_or_none()
    if not source or not source.external_url:
        raise HTTPException(status_code=404, detail="소스 또는 URL을 찾을 수 없습니다.")
    return await check_url(source.external_url)


@router.post("/check-links/batch")
async def check_links_batch(content_id: str, db: AsyncSession = Depends(get_db)):
    """콘텐츠의 모든 소스 URL 일괄 확인."""
    result = await db.execute(
        select(Source).where(Source.content_id == content_id, Source.external_url.isnot(None))
    )
    sources = result.scalars().all()
    if not sources:
        raise HTTPException(status_code=404, detail="확인할 소스가 없습니다.")
    urls = [s.external_url for s in sources if s.external_url]
    results = await check_urls_batch(urls)
    return {"content_id": content_id, "checked": len(results), "results": results}
