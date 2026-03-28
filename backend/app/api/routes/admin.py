from fastapi import APIRouter, BackgroundTasks

from app.tasks.seed_data import seed

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/seed")
async def trigger_seed(background_tasks: BackgroundTasks):
    background_tasks.add_task(seed, verbose=False)
    return {"message": "시드 데이터 수집이 백그라운드에서 시작됩니다."}
