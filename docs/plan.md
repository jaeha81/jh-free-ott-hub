# Plan: 무료 영화·애니 검색형 OTT 허브 — MVP 개발 계획

## 1. 구현 접근 방식

### 선택한 방법론

구현계획서의 **B안(검색·연결 허브)** 을 확정하고, **0단계(정책 확정) ~ 3단계(재생 연결)** 까지를 하나의 MVP로 묶어 개발한다.

### research.md CPS 반영

- **Context:** 무료 합법 스트리밍 플랫폼 6개 검증 완료, Crunchyroll 무료 폐지 확인
- **Problem:** 기술 상세 설계 부재 → 이 plan.md에서 해결
- **Solution:** TMDb + Watchmode API 기반 메타데이터 수집, Next.js + FastAPI 풀스택, PostgreSQL, HLS.js 인앱 재생

### 기술적 근거

1. **Next.js App Router:** SSR/ISR로 SEO + 빠른 초기 로드. TV 브라우저에서도 렌더링 안정적
2. **FastAPI:** 비동기 처리로 메타데이터 수집·검색 API에 최적. OpenAPI 자동 문서화
3. **PostgreSQL + SQLAlchemy 2.0:** 복잡한 필터링(국가·장르·자막·재생방식) 쿼리에 강함
4. **TMDb API:** 무료, 다국어 지원, 포스터/시놉시스 품질 우수
5. **HLS.js:** 공공도메인 직접재생에 필요한 적응형 스트리밍, 브라우저 호환성 최고

---

## 2. 수정/추가될 파일 경로

### 프로젝트 루트 구조 (모노레포)
```
jh-free-ott-hub/
├── frontend/                    # Next.js 앱
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── public/
│   │   └── icons/              # PWA 아이콘
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       # 루트 레이아웃
│       │   ├── page.tsx         # 홈 (추천 화면)
│       │   ├── browse/
│       │   │   └── page.tsx     # 탐색 (필터 검색)
│       │   ├── content/
│       │   │   └── [id]/
│       │   │       └── page.tsx # 상세 페이지
│       │   ├── player/
│       │   │   └── [id]/
│       │   │       └── page.tsx # 인앱 플레이어
│       │   └── settings/
│       │       └── page.tsx     # 설정
│       ├── components/
│       │   ├── ui/              # 공통 UI (Button, Card, Modal)
│       │   ├── ContentCard.tsx  # 작품 카드
│       │   ├── Carousel.tsx     # 가로 캐러셀
│       │   ├── FilterBar.tsx    # 필터 바
│       │   ├── SearchBar.tsx    # 검색 바
│       │   ├── Player.tsx       # HLS 플레이어 래퍼
│       │   └── FocusManager.tsx # D-pad 포커스 관리
│       ├── hooks/
│       │   ├── useSearch.ts     # 검색 훅
│       │   ├── useFocus.ts      # TV 포커스 훅
│       │   └── usePlayer.ts     # 플레이어 상태 훅
│       ├── lib/
│       │   ├── api.ts           # FastAPI 클라이언트
│       │   └── constants.ts     # 상수 정의
│       └── types/
│           └── content.ts       # 타입 정의
│
├── backend/                     # FastAPI 앱
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/           # 마이그레이션 파일
│   └── app/
│       ├── main.py              # FastAPI 앱 진입점
│       ├── core/
│       │   ├── config.py        # 환경 설정
│       │   ├── database.py      # DB 연결 (async SQLAlchemy)
│       │   └── deps.py          # 의존성 주입
│       ├── api/
│       │   ├── routes/
│       │   │   ├── contents.py  # /api/contents 엔드포인트
│       │   │   ├── search.py    # /api/search 엔드포인트
│       │   │   ├── sources.py   # /api/sources 엔드포인트
│       │   │   └── health.py    # /api/health 헬스체크
│       │   └── router.py        # 라우터 통합
│       ├── models/
│       │   ├── content.py       # Content SQLAlchemy 모델
│       │   └── source.py        # Source SQLAlchemy 모델
│       ├── schemas/
│       │   ├── content.py       # Content Pydantic 스키마
│       │   └── source.py        # Source Pydantic 스키마
│       ├── services/
│       │   ├── tmdb_service.py  # TMDb API 연동
│       │   ├── content_service.py # 콘텐츠 CRUD
│       │   ├── search_service.py  # 검색 로직
│       │   └── link_checker.py  # 링크 상태 검증
│       └── tasks/
│           ├── seed_data.py     # 시드 데이터 수집 스크립트
│           └── verify_links.py  # 링크 검증 배치
│
├── docker-compose.yml           # 개발 환경 (PostgreSQL + API + Frontend)
├── .env.example                 # 환경 변수 템플릿
└── README.md                    # 프로젝트 설명
```

