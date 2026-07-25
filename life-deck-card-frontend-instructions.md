# 「7장의 동네」 카드형 성향 조사 프론트 구현 지시서

> 이 문서는 개발 에이전트에게 그대로 전달할 수 있는 구현 지시서다.  
> 목표는 기존 `동네탐색`, `AI 검색`, `LifeMatch`와 분리된 **카드 선택형 생활 성향 조사 프론트 프로토타입**을 만드는 것이다.

---

## 0. 가장 중요한 지시

1. 먼저 GitHub 저장소 `swleeSTrain/dive_2026`의 현재 프론트 구조와 아래 파일을 읽는다.
   - `client/src/styles/index.css`
   - `docs/STYLE_GUIDE.md`
   - `client/src/features/lifeMatch/model.ts`
   - `client/src/pages/LifeMatch.tsx`
2. 현재 운영 화면을 직접 수정하지 않는다.
   - `client/src/pages/LifeMatch.tsx` 교체 금지
   - 기존 추천 API, 인증, 지도, 정책 페이지 수정 금지
3. 별도 프로토타입으로 구현한다.
   - 권장 경로: `prototypes/life-deck/`
   - React + TypeScript + Vite 사용
   - 프로덕션 `client/`와 의존성 및 라우팅을 분리한다.
4. 이번 범위는 **카드 선택 경험과 성향 결과 화면까지만**이다.
   - 백엔드 호출 없음
   - 실제 공공임대주택 조회 없음
   - Kakao 지도 없음
   - Gemini/AI 호출 없음
5. 모든 질문과 결과는 로컬 데이터로 동작해야 한다.
6. 선택 결과는 마지막에 JSON 형태로 확인할 수 있어야 한다.
7. 모바일 390px와 데스크톱 1440px에서 모두 완성된 화면처럼 보여야 한다.
8. 참고용 시각 결과물은 다음 파일을 기준으로 한다.
   - `life-deck-card-demo.html`
   - `life-deck-card-preview.png`
   - `life-deck-card-mobile-preview.png`

---

# 1. 제품 콘셉트

## 이름

**7장의 동네**

## 핵심 문장

> 당신이 살고 싶은 집을 바로 묻지 않습니다.  
> 반복하고 싶은 하루를 고르면, 그 선택을 실제 생활권 데이터의 가중치로 번역합니다.

## 서비스 설명 문구

> 운세가 아니라, 말로 설명하기 어려운 생활 취향을 카페·상권·녹지·이동·주택 조건으로 변환하는 인터랙션입니다.

## 기존 기능과의 역할 구분

| 기능 | 사용자의 상태 | 역할 |
|---|---|---|
| 동네탐색 | 원하는 조건을 이미 알고 있음 | 조건을 직접 설정하고 검색 |
| AI 검색 | 원하는 조건을 문장으로 말할 수 있음 | 자연어를 검색 조건으로 변환 |
| 7장의 동네 | 무엇을 원하는지 아직 명확하지 않음 | 장면 선택으로 잠재 생활 성향 발견 |

카드 UI는 점술 서비스처럼 보이면 안 된다. **타로 카드의 선택·뒤집기·해석 경험만 차용한 데이터 기반 성향 조사**로 표현한다.

---

# 2. 산출물

다음 구조의 독립 프론트를 만든다.

```text
prototypes/life-deck/
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ index.html
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   ├─ styles.css
   ├─ types.ts
   ├─ data/
   │  ├─ questions.ts
   │  └─ archetypes.ts
   ├─ lib/
   │  └─ scoring.ts
   └─ components/
      ├─ IntroScreen.tsx
      ├─ ProgressHeader.tsx
      ├─ TarotCard.tsx
      ├─ QuestionScreen.tsx
      ├─ ResultScreen.tsx
      ├─ ArcanaCard.tsx
      ├─ AxisBars.tsx
      └─ PayloadDialog.tsx
```

실행 방법은 다음처럼 단순해야 한다.

```bash
cd prototypes/life-deck
bun install
bun run dev
```

`bun run build`도 오류 없이 완료돼야 한다.

---

# 3. 화면 흐름

상태는 세 단계만 사용한다.

