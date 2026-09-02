# 6PM 백엔드

Spring Boot 3.3 (Java 21) + Gradle + MySQL. 랭킹 저장/조회 API 하나만 제공합니다.
계약은 [../docs/api-contract.md](../docs/api-contract.md) 참고.

## 로컬 실행

1. MySQL 준비 (없으면 `brew install mysql && brew services start mysql`)
   ```sql
   CREATE DATABASE sixpm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. 필요하면 접속 정보를 환경변수로 지정 (기본값: `root` / 빈 비밀번호 / `localhost:3306/sixpm`)
   ```
   DB_URL=jdbc:mysql://localhost:3306/sixpm?useSSL=false&serverTimezone=UTC&characterEncoding=UTF-8
   DB_USERNAME=root
   DB_PASSWORD=
   ```
3. 실행
   ```
   ./gradlew bootRun
   ```
   기본 포트 8080. `PORT` 환경변수로 변경 가능.

Java 21이 로컬에 없으면 Gradle이 [foojay 툴체인 리졸버](https://github.com/gradle/foojay-toolchains)로
자동 다운로드합니다 (최초 빌드 시 네트워크 필요).

## 테스트

```
./gradlew test
```

테스트는 실제 MySQL 없이 인메모리 H2로 돕니다 (`src/test/resources/application.yml`).

## 엔드포인트

- `POST /api/rank` — 기록 등록
- `GET /api/ranks` — 상위 5개 조회 (서버에서 정렬됨)

## CORS

`app.cors.allowed-origins` (기본: `http://localhost:4173,http://localhost:5173`)에
프론트 개발 서버 주소가 등록되어 있어야 합니다. 배포 도메인 추가 시
`CORS_ALLOWED_ORIGINS` 환경변수로 콤마 구분 덮어쓰기.
