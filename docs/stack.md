# Next.js + MongoDB Atlas 개발 기준

서비스가 바뀌어도 Next.js App Router·React·TypeScript·MongoDB Atlas 조합을 기본으로 사용한다.
이 레포는 개발 규칙이며 패키지·앱·Atlas 리소스를 생성하지 않는다.

## 기능 중심 구조
```text
src/
  app/                 # 페이지 진입·레이아웃·API 요청 경계·기능 조립
  features/<feature>/  # 해당 기능의 UI·모델·서버 처리
  shared/
    lib/db/            # 서버의 Atlas 연결 관리
    components/        # 실제로 공유하는 UI
    ...                # 필요한 공통 코드만 추가
```
작은 기능은 파일부터 만들고 필요할 때 폴더로 나눈다. ui/model/api 등의 빈 계층을 강제하지 않는다.
순수 모델은 입력으로 필요한 값을 받고 계산·변환한다. store·서버 처리·API가 상태와 I/O를 연결한다.
공통 코드에서 기능 코드를 가져오지 않는다. 여러 기능의 조립은 앱 진입점이 맡는다.
기존 프로젝트는 현재 경계를 존중하고 기능 단위로 점진적으로 맞춘다.

## 서버와 클라이언트
- 서버 컴포넌트·Route Handler·서버 전용 기능 코드에서 DB에 접근한다.
- 클라이언트 컴포넌트는 사용자 상호작용을 맡고, 서버 경계를 통해 데이터를 요청한다.
- MongoDB 모듈에 `import 'server-only'`를 사용해 클라이언트 반입을 막는다.
- Route Handler는 입력·응답을 처리하고, 커진 도메인 처리는 기능 안으로 옮긴다.

## Atlas 연결
- 서버 환경변수 `MONGODB_URI`, `MONGODB_DB`를 사용하고 실제 값은 `.env.local` 또는 배포 설정에 둔다.
- 코드 저장소의 `.env.example`에는 변수명과 자리표시자만 둔다. `NEXT_PUBLIC_`으로 노출하지 않는다.
- 서버의 연결 모듈이 MongoClient와 연결 Promise를 재사용한다. 요청마다 새로 열고 닫지 않는다.
- 개발 HMR·동일한 서버 인스턴스의 재사용을 고려한다. 서로 다른 인스턴스는 캐시를 공유하지 않는다.
- 연결 실패 시 캐시를 복구해 다음 요청에서 재시도할 수 있게 한다.
- 환경변수 검사·실제 연결은 DB 사용 시점에 수행하고 import만으로 외부 접속을 시작하지 않는다.
- 연결 풀·타임아웃 값은 서비스 조건에 맞춘다. Manna의 특정 값·DB 이름을 고정하지 않는다.

설정·연결 모듈·주요 DB 함수에도 [파일·함수 JSDoc](jsdoc.md)을 작성한다.
근거: [Next.js 서버·클라이언트 경계](https://nextjs.org/docs/app/getting-started/server-and-client-components), [MongoClient 재사용](https://www.mongodb.com/docs/drivers/node/current/connect/mongoclient/).
