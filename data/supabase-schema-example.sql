-- 예시: 가상의 가람중학교 예시 PRD(PRD-backup.md) 기준의 테이블입니다. 참고·백업용입니다.
-- 내 PRD로 진행한 학생은 내 spec.md로 Codex가 만든 SQL을 씁니다(supabase-snippet.md 1단계).
-- 이 파일을 쓸 때: Supabase 대시보드 → SQL Editor → New query에 전체를 붙여 넣고 Run을 누릅니다.

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  questions jsonb not null default '[]',   -- 질문 최대 3개 (문자열 목록)
  link text,                               -- 참고 링크 (예: 발표 자료 주소)
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) on delete cascade,
  student_name text not null,              -- 가명·별명만
  answers jsonb not null default '[]',     -- [{ "q": 질문, "a": 답 }]
  difficulty text,                         -- 어려웠던 점 한 줄
  feedback_good text,                      -- 잘한 점
  feedback_next text,                      -- 다음 걸음
  feedback_at timestamptz,                 -- 선생님이 확정해 보낸 시각
  read_at timestamptz,                     -- 학생이 피드백을 연 시각
  reaction text,                           -- 이모지 반응
  reply text,                              -- 학생 답글 한 줄
  created_at timestamptz not null default now()
);

-- 보안 규칙(RLS): 실습용으로 익명 읽기·쓰기를 허용합니다.
-- 실제 학교 서비스라면 로그인을 붙이고 "학생은 자기 글만, 선생님은 전체"처럼 역할별 규칙을 써야 합니다.
alter table assignments enable row level security;
alter table submissions enable row level security;

create policy "practice read assignments" on assignments for select using (true);
create policy "practice write assignments" on assignments for insert with check (true);
create policy "practice read submissions" on submissions for select using (true);
create policy "practice write submissions" on submissions for insert with check (true);
create policy "practice update submissions" on submissions for update using (true) with check (true);
