-- 생각 노트 실습용 스키마
-- 기준: .scratch/reflection-notebook/spec.md
-- 실제 학생 정보로 사용하지 마세요. anon은 모든 행을 읽고 수정할 수 있습니다.
-- 이 파일은 테이블을 생성할 뿐, 기존 Vercel/Neon 사이트의 저장소를 바꾸지 않습니다.
-- 기존 테이블은 유지하고 티켓 02의 새 컬럼만 없을 때 추가합니다.
begin;

create table if not exists public.lessons (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  title text not null check (char_length(title) between 1 and 100),
  password_hash text not null,
  password_salt text not null,
  questions jsonb not null default '["오늘 배운 내용을 자기 말로 설명해 보세요.","오늘 수업에서 재미있었거나 흥미로웠던 점에 대해 이야기해 주세요!","아직 헷갈리는 점은 무엇인가요?","선생님들에게 바라는 점이 있나요?"]'::jsonb
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = 4),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  lesson_code text not null references public.lessons(code) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  personal_pin text not null check (personal_pin ~ '^[0-9]{12}$'),
  created_at timestamptz not null default now(),
  unique (lesson_code, personal_pin)
);

-- 다시 제출할 때는 기존 행을 덮어쓰지 않고 새 차수의 행을 추가합니다.
create table if not exists public.revisions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  questions jsonb not null
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = 4),
  answers jsonb not null
    check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) = 4),
  feedback text not null default '' check (char_length(feedback) <= 3000),
  created_at timestamptz not null default now(),
  feedback_at timestamptz,
  unique (student_id, revision_number)
);

-- student_id가 null이면 선생님의 접속 기록입니다.
create table if not exists public.sessions (
  token uuid primary key default gen_random_uuid(),
  lesson_code text not null references public.lessons(code) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 티켓 02: 칭찬 스티커와 수업별 응원 한마디
alter table public.revisions
  add column if not exists sticker text default null
  check (sticker is null or sticker in ('star', 'clap', 'growth'));

alter table public.lessons
  add column if not exists encouragement text not null default ''
  check (char_length(encouragement) <= 120);

create index if not exists students_lesson_code_idx on public.students(lesson_code);
create index if not exists sessions_lesson_code_idx on public.sessions(lesson_code);
create index if not exists sessions_student_id_idx on public.sessions(student_id);

grant usage on schema public to anon;

-- PostgreSQL의 CREATE POLICY에는 IF NOT EXISTS 문법이 없습니다.
-- pg_policies를 조회해 없는 정책만 생성합니다.
do $policies$
declare
  table_name text;
begin
  foreach table_name in array array['lessons', 'students', 'revisions', 'sessions'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update on table public.%I to anon', table_name);
    -- DELETE와 TRUNCATE 권한은 부여하지 않고 기존 권한도 취소합니다.
    execute format('revoke delete, truncate on table public.%I from anon, authenticated, public', table_name);

    if not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = table_name and p.policyname = 'practice_anon_read') then
      execute format('create policy practice_anon_read on public.%I for select to anon using (true)', table_name);
    end if;
    if not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = table_name and p.policyname = 'practice_anon_insert') then
      execute format('create policy practice_anon_insert on public.%I for insert to anon with check (true)', table_name);
    end if;
    if not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = table_name and p.policyname = 'practice_anon_update') then
      execute format('create policy practice_anon_update on public.%I for update to anon using (true) with check (true)', table_name);
    end if;
    -- 다른 허용 정책이 있어도 이 제한 정책으로 일반 사용자의 삭제를 막습니다.
    if not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = table_name and p.policyname = 'practice_deny_delete') then
      execute format('create policy practice_deny_delete on public.%I as restrictive for delete to anon, authenticated using (false)', table_name);
    end if;
  end loop;
end;
$policies$;

-- Supabase SQL Editor와 service_role은 관리자 권한이므로 삭제할 수 있습니다.
-- 일반 사용자의 삭제를 막는 이번 실습 요구를 우선합니다.
commit;

