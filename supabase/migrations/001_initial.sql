-- ============================================================
-- 1. 사용자 테이블
-- ============================================================
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  avatar_url  text,
  role        text not null default 'child' check (role in ('parent', 'child')),
  parent_id   uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- RLS 활성화
alter table public.users enable row level security;

-- 본인 프로필 읽기
create policy "users: read own" on public.users
  for select using (auth.uid() = id);

-- 부모는 자녀 프로필 읽기
create policy "users: parent reads children" on public.users
  for select using (
    auth.uid() = parent_id
  );

-- 본인 프로필 수정
create policy "users: update own" on public.users
  for update using (auth.uid() = id);

-- 신규 사용자 삽입 (OAuth 콜백에서)
create policy "users: insert own" on public.users
  for insert with check (auth.uid() = id);

-- ============================================================
-- 2. 숙제 테이블
-- ============================================================
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  subject     text not null,
  due_date    date not null,
  description text not null default '',
  image_url   text,
  status      text not null default 'pending' check (status in ('pending', 'done')),
  created_at  timestamptz not null default now()
);

-- 인덱스
create index if not exists assignments_user_id_idx on public.assignments(user_id);
create index if not exists assignments_due_date_idx on public.assignments(due_date);

-- RLS 활성화
alter table public.assignments enable row level security;

-- 본인 숙제 CRUD
create policy "assignments: read own" on public.assignments
  for select using (auth.uid() = user_id);

create policy "assignments: insert own" on public.assignments
  for insert with check (auth.uid() = user_id);

create policy "assignments: update own" on public.assignments
  for update using (auth.uid() = user_id);

create policy "assignments: delete own" on public.assignments
  for delete using (auth.uid() = user_id);

-- 부모는 자녀 숙제 읽기
create policy "assignments: parent reads children" on public.assignments
  for select using (
    exists (
      select 1 from public.users
      where id = assignments.user_id
        and parent_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Storage 버킷 설정 (Supabase Dashboard에서도 설정 필요)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('homework-images', 'homework-images', true)
on conflict (id) do nothing;

-- 본인 폴더에만 업로드 허용
create policy "storage: upload own folder" on storage.objects
  for insert with check (
    bucket_id = 'homework-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 공개 읽기
create policy "storage: public read" on storage.objects
  for select using (bucket_id = 'homework-images');

-- ============================================================
-- 4. 자녀 연결 함수 (부모 ID로 연결)
-- ============================================================
create or replace function public.link_child_to_parent(p_parent_id uuid)
returns void
language plpgsql security definer
as $$
begin
  update public.users
  set parent_id = p_parent_id
  where id = auth.uid()
    and role = 'child'
    and parent_id is null;
end;
$$;

-- ============================================================
-- 5. 역할 변경 함수 (관리자용)
-- ============================================================
create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer
as $$
begin
  if p_role not in ('parent', 'child') then
    raise exception 'Invalid role';
  end if;
  update public.users set role = p_role where id = p_user_id;
end;
$$;
