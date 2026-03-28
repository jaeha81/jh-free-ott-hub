import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Content(Base):
    __tablename__ = "contents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    original_title: Mapped[str | None] = mapped_column(String(500))
    year: Mapped[int | None] = mapped_column(Integer)
    country: Mapped[str | None] = mapped_column(String(500))  # JSON 직렬화 문자열
    genres: Mapped[str | None] = mapped_column(String(1000))  # JSON 직렬화 문자열
    synopsis: Mapped[str | None] = mapped_column(Text)
    poster_url: Mapped[str | None] = mapped_column(String(1000))
    tmdb_id: Mapped[int | None] = mapped_column(Integer, unique=True, index=True)
    audience: Mapped[str | None] = mapped_column(String(50))  # children / family / general
    license_class: Mapped[str | None] = mapped_column(
        String(50)
    )  # public_domain / institutional / ad_supported / unknown
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    sources: Mapped[list["Source"]] = relationship(  # noqa: F821
        "Source", back_populates="content", cascade="all, delete-orphan"
    )
