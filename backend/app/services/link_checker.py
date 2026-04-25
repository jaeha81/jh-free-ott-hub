"""
외부 소스 URL 유효성 검증 서비스.
HTTP HEAD 요청으로 링크 생존 여부 확인.
"""
import asyncio
from datetime import datetime, timezone
from typing import Literal

import httpx

CheckStatus = Literal["ok", "broken", "timeout", "redirect", "unknown"]


async def check_url(url: str, timeout: float = 8.0) -> dict:
    """단일 URL 상태 확인. HEAD → GET 폴백."""
    start = datetime.now(timezone.utc)
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=timeout,
            headers={"User-Agent": "Mozilla/5.0 (compatible; JH-OTT-LinkChecker/1.0)"},
        ) as client:
            try:
                resp = await client.head(url)
            except httpx.HTTPStatusError:
                resp = await client.get(url)

            status: CheckStatus = "ok" if resp.status_code < 400 else "broken"
            return {
                "url": url,
                "status": status,
                "http_code": resp.status_code,
                "final_url": str(resp.url),
                "checked_at": start.isoformat(),
            }
    except httpx.TimeoutException:
        return {"url": url, "status": "timeout", "http_code": None, "final_url": url, "checked_at": start.isoformat()}
    except Exception as exc:
        return {"url": url, "status": "unknown", "http_code": None, "final_url": url,
                "checked_at": start.isoformat(), "error": str(exc)}


async def check_urls_batch(urls: list[str], concurrency: int = 5) -> list[dict]:
    """여러 URL 병렬 확인."""
    semaphore = asyncio.Semaphore(concurrency)

    async def _check(url: str) -> dict:
        async with semaphore:
            return await check_url(url)

    return await asyncio.gather(*[_check(u) for u in urls])
