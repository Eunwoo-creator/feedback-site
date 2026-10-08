# Supabase 연결 스니펫

> **키 경고**: 화면 파일(`index.html`)에는 **공개 키(anon 또는 Publishable) 하나만** 넣습니다. `service_role`(또는 Secret) 키와 DB 비밀번호는 어떤 경우에도 넣지 않습니다. 저장소가 공개라서 누구나 코드를 볼 수 있습니다.

## 1단계. 내 spec.md로 테이블 SQL 만들기

테이블 구조는 사람마다 다릅니다. 내 Spec에 적힌 데이터 구조가 곧 테이블입니다.

```
.scratch/feedback-site/spec.md를 먼저 읽어 줘.
Spec의 데이터 구조(저장하는 것들)를 Supabase 테이블로 만드는 SQL을 써 줘.
- 이미 있으면 다시 만들지 않도록 if not exists를 써 줘.
- 실습용이라 익명 사용자가 읽기·쓰기·수정을 할 수 있는 RLS 정책을 넣어 줘. 지우기는 막아 줘.
- SQL은 supabase/schema.sql 파일로 저장하고, 테이블과 컬럼을 표로 정리해서 보여 줘.
```

표를 내 spec.md와 나란히 보고, Spec에 있는 저장 항목이 모두 컬럼으로 들어갔는지 확인합니다.

> 예시 PRD(PRD-backup.md)로 이어 온 학생은 `supabase-schema-example.sql`을 그대로 써도 됩니다.

## 2단계. 대시보드에서 실행

1. Supabase 대시보드에서 미리 만든 프로젝트를 엽니다. 프로젝트가 멈춰 있으면(Paused) Restore를 누릅니다.
2. 왼쪽 메뉴 **SQL Editor** → **New query**에 `supabase/schema.sql` 내용을 전부 붙여 넣고 **Run**을 누릅니다.
3. 왼쪽 **Table Editor**에서 내 테이블과 컬럼이 1단계의 표와 같은지 봅니다.

## 3단계. 연결 정보 복사

**Project Settings → API**(또는 Data API)에서 두 값을 복사해 아래 칸에 적습니다.

| 이름 | 값 |
|---|---|
| Project URL | `https://__________.supabase.co` |
| 공개 키 (anon 또는 Publishable) | (긴 문자열) |

## 4단계. Codex에게 연결 부탁하기

```
index.html의 저장 방식을 브라우저 저장(localStorage)에서 Supabase로 바꿔 줘.
- 테이블은 방금 만든 supabase/schema.sql 그대로야.
- Project URL: (여기에 붙여 넣기)
- 공개 키: (여기에 붙여 넣기)
- supabase-js는 CDN 한 줄로 불러 줘. 빌드 도구는 쓰지 마.
- 저장하고 읽는 자리만 바꾸고, 화면과 기능은 그대로 둬.
- 끝나면 바뀐 곳을 표로 알려 주고, service_role 키 같은 비밀 키가 코드에 없는지 점검해 줘.
```

## 5단계. 내 PC에서 확인

1. 내 PC에서 화면을 열고, 선생님 화면에서 과제 하나를 올립니다.
2. 같은 브라우저의 **시크릿 창**으로 화면을 열고, 학생 화면에서 그 과제에 답을 제출합니다.
3. 원래 창의 선생님 화면을 새로고침해 시크릿 창에서 낸 글이 보이는지 봅니다.
4. Supabase **Table Editor**에 그 글이 한 줄 생겼는지 봅니다.
5. 브라우저를 새로고침해도 글이 그대로인지 봅니다.

배포 주소에 반영하는 일은 「재배포하기」에서 합니다.

> 이 실습의 보안 규칙은 "누구나 읽고 쓸 수 있음"입니다. 실제 학교 서비스라면 로그인을 붙이고 "학생은 자기 글만, 선생님은 전체"처럼 데이터베이스 규칙(RLS)을 따로 써야 합니다.
