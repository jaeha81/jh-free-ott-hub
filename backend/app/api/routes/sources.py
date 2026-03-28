from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.source import Source
from app.schemas.source import SourceResponse

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
