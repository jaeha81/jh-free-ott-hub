# CLAUDE.md — JH 무료 영화·애니 검색형 OTT 허브

## 프로젝트 개요

전 세계 무료·합법 영화/애니메이션을 한곳에서 검색하고, 공식 경로로 연결하는 OTT형 허브 서비스.
디자인은 넷플릭스처럼, 백엔드는 검색 허브로 설계한다.

- **서비스 형태:** 검색·연결 허브 (B안 확정)
- **핵심 UX:** 모바일·태블릿·TV에서 동일한 콘텐츠 탐색 경험 / 리모컨(D-pad)·터치 동시 대응
- **절대 금지:** VPN 우회, 무단 미러링, 보호 스트림 재송출, DRM 우회

---

## 필수 문서 (반드시 읽고 시작)

1. `docs/research.md` — 플랫폼 검증, 기술 스택 검증, CPS 분석
2. `docs/plan.md` — Wave별 구현 계획, 코드 스니펫, 이밸류에이션 체크리스트
3. `docs/implementation_plan_original.md` — 원본 구현계획서 (정책/로드맵/리스크)

---

## 기술 스택

| 영역 | 스택 | 버전 |
|------|------|------|
| 프론트엔드 | Next.js (App Router) + TypeScript + Tailwind CSS | 14+ |
| 백엔드 | FastAPI + SQLAlchemy 2.0 (async) + Alembic | 0.100+ |
| DB | PostgreSQL (개발 시 SQLite 허용) | 15+ |
| 재생 | HLS.js (공공도메인 인앱 재생) | latest |
| 메타데이터 API | TMDb (작품 정보) + Watchmode (가용성) | - |
| 패키지 매니저 | npm (frontend) / pip (backend) | - |
| 컨테이너 | Docker Compose (개발 환경) | - |

---

## 디렉토리 구조

```
jh-free-ott-hub/
├── CLAUDE.md                    # 이 파일 (글로벌 지침)
├── docs/
│   ├── research.md              # 리서치 결과
│   ├── plan.md                  # 구현 계획
│   └── implementation_plan_original.md  # 원본 계획서
│
├── frontend/                    # Next.js 앱
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       # 루트 레이아웃 (다크 테마 기본)
│       │   ├── page.tsx         # 홈 (추천 캐러셀)
│       │   ├── browse/page.tsx  # 탐색 (필터 검색)
│       │   ├── content/[id]/page.tsx  # 상세
│       │   ├── player/[id]/page.tsx   # 인앱 플레이어
│       │   └── settings/page.tsx      # 설정
│       ├── components/
│       │   ├── ui/              # 공통 UI
│       │   ├── ContentCard.tsx  # 작품 카드 (포커스 대응)
│       │   ├── Carousel.tsx     # 가로 캐러셀
│       │   ├── FilterBar.tsx    # 필터 바
│       │   ├── SearchBar.tsx    # 검색 바
│       │   ├── Player.tsx       # HLS 플레이어
│       │   └── FocusManager.tsx # D-pad 포커스 관리
│       ├── hooks/
│       │   ├── useSearch.ts
│       │   ├── useFocus.ts
│       │   └── usePlayer.ts
│       ├── lib/
│       │   ├── api.ts           # FastAPI 클라이언트
│       │   └── constants.ts
│       └── types/
│           └── content.ts
│
├── backend/                     # FastAPI 앱
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/versions/
│   └── app/
│       ├── main.py              # 진입점
│       ├── core/
│       │   ├── config.py        # 환경 설정 (.env 로드)
│       │   ├── database.py      # async SQLAlchemy 연결
│       │   └── deps.py          # 의존성 주입
│       ├── api/routes/
│       │   ├── contents.py      # /api/contents
│       │   ├── search.py        # /api/search
│       │   ├── sources.py       # /api/sources
│       │   └── health.py        # /api/health
│       ├── models/
│       │   ├── content.py       # Content 모델
│       │   └── source.py        # Source 모델
│       ├── schemas/
│       │   ├── content.py       # Pydantic 스키마
│       │   └── source.py
│       ├── services/
│       │   ├── tmdb_service.py  # TMDb API 연동
│       │   ├── content_service.py
│       │   ├── search_service.py
│       │   └── link_checker.py
│       └── tasks/
│           ├── seed_data.py     # 시드 데이터 수집
│           └── verify_links.py  # 링크 검증 배치
│
├── docker-compose.yml
└── .env.example
```