```ts
type Stage = 'intro' | 'question' | 'result'
```

## 3.1 인트로

### 화면 구성

데스크톱에서는 좌우 2열로 구성한다.

- 왼쪽: 제목, 설명, 시작 버튼, 안내 문구
- 오른쪽: 세 장의 카드가 부채꼴로 겹쳐 있는 카드 덱

### 고정 문구

```text
당신의 하루를
7장의 동네로.
```

```text
살고 싶은 집을 바로 묻지 않습니다.
반복하고 싶은 장면을 고르면,
그 선택을 실제 생활권 데이터의 가중치로 번역합니다.
```

주요 버튼:

```text
카드 펼치기
```

하단 안내:

```text
운세가 아니라, 말로 설명하기 어려운 생활 취향을
카페·상권·녹지·이동·주택 조건으로 변환하는 인터랙션 예시입니다.
```

### 카드 덱

- 카드 세 장을 겹친다.
- 중앙 카드는 약간 위로 올라오고 정면을 향한다.
- 좌우 카드는 각각 약 10~12도 회전한다.
- 카드 뒷면에는 별, 원, 금색 테두리 패턴을 넣는다.
- 이미지 파일 없이 CSS와 SVG로 구현해도 된다.

---

## 3.2 질문 화면

### 상단

- `01 / 07` 형식 진행 번호
- 중앙 진행 바
- 오른쪽 `LIFE DECK READING`

### 질문 헤더

- 작은 카드 번호 문구
- 큰 질문 문구
- 한 줄 설명

### 카드 배치

- 일반 질문: 3장
- 마지막 질문: 4장
- 데스크톱: 한 줄 카드 그리드
- 모바일: 가로 스크롤 또는 한 장 중심 캐러셀

### 선택 동작

1. 카드 앞면에는 아이콘, 카드명, 짧은 장면 설명을 표시한다.
2. 카드를 클릭하면 Y축으로 180도 뒤집는다.
3. 카드 뒷면에는 해석 문장과 성향 칩을 표시한다.
4. 선택한 카드에는 오른쪽 위 체크 표시를 보여준다.
5. 같은 질문의 선택하지 않은 카드는 투명도와 채도를 낮춘다.
6. 다른 카드를 클릭하면 선택이 즉시 바뀐다.
7. 선택 전에는 `다음 카드` 버튼을 비활성화한다.
8. 이전 단계로 돌아와도 기존 선택을 보존한다.

### 하단 버튼

- 왼쪽: `이전 카드`
- 가운데: 선택 안내 문구
- 오른쪽: `다음 카드`
- 마지막 질문에서는 `성향 카드 공개`

---

## 3.3 결과 화면

### 제목

```text
당신의 생활 아르카나
```

설명:

```text
선택한 일곱 장면을 생활 취향, 이동, 주거 조건 데이터로 변환한 결과입니다.
실제 서비스에서는 이 값이 기존 추천 API의 입력으로 이어집니다.
```

### 데스크톱 구조

- 왼쪽: 큰 성향 아르카나 카드
- 오른쪽: 분석 패널

### 아르카나 카드

표시 요소:

- 대표 성향 아이콘
- 대표 성향 한글명
- 영문명
- 설명
- 보조 성향 이름과 비율

예:

```text
고요의 정원사
THE QUIET GARDENER

도시의 편리함보다 고요한 회복과 주거의 안정감을 먼저 찾습니다.
나무와 산책길, 낮은 소음이 당신의 하루를 오래 지켜줍니다.

보조 성향: 시간의 항해사 31%
```

### 오른쪽 분석 패널

세 구역으로 나눈다.

1. `FUN · WORK · REST`
   - 가로 막대 그래프
   - 세 값의 합은 항상 100
2. `추천 엔진으로 넘길 값`
   - 상위 4개 선호 벡터
   - 반드시 지킬 조건
   - 먼저 완화할 조건
3. `당신이 고른 일곱 장면`
   - 선택한 카드 제목을 칩으로 표시

하단 버튼:

- `다시 카드 펼치기`
- `추천 요청 데이터 보기`

`추천 요청 데이터 보기`를 누르면 브라우저 `alert` 대신 접근 가능한 모달 또는 `<dialog>`를 사용해 JSON을 보여준다.

