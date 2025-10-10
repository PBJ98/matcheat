# MatchEats (웹 MVP)

Next.js(App Router) + NextAuth(Credentials) + Prisma + PostgreSQL

> **데모용**으로 간단한 로그인(이메일만 입력)과 추천/좋아요/매칭 플로우의 최소 구현을 포함합니다.

## 1) 준비물
- Node 18+
- PostgreSQL (권장: Neon 또는 Supabase)

## 2) 설정
```bash
cp .env.example .env
# .env 파일에 DB 연결 문자열(DATABASE_URL)과 NEXTAUTH_SECRET을 채워주세요.
```

## 3) 설치 & 마이그레이션 & 시드
```bash
npm install
npx prisma migrate dev --name init
npx prisma db seed
```

## 4) 개발 서버
```bash
npm run dev
```

- http://localhost:3000 접속
- **이메일만 입력**해서 로그인 → 온보딩 → 추천 목록 → 좋아요 → 매칭 생성

## 폴더 구조
- `app/` : Next.js App Router
- `app/api/` : API Routes
- `lib/` : 공용 라이브러리(auth, prisma)
- `prisma/` : Prisma 스키마 및 시드