---

## Wave별 실행 지침

### Wave 1 — 백엔드 기반 (병렬 가능)

```
순서:
1. backend/ 프로젝트 초기화 (FastAPI + SQLAlchemy 2.0 + Alembic)
2. Content, Source DB 모델 생성 + 마이그레이션
3. TMDb 서비스 구현 (영화 검색/상세)
4. 시드 데이터 스크립트 (공공도메인 영화 100개+ 수집)

검증:
- uvicorn app.main:app 실행 → /docs 접근 가능
- alembic upgrade head → 테이블 생성 확인
- seed_data.py 실행 → contents 테이블 100+ 레코드
```

### Wave 2 — 프론트엔드 기반 (Wave 1과 병렬 가능)

```
순서:
1. frontend/ 프로젝트 초기화 (Next.js 14 + Tailwind + TypeScript)
2. 홈 화면 (추천 캐러셀 + 카테고리별 가로 스크롤)
3. 탐색 화면 (장르/국가/자막/재생방식 필터 + 검색)
4. 상세 화면 (포스터, 시놉시스, 소스 목록, 재생/연결 버튼)

검증:
- npm run dev → localhost:3000 접근 가능
- 홈에서 카드 캐러셀 표시
- 필터 변경 시 결과 갱신
- 작품 클릭 → 상세 → 재생방식 분기
```

### Wave 3 — 통합 + 재생 (Wave 1, 2 완료 후)

```
순서:
1. 검색 API (Full-Text Search + 필터 조합)
2. HLS 플레이어 (공공도메인 인앱 직접 재생)
3. 외부 연결 (Tubi/Viki → 공식 URL 새 탭/앱 열기)
4. D-pad 포커스 매니저 (키보드 방향키 카드 탐색)

검증:
- /api/search?q=holiday&genre=드라마 → 정확한 결과
- Internet Archive 공공도메인 영화 1편 인앱 재생 성공
- 외부 링크 → 해당 플랫폼 상세 페이지 도달
- 방향키만으로 홈→카드→상세→뒤로 전체 플로우
```

### Wave 4 — 운영 도구 + 마무리 (Wave 3 완료 후)

```
순서:
1. 링크 검증 배치 (전체 소스 URL 상태 체크)
2. 설정 화면 (언어, 자막 기본값, 네트워크 품질)
3. Docker Compose (PostgreSQL + FastAPI + Next.js)
4. MVP 완료 기준 전수 검증

검증:
- 만료 URL 검색 결과에서 자동 제외
- 설정 변경 → 홈/상세 반영
- docker-compose up → 전체 서비스 실행
- MVP 6개 기준 전체 통과
```

---

## 콘텐츠 소스 정책 (절대 준수)

### 초기 연동 소스 3종

| 소스 | 역할 | watch_mode |
|------|------|-----------|
| Internet Archive | 공공도메인 직접 재생 | in_app |
| Tubi | 광고형 무료 플랫폼 외부 연결 | external |
| Rakuten Viki | 아시아 무료 플랫폼 외부 연결 | external |

### 직접재생 vs 외부연결 기준

- **in_app (직접재생):** 공공도메인, 권리 명확 오픈 아카이브, 자체 라이선스 콘텐츠만
- **external (외부연결):** Plex, Tubi, Viki, Kanopy 등 → 공식 상세 페이지 또는 공식 앱으로 이동
- **절대 금지:** 영상 스트림 주소 추출, DRM 우회, 계정 인증 필요 재생 URL 탈취

### 제외 대상

- Crunchyroll (2025-12-31 무료 폐지)
- VPN/프록시 우회 기능
- 보호된 스트림 무단 재송출

---

## DB 스키마