---

# 4. 디자인 시스템

기존 `dive_2026`의 색상 체계를 그대로 사용한다.

```css
:root {
  --plum: #261c3b;
  --plum-light: #38295a;
  --lilac: #f5f3f8;
  --lilac-dim: #e9e5f0;
  --violet: #6d4aff;
  --violet-dark: #5636d6;
  --gold: #d9a441;
  --slate: #625c72;
  --slate-light: #948da6;
  --white: #ffffff;
}
```

## 색상 역할

| 색 | 역할 |
|---|---|
| `plum` | 제목, 구조, 카드 뒷면 |
| `lilac` | 전체 배경 |
| `lilac-dim` | 보조 배경과 진행 바 |
| `violet` | 선택, 주요 CTA, 포커스 |
| `gold` | 카드 장식과 희소한 강조 |
| `slate` | 본문과 보조 정보 |

새로운 핵심 색상은 추가하지 않는다. 옵션별 포인트 색도 가급적 `violet`, `violet-dark`, `gold`, `plum-light` 안에서 해결한다.

## 타이포그래피

- 기본: Pretendard
- 대체: `system-ui`, `sans-serif`
- 숫자와 카드 번호: monospace
- 타로 분위기를 내기 위해 장식용 영문 세리프 폰트를 추가하지 않는다.
- 한글 가독성을 우선한다.

## 모서리

- 일반 버튼: `999px`
- 카드: `24px`
- 큰 결과 카드: `30px`
- 모달: `24px`

## 배경

- 라일락 계열의 밝은 배경
- 보라색과 골드의 약한 radial gradient
- 작은 점 또는 별 패턴을 매우 낮은 투명도로 추가
- 과도한 네온, 검은 배경 전체화면, 점술 앱 같은 촛불 이미지는 사용하지 않는다.

## 카드

앞면:

- 흰색 또는 반투명 흰색
- 얇은 저채도 테두리
- 중앙 원형 아이콘 영역
- 하단 제목과 장면 설명

뒷면:

- `plum` 중심의 어두운 배경
- 금색 내부 테두리
- 카드 해석과 성향 칩
- 텍스트는 `lilac`

## 아이콘

- Lucide 또는 품질이 동일한 inline SVG 사용
- 선 굵기 통일
- 이모지는 사용하지 않는다.
- 카드마다 사진이나 생성 이미지를 넣지 않는다.

---

# 5. 데이터 타입

```ts
export type TraitKey =
  | 'fun'
  | 'work'
  | 'rest'
  | 'commute'
  | 'convenience'
  | 'destination'
  | 'home'
  | 'space'
  | 'residential'
  | 'commercial'
  | 'cafe'
  | 'food'
  | 'dining'
  | 'exercise'
  | 'walking'
  | 'green'
  | 'pharmacy'
  | 'parking'
  | 'housing'
  | 'affordability'

export type TraitVector = Partial<Record<TraitKey, number>>

export interface CardOption {
  id: string
  title: string
  caption: string
  meaning: string
  icon: string
  chips: string[]
  traits: TraitVector
  hard?: string
  tradeoff?: string
}

export interface CardQuestion {
  id: string
  kicker: string
  title: string
  description: string
  options: CardOption[]
}

export interface DeckState {
  stage: 'intro' | 'question' | 'result'
  questionIndex: number
  answers: Record<string, string>
}
```

---

# 6. 질문 데이터

아래 문구를 임의로 바꾸거나 추가 질문을 만들지 않는다.

## 카드 1 — 아침

질문:

```text
아침에 20분의 여유가 생긴다면?
```

| ID | 카드 | 장면 설명 | 성향 값 |
|---|---|---|---|
| `walk-station` | 움직이는 아침 | 역까지 가볍게 걸으며 하루를 깨운다 | `work +3`, `commute +3`, `convenience +2`, `destination +2` |
| `sunlit-room` | 햇빛 드는 방 | 창을 열고 집 안에서 천천히 시작한다 | `rest +2`, `home +3`, `space +3`, `residential +1` |
| `coffee-alley` | 커피 향 골목 | 동네 카페에 들러 나만의 리듬을 만든다 | `fun +3`, `cafe +3`, `commercial +2`, `food +1` |

