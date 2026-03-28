import json
from datetime import datetime

from pydantic import BaseModel, model_validator

from app.schemas.source import SourceResponse


class ContentBase(BaseModel):
    title: str
    original_title: str | None = None
    year: int | None = None
    country: list[str] | None = None
    genres: list[str] | None = None
    synopsis: str | None = None
    poster_url: str | None = None
    tmdb_id: int | None = None
    audience: str | None = None
    license_class: str | None = None


class ContentCreate(ContentBase):
    pass


class ContentResponse(ContentBase):
    id: str
    created_at: datetime
    updated_at: datetime
    sources: list[SourceResponse] = []

    @model_validator(mode="before")
    @classmethod
    def parse_json_fields(cls, values):
        if hasattr(values, "__dict__"):
            obj = values.__dict__
        else:
            obj = dict(values)
        for field in ("country", "genres"):
            val = obj.get(field)
            if isinstance(val, str):
                try:
                    obj[field] = json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    obj[field] = []
        return obj

    model_config = {"from_attributes": True}


class ContentListResponse(BaseModel):
    items: list[ContentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
