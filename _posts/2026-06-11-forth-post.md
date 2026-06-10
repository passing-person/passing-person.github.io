---

title: 전투 콘텐츠, 사운드, 이벤트 구조 업데이트
date: 2026-06-11 00:50:00 +0900
categories: [Devlog]
tags: [unity, card-game, combat, audio, event-system, prototype]
description: 카드 게임 프로토타입에 신규 적 세트, 상태이상 판정 보정, SO 기반 오디오 시스템, 이벤트 결과 흐름을 추가했다.
---

# 전투 콘텐츠, 사운드, 이벤트 구조 업데이트

오늘은 전투 콘텐츠 확장, 상태이상 판정 정리, 사운드 시스템 추가, 이벤트 구조 보강을 진행했다.

이번 작업의 핵심은 다음 네 가지다.

```text
1. 신규 적과 관련 전투 콘텐츠 추가
2. MultiHit / 상태이상 / 피해 표기 판정 정리
3. SO 기반 오디오 시스템과 BGM 그룹 추가
4. 신규 적과 연결되는 이벤트 구조 추가
```

---

## 신규 적 세트 추가

이번에 추가한 적은 다음 세 종류다.

```text
고블린 투척병
늑대
독 슬라임
```

각 적은 단순히 적 데이터만 추가한 것이 아니라, 전투 역할에 맞는 카드와 상태이상 구조까지 함께 구성했다.

---

## 고블린 투척병

고블린 투척병은 원거리 압박형 적이다.

전투 역할은 다음과 같다.

```text
멀리서 공격
거리 유지
플레이어의 접근 카드 요구
```

기존 고블린이 기본 공격 확인용 적에 가까웠다면, 고블린 투척병은 플레이어가 이동과 거리 조절을 고려하도록 만드는 역할이다.

관련 카드 방향은 다음과 같다.

```text
원거리 투척 공격
후퇴 후 공격
접근 방해형 공격
```

---

## 늑대

늑대는 빠른 접근형 적이다.

전투 역할은 다음과 같다.

```text
빠른 전진
근접 압박
MultiHit 공격
출혈 부여
```

늑대 세트는 이동 후 공격과 연속 공격을 중심으로 구성했다.

주요 카드 방향은 다음과 같다.

```text
Pounce
- 앞으로 이동

Bite
- 근접 공격

Frenzy Bite
- 근접 MultiHit 공격
```

늑대는 출혈 상태이상과 같이 사용할 수 있도록 구성했다.

---

## 독 슬라임

독 슬라임은 지속 피해형 적이다.

전투 역할은 다음과 같다.

```text
Poison 부여
지속 피해 압박
장기전 손실 유도
상태이상 power 검증
```

주요 카드 방향은 없지만 모든 카드에 독을 부여하도록 설계되어 있다.

독 슬라임은 power 기반 상태이상 구조를 실제 전투에서 검증하기 위한 적이다.

---

# 상태이상 판정 정리

이번 작업에서는 상태이상 부여와 피해 표기 구조도 정리했다.

특히 MultiHit과 OnHit 상태이상 부여가 결합될 때, 같은 카드 안에서 후속 타격의 피해가 의도치 않게 증가하는 문제가 생길 수 있었다.

이를 막기 위해 MultiHit 중 OnHit 상태이상 부여는 즉시 적용하지 않고, 카드의 모든 타격이 끝난 뒤 적용하도록 정리했다.

현재 정책은 다음과 같다.

```text
1. MultiHit의 각 타격 피해를 먼저 처리한다.
2. MultiHit 중 OnHit ApplyStatus는 즉시 적용하지 않는다.
3. 각 hit마다 상태이상 부여를 pending queue에 저장한다.
4. 모든 hit가 끝난 뒤 저장된 횟수만큼 상태이상을 순서대로 적용한다.
```