## 카드 2 — 저녁

질문:

```text
하루를 마친 뒤, 가장 먼저 향하는 곳은?
```

| ID | 카드 | 장면 설명 | 성향 값 |
|---|---|---|---|
| `restaurant-light` | 불빛 켜진 식당가 | 좋아하는 사람과 맛있는 것을 찾아간다 | `fun +3`, `dining +3`, `food +3`, `commercial +2` |
| `quiet-walk` | 조용한 산책길 | 조금 느리게 걸으며 하루를 정리한다 | `rest +3`, `walking +3`, `green +2`, `residential +2` |
| `straight-home` | 곧바로 돌아가는 집 | 이동을 줄이고 익숙한 공간에서 쉰다 | `home +3`, `rest +2`, `commute +2`, `housing +2` |

## 카드 3 — 주말

질문:

```text
주말 오전, 당신의 몸이 먼저 찾는 것은?
```

| ID | 카드 | 장면 설명 | 성향 값 |
|---|---|---|---|
| `exercise` | 운동으로 여는 하루 | 몸을 움직여야 비로소 주말이 시작된다 | `exercise +3`, `fun +2`, `commercial +1`, `work +1` |
| `brunch` | 브런치와 대화 | 카페와 식당 사이에서 여유를 보낸다 | `cafe +2`, `food +2`, `dining +2`, `fun +3`, `commercial +2` |
| `park` | 공원과 느린 산책 | 사람보다 나무가 많은 길을 고른다 | `green +3`, `rest +3`, `walking +2`, `residential +2` |

## 카드 4 — 안심

질문:

```text
낯선 동네에서 가장 먼저 안심되는 것은?
```

| ID | 카드 | 장면 설명 | 성향 값 |
|---|---|---|---|
| `daily-shops` | 편의점과 약국 | 필요한 것을 바로 해결할 수 있는 거리 | `convenience +3`, `pharmacy +3`, `commercial +1`, `rest +1` |
| `transit-network` | 익숙한 교통망 | 어디로든 갈 수 있다는 확신이 드는 곳 | `work +3`, `commute +3`, `destination +2`, `convenience +1` |
| `quiet-block` | 조용한 주택가 | 낮은 소음과 일정한 생활 리듬이 느껴지는 곳 | `residential +3`, `rest +2`, `home +2`, `green +1` |

## 카드 5 — 비 오는 날

질문:

```text
비 오는 날, 가장 마음이 놓이는 장면은?
```

| ID | 카드 | 장면 설명 | 성향 값 |
|---|---|---|---|
| `five-minutes` | 모든 것이 5분 안에 | 우산 하나로 일상을 해결할 수 있는 동네 | `commercial +3`, `convenience +3`, `cafe +1`, `food +1`, `fun +2` |
| `drive` | 차로 편하게 이동 | 비와 거리의 제약을 이동수단으로 해결한다 | `parking +3`, `commute +1`, `space +1`, `work +1` |
| `good-home` | 밖에 안 나가도 좋은 집 | 집 안의 편안함이 날씨를 잊게 만든다 | `home +3`, `space +3`, `rest +2`, `housing +3` |

## 카드 6 — 절대 지킬 조건

질문:

```text
어떤 조건만큼은 절대 놓치고 싶지 않나요?
```

| ID | 카드 | 장면 설명 | 성향 값 | 하드 필터 값 |
|---|---|---|---|---|
| `budget` | 감당 가능한 비용 | 생활의 여유를 지키는 예산선 | `affordability +4`, `housing +1`, `rest +1` | `예산` |
| `short-commute` | 짧은 이동 시간 | 매일 되풀이되는 시간을 되찾는 선택 | `commute +4`, `work +3`, `destination +3` | `이동시간` |
| `enough-space` | 충분한 집의 크기 | 오래 머물러도 답답하지 않은 공간 | `space +4`, `home +2`, `housing +3` | `공간` |

## 카드 7 — 뒤집힌 카드

질문:

```text
한 장을 뒤집어야 한다면?
```

