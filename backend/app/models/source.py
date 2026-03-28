import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    content_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("contents.id"), nullable=False, index=True
    )
    source_name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # Plex / Tubi / Viki / Internet Archive
    watch_mode: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # in_app / external
    external_url: Mapped[str | None] = mapped_column(String(2000))
    stream_url: Mapped[str | None] = mapped_column(String(2000))
    quality_hint: Mapped[str | None] = mapped_column(String(20))  # HD / SD / Unknown
    subtitle_languages: Mapped[str | None] = mapped_column(
        String(500)
    )  # JSON 직렬화 문자열
    availability_note: Mapped[str | None] = mapped_column(String(500))
    region_hint: Mapped[str | None] = mapped_column(
        String(50)
    )  # global / asia / region_limited
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    content: Mapped["Content"] = relationship("Content", back_populates="sources")  # noqa: F821
