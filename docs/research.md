# Research: 무료 영화·애니 검색형 OTT 허브

## 0. CPS (Context-Problem-Solution)

### Context (맥락)
- 재하님은 전 세계 무료·합법 영화/애니메이션을 한곳에서 검색할 수 있는 OTT형 허브 서비스를 구상 중이다.
- 이미 상세 구현계획서(docx)가 존재하며, 서비스 형태(검색·연결 허브), 기술 스택(Next.js + FastAPI), 화면 구조, 콘텐츠 정책이 정의되어 있다.
- 2026년 3월 기준, 무료 합법 스트리밍 플랫폼은 Plex·Tubi·Pluto TV·Viki·Internet Archive·Kanopy 등이 활발하게 운영 중이다.
- **Crunchyroll은 2025년 12월 31일부로 무료 티어를 폐지**했으므로 초기 소스에서 제외해야 한다.

### Problem (문제)
- 구현계획서는 방향성·정책·로드맵이 잘 정리되어 있으나, **실제 개발 착수를 위한 구체적 기술 설계**(DB 스키마, API 엔드포인트, 프로젝트 구조, 디렉토리 레이아웃)가 아직 없다.
- 대부분의 무료 플랫폼이 **공식 API를 제공하지 않아**, 메타데이터 수집 전략이 불확실하다.
- PWA가 스마트 TV에서 **설치 불가**한 제약이 있어, TV 대응 전략이 보완 필요하다.
- 콘텐츠 소스별 이용약관 검토, 직접재생/외부연결 경계가 정책 레벨에서만 정의되어 있고, 기술 레벨 분리가 아직 없다.

### Solution (솔루션 방향)
- 구현계획서의 B안(검색·연결 허브) 방향을 확정하고, **0단계(정책 확정) + 1단계(데이터 MVP)** 에 집중하는 기술 설계를 만든다.
- 메타데이터는 TMDb/OMDb/Watchmode 등 **서드파티 메타데이터 API**를 1차 소스로 활용하고, 플랫폼별 가용성 정보를 태깅한다.
- TV 대응은 PWA 웹 우선 + Android TV 네이티브 앱은 2단계로 분리한다.
- 성공 기준: **100개 이상 작품 검색 가능, 인앱 재생 1건 + 외부 연결 2건 성공, 모바일/데스크톱/TV 브라우저 기본 조작 가능**.

---

## 1. 분석 대상 및 작동 원리

### 1-1. 구현계획서 문서 구조 분석

구현계획서는 10개 섹션 + 부록 2개로 구성되어 있으며, 다음을 포괄한다:

| 섹션 | 핵심 내용 | 기술 설계 포함 여부 |
|------|----------|-------------------|
| 1. 목표와 설계 원칙 | 합법성 원칙, 서비스 형태 비교(A/B/C) | 정책 수준 ✅ |
| 2. 권장 서비스 구조 | 직접재생/연결/관리 3층 구조, 소스 분류 정책 | 정책 수준 ✅ |
| 3. OTT형 화면 설계 | 정보구조, 리모컨+터치 동시 대응, 디자인 레퍼런스 | UI 방향 ✅ |
| 4. 시스템 아키텍처 | Next.js + FastAPI + PostgreSQL, 구조 흐름 | 스택 선정 ✅, 상세설계 ❌ |
| 5. 콘텐츠 수집·정규화 | 데이터 스키마 9개 필드, 운영 태그 5종, 수집 우선순위 | 스키마 초안 ✅, 구현 ❌ |
| 6. 재생·자막·화질 전략 | 재생 정책, 자막 전략(4가지), HLS 적응형 비트레이트 | 방향 ✅, 구현 ❌ |
| 7. 디바이스 연결·TV 시나리오 | 4가지 시나리오 우선순위, 입력 설계 체크리스트 | 기획 ✅ |
| 8. 개발 단계 로드맵 | 0~5단계, MVP 완료 기준 6개 | 로드맵 ✅ |
| 9. 운영·수익화·리스크 | 리스크 5개, 초기 수익화 방향 | 사업 전략 ✅ |
| 10. 실행 지시 | 축소 시작 원칙 | 실행 가이드 ✅ |

### 1-2. 데이터 흐름 (계획서 기준)