---

## 3. 변경 사항 코드 스니펫

### 3-1. 백엔드: Content 모델

**Before:** 없음 (신규 프로젝트)

**After:**
```python
# backend/app/models/content.py
from sqlalchemy import Column, String, Integer, ARRAY, Text, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.core.database import Base

class Content(Base):
    __tablename__ = "contents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False, index=True)
    original_title = Column(String(500))
    year = Column(Integer)
    country = Column(ARRAY(String))
    genres = Column(ARRAY(String))
    synopsis = Column(Text)
    poster_url = Column(String(1000))
    tmdb_id = Column(Integer, unique=True, index=True)
    audience = Column(String(50))  # children / family / general
    license_class = Column(String(50))  # public_domain / institutional / ad_supported / unknown
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sources = relationship("Source", back_populates="content", cascade="all, delete-orphan")
```

### 3-2. 백엔드: Source 모델

**After:**
```python
# backend/app/models/source.py
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.core.database import Base

class Source(Base):
    __tablename__ = "sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id = Column(UUID(as_uuid=True), ForeignKey("contents.id"), nullable=False)
    source_name = Column(String(100), nullable=False)  # Plex / Tubi / Viki / Internet Archive
    watch_mode = Column(String(20), nullable=False)  # in_app / external
    external_url = Column(String(2000))
    stream_url = Column(String(2000))
    quality_hint = Column(String(20))  # HD / SD / Unknown
    subtitle_languages = Column(ARRAY(String))
    availability_note = Column(String(500))
    region_hint = Column(String(50))  # global / asia / region_limited
    is_verified = Column(Boolean, default=False)
    last_checked_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    content = relationship("Content", back_populates="sources")
```

### 3-3. 백엔드: 검색 API 엔드포인트

**After:**
```python
# backend/app/api/routes/search.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.deps import get_db
from app.schemas.content import ContentListResponse
from app.services.search_service import SearchService

router = APIRouter(prefix="/api/search", tags=["search"])

@router.get("/", response_model=ContentListResponse)
async def search_contents(
    q: Optional[str] = Query(None, description="검색어"),
    genre: Optional[str] = Query(None, description="장르 필터"),
    country: Optional[str] = Query(None, description="국가 필터"),
    subtitle_lang: Optional[str] = Query(None, description="자막 언어 필터"),
    watch_mode: Optional[str] = Query(None, description="in_app 또는 external"),
    sort_by: str = Query("title", description="정렬 기준"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = SearchService(db)
    return await service.search(
        q=q, genre=genre, country=country,
        subtitle_lang=subtitle_lang, watch_mode=watch_mode,
        sort_by=sort_by, page=page, page_size=page_size,
    )
```

### 3-4. 프론트엔드: ContentCard 컴포넌트

**After:**
```tsx
// frontend/src/components/ContentCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Content } from "@/types/content";

interface ContentCardProps {
  content: Content;
  isFocused?: boolean;
}

export default function ContentCard({ content, isFocused }: ContentCardProps) {
  return (
    <Link
      href={`/content/${content.id}`}
      className={`
        block rounded-lg overflow-hidden transition-transform duration-200
        ${isFocused ? "scale-110 ring-2 ring-white shadow-xl z-10" : "hover:scale-105"}
      `}
      data-focusable="true"
    >
      <div className="relative aspect-[2/3] bg-gray-800">
        {content.poster_url ? (
          <Image
            src={content.poster_url}
            alt={content.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 33vw, 200px"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            {content.title}
          </div>
        )}
      </div>
      <div className="p-2 bg-gray-900">
        <p className="text-white text-sm truncate">{content.title}</p>
        <p className="text-gray-400 text-xs">{content.year} · {content.genres?.[0]}</p>
      </div>
    </Link>
  );
}
```