이 구조에서는 MultiHit 카드가 출혈을 부여하더라도, 같은 카드의 후속 타격이 즉시 출혈의 피해 증가를 받지 않는다.

대신 상태이상 부여 횟수는 유지된다.

예를 들어 2타 MultiHit 카드가 타격마다 출혈을 부여한다면 다음과 같이 처리된다.

```text
1타 피해 처리
→ 출혈 부여 예약 1회

2타 피해 처리
→ 출혈 부여 예약 1회

카드 종료 후
→ 출혈 2회 적용
```

---

## 상태이상 중첩 규칙 확장

상태이상 중첩 규칙도 세분화했다.

기존에는 Additive와 Refresh 중심이었지만, 상태이상마다 duration과 power의 누적 방식이 다르기 때문에 추가 규칙이 필요했다.

현재 중첩 규칙은 다음과 같다.

```text
Additive
- duration += duration
- power += power

RefreshLonger
- duration = max
- power = stronger

AddDurationRefreshPower
- duration += duration
- power = stronger

RefreshDurationAddPower
- duration = max
- power += power
```

적용 기준은 다음과 같다.

```text
출혈
- Additive
- duration 누적
- power 누적

화상
- AddDurationRefreshPower
- duration 누적
- power는 더 강한 쪽 유지

일부 스택형 강화 / 약화
- RefreshDurationAddPower
- duration은 갱신
- power만 누적

일반 갱신형 버프 / 디버프
- RefreshLonger
- duration과 power 모두 강한 쪽 유지
```

---

## 피해 표기 방식 변경

전투는 1대1 구조이므로, 카드 피해 표기에는 상대 상태이상에 의한 받는 피해 증가 / 감소도 포함하도록 수정했다.

예를 들어 다음 상황이 있다.

```text
기본 피해: 15 x 2
상대 출혈: 받는 피해 +10
```

기존 표기는 다음과 같았다.

```text
30
```

수정 후 표기는 다음과 같다.

```text
50
```

계산 기준은 다음과 같다.

```text
표기 피해 = 공격자 기준 피해 + 상대 받는 피해 modifier
실제 피해 = 표기 피해에서 Guard 등 방어 자원 처리
```

Guard는 피해 표기에 포함하지 않는다.
Guard는 피해 수치 자체가 아니라 방어 자원으로 처리한다.

---

# 설명 placeholder 보강

카드와 인챈트 설명에 사용하는 placeholder도 일부 보강했다.

특히 상태이상 부여 인챈트에서 placeholder가 그대로 노출되는 문제가 있어서, 상태이상 관련 placeholder를 추가했다.

추가한 주요 placeholder는 다음과 같다.

```text
{Status}
{StatusName}
{AppliedStatus}
{StatusDuration}
{Duration}
{StatusPower}
{StatusPowerRaw}
{Power}
{PowerRaw}
{StatusDurationModifier}
{StatusPowerModifier}
{PowerModifier}
{ResourceCost}
{ResourceName}
```

또한 이동 설명에서 후퇴 이동이 음수로 표시되는 문제를 피하기 위해 다음 placeholder를 추가했다.

```text
{MoveAbs}
{MoveDirection}
{MoveText}
```

예시는 다음과 같다.

```text
{MoveText}한 뒤 공격한다.
```

출력 예시:

```text
뒤로 1칸 이동한 뒤 공격한다.
```

---

# SO 기반 오디오 시스템 추가

이번 작업에서는 사운드 재생 구조도 추가했다.

사운드는 중앙 매니저와 SO를 함께 사용하는 방식으로 구성했다.

추가된 핵심 구조는 다음과 같다.

```text
AudioCueSO
BgmCueSO
AudioLibrarySO
AudioManager
BgmPlayer
```

역할은 다음과 같다.

