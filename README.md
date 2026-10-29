# Lean Doc Harness

**Next.js + MongoDB Atlas 서비스를 위한, Manna 방식의 문서·JSDoc 하네스.**
메타 정보는 `.md`에서, 코드에 밀접한 설명은 파일·함수의 JSDoc에서 관리합니다.
실행 앱이나 서비스 기능을 포함하지 않고 개발에 적용할 문서·규칙·갱신 훅을 제공합니다.

## 세 곳의 설명이 이어집니다

| 위치 | 역할 | 내용 |
| --- | --- | --- |
| `.md` | 프로젝트와 기능의 지도 | 무엇을 왜 만드는지, 구조·판단 이유·개발 흐름 |
| 파일 상단 JSDoc | 해당 파일의 지도 | 역할·사용처·주요 함수와 exports |
| 주요 함수 JSDoc | 해당 동작의 설명 | 책임·입력·반환·실패·부작용 |

`.md`를 얇게 유지하되, 파일 안내와 주요 함수 설명은 기본으로 작성합니다.
파일에는 전체 역할을, 함수에는 구체적인 동작을 적으므로 같은 본문을 반복할 필요는 없습니다.

## 기본 개발 모델

- Next.js App Router + React + TypeScript를 사용합니다.
- MongoDB Atlas는 서버에서 MongoDB 드라이버로 접근합니다.
- 기능 구현은 `src/features/<feature>/`에 모읍니다.
- 작은 모델 함수는 계산·변환, 상위 코드와 API는 상태·I/O·기능 조립을 맡습니다.
- 상태·스타일 도구는 서비스에 맞게 선택합니다. 브랜치별 멀티 에이전트는 운영하지 않습니다.

## 필요한 문서만 읽습니다

| 파일 | 역할 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | 공통 작업 규칙 |
| [docs/project.md](docs/project.md) | 서비스 목적·범위·설계 판단을 채우는 양식 |
| [docs/stack.md](docs/stack.md) | Next.js·Atlas 경계와 기능 중심 구조 |
| [docs/jsdoc.md](docs/jsdoc.md) | Manna 방식 파일·함수 JSDoc 규칙과 완성 예시 |
| [기능 문서 양식](docs/features/_template.md) | 기능의 목적·협력 관계·완료 조건 |

공통 규칙은 `AGENTS.md` 하나가 원본이고 `CLAUDE.md`는 이를 가져옵니다.
일상 작업은 규칙 → 프로젝트 요약 → 관련 기능 문서 → 코드 순서입니다.
전체 문서를 매번 주입하거나 별도 memory-bank를 만들지 않습니다.

## 프로젝트에 적용

1. 기존 Next.js 프로젝트에 규칙·`docs/`·`scripts/review-docs.mjs`를 복사합니다.
2. `docs/project.md`를 채우고 필요한 기능 문서를 양식에서 만듭니다.
3. 파일 상단과 주요 함수에 [JSDoc 예시](docs/jsdoc.md)를 적용합니다.
4. 사용하는 도구의 훅 설정을 합칩니다. 기존 파일이 있으면 `hooks.Stop`만 추가합니다.
5. 타입·린트·필요한 테스트 후 코드와 설명을 함께 확인합니다.

점검 스크립트에는 Node.js 22 이상과 Git이 필요합니다. 새 Codex 훅은 신뢰 검토 후 사용합니다.
앱의 환경변수·연결 지침은 [스택 문서](docs/stack.md)를 따릅니다.

## 갱신 훅

종료 전에 관련 메타 문서·파일 안내·주요 함수 설명을 한 번 점검하도록 요청합니다.
직접 작성한 JS/TS와 `src/` 데이터의 staged·unstaged·새 파일·삭제·이동을 확인합니다.
기능 폴더와 이름이 같은 문서, 또는 변경 경로를 직접 언급한 기능 문서를 후보로 제시합니다.
기존 사용자 변경도 후보에 포함될 수 있어 에이전트는 이번 작업만 구분해 점검합니다.
`stop_hook_active`로 같은 종료 점검의 반복을 막습니다. 설명이 이미 맞으면 수정하지 않습니다.
훅은 직접 설명을 쓰거나 내용의 정확성을 판정하지 않습니다. 같은 에이전트가 코드와 대조합니다.

```sh
node scripts/review-docs.mjs --check  # 변경 파일·문서 후보 확인
node --test                        # 하네스 자체 검증
```

연결 규격: [Claude Code Hooks](https://code.claude.com/docs/en/hooks#stop), [Codex Hooks](https://learn.chatgpt.com/docs/hooks#stop), [Claude 문서 가져오기](https://code.claude.com/docs/en/memory#import-additional-files).
