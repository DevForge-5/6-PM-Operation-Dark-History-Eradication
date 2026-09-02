# 6PM: 흑역사 소멸작전 — 선택 사운드 팩

첨부된 무료 사운드 팩을 풀어 게임에 필요한 파일만 골라 정리한 묶음입니다.
파일명은 코드에서 바로 용도를 알아볼 수 있도록 변경했습니다.

## 폴더 구성

- `bgm/`: 메인 화면·게임 플레이 배경음악
- `sfx/ui/`: 버튼, OPTION, ESC 메뉴
- `sfx/gameplay/`: 이동, 문, 상자, 기계, 착지
- `sfx/events/`: QTE, 경고, 피격, CRINGE, 보스, 결과
- `licenses/`: 원본 팩의 라이선스와 안내문

## 권장 연결표

| 게임 상황 | 파일 |
|---|---|
| 메인 화면 | `bgm/menu_biohazard.ogg` |
| 탐색/플레이 | `bgm/gameplay_wasteland_loop.ogg` |
| 버튼에 마우스 올리기 | `sfx/ui/button_hover.ogg` |
| 일반 버튼 클릭 | `sfx/ui/button_click.ogg` |
| START | `sfx/ui/start_game.ogg` |
| OPTION 열기 | `sfx/ui/option_open.ogg` |
| OPTION/창 닫기 | `sfx/ui/window_close.ogg` |
| ESC 메뉴 열기 | `sfx/ui/pause_open.ogg` |
| 재개 | `sfx/ui/resume_game.ogg` |
| 홈으로 | `sfx/ui/go_home.ogg` |
| 멈추기 체크 | `sfx/ui/pause_checkbox.ogg` |
| 볼륨 + / - | `sfx/ui/volume_change.ogg` |
| 다시하기 | `sfx/ui/retry.ogg` |
| 리더보드 열기 | `sfx/ui/leaderboard_open.ogg` |
| 교실/복도 발걸음 | `sfx/gameplay/footstep_concrete_01~05.ogg` 중 무작위 |
| 계단 발걸음 | `sfx/gameplay/footstep_stairs.ogg` |
| 문 열기 | `sfx/gameplay/door_open.ogg` |
| 아이템/상자 열기 | `sfx/gameplay/item_box_open.ogg` |
| 기계/서버 작동 | `sfx/gameplay/machine_cogs.ogg` |
| 착지/충돌 | `sfx/gameplay/landing.ogg` |
| QTE 시작 | `sfx/events/qte_start.ogg` |
| QTE 성공 | `sfx/events/qte_success.ogg` |
| QTE 실패 | `sfx/events/qte_fail.ogg` |
| 위험 경고 | `sfx/events/warning.ogg` |
| CRINGE 상승 | `sfx/events/cringe_up.ogg` |
| 피격 | `sfx/events/damage.ogg` |
| 보스 등장 | `sfx/events/boss_appear.ogg` |
| 화면 오류/왜곡 | `sfx/events/screen_glitch.ogg` |
| 게임 오버 | `sfx/events/game_over.ogg` |
| 클리어 | `sfx/events/mission_clear.ogg` |

## 구현 팁

- 발걸음 5개는 순서대로 반복하지 말고 무작위로 재생하면 자연스럽습니다.
- 배경음악 두 파일은 `loop = true`, UI·이벤트 효과음은 `loop = false`로 사용하세요.
- `gameplay_wasteland_loop.ogg`는 파일명대로 반복 재생용입니다.
- 효과음과 배경음악 볼륨은 OPTION의 두 설정값에 각각 연결하세요.
- 같은 효과음이 매우 빠르게 겹치지 않도록 30~80ms 정도의 재생 제한을 두면 소리가 깨지는 현상을 줄일 수 있습니다.

## 라이선스

첨부된 원본 자료에서 CC0로 제공된 파일을 선별했습니다. 원본 팩의 라이선스/안내문은 `licenses/`에 함께 보관했습니다.