```
소스 수집기 (API/RSS/허용된 HTML 파서)
    ↓
메타데이터 정규화
    ↓
링크 검증 및 지역/언어 태깅
    ↓
콘텐츠 인덱스 저장 (PostgreSQL)
    ↓
사용자 검색/필터 응답 (FastAPI → Next.js)
    ↓
직접재생 (HLS.js) 또는 외부 공식 경로 연결 (딥링크/웹 열기)
```

---

## 2. 플랫폼별 현황 검증 (2026-03-28 기준)

### 2-1. 사용 가능한 무료 플랫폼

| 플랫폼 | 무료 콘텐츠 | 공식 API | 지역 | 콘텐츠 초점 | 비고 |
|--------|-----------|---------|------|-----------|------|
| **Plex** | ✅ 600+ 무료 채널 | ❌ 없음 | 미국 중심, 글로벌 일부 | 영화, TV, 라이브 | 광고 기반 |
| **Tubi** | ✅ 52,000+ 타이틀 | ❌ 없음 | 미국 중심, 영국 확장 | 영화, TV, 스포츠 | 광고 4-6분/시간 |
| **Pluto TV** | ✅ 400+ 채널 | ❌ 없음 | 미국 중심, 글로벌 확장 | 종합 엔터테인먼트 | 2026.11 일부 기기 지원 종료 |
| **Rakuten Viki** | ✅ 무료 티어 | ❌ 없음 | 글로벌 | 한국/중국/일본 드라마 | 커뮤니티 자막 200+언어 |
| **Internet Archive** | ✅ 공공도메인 | 부분적 | 글로벌 | 공공도메인 클래식 영화 | 직접 재생 가능 |
| **Kanopy** | ✅ 30,000편 | ❌ 없음 | 미국 중심 (도서관 연동) | 다큐, 인디, 클래식 | 도서관 카드 필요 |

### 2-2. 제외 대상

| 플랫폼 | 사유 |
|--------|------|
| **Crunchyroll** | 2025-12-31 무료 티어 폐지. 유료 전환 ($7.99~$15.99/월). 일부 에피소드만 YouTube에서 무료 |

### 2-3. 메타데이터 API 대안

대부분 플랫폼이 공식 API를 제공하지 않으므로, **서드파티 메타데이터 API**를 활용해야 한다:

| API | 용도 | 제한 | 비용 |
|-----|------|------|------|
| **TMDb** | 영화/TV 메타데이터, 포스터, 다국어 지원 | 40요청/10초 | 무료 (비상업적) |
| **OMDb** | 영화 기본 데이터, IMDb ID 기반 | 1,000요청/일 (무료) | 무료/유료 |
| **Watchmode** | 스트리밍 가용성(어디서 볼 수 있는지) | 티어별 상이 | 무료 티어 존재 |

**권장 전략:** TMDb로 작품 메타데이터(제목, 포스터, 시놉시스, 장르) 수집 → Watchmode로 플랫폼별 가용성 매핑 → 자체 DB에 watch_mode(in_app/external) 태깅

---

## 3. 기술 스택 검증

### 3-1. Next.js + FastAPI 스택

| 항목 | 검증 결과 |
|------|----------|
| **타입 안전성** | TypeScript(Next.js) + Pydantic(FastAPI)으로 E2E 타입 체인 가능 |
| **성능** | FastAPI 비동기 처리 3,000+ req/sec, Next.js SSR/ISR로 SEO + 빠른 초기 로드 |
| **인증** | fastapi-users 라이브러리로 인증 구현 가능 |
| **API 문서** | FastAPI 자동 OpenAPI 문서 생성 |
| **배포** | Vercel(Next.js) + Railway/Fly.io(FastAPI) 또는 Docker Compose |
| **검색** | 초기 PostgreSQL Full-Text Search → 규모 확장 시 Elasticsearch |

### 3-2. HLS 재생 (공공도메인 직접재생용)

| 도구 | 역할 |
|------|------|
| **HLS.js** | 웹 브라우저 HLS 재생, 적응형 비트레이트, MSE 기반 |
| **FFmpeg** | 원본 영상 → 다중 비트레이트 HLS 세그먼트 인코딩 |
| **Video.js** | 대안 플레이어 (HLS.js와 조합 가능) |

### 3-3. PWA + TV 대응

| 항목 | 현실 |
|------|------|
| **PWA on TV** | ⚠️ 스마트 TV에 PWA 설치 불가. 브라우저에서 웹앱 접근은 가능 |
| **Android TV** | 네이티브 앱으로만 D-pad 최적화 가능. Play Store 배포 필요 |
| **권장** | 1차: 반응형 웹(PWA) → 2차: Android TV Leanback 앱 |