| ID | 카드 | 장면 설명 | 성향 값 | 먼저 완화할 조건 |
|---|---|---|---|---|
| `far-commerce` | 상권과 조금 멀어도 괜찮다 | 가까움 대신 조용함을 택한다 | `commercial -2`, `rest +2`, `residential +2`, `green +1` | `상권 거리` |
| `smaller-home` | 집이 조금 작아도 괜찮다 | 공간보다 위치와 가격을 남긴다 | `space -2`, `affordability +2`, `convenience +1`, `commercial +1` | `최소 면적` |
| `longer-commute` | 출퇴근이 조금 길어도 괜찮다 | 시간 대신 내가 원하는 동네를 택한다 | `commute -2`, `rest +2`, `home +1`, `fun +1`, `green +1` | `목적지 거리` |
| `raise-budget` | 예산을 조금 높일 수 있다 | 가능성을 넓혀 더 맞는 생활권을 찾는다 | `affordability -1`, `fun +1`, `work +1`, `housing +1`, `commercial +1` | `예산 상한` |

각 옵션에는 다음도 반드시 넣는다.

- 한 문장의 카드 해석
- 3개의 짧은 성향 칩
- 의미에 맞는 선형 아이콘

---

# 7. 성향 계산

## 7.1 전체 성향 합산

선택한 7개 옵션의 `traits`를 키별로 모두 더한다.

```ts
function sumTraits(
  questions: CardQuestion[],
  answers: Record<string, string>,
): Record<TraitKey, number>
```

존재하지 않는 값은 `0`으로 취급한다.

## 7.2 FUN · WORK · REST 계산

```ts
const rawFun = Math.max(
  1,
  traits.fun
    + traits.cafe * 0.45
    + traits.food * 0.35
    + traits.exercise * 0.35
    + traits.dining * 0.35,
)

const rawWork = Math.max(
  1,
  traits.work
    + traits.commute * 0.55
    + traits.destination * 0.45
    + traits.convenience * 0.2,
)

const rawRest = Math.max(
  1,
  traits.rest
    + traits.home * 0.4
    + traits.green * 0.5
    + traits.residential * 0.35
    + traits.walking * 0.25,
)
```

합계를 100으로 정규화한다.

```ts
const total = rawFun + rawWork + rawRest
const fun = Math.round((rawFun / total) * 100)
const work = Math.round((rawWork / total) * 100)
const rest = 100 - fun - work
```

## 7.3 아르카나 유형

### 고요의 정원사

```ts
rest * 1.5
+ green * 2
+ residential * 1.5
+ walking * 1.4
+ home * 0.5
```

### 시간의 항해사

```ts
work * 1.5
+ commute * 2
+ destination * 1.6
+ convenience * 0.7
```

### 골목의 수집가

```ts
fun * 1.2
+ cafe * 2
+ food * 1.5
+ commercial * 1.2
+ convenience * 0.6
```

### 집의 연금술사

```ts
home * 2
+ space * 1.7
+ housing * 1.6
+ residential * 0.7
```

### 도시의 불빛

```ts
fun * 1.5
+ dining * 1.8
+ exercise * 1.5
+ commercial * 1.5
+ food
```

### 균형의 설계자

```ts
28
- (Math.max(funAxis, workAxis, restAxis)
  - Math.min(funAxis, workAxis, restAxis)) * 0.38
+ affordability
+ convenience * 0.5
```

점수 순으로 정렬한다.

- 1위: 대표 성향
- 2위: 보조 성향
- 대표와 보조 점수의 합을 기준으로 두 비율을 계산한다.

```ts
const primaryPercent = Math.round(
  (primaryScore / (primaryScore + secondaryScore)) * 100,
)
const secondaryPercent = 100 - primaryPercent
```

## 7.4 추천 벡터

각 값은 0~100으로 제한한다.

```ts
const normalize = (value: number, max: number) =>
  Math.max(0, Math.min(100, Math.round((value / max) * 100)))
```

```ts
const vector = {
  '카페·골목': normalize(cafe + commercial * 0.45, 8),
  '외식·상권': normalize(food + dining + commercial * 0.35, 11),
  '녹지·산책': normalize(green + walking + rest * 0.25, 10),
  '이동·목적지': normalize(commute + destination + work * 0.25, 11),
  '집·공간': normalize(home + space + housing * 0.35, 12),
  '생활 편의': normalize(convenience + pharmacy * 0.8 + parking * 0.5, 9),
}
```

