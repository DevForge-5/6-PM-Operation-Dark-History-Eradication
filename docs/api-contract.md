# API Contract — Ranking

프론트(`frontend/js/api/ranking-service.js`)와 백엔드(`backend/`)가 합의한 계약입니다.
필드명은 양쪽 다 camelCase 그대로 사용합니다 (서버 DTO가 프론트 JSON과 1:1 매칭).

## POST /api/rank

기록 1건을 등록합니다.

**Request body**

```json
{
  "nickname": "신이현",
  "clearTimeMinutes": 1025,
  "cringe": 10,
  "endingType": "True"
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `nickname` | string, 1~12자 | 플레이어 닉네임 |
| `clearTimeMinutes` | int, 0 이상 | 엔딩 도달 시각 (17:00 = 1020, 18:00 = 1080분 기준, 자정 넘김 없음) |
| `cringe` | int, 0~100 | 엔딩 시점 Cringe 수치 |
| `endingType` | string | `True` / `Bad` / `Hidden` / `Secret` |

**Response** — `201 Created`, 저장된 항목을 그대로 반환.

**검증 실패 시** — `400 Bad Request`, `{ "message": "필드: 사유" }`

## GET /api/ranks

상위 5개 기록을 반환합니다. **서버에서 정렬해서 내려줍니다** —
`clearTimeMinutes` 오름차순, 동률이면 `cringe` 오름차순 (프론트는 재정렬하지 않고 그대로 표시).

**Response** — `200 OK`

```json
[
  { "nickname": "신이현", "clearTimeMinutes": 1025, "cringe": 10, "endingType": "True" },
  { "nickname": "최지훈", "clearTimeMinutes": 1080, "cringe": 88, "endingType": "Bad" }
]
```

## 전환 방법

지금 프론트는 `frontend/js/api/mock-rankings.js`로 목데이터를 쓰고 있습니다.
백엔드 배포가 끝나면 `frontend/js/api/ranking-service.js`의 `USE_MOCK`을 `false`로
바꾸기만 하면 실제 API를 호출합니다 (fetch 대상 경로: 프론트와 백엔드가 같은 오리진에서
서빙되거나, 배포 시 API 베이스 URL을 프록시/환경변수로 맞춰야 함 — 아직 미정).
