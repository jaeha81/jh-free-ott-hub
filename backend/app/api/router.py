from fastapi import APIRouter

from app.api.routes import admin, contents, health, search, sources

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(contents.router)
api_router.include_router(search.router)
api_router.include_router(sources.router)
api_router.include_router(admin.router)