결과 화면에서는 높은 값부터 정렬한다.

---

# 8. 결과 JSON

`추천 요청 데이터 보기`에서 다음 형태를 보여준다.

```ts
interface LifeDeckPayload {
  lifeStats: {
    fun: number
    work: number
    rest: number
  }
  mustKeep?: string
  relaxFirst?: string
  preferenceVector: Record<string, number>
  archetype: string
  secondaryArchetype: string
  selectedCards: Array<{
    questionId: string
    optionId: string
    title: string
  }>
}
```

예시:

```json
{
  "lifeStats": {
    "fun": 28,
    "work": 31,
    "rest": 41
  },
  "mustKeep": "예산",
  "relaxFirst": "상권 거리",
  "preferenceVector": {
    "녹지·산책": 78,
    "집·공간": 64,
    "이동·목적지": 52,
    "생활 편의": 44,
    "카페·골목": 31,
    "외식·상권": 24
  },
  "archetype": "고요의 정원사",
  "secondaryArchetype": "시간의 항해사",
  "selectedCards": []
}
```

---

# 9. 상태 및 상호작용 규칙

## 상태

```ts
const [stage, setStage] = useState<Stage>('intro')
const [questionIndex, setQuestionIndex] = useState(0)
const [answers, setAnswers] = useState<Record<string, string>>({})
```

## 규칙

- 하나의 질문에는 하나의 옵션만 선택 가능
- 선택은 즉시 저장
- 이전/다음 이동 시 선택 유지
- 결과 진입은 7개 질문 모두 답한 경우만 가능
- `다시 카드 펼치기`는 모든 답변과 단계 초기화
- 페이지 새로고침 후 답변 복원은 이번 범위에서 선택 사항
- 자동 API 호출 금지

---

# 10. 모션

## 필수

- 화면 진입: `opacity + translateY`
- 카드 hover: 약간 위로 이동
- 카드 선택: `rotateY(180deg)`
- 다른 카드: opacity와 saturation 감소
- 결과 카드 내부 장식 원: 매우 느린 회전
- 진행 바: 부드러운 width 전환

## 시간 권장값

```text
화면 진입       450~550ms
카드 뒤집기     650~750ms
카드 hover      180~220ms
진행 바         400~500ms
버튼 hover      150~200ms
```

## 접근성

`prefers-reduced-motion: reduce`에서는:

- 카드 뒤집기를 짧은 fade로 대체하거나 시간을 크게 줄인다.
- 장식 회전을 중단한다.
- 스크롤 애니메이션을 사용하지 않는다.

---

# 11. 반응형

## 데스크톱

- 최대 콘텐츠 폭 약 1180px
- 인트로 2열
- 질문 카드 3~4열
- 결과 2열

## 태블릿

- 질문 카드 2열 가능
- 결과는 1열 전환 가능

## 모바일 390px

- 상단 브랜드와 불필요한 메타 문구를 간소화
- 인트로는 세로 배치
- 카드 덱 크기 축소
- 질문 카드는 한 번에 한 장이 중심에 보이는 가로 스크롤
- `scroll-snap-type: x mandatory` 적용
- 카드 최소 높이가 화면을 과도하게 넘지 않게 조정
- 이전/다음 버튼을 화면 폭에 맞게 2열 배치
- 결과 아르카나 카드와 분석 패널을 세로 배치
- 가로 스크롤이나 잘린 한글 문구가 없어야 함

---

# 12. 접근성 요구사항

- 선택 카드는 반드시 `<button>`으로 구현
- `aria-pressed`로 선택 상태 제공
- 카드 제목과 장면 설명을 접근 가능한 이름에 포함
- 진행률은 `aria-label` 또는 `aria-valuenow` 제공
- 질문이 바뀔 때 질문 제목에 포커스 이동
- 모달은 `role="dialog"`, `aria-modal="true"` 또는 네이티브 `<dialog>` 사용
- Escape로 결과 JSON 모달 닫기
- 포커스 표시 제거 금지
- 카드 앞면과 뒷면의 텍스트 대비 확보
- 색만으로 선택 상태를 표현하지 말고 체크 표시 병행

