# API Contract — Ranking

프론트(`frontend/js/api/speedrun-ranking.js`)와 백엔드(`backend/`)가 합의한 계약입니다.
엔딩별(5종) 스피드런 랭킹 — 전체 플레이어가 공유하는 서버 저장 리더보드입니다.

## POST /api/rankings

기록 1건을 등록합니다.

**Request body**

```json
{
  "nickname": "신이현",
  "endingId": "ending1",
  "clearTimeMs": 625000
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `nickname` | string, 1~12자 | 플레이어 닉네임 |
| `endingId` | string | `ending1`~`ending5` 중 하나 (True/Bad/Bad/Hidden/Secret — [endings.js](../frontend/js/data/endings.js) 참고) |
| `clearTimeMs` | long, 0 이상 | 클리어까지 걸린 시간(밀리초) |

**Response** — `201 Created`

```json
{ "nickname": "신이현", "clearTimeMs": 625000, "rank": 3, "saved": true }
```

`rank`는 해당 엔딩에서의 전체 순위, `saved`는 상위 10위 안에 들었는지 여부입니다
(10위 밖이어도 기록 자체는 서버에 남습니다 — `GET`에서만 상위 10개로 제한).

**검증 실패 시** — `400 Bad Request`, `{ "message": "필드: 사유" }`

## GET /api/rankings/{endingId}

해당 엔딩의 상위 10개 기록을 반환합니다. **서버에서 정렬해서 내려줍니다** —
`clearTimeMs` 오름차순 (프론트는 재정렬하지 않고 그대로 표시).

**Response** — `200 OK`

```json
[
  { "nickname": "신이현", "clearTimeMs": 625000 },
  { "nickname": "최지훈", "clearTimeMs": 701000 }
]
```

존재하지 않는 `endingId`나 아직 기록이 없는 엔딩은 빈 배열을 반환합니다.

## 배포 연결

프론트는 `window.SIXPM_API_BASE_URL`(배포된 Render 주소)로 이 API를 호출합니다.
배포 아키텍처(백엔드는 Render, 프론트는 Vercel — 서로 다른 오리진)와 CORS 설정 방법은
[deployment.md](./deployment.md) 참고.
