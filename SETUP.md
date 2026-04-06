# 설정 가이드

## 1. 의존성 설치

```bash
npm install
```

## 2. Supabase 설정

### 2-1. 프로젝트 생성
1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. Project URL과 anon key를 `.env.local`에 입력

### 2-2. DB 마이그레이션
Supabase Dashboard → SQL Editor에서 `supabase/migrations/001_initial.sql` 내용 실행

### 2-3. Google OAuth 설정
1. [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 클라이언트 ID 생성
2. 승인된 리디렉션 URI 추가:
   - `https://your-project-id.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Authentication → Providers → Google 활성화
   - Client ID, Client Secret 입력

### 2-4. Storage 버킷
Supabase Dashboard → Storage → `homework-images` 버킷 생성 (Public)
또는 SQL Editor에서 migration 파일의 Storage 섹션 실행

## 3. 환경변수 설정 (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 4. PWA 아이콘 생성

`public/icons/` 폴더에 아이콘 파일 추가:
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)

무료 PWA 아이콘 생성: [PWA Builder](https://www.pwabuilder.com/imageGenerator)

## 5. Vercel 배포

```bash
# Vercel CLI 사용
npx vercel

# 또는 GitHub 연결 후 자동 배포
```

Vercel 환경변수 설정 (Dashboard → Settings → Environment Variables):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_APP_URL` (배포된 Vercel URL)

## 6. 부모/자녀 계정 역할 변경

첫 로그인 시 기본 역할은 `child`입니다.
부모 계정으로 변경하려면 Supabase SQL Editor에서:

```sql
select set_user_role('user-uuid-here', 'parent');
```

또는 Dashboard → Table Editor → users 테이블에서 직접 수정

## 7. 자녀-부모 연결

자녀 계정에서 부모 ID를 입력하여 연결하거나
Supabase Dashboard에서 직접 `parent_id` 컬럼 설정

## 아이폰 홈화면 추가

Safari에서 앱 접속 → 공유 버튼 → 홈 화면에 추가
