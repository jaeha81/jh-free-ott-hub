"""
링크 검증 배치 스크립트
- 모든 소스의 stream_url / external_url에 HEAD 요청
- 200/302 → is_verified=True, last_checked_at 갱신
- 403/404/503 등 → is_verified=False
- 실행: python -m app.tasks.verify_links (backend/ 디렉토리에서)
"""

import asyncio
import sys
from datetime import datetime
from pathlib import Path

# backend/ 를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import httpx
from sqlalchemy import select

from app.core.database import AsyncSessionLocal, Base, engine
from app.models.source import Source

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


async def check_url(client: httpx.AsyncClient, url: str) -> tuple[bool, int]:
    """URL에 HEAD 요청을 보내 접근 가능 여부 확인"""
    try:
        resp = await client.head(url, headers=HEADERS, follow_redirects=True)
        status = resp.status_code
        verified = status in (200, 301, 302, 303, 307, 308)
        return verified, status
    except httpx.TimeoutException:
        return False, 0
    except Exception:
        return False, -1


async def verify_all(verbose: bool = True) -> dict:
    """모든 소스의 링크를 검증하고 결과를 DB에 업데이트"""
    # DB 테이블 확인
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    results = {"total": 0, "verified": 0, "failed": 0, "skipped": 0}

    async with AsyncSessionLocal() as session:
        stmt = select(Source)
        result = await session.execute(stmt)
        sources = result.scalars().all()

        results["total"] = len(sources)

        if verbose:
            msg = f"\n=== 링크 검증 시작: {len(sources)}개 소스 ===\n"
            sys.stdout.buffer.write(msg.encode("utf-8"))
            sys.stdout.flush()

        async with httpx.AsyncClient(
            timeout=10.0,
            verify=False,
            follow_redirects=True,
        ) as client:
            for source in sources:
                # stream_url 우선, 없으면 external_url
                url = source.stream_url or source.external_url
                if not url:
                    results["skipped"] += 1
                    if verbose:
                        msg = f"  SKIP: source_id={source.id} (URL 없음)\n"
                        sys.stdout.buffer.write(msg.encode("utf-8"))
                        sys.stdout.flush()
                    continue

                verified, status = await check_url(client, url)
                source.is_verified = verified
                source.last_checked_at = datetime.utcnow()

                if verified:
                    results["verified"] += 1
                    label = "OK"
                else:
                    results["failed"] += 1
                    label = "FAIL"

                if verbose:
                    short_url = url[:80] + "..." if len(url) > 80 else url
                    msg = f"  [{label}] ({status}) {short_url}\n"
                    sys.stdout.buffer.write(msg.encode("utf-8"))
                    sys.stdout.flush()

        await session.commit()

    if verbose:
        summary = (
            f"\n=== 검증 완료 ===\n"
            f"  전체: {results['total']}\n"
            f"  성공: {results['verified']}\n"
            f"  실패: {results['failed']}\n"
            f"  건너뜀: {results['skipped']}\n"
        )
        sys.stdout.buffer.write(summary.encode("utf-8"))
        sys.stdout.flush()

    return results


if __name__ == "__main__":
    asyncio.run(verify_all())
