from fastapi import APIRouter, BackgroundTasks

from app.tasks.seed_data import seed
from app.tasks.verify_links import verify_all

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/seed")
async def trigger_seed(background_tasks: BackgroundTasks):
    background_tasks.add_task(seed, verbose=False)
    return {"message": "시드 데이터 수집이 백그라운드에서 시작됩니다."}


@router.post("/verify-links")
async def trigger_verify_links(background_tasks: BackgroundTasks):
    """모든 소스 URL의 접근 가능 여부를 검증하는 배치 작업을 트리거합니다."""
    background_tasks.add_task(verify_all, verbose=False)
    return {"message": "링크 검증 작업이 백그라운드에서 시작됩니다."}