```text
AudioCueSO
- 효과음 1종 정의
- 여러 AudioClip 후보
- volume
- pitchRange
- randomizeClip

BgmCueSO
- BGM 1종 정의
- AudioClip
- volume
- loop

AudioLibrarySO
- 공통 UI / 전투 / 승패 사운드 모음

AudioManager
- 실제 재생 담당
- SFX / BGM 재생
- 씬 전환 시 BGM 자동 전환

BgmPlayer
- 특정 씬에서 BGM을 직접 재생할 수 있는 컴포넌트
```

---

## 사운드 적용 범위

사운드는 다음 영역에 연결했다.

```text
카드 사용
공격 명중
이동
Guard 획득
상태이상 부여
상태이상 tick
전투 시작
승리
패배
버튼 클릭
팝업 열림 / 닫힘
```

카드 선택음이나 사용음은 즉발 효과음과 겹칠 수 있으므로, 실제 사용에서는 필요한 지점만 선택적으로 남기는 방향으로 정리했다.

---

## BGM 그룹 구성

BGM은 두 그룹으로 나눴다.

```text
Title / Main
Prepare / Combat
```

AudioLibrarySO에 다음 슬롯을 추가했다.

```text
titleMainBgm
prepareCombatBgm
```

씬 그룹은 다음처럼 동작한다.

```text
TitleScene
RunPrototypeScene
MainScene
→ titleMainBgm

PrepareScene
CombatScene
→ prepareCombatBgm
```

같은 그룹 안에서 씬이 바뀌면 BGM을 다시 시작하지 않는다.

예를 들어 다음 전환에서는 BGM이 유지된다.

```text
TitleScene → MainScene
PrepareScene → CombatScene
```

다른 그룹으로 이동할 때만 BGM이 전환된다.

```text
MainScene → PrepareScene
```

---

# 이벤트 구조 추가

신규 적과 연결되는 이벤트도 추가했다.

추가한 이벤트는 다음 세 개다.

```text
고블린 은닉처
사냥꾼의 흔적
독 웅덩이
```

이벤트는 기존 프로젝트의 이벤트 흐름에 맞춰 구성했다.

기존 형식은 선택지에서 곧바로 결과를 실행하지 않고, 중간 결과 EventSO로 이동한 뒤 단일 선택지를 통해 실제 결과를 실행하는 방식이다.

이번 이벤트도 같은 구조를 따른다.

```text
루트 EventSO
→ 선택지
→ 결과 설명용 EventSO
→ 단일 확인 선택지
→ Reward / Combat / None
```

# 현재 구현 상태

오늘 작업 후 구현 상태는 다음과 같다.

```text
고블린 투척병
- 전투 콘텐츠 완료
- 관련 이벤트 추가

늑대
- 전투 콘텐츠 완료
- 출혈 연계 완료
- 관련 이벤트 추가

독 슬라임
- 전투 콘텐츠 완료
- Poison 연계 완료
- 관련 이벤트 추가

상태이상 판정
- MultiHit 지연 적용
- 상태이상 중첩 규칙 확장
- 상대 상태이상 피해 표기 반영

오디오
- SO 기반 SFX 구조 추가
- BGM 그룹 추가
- Title/Main, Prepare/Combat BGM 연결

이벤트
- 선택지 → 결과 EventSO → 단일 선택지 → 실제 결과 구조 적용
```

---

# 다음 작업

다음 작업 후보는 다음과 같다.

```text
1. 생성된 이벤트의 보상 테이블 채우기
2. 방패 슬라임 SO 세트 제작
3. 해골 궁수 SO 세트 제작
4. 균열 골렘 SO 세트 제작
5. 상태이상 / 카드 / 인챈트 아이콘 규칙 정리
6. 사운드 볼륨 밸런스 조정
```

현재 전투 콘텐츠는 고블린 투척병, 늑대, 독 슬라임까지 확장되었다.
다음 단계에서는 방어형 적과 거리 유지형 적을 추가해 전투 패턴을 더 넓히는 것이 우선이다.

[게임 실행하기](/Game/ProjectEnchant/)