### 3-5. 프론트엔드: HLS 플레이어

**After:**
```tsx
// frontend/src/components/Player.tsx
"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface PlayerProps {
  streamUrl: string;
  title: string;
}

export default function Player({ streamUrl, title }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari 네이티브 HLS
      video.src = streamUrl;
    }
  }, [streamUrl]);

  return (
    <div className="relative w-full bg-black aspect-video">
      <video
        ref={videoRef}
        controls
        autoPlay
        className="w-full h-full"
        title={title}
      />
    </div>
  );
}
```

---

## 4. 고려 사항 및 트레이드오프

| 결정 | 선택 | 대안 | 근거 |
|------|------|------|------|
| 모노레포 vs 분리 레포 | 모노레포 | 프론트/백 분리 레포 | MVP 단계에서 코드 이동·공유 편의 |
| PostgreSQL vs SQLite | PostgreSQL | SQLite (개발 시) | ARRAY 타입, Full-Text Search 네이티브 지원 |
| SSR vs CSR | SSR (Next.js App Router) | SPA (Vite) | SEO, 초기 로드 속도, TV 브라우저 안정성 |
| 자체 인코딩 vs 원본 링크 | 원본 HLS 링크 사용 | FFmpeg 자체 인코딩 | MVP에서 CDN 비용 절감. 공공도메인 원본 대부분 재생 가능 |
| Tailwind vs CSS-in-JS | Tailwind CSS | styled-components | 빌드 성능, TV 브라우저 호환성, 팀 생산성 |
| D-pad 포커스 | 커스텀 FocusManager | react-tv-navigation | 외부 의존 최소화, 정밀 제어 가능 |

### 리스크 완화

1. **TMDb API 한도:** 40req/10sec → 배치 수집 + DB 캐싱으로 사용자 요청은 자체 DB에서 응답
2. **외부 링크 만료:** link_checker 배치를 매일 실행 → 만료 링크 자동 비노출
3. **TV 포커스 UX:** 개발 초기부터 키보드 방향키 테스트를 병행 (TV 시뮬레이션)

---

## 5. Todo 리스트 (Wave 분류)

### Wave 1 — 백엔드 기반 (병렬 가능)

- [ ] [BACKEND] 프로젝트 초기화: FastAPI + SQLAlchemy 2.0 + Alembic 설정
  검증: `uvicorn app.main:app` 실행 시 /docs 접근 가능

- [ ] [BACKEND] DB 모델 생성: Content, Source 테이블 + Alembic 마이그레이션
  검증: `alembic upgrade head` 성공, 테이블 생성 확인

- [ ] [BACKEND] TMDb 서비스 구현: 영화 검색/상세 API 연동
  검증: `tmdb_service.search("Roman Holiday")` 결과 반환

- [ ] [BACKEND] 시드 데이터 스크립트: TMDb에서 공공도메인 영화 100개+ 수집
  검증: contents 테이블에 100개 이상 레코드 존재

### Wave 2 — 프론트엔드 기반 (병렬 가능, Wave 1과 일부 병렬)

- [ ] [FRONTEND] 프로젝트 초기화: Next.js 14 App Router + Tailwind CSS + TypeScript
  검증: `npm run dev` 실행 시 localhost:3000 접근 가능

- [ ] [FRONTEND] 홈 화면: 추천 캐러셀 + 카테고리별 가로 스크롤
  검증: 홈에서 작품 카드가 캐러셀로 표시됨

- [ ] [FRONTEND] 탐색 화면: 장르/국가/자막/재생방식 필터 + 검색 바
  검증: 필터 변경 시 결과 갱신

- [ ] [FRONTEND] 상세 화면: 포스터, 시놉시스, 소스 목록, 재생/연결 버튼
  검증: 작품 클릭 → 상세 → 재생방식에 따라 인앱/외부 분기