### contents 테이블

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| title | VARCHAR(500) | 표준 제목 |
| original_title | VARCHAR(500) | 원제 |
| year | INTEGER | 제작 연도 |
| country | VARCHAR[] | 제작/소스 국가 |
| genres | VARCHAR[] | 장르 태그 |
| synopsis | TEXT | 시놉시스 |
| poster_url | VARCHAR(1000) | 포스터 URL |
| tmdb_id | INTEGER (unique) | TMDb 연동 ID |
| audience | VARCHAR(50) | children / family / general |
| license_class | VARCHAR(50) | public_domain / institutional / ad_supported / unknown |
| created_at | TIMESTAMP | 등록일 |
| updated_at | TIMESTAMP | 수정일 |

### sources 테이블

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| content_id | UUID (FK) | → contents.id |
| source_name | VARCHAR(100) | Plex / Tubi / Viki / Internet Archive |
| watch_mode | VARCHAR(20) | in_app / external |
| external_url | VARCHAR(2000) | 외부 연결 URL |
| stream_url | VARCHAR(2000) | 직접 재생 URL |
| quality_hint | VARCHAR(20) | HD / SD / Unknown |
| subtitle_languages | VARCHAR[] | 자막 가능 언어 |
| availability_note | VARCHAR(500) | 재생 조건 요약 |
| region_hint | VARCHAR(50) | global / asia / region_limited |
| is_verified | BOOLEAN | 링크 검증 여부 |
| last_checked_at | TIMESTAMP | 마지막 검증 시각 |

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/health | 헬스체크 |
| GET | /api/contents | 전체 콘텐츠 목록 (페이지네이션) |
| GET | /api/contents/{id} | 콘텐츠 상세 (소스 포함) |
| GET | /api/search | 검색 (q, genre, country, subtitle_lang, watch_mode, sort_by, page) |
| GET | /api/sources/{content_id} | 특정 콘텐츠의 소스 목록 |
| POST | /api/admin/seed | 시드 데이터 수집 트리거 (관리자) |
| POST | /api/admin/verify-links | 링크 검증 배치 트리거 (관리자) |

---

## 환경 변수 (.env)

```
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/free_ott_hub

# TMDb API
TMDB_API_KEY=your_tmdb_api_key_here
TMDB_BASE_URL=https://api.themoviedb.org/3

# Watchmode API (2단계 이후)
WATCHMODE_API_KEY=your_watchmode_api_key_here

# App
APP_ENV=development
CORS_ORIGINS=http://localhost:3000
```

---

## 코딩 컨벤션

- **Python:** snake_case, Black 포매터, type hint 필수, unknown 타입 지양
- **TypeScript:** PascalCase(컴포넌트), camelCase(변수/함수), 경로는 kebab-case
- **커밋:** 한글 커밋 메시지 허용, Wave 번호 접두사 (예: `[Wave1] Content 모델 생성`)
- **레이어 패턴:** Route → Service → Model (백엔드) / Page → Component → Hook (프론트엔드)
- **에러 처리:** FastAPI HTTPException, Next.js error.tsx boundary

---

## MVP 완료 기준 (6개 항목 전수 통과 필요)

- [ ] 무료·합법 소스 3~5개 이상 연결
- [ ] 최소 100개 이상 작품 메타데이터 검색 가능
- [ ] 국가/장르/자막 필터 작동
- [ ] 공공도메인 작품 1개 이상 인앱 재생 성공
- [ ] 외부 플랫폼 작품 1개 이상 공식 링크/앱 연결 성공
- [ ] 모바일/데스크톱/TV 브라우저에서 기본 조작 가능

---

## 다중 에이전트 운용 (tmux 병렬 시)

| 에이전트 | 역할 | 수정 권한 |
|---------|------|----------|
| Agent 1 (RESEARCH) | 코드베이스 분석 | docs/research.md만 |
| Agent 2 (PLAN) | 계획 수립 | docs/plan.md만 |
| Agent 3 (FRONTEND) | 프론트엔드 구현 | frontend/ 전체 |
| Agent 4 (BACKEND) | 백엔드 구현 | backend/ 전체 |
| Agent 5 (QA) | 타입 체크·검증 | 코드 수정 금지 |

**규칙:** 하나의 파일은 하나의 에이전트만 수정한다.
