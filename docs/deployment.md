# 배포 가이드 — 백엔드 (Render)

[render.yaml](../render.yaml)이 웹 서비스와 PostgreSQL DB를 한 번에 정의하는
Render Blueprint라, DB 계정을 따로 만들 필요 없이 Render 계정 하나로 끝납니다.

## 1. Render 계정 만들기

1. https://render.com 접속 → **Get Started** → GitHub 계정으로 가입/로그인
   (GitHub으로 가입하면 저장소 접근 권한을 바로 얻어서 다음 단계가 편합니다)
2. 이메일 인증까지 마칩니다.

## 2. 이 저장소를 Blueprint로 배포

1. Render 대시보드 → 우측 상단 **New +** → **Blueprint** 선택
2. **Connect GitHub** → `DevForge-5/6-PM-Operation-Dark-History-Eradication` 저장소 선택
   (처음이면 GitHub 쪽에서 Render 앱에 저장소 접근을 승인하는 팝업이 뜹니다 — 이 저장소만 선택해서 승인)
3. Render가 루트의 `render.yaml`을 자동으로 읽어서 다음 두 개를 보여줍니다.
   - `sixpm-db` — PostgreSQL (Free)
   - `sixpm-backend` — 웹 서비스 (`backend/Dockerfile` 기준)
4. Blueprint 이름을 확인하고 **Apply** 클릭
5. 빌드 로그가 뜨면서 DB 생성 → Docker 이미지 빌드 → 배포 순서로 진행됩니다 (첫 배포는 5~10분 정도 걸릴 수 있습니다).
6. 완료되면 `sixpm-backend` 서비스 페이지 상단에 URL이 보입니다
   (`https://sixpm-backend-XXXX.onrender.com` 형태). 이 URL을 복사해둡니다.

DB 연결 정보(`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`)는
`render.yaml`이 `fromDatabase`로 자동 연결하므로 **직접 입력할 게 없습니다.**

## 3. 배포 확인

브라우저나 터미널에서 방금 복사한 URL로 확인합니다.

```
curl https://sixpm-backend-XXXX.onrender.com/api/ranks
```

`[]` (빈 배열)이 나오면 DB 연결과 서버 기동이 정상입니다.

> Render 무료 플랜은 15분간 요청이 없으면 슬립 상태로 들어가고, 다음 요청이 오면
> 다시 깨어나는 데 30초~1분 정도 걸립니다. 대회 발표 직전에는 미리 한 번 요청을
> 보내서 깨워두는 걸 권장합니다.

## 4. 프론트엔드를 실제 백엔드에 연결

[frontend/index.html](../frontend/index.html)에 이미 `window.SIXPM_API_BASE_URL`이
Render 백엔드 주소로 설정돼 있고, [frontend/js/api/speedrun-ranking.js](../frontend/js/api/speedrun-ranking.js)가
그 주소로 `/api/rankings`를 호출합니다 (계약은 [api-contract.md](./api-contract.md) 참고).
백엔드 주소가 바뀌면 그 스크립트 한 줄만 갱신하면 됩니다.

Vercel에 프론트를 배포하고 나온 도메인(예: `https://sixpm.vercel.app`)이 확정되면,
Render 대시보드 → `sixpm-backend` 서비스 → **Environment** 탭 →
`CORS_ALLOWED_ORIGINS` 값에 그 도메인을 입력하고 저장합니다
(여러 개면 콤마로 구분, 예: `https://sixpm.vercel.app,http://localhost:5173`).
저장하면 서비스가 자동 재배포됩니다.

## 5. 제출 어뷰징 방지

`POST /api/rank`는 같은 클라이언트(IP 기준)로부터 5초 이내 재요청이 오면 `429 Too Many Requests`를
반환합니다 ([RateLimitInterceptor](../backend/src/main/java/com/devforge/sixpm/common/RateLimitInterceptor.java)).
단일 인스턴스 메모리 기반이라 재배포하면 초기화되고, 인스턴스를 여러 개 띄우면 인스턴스별로 따로 카운트됩니다 —
지금 규모(대회 제출용 단일 인스턴스)에서는 충분하지만, 나중에 인스턴스를 늘릴 계획이면 Redis 등 공유 저장소로
옮겨야 합니다. Render 대시보드에서 `RATE_LIMIT_ENABLED=false` 환경변수를 추가하면 끌 수 있습니다.

## 참고 — 무료 플랜 제약

- 웹 서비스: 15분 미사용 시 슬립, 월 750시간 무료
- PostgreSQL: 무료 인스턴스는 **생성 후 90일 뒤 만료**됩니다. 대회 일정이 90일을 넘기면
  만료 전에 새 DB를 만들어 데이터를 옮기거나 유료 플랜으로 전환해야 합니다.