### Wave 3 — 통합 + 재생 (Wave 1, 2 완료 후)

- [ ] [BACKEND] 검색 API: Full-Text Search + 필터 조합 엔드포인트
  검증: `/api/search?q=holiday&genre=드라마&country=US` 정확한 결과

- [ ] [FRONTEND] HLS 플레이어: 공공도메인 작품 인앱 직접 재생
  검증: Internet Archive 공공도메인 영화 1편 인앱 재생 성공

- [ ] [FRONTEND] 외부 연결: Tubi/Viki 작품 → 공식 URL 새 탭/앱 열기
  검증: 외부 링크 클릭 → 해당 플랫폼 상세 페이지 도달

- [ ] [FRONTEND] D-pad 포커스 매니저: 키보드 방향키로 카드 탐색 가능
  검증: Tab 없이 방향키만으로 홈→카드→상세→뒤로 전체 플로우 조작

### Wave 4 — 운영 도구 + 마무리 (Wave 3 완료 후)

- [ ] [BACKEND] 링크 검증 배치: 전체 소스 URL 상태 체크 + 만료 비노출
  검증: 만료 URL이 검색 결과에서 자동 제외됨

- [ ] [FRONTEND] 설정 화면: 언어 선택, 자막 기본값, 네트워크 품질 프리셋
  검증: 설정 변경 → 홈/상세에 즉시 반영

- [ ] [INFRA] Docker Compose: PostgreSQL + FastAPI + Next.js 원커맨드 개발환경
  검증: `docker-compose up` 한 번으로 전체 서비스 실행

- [ ] [QA] MVP 완료 기준 검증: 계획서의 6개 기준 전수 확인
  검증: 아래 체크리스트 전체 통과

---

## 6. 이밸류에이션 체크리스트

### 설계 검증
- [x] CPS의 Problem(기술 상세 설계 부재)을 이 Plan이 해결하는가? → 모델, API, 컴포넌트, 디렉토리까지 명세
- [x] 기존 구현계획서와 충돌하는 부분이 없는가? → B안 방향 유지, 소스 분류/정책 그대로 반영
- [x] 중복 로직이 새로 생기지 않는가? → 신규 프로젝트, TMDb 래퍼는 기존 라이브러리 활용 검토

### 구현 검증
- [x] 기존 레이어 구조를 따르는가? → Controller(routes) → Service → Repository(models) 패턴 준수
- [x] ORM/마이그레이션 규칙이 반영되었는가? → SQLAlchemy 2.0 async + Alembic 마이그레이션
- [x] 타입 안전성이 확보되었는가? → Pydantic 스키마 + TypeScript 타입 정의, unknown 미사용

### 유지보수 검증
- [x] 다른 개발자가 이 Plan만 보고 구현할 수 있는가? → 파일 경로, 코드 스니펫, 검증 기준 포함
- [x] 파일명/네이밍이 프로젝트 컨벤션과 일치하는가? → snake_case(Python), PascalCase(React), kebab-case(경로)

### MVP 완료 기준 (구현계획서 8-1절 기준)
- [ ] 무료·합법 소스 3~5개 이상 연결 → Internet Archive + Tubi + Viki (최소 3종)
- [ ] 최소 100개 이상 작품 메타데이터 검색 가능 → TMDb 시드 데이터 100+
- [ ] 국가/장르/자막 필터 작동 → search API 필터 파라미터 구현
- [ ] 공공도메인 작품 1개 이상 인앱 재생 성공 → HLS.js + Internet Archive
- [ ] 외부 플랫폼 작품 1개 이상 공식 링크/앱 연결 성공 → Tubi 또는 Viki 딥링크
- [ ] 모바일/데스크톱/TV 브라우저에서 기본 조작 가능 → 반응형 + D-pad 포커스

### 판정
- **전체 설계/구현/유지보수 검증: 통과**
- MVP 완료 기준: 구현 후 확인 필요

---

계획이 완료되었습니다. 검토 후 메모를 남겨주시거나 구현 승인을 해주세요.
아직 코드를 수정하지는 않았습니다.