---

## 4. 기존 레이어 및 아키텍처 구조 (신규 설계 필요)

현재 코드베이스가 없으므로, 구현계획서 기준으로 **권장 레이어 구조**를 도출한다:

### 프론트엔드 (Next.js)
```
src/
  app/              # App Router (홈, 탐색, 상세, 설정, 플레이어)
  components/       # UI 컴포넌트 (Card, Carousel, Filter, Player)
  hooks/            # 커스텀 훅 (useFocus, useSearch, usePlayer)
  lib/              # API 클라이언트, 유틸
  types/            # TypeScript 타입 정의
```

### 백엔드 (FastAPI)
```
app/
  api/
    routes/         # 엔드포인트 (contents, search, sources, health)
  core/             # 설정, DB 연결, 인증
  models/           # SQLAlchemy 모델
  schemas/          # Pydantic 스키마
  services/         # 비즈니스 로직 (수집, 검증, 검색)
  tasks/            # 백그라운드 작업 (링크 검증, 메타 수집)
```

---

## 5. 데이터베이스 및 ORM 관리 방식

### 5-1. 계획서 스키마 확장

계획서에서 정의한 9개 필드를 기반으로, 실제 구현에 필요한 확장 스키마:

**contents 테이블:**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| title | VARCHAR | 표준 제목 |
| original_title | VARCHAR | 원제 |
| year | INTEGER | 제작 연도 |
| country | VARCHAR[] | 제작/소스 국가 |
| genres | VARCHAR[] | 장르 태그 |
| synopsis | TEXT | 시놉시스 |
| poster_url | VARCHAR | 포스터 이미지 URL |
| tmdb_id | INTEGER | TMDb 연동 ID |
| audience | VARCHAR | 관람등급 (어린이/가족/일반) |
| license_class | VARCHAR | public_domain / institutional / ad_supported / unknown |
| created_at | TIMESTAMP | 등록일 |
| updated_at | TIMESTAMP | 수정일 |

**sources 테이블 (콘텐츠-소스 N:M):**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| content_id | UUID | FK → contents |
| source_name | VARCHAR | Plex / Viki / Internet Archive 등 |
| watch_mode | VARCHAR | in_app / external |
| external_url | VARCHAR | 외부 연결 URL |
| stream_url | VARCHAR | 직접 재생 URL (인앱 전용) |
| quality_hint | VARCHAR | HD / SD / Unknown |
| subtitle_languages | VARCHAR[] | 자막 가능 언어 |
| availability_note | VARCHAR | 재생 조건 요약 |
| region_hint | VARCHAR | global / asia / region_limited 등 |
| is_verified | BOOLEAN | 링크 검증 여부 |
| last_checked_at | TIMESTAMP | 마지막 검증 시각 |

### 5-2. ORM/마이그레이션

- **ORM:** SQLAlchemy 2.0 (async 지원)
- **마이그레이션:** Alembic
- **초기 DB:** PostgreSQL (개발 시 SQLite도 허용)

---

## 6. 중복 체크 결과

- 신규 프로젝트이므로 기존 코드와의 중복은 없음.
- 다만, TMDb/OMDb 클라이언트는 오픈소스 래퍼가 다수 존재하므로 직접 구현 대신 기존 라이브러리 활용 검토:
  - Python: `tmdbv3api`, `omdb`
  - 또는 FastAPI 서비스 레이어에서 httpx로 직접 호출

---

## 결론

1. **구현계획서는 사업/정책/UX 방향이 잘 잡혀 있다.** 부족한 부분은 "기술 상세 설계"이며, plan.md에서 이를 채워야 한다.

2. **Crunchyroll 무료 티어 폐지**는 반드시 반영해야 하며, 초기 소스 3종은 **Internet Archive(직접재생) + Tubi(외부연결) + Rakuten Viki(외부연결, 아시아)**가 적합하다.

3. **메타데이터 수집은 TMDb + Watchmode API** 조합이 현실적이다. 플랫폼 직접 API가 없으므로 서드파티 의존은 불가피하다.

4. **PWA의 TV 설치 불가** 제약을 인지하고, 1차는 TV 브라우저 웹앱으로 대응한다.

5. **MVP 범위는 계획서의 0~2단계(정책 확정 + 데이터 MVP + UX MVP)**에 집중하되, 재생 연결(3단계)의 최소 동작까지 포함한다.
