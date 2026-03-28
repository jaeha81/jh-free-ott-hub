import json
from datetime import datetime

from pydantic import BaseModel, model_validator


class SourceBase(BaseModel):
    source_name: str
    watch_mode: str
    external_url: str | None = None
    stream_url: str | None = None
    quality_hint: str | None = None
    subtitle_languages: list[str] | None = None
    availability_note: str | None = None
    region_hint: str | None = None


class SourceCreate(SourceBase):
    content_id: str


class SourceResponse(SourceBase):
    id: str
    content_id: str
    is_verified: bool
    last_checked_at: datetime | None = None
    created_at: datetime

    # DB에서는 JSON 문자열로 저장, 응답 시 list로 변환
    @model_validator(mode="before")
    @classmethod
    def parse_json_fields(cls, values):
        if hasattr(values, "__dict__"):
            values = values.__dict__
        if isinstance(values.get("subtitle_languages"), str):
            try:
                values["subtitle_languages"] = json.loads(values["subtitle_languages"])
            except (json.JSONDecodeError, TypeError):
                values["subtitle_languages"] = []
        return values

    model_config = {"from_attributes": True}