---

# 13. 구현 금지 사항

- 기존 `LifeMatch` 페이지 덮어쓰기
- 백엔드 엔드포인트 추가
- Kakao 지도 삽입
- 주택 추천 카드 임의 생성
- Gemini 또는 OpenAI 연결
- 타로 점술 문구 사용
- “운명”, “미래 예언”, “당첨될 집” 같은 표현 사용
- 카드에 스톡 사진 또는 무관한 AI 이미지를 넣기
- 과도한 유리 효과, 네온, 보라색 glow 남용
- 모든 요소를 중첩된 카드로 감싸기
- 버튼이나 선택 카드가 실제로 동작하지 않는 정적 목업

---

# 14. 완료 기준

다음 항목을 모두 만족해야 완료다.

## 기능

- [ ] 인트로에서 카드 시작 가능
- [ ] 정확히 7개 질문 표시
- [ ] 질문별 한 장만 선택 가능
- [ ] 선택 시 카드가 뒤집힘
- [ ] 선택하지 않은 카드가 약하게 처리됨
- [ ] 이전/다음 이동 가능
- [ ] 선택 전 다음 버튼 비활성화
- [ ] 마지막 단계에서 결과 생성
- [ ] 대표 및 보조 성향 계산
- [ ] FUN·WORK·REST 합계가 100
- [ ] 반드시 지킬 조건과 완화 조건 표시
- [ ] JSON 결과 모달 동작
- [ ] 다시 시작 가능

## 시각

- [ ] 기존 `dive_2026` 팔레트와 일치
- [ ] 카드 앞·뒷면이 완성된 디자인
- [ ] 카드 덱 인트로가 자연스럽게 보임
- [ ] 한글 텍스트 잘림 없음
- [ ] 데스크톱과 모바일 모두 프로토타입이 아닌 제품 수준으로 보임

## 품질

- [ ] TypeScript 오류 없음
- [ ] `bun run build` 성공
- [ ] 콘솔 오류 없음
- [ ] 1440px 데스크톱 확인
- [ ] 390px 모바일 확인
- [ ] 키보드만으로 전체 진행 가능
- [ ] reduced motion 확인

---

# 15. 향후 실제 서비스 연동용 매핑

이번 프로토타입에서는 구현하지 않되, 데이터 구조는 다음 연결을 고려해 둔다.

| 카드 결과 | 기존 추천 요청과 연결 가능한 값 |
|---|---|
| `lifeStats` | `LifestyleRecommendationRequest.lifeStats` |
| 카페·골목 | 카페 POI 가중치 |
| 외식·상권 | 음식점 POI 가중치 |
| 녹지·산책 | REST 및 용도지역 가중치 |
| 이동·목적지 | 주요 목적지 거리 가중치 |
| 집·공간 | 최소 면적·방 수와 housing score |
| 생활 편의 | 편의점·약국·주차 가중치 |
| `mustKeep` | 하드 필터 우선순위 |
| `relaxFirst` | 결과 0건 시 조건 완화 전략 |

실제 통합 단계에서는 기존 `buildLifestylePreferences()`를 바로 대체하지 말고 다음 구조를 권장한다.

```text
카드 선택 결과
→ LifeDeckPayload
→ 카드 결과를 LifeProfile/WeeklyRoutine으로 변환
→ 기존 buildLifestylePreferences()
→ 기존 LifestyleRecommendationRequest
```

즉, **카드 UI는 새로운 진입 방식이고 추천 엔진은 기존 것을 재사용**한다.

---

# 16. 개발 에이전트 최종 응답 형식

작업 완료 후 다음을 보고한다.

1. 생성한 경로
2. 실행 명령
3. 구현한 화면 단계
4. 모바일 및 데스크톱 검증 결과
5. 빌드 결과
6. 남은 의도적 미구현 사항
7. 결과 스크린샷 경로

기능을 기존 서비스에 병합하거나 배포하지 않는다. 이번 결과는 독립적인 UI 검증용 프로토타입으로 마무리한다.
