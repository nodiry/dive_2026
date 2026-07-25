import type { LifeStats, WeeklyRoutine } from './model';

export type DeckMode = 'routine' | 'intuition';
export type DeckLocale = 'ko' | 'en';

export interface LocalizedText {
  ko: string;
  en: string;
}

export type DeckIconKey =
  | 'balance'
  | 'brunch'
  | 'car'
  | 'city'
  | 'clock'
  | 'cluster'
  | 'coffee'
  | 'coin'
  | 'compass'
  | 'dining'
  | 'dumbbell'
  | 'expand'
  | 'home'
  | 'leaf'
  | 'longRoad'
  | 'moonTree'
  | 'park'
  | 'pharmacy'
  | 'quiet'
  | 'shopAway'
  | 'smallHome'
  | 'sofa'
  | 'sparkleHome'
  | 'train'
  | 'transit'
  | 'wallet'
  | 'window';

type TraitKey =
  | 'affordability'
  | 'cafe'
  | 'commercial'
  | 'commute'
  | 'convenience'
  | 'destination'
  | 'dining'
  | 'exercise'
  | 'food'
  | 'fun'
  | 'green'
  | 'home'
  | 'housing'
  | 'parking'
  | 'pharmacy'
  | 'residential'
  | 'rest'
  | 'space'
  | 'walking'
  | 'work';

type Traits = Partial<Record<TraitKey, number>>;

export interface DeckOption {
  id: string;
  title: LocalizedText;
  caption: LocalizedText;
  meaning: LocalizedText;
  icon: DeckIconKey;
  chips: LocalizedText[];
  traits: Traits;
}

export interface DeckQuestion {
  id: string;
  kicker: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  options: DeckOption[];
}

export interface LifeArchetype {
  id: string;
  name: LocalizedText;
  english: string;
  description: LocalizedText;
  icon: DeckIconKey;
  score: (traits: Traits, stats: LifeStats) => number;
}

export interface LifeDeckResult {
  mode: DeckMode;
  answers: Record<string, string>;
  lifeStats: LifeStats;
  routine: WeeklyRoutine;
  archetypeId: string;
  secondaryArchetypeId: string;
  secondaryPercent: number;
  mustKeepId: string;
  relaxFirstId: string;
}

const text = (ko: string, en: string): LocalizedText => ({ ko, en });
const chips = (...values: [string, string][]): LocalizedText[] =>
  values.map(([ko, en]) => text(ko, en));

export const MODE_COPY: Record<
  DeckMode,
  {
    title: LocalizedText;
    eyebrow: LocalizedText;
    description: LocalizedText;
    cta: LocalizedText;
    icon: DeckIconKey;
  }
> = {
  routine: {
    title: text('선명한 하루', 'A Clear Day'),
    eyebrow: text('나는 내 하루를 잘 안다', 'I know the rhythm of my day'),
    description: text(
      '아침부터 밤까지 실제 생활 장면을 따라가며 나에게 중요한 동네 조건을 기록합니다.',
      'Follow a real day from morning to night and record what your neighborhood needs.',
    ),
    cta: text('내 하루 펼치기', 'Lay out my day'),
    icon: 'clock',
  },
  intuition: {
    title: text('숨은 하루', 'A Hidden Day'),
    eyebrow: text('아직 원하는 하루를 잘 모르겠다', 'I cannot quite describe my ideal day yet'),
    description: text(
      '문·빛·소리·밤 풍경 중 끌리는 장면을 고르면 말로 설명하기 어려운 취향을 발견합니다.',
      'Choose the doors, light, sounds, and night scenes that pull you in to reveal quieter preferences.',
    ),
    cta: text('카드로 발견하기', 'Discover through cards'),
    icon: 'moonTree',
  },
};

const SHARED_REALITY_QUESTIONS: DeckQuestion[] = [
  {
    id: 'must-have',
    kicker: text('Card 06 · Reality', 'Card 06 · Reality'),
    title: text(
      '이것만큼은 절대 놓치고 싶지 않아요.',
      'Which condition must your next home protect?',
    ),
    description: text(
      '이 선택은 성향이 아니라 실제 추천에서 먼저 지킬 조건입니다.',
      'This becomes the first real-world condition your recommendations should protect.',
    ),
    options: [
      {
        id: 'budget',
        title: text('감당 가능한 비용', 'A manageable budget'),
        caption: text('생활의 여유를 지키는 예산선', 'A budget that leaves room to live'),
        icon: 'wallet',
        meaning: text(
          '가격 여유와 예산 적합도를 가장 먼저 지킵니다.',
          'Budget fit and affordability stay protected first.',
        ),
        chips: chips(['가격 필수', 'Budget first'], ['여유 +2', 'Breathing room +2']),
        traits: { affordability: 4, housing: 1, rest: 1 },
      },
      {
        id: 'short-commute',
        title: text('짧은 이동 시간', 'A shorter commute'),
        caption: text('매일 되풀이되는 시간을 되찾는 조건', 'Win back time you spend every day'),
        icon: 'clock',
        meaning: text(
          '주요 목적지와의 거리와 이동 편의를 최우선으로 둡니다.',
          'Distance to your frequent destination becomes the priority.',
        ),
        chips: chips(['거리 필수', 'Distance first'], ['WORK +3', 'WORK +3']),
        traits: { commute: 4, work: 3, destination: 3 },
      },
      {
        id: 'enough-space',
        title: text('충분한 집의 크기', 'Enough room at home'),
        caption: text(
          '오래 머물러도 답답하지 않은 공간',
          'Space that still feels good after a long day',
        ),
        icon: 'expand',
        meaning: text(
          '면적과 방 수를 취향이 아닌 필수조건으로 지킵니다.',
          'Area and room count become requirements, not preferences.',
        ),
        chips: chips(['면적 필수', 'Area first'], ['집 중심 +2', 'Home +2']),
        traits: { space: 4, home: 2, housing: 3 },
      },
      {
        id: 'quiet-home',
        title: text('조용한 주거환경', 'A quiet residential setting'),
        caption: text(
          '집에 돌아왔을 때 확실히 쉴 수 있는 곳',
          'A place that truly lets you recover',
        ),
        icon: 'quiet',
        meaning: text(
          '상권 밀도보다 낮은 소음과 안정적인 주거환경을 우선합니다.',
          'Calm residential surroundings matter more than commercial density.',
        ),
        chips: chips(['주거 필수', 'Calm first'], ['REST +3', 'REST +3']),
        traits: { residential: 4, rest: 3, home: 2, green: 1 },
      },
    ],
  },
  {
    id: 'reverse',
    kicker: text('Card 07 · Reversed', 'Card 07 · Reversed'),
    title: text(
      '좋은 동네를 위해 한 장을 뒤집는다면?',
      'Which card could you turn over for a better match?',
    ),
    description: text(
      '추천 후보가 없을 때 어떤 조건부터 완화할 수 있는지 선택하세요.',
      'Choose the first condition you could relax when the result set is too tight.',
    ),
    options: [
      {
        id: 'far-commerce',
        title: text('상권과 조금 멀어도 괜찮다', 'Shops can be a little farther away'),
        caption: text('가까움 대신 조용함을 택한다', 'Trade proximity for calm'),
        icon: 'shopAway',
        meaning: text(
          '상권 접근성을 먼저 완화하고 주거 안정과 고요함을 남깁니다.',
          'Relax commercial access while keeping calm and residential stability.',
        ),
        chips: chips(['상권 완화', 'Relax shops'], ['REST +2', 'REST +2']),
        traits: { commercial: -2, rest: 2, residential: 2, green: 1 },
      },
      {
        id: 'smaller-home',
        title: text('집이 조금 작아도 괜찮다', 'The home can be a little smaller'),
        caption: text('공간보다 위치와 가격을 남긴다', 'Keep location and price before space'),
        icon: 'smallHome',
        meaning: text(
          '면적 조건을 먼저 완화하고 예산과 생활 접근성을 지킵니다.',
          'Relax minimum area while protecting budget and daily access.',
        ),
        chips: chips(['면적 완화', 'Relax area'], ['가격 +2', 'Budget +2']),
        traits: { space: -2, affordability: 2, convenience: 1, commercial: 1 },
      },
      {
        id: 'longer-commute',
        title: text('출퇴근이 조금 길어도 괜찮다', 'The commute can be a little longer'),
        caption: text(
          '시간 대신 원하는 생활권을 택한다',
          'Trade time for the neighborhood you want',
        ),
        icon: 'longRoad',
        meaning: text(
          '목적지 거리를 완화하고 주거환경과 생활 취향을 더 지킵니다.',
          'Relax destination distance to preserve neighborhood fit.',
        ),
        chips: chips(['거리 완화', 'Relax distance'], ['취향 +2', 'Lifestyle +2']),
        traits: { commute: -2, rest: 2, home: 1, fun: 1, green: 1 },
      },
      {
        id: 'raise-budget',
        title: text('예산을 조금 높일 수 있다', 'I could stretch the budget'),
        caption: text(
          '가능성을 넓혀 더 맞는 생활권을 찾는다',
          'Open more options to keep the right fit',
        ),
        icon: 'coin',
        meaning: text(
          '가격 상한을 먼저 완화해 생활 성향과 주택 조건을 유지합니다.',
          'Relax the price ceiling to preserve lifestyle and home fit.',
        ),
        chips: chips(['예산 완화', 'Relax budget'], ['취향 유지', 'Keep lifestyle']),
        traits: { affordability: -1, fun: 1, work: 1, housing: 1, commercial: 1 },
      },
    ],
  },
];

const ROUTINE_QUESTIONS: DeckQuestion[] = [
  {
    id: 'routine-morning',
    kicker: text('Card 01 · 07:00', 'Card 01 · 07:00'),
    title: text(
      '눈을 뜬 뒤, 당신의 아침은 어디에서 시작되나요?',
      'Where does your morning really begin?',
    ),
    description: text(
      '실제로 반복하거나 앞으로 반복하고 싶은 장면을 골라주세요.',
      'Choose the scene you repeat now or want to make part of your day.',
    ),
    options: [
      {
        id: 'slow-home',
        title: text('천천히 준비하는 집', 'A slow morning at home'),
        caption: text(
          '햇빛과 여유가 있는 방에서 하루를 시작한다',
          'Start with sunlight and room to breathe',
        ),
        icon: 'window',
        meaning: text(
          '집의 안락함과 충분한 공간을 하루의 기반으로 삼습니다.',
          'Comfort and space at home anchor your day.',
        ),
        chips: chips(['REST +3', 'REST +3'], ['집 중심 +3', 'Home +3']),
        traits: { rest: 3, home: 3, space: 2, residential: 1 },
      },
      {
        id: 'quick-leave',
        title: text('씻고 바로 출발', 'Get ready and head out'),
        caption: text(
          '준비를 마치면 지체 없이 목적지로 움직인다',
          'Move toward the day without delay',
        ),
        icon: 'train',
        meaning: text(
          '짧고 예측 가능한 이동과 목적지 접근성을 중요하게 봅니다.',
          'Predictable travel and destination access matter.',
        ),
        chips: chips(['WORK +3', 'WORK +3'], ['출퇴근 +3', 'Commute +3']),
        traits: { work: 3, commute: 3, destination: 2, convenience: 1 },
      },
      {
        id: 'cafe-start',
        title: text('동네 카페에서 시작', 'Start at a neighborhood café'),
        caption: text(
          '커피 한 잔과 함께 나만의 리듬을 만든다',
          'Find your rhythm over a cup of coffee',
        ),
        icon: 'coffee',
        meaning: text(
          '가까운 카페와 골목 상권이 하루의 에너지원입니다.',
          'Nearby cafés and local streets energize your day.',
        ),
        chips: chips(['FUN +2', 'FUN +2'], ['카페 +3', 'Café +3']),
        traits: { fun: 2, cafe: 3, commercial: 2, food: 1 },
      },
      {
        id: 'home-focus',
        title: text('집에서 바로 집중', 'Focus from home'),
        caption: text(
          '출근 없이 업무나 공부를 집에서 시작한다',
          'Start work or study without commuting',
        ),
        icon: 'sparkleHome',
        meaning: text(
          '집의 기능성과 조용한 환경, 충분한 공간이 중요합니다.',
          'A functional, quiet, roomy home matters.',
        ),
        chips: chips(['집 중심 +3', 'Home +3'], ['공간 +3', 'Space +3']),
        traits: { home: 3, space: 3, work: 2, housing: 2, residential: 2 },
      },
    ],
  },
  {
    id: 'routine-commute',
    kicker: text('Card 02 · 08:10', 'Card 02 · 08:10'),
    title: text(
      '평일 아침, 가장 익숙한 이동 장면은?',
      'What does a typical weekday trip look like?',
    ),
    description: text(
      '이동 방식은 목적지 거리와 주변 생활시설 가중치로 이어집니다.',
      'Your travel pattern shapes destination and nearby-amenity weights.',
    ),
    options: [
      {
        id: 'public-transit',
        title: text('지하철·버스', 'Subway or bus'),
        caption: text(
          '정해진 노선과 환승으로 도시를 이동한다',
          'Move through the city by routes and transfers',
        ),
        icon: 'transit',
        meaning: text(
          '도시 연결성과 주요 목적지까지의 거리를 우선합니다.',
          'City connections and destination distance come first.',
        ),
        chips: chips(['출퇴근 +4', 'Commute +4'], ['WORK +3', 'WORK +3']),
        traits: { commute: 4, destination: 3, work: 3, convenience: 1 },
      },
      {
        id: 'drive-work',
        title: text('자동차로 이동', 'Drive'),
        caption: text(
          '주차와 도로 접근성이 있으면 넓은 반경도 괜찮다',
          'A wider radius works with parking and road access',
        ),
        icon: 'car',
        meaning: text(
          '차량 이동성을 확보하면 중심 상권에서 멀어도 괜찮습니다.',
          'Good vehicle access makes a wider search area work.',
        ),
        chips: chips(['주차 +4', 'Parking +4'], ['넓은 반경', 'Wider radius']),
        traits: { parking: 4, commute: 2, space: 1, work: 1 },
      },
      {
        id: 'walk-cycle',
        title: text('걷거나 자전거', 'Walk or cycle'),
        caption: text(
          '일과 생활을 가까운 반경 안에서 해결한다',
          'Keep work and life within a short radius',
        ),
        icon: 'park',
        meaning: text(
          '보행 가능한 짧은 생활권과 편의시설 밀도를 선호합니다.',
          'You prefer a walkable, compact daily radius.',
        ),
        chips: chips(['짧은 반경', 'Short radius'], ['편의 +3', 'Convenience +3']),
        traits: { commute: 2, convenience: 3, walking: 2, green: 1, commercial: 1 },
      },
      {
        id: 'remote-nearby',
        title: text('재택 또는 집 근처', 'Remote or close to home'),
        caption: text(
          '멀리 출근하지 않고 생활과 일을 겹친다',
          'Let home and work share the same area',
        ),
        icon: 'home',
        meaning: text(
          '집의 기능과 주변 편의, 조용한 주거환경이 중요합니다.',
          'Home function, local convenience, and calm matter.',
        ),
        chips: chips(['집 중심 +3', 'Home +3'], ['편의 +2', 'Convenience +2']),
        traits: { home: 3, space: 2, work: 2, convenience: 2, residential: 2 },
      },
    ],
  },
  {
    id: 'routine-midday',
    kicker: text('Card 03 · 12:30', 'Card 03 · 12:30'),
    title: text(
      '점심이나 짧은 휴식은 보통 어떻게 보내나요?',
      'How do you usually spend lunch or a short break?',
    ),
    description: text(
      '하루 중간의 선택은 상권 밀도와 머무는 방식의 단서입니다.',
      'Midday choices reveal the density and places you need nearby.',
    ),
    options: [
      {
        id: 'fast-lunch',
        title: text('익숙한 식당에서 빠르게', 'A quick meal at a familiar place'),
        caption: text(
          '짧은 시간 안에 식사와 다음 일정을 해결한다',
          'Eat and move on without wasting time',
        ),
        icon: 'dining',
        meaning: text(
          '가까운 음식점과 생활 편의를 선호합니다.',
          'Nearby food and everyday convenience matter.',
        ),
        chips: chips(['음식 +2', 'Food +2'], ['편의 +3', 'Convenience +3']),
        traits: { food: 2, convenience: 3, work: 2, commercial: 1 },
      },
      {
        id: 'new-alley',
        title: text('새로운 골목을 탐색', 'Explore a new alley'),
        caption: text(
          '새 식당과 작은 가게를 발견하는 시간이 좋다',
          'Enjoy finding a new restaurant or tiny shop',
        ),
        icon: 'brunch',
        meaning: text(
          '다양한 외식과 골목의 발견에서 에너지를 얻습니다.',
          'Food variety and small discoveries give you energy.',
        ),
        chips: chips(['FUN +3', 'FUN +3'], ['상권 +3', 'Shops +3']),
        traits: { fun: 3, dining: 3, food: 3, commercial: 3 },
      },
      {
        id: 'quiet-cafe',
        title: text('조용한 카페에 머무르기', 'Stay in a quiet café'),
        caption: text('커피와 함께 혼자 집중하거나 쉬어간다', 'Focus or pause over coffee'),
        icon: 'coffee',
        meaning: text(
          '가까운 카페와 안정적으로 머물 공간을 선호합니다.',
          'You value a nearby café where you can settle in.',
        ),
        chips: chips(['카페 +3', 'Café +3'], ['집중 +2', 'Focus +2']),
        traits: { cafe: 3, work: 2, rest: 1, commercial: 1 },
      },
      {
        id: 'indoor-lunch',
        title: text('도시락·배달로 실내에서', 'Lunch or delivery indoors'),
        caption: text(
          '밖으로 나가지 않고 익숙한 공간에서 해결한다',
          'Stay in a familiar place instead of going out',
        ),
        icon: 'sofa',
        meaning: text(
          '실내의 편안함과 생활 편의를 중요하게 생각합니다.',
          'Indoor comfort and practical convenience matter.',
        ),
        chips: chips(['집 중심 +2', 'Home +2'], ['REST +2', 'REST +2']),
        traits: { home: 2, convenience: 2, rest: 2, space: 1 },
      },
    ],
  },
  {
    id: 'routine-evening',
    kicker: text('Card 04 · 19:00', 'Card 04 · 19:00'),
    title: text(
      '하루를 마친 뒤 가장 먼저 향하는 곳은?',
      'Where do you head first after the day ends?',
    ),
    description: text(
      '퇴근 이후 반복되는 한 시간이 실제 생활권을 만듭니다.',
      'The first hour after work defines your real neighborhood.',
    ),
    options: [
      {
        id: 'gym-after',
        title: text('운동 공간', 'A place to exercise'),
        caption: text('헬스장이나 운동으로 하루의 긴장을 푼다', 'Release the day through movement'),
        icon: 'dumbbell',
        meaning: text(
          '운동시설 접근성과 활동적인 저녁이 중요합니다.',
          'Exercise access and an active evening matter.',
        ),
        chips: chips(['운동 +4', 'Exercise +4'], ['FUN +2', 'FUN +2']),
        traits: { exercise: 4, fun: 2, commercial: 1 },
      },
      {
        id: 'meet-people',
        title: text('사람을 만나는 식당', 'A restaurant with people'),
        caption: text('친구와 저녁을 먹거나 대화를 이어간다', 'Share dinner and conversation'),
        icon: 'dining',
        meaning: text(
          '외식과 만남, 늦게까지 살아 있는 상권을 선호합니다.',
          'Dining, people, and an active evening district matter.',
        ),
        chips: chips(['외식 +4', 'Dining +4'], ['FUN +3', 'FUN +3']),
        traits: { dining: 4, food: 3, fun: 3, commercial: 2 },
      },
      {
        id: 'walk-after',
        title: text('공원과 산책길', 'A park or walking path'),
        caption: text('조금 느리게 걸으며 하루를 정리한다', 'Slow down and clear the day'),
        icon: 'moonTree',
        meaning: text(
          '녹지와 보행환경, 조용한 회복을 중요하게 봅니다.',
          'Green space, walkability, and quiet recovery matter.',
        ),
        chips: chips(['산책 +4', 'Walking +4'], ['REST +3', 'REST +3']),
        traits: { walking: 4, rest: 3, green: 3, residential: 2 },
      },
      {
        id: 'culture-evening',
        title: text('새로운 문화와 장소', 'Culture and new places'),
        caption: text(
          '전시·공연·새 가게를 찾아 도시를 더 누린다',
          'Find exhibitions, shows, and new places',
        ),
        icon: 'city',
        meaning: text(
          '활동과 상업시설이 가까운 도시형 생활권을 선호합니다.',
          'You prefer an urban area with activity close by.',
        ),
        chips: chips(['FUN +4', 'FUN +4'], ['상권 +3', 'Shops +3']),
        traits: { fun: 4, commercial: 3, dining: 1, cafe: 1 },
      },
    ],
  },
  {
    id: 'routine-night',
    kicker: text('Card 05 · 22:30', 'Card 05 · 22:30'),
    title: text(
      '밤에 집 주변에서 가장 중요하게 느끼는 것은?',
      'What matters most around home at night?',
    ),
    description: text(
      '낮보다 밤의 동네에서 지키고 싶은 조건을 골라주세요.',
      'Choose the condition you want your neighborhood to protect after dark.',
    ),
    options: [
      {
        id: 'late-facilities',
        title: text('늦게까지 열린 생활시설', 'Everyday places open late'),
        caption: text(
          '시간에 쫓기지 않고 필요한 것을 해결한다',
          'Get what you need without racing the clock',
        ),
        icon: 'cluster',
        meaning: text(
          '가까운 상권과 높은 생활 편의가 있어야 마음이 놓입니다.',
          'Nearby commerce and convenience help you feel at ease.',
        ),
        chips: chips(['편의 +4', 'Convenience +4'], ['상권 +3', 'Shops +3']),
        traits: { convenience: 4, commercial: 3, fun: 1, pharmacy: 1 },
      },
      {
        id: 'quiet-night',
        title: text('조용한 주택가', 'A quiet residential street'),
        caption: text(
          '집에 돌아오면 소음과 활동이 잦아든다',
          'The noise fades when you return home',
        ),
        icon: 'quiet',
        meaning: text(
          '낮은 소음과 안정적인 주거환경에서 회복합니다.',
          'Low noise and residential stability help you recover.',
        ),
        chips: chips(['REST +4', 'REST +4'], ['주거 +4', 'Residential +4']),
        traits: { rest: 4, residential: 4, home: 2, green: 1 },
      },
      {
        id: 'daily-care',
        title: text('가까운 편의점과 약국', 'A nearby convenience store and pharmacy'),
        caption: text(
          '작은 문제를 짧은 동선 안에서 해결한다',
          'Solve small needs within a short walk',
        ),
        icon: 'pharmacy',
        meaning: text(
          '생활 필수시설의 가까움에서 안정감을 얻습니다.',
          'Nearby essentials create everyday confidence.',
        ),
        chips: chips(['편의 +4', 'Convenience +4'], ['약국 +3', 'Pharmacy +3']),
        traits: { convenience: 4, pharmacy: 3, rest: 1, commercial: 1 },
      },
      {
        id: 'easy-parking',
        title: text('넉넉한 주차와 넓은 길', 'Easy parking and wider streets'),
        caption: text(
          '늦게 돌아와도 이동과 주차가 어렵지 않다',
          'Come home late without a parking struggle',
        ),
        icon: 'car',
        meaning: text(
          '차량 접근성과 주차가 확보되면 넓은 반경도 편안합니다.',
          'Parking and vehicle access make a wider radius work.',
        ),
        chips: chips(['주차 +4', 'Parking +4'], ['이동 +2', 'Mobility +2']),
        traits: { parking: 4, commute: 2, space: 1 },
      },
    ],
  },
  ...SHARED_REALITY_QUESTIONS,
];

const INTUITION_QUESTIONS: DeckQuestion[] = [
  {
    id: 'hidden-door',
    kicker: text('Card 01 · The Door', 'Card 01 · The Door'),
    title: text('지금 가장 열어보고 싶은 문은?', 'Which door do you want to open?'),
    description: text(
      '이유를 오래 생각하지 말고 첫눈에 끌리는 장면을 고르세요.',
      'Do not overthink it—choose the scene that pulls you in first.',
    ),
    options: [
      {
        id: 'alley-door',
        title: text('사람들이 오가는 골목', 'A lively neighborhood alley'),
        caption: text('작은 가게와 대화가 이어지는 문', 'A door to small shops and conversation'),
        icon: 'city',
        meaning: text(
          '활기 있는 상권과 발견이 많은 골목에서 에너지를 얻습니다.',
          'Lively streets and small discoveries give you energy.',
        ),
        chips: chips(['FUN +3', 'FUN +3'], ['상권 +3', 'Shops +3']),
        traits: { fun: 3, commercial: 3, dining: 2, food: 2 },
      },
      {
        id: 'sun-door',
        title: text('햇빛 드는 조용한 집', 'A quiet, sunlit home'),
        caption: text(
          '오래 머물러도 편안할 것 같은 문',
          'A door that feels comfortable for a long stay',
        ),
        icon: 'window',
        meaning: text(
          '집의 안락함과 고요한 주거환경을 무의식적으로 찾습니다.',
          'You are drawn to comfort and a quiet residential setting.',
        ),
        chips: chips(['REST +3', 'REST +3'], ['집 중심 +3', 'Home +3']),
        traits: { rest: 3, home: 3, space: 2, residential: 2 },
      },
      {
        id: 'station-door',
        title: text('곧게 이어진 역 앞', 'A station opening onto the city'),
        caption: text('어디로든 갈 수 있을 것 같은 문', 'A door that could take you anywhere'),
        icon: 'transit',
        meaning: text(
          '도시 연결성과 시간의 효율을 중요하게 생각합니다.',
          'Connection and time efficiency matter.',
        ),
        chips: chips(['WORK +3', 'WORK +3'], ['출퇴근 +3', 'Commute +3']),
        traits: { work: 3, commute: 3, destination: 3, convenience: 1 },
      },
      {
        id: 'forest-door',
        title: text('나무와 산책길', 'Trees and a walking path'),
        caption: text('조용한 바람이 이어질 것 같은 문', 'A door to quiet air and open space'),
        icon: 'park',
        meaning: text(
          '녹지와 여백, 낮은 자극에서 회복합니다.',
          'Green space and lower stimulation help you recover.',
        ),
        chips: chips(['REST +4', 'REST +4'], ['녹지 +3', 'Green +3']),
        traits: { rest: 4, green: 3, walking: 3, residential: 2 },
      },
    ],
  },
  {
    id: 'hidden-light',
    kicker: text('Card 02 · The Light', 'Card 02 · The Light'),
    title: text('가장 오래 머물고 싶은 빛은?', 'Which light would you stay with longest?'),
    description: text(
      '편안함이나 활력을 느끼는 빛을 직감으로 선택하세요.',
      'Choose the light that feels calming or energizing.',
    ),
    options: [
      {
        id: 'cafe-light',
        title: text('카페 창문의 따뜻한 빛', 'Warm light through a café window'),
        caption: text(
          '머물고 대화할 수 있는 골목의 온기',
          'The warmth of a street where you can linger',
        ),
        icon: 'coffee',
        meaning: text(
          '가까운 카페와 작은 상권을 생활의 중요한 배경으로 봅니다.',
          'Nearby cafés and small shops form an important backdrop.',
        ),
        chips: chips(['카페 +4', 'Café +4'], ['FUN +2', 'FUN +2']),
        traits: { cafe: 4, fun: 2, commercial: 2, food: 1 },
      },
      {
        id: 'neon-light',
        title: text('늦은 밤 도시의 네온', 'Late-night city neon'),
        caption: text('계속 움직이는 거리의 에너지', 'The energy of streets that keep moving'),
        icon: 'city',
        meaning: text(
          '늦은 시간에도 선택지가 많은 도시형 생활권을 선호합니다.',
          'You prefer an urban area with options after dark.',
        ),
        chips: chips(['FUN +4', 'FUN +4'], ['상권 +4', 'Shops +4']),
        traits: { fun: 4, commercial: 4, dining: 2, food: 1 },
      },
      {
        id: 'lamp-light',
        title: text('집 안의 조용한 스탠드', 'A quiet lamp at home'),
        caption: text('나만의 공간에서 깊어지는 빛', 'Light that deepens your own private space'),
        icon: 'sofa',
        meaning: text(
          '집과 개인 공간의 기능, 조용한 집중을 중요하게 생각합니다.',
          'Private space and quiet focus matter.',
        ),
        chips: chips(['집 중심 +4', 'Home +4'], ['공간 +3', 'Space +3']),
        traits: { home: 4, space: 3, rest: 2, housing: 2 },
      },
      {
        id: 'sun-leaf',
        title: text('나뭇잎 사이 아침 햇빛', 'Morning light through leaves'),
        caption: text('천천히 걸을 수 있는 여백의 빛', 'Light with enough room to slow down'),
        icon: 'leaf',
        meaning: text(
          '녹지와 산책, 차분한 주거환경에서 안정감을 얻습니다.',
          'Green space and a calm walk help you feel grounded.',
        ),
        chips: chips(['녹지 +4', 'Green +4'], ['REST +3', 'REST +3']),
        traits: { green: 4, walking: 3, rest: 3, residential: 2 },
      },
    ],
  },
  {
    id: 'hidden-rain',
    kicker: text('Card 03 · The Rain', 'Card 03 · The Rain'),
    title: text('비 오는 날 가장 마음이 놓이는 장면은?', 'Which rainy-day scene puts you at ease?'),
    description: text(
      '날씨가 불편할 때도 지키고 싶은 생활방식을 선택하세요.',
      'Choose the way of living you still want on an inconvenient day.',
    ),
    options: [
      {
        id: 'rain-five',
        title: text('모든 것이 5분 안에', 'Everything within five minutes'),
        caption: text(
          '우산 하나로 일상을 해결하는 동네',
          'A neighborhood manageable with one umbrella',
        ),
        icon: 'cluster',
        meaning: text(
          '작고 밀도 높은 생활권과 가까운 편의시설을 선호합니다.',
          'You prefer a compact daily radius and nearby essentials.',
        ),
        chips: chips(['편의 +4', 'Convenience +4'], ['짧은 반경', 'Short radius']),
        traits: { commercial: 3, convenience: 4, cafe: 1, food: 1, fun: 1 },
      },
      {
        id: 'rain-home',
        title: text('밖에 안 나가도 좋은 집', 'A home worth staying in'),
        caption: text(
          '집 안의 편안함이 날씨를 잊게 한다',
          'Comfort indoors makes the weather disappear',
        ),
        icon: 'sofa',
        meaning: text(
          '주택 자체의 공간과 기능을 주변 상권보다 우선합니다.',
          'The home itself matters more than the surrounding shops.',
        ),
        chips: chips(['집 중심 +4', 'Home +4'], ['공간 +4', 'Space +4']),
        traits: { home: 4, space: 4, rest: 2, housing: 3 },
      },
      {
        id: 'rain-car',
        title: text('차로 편하게 이동', 'Move comfortably by car'),
        caption: text(
          '비와 거리의 제약을 이동수단으로 해결한다',
          'Use mobility to overcome rain and distance',
        ),
        icon: 'car',
        meaning: text(
          '주차와 차량 이동성을 확보하면 넓은 생활반경도 괜찮습니다.',
          'Parking and vehicle access make a wider radius work.',
        ),
        chips: chips(['주차 +4', 'Parking +4'], ['넓은 반경', 'Wider radius']),
        traits: { parking: 4, commute: 1, space: 1, work: 1 },
      },
      {
        id: 'rain-walk',
        title: text('비가 그친 조용한 길', 'A quiet street after the rain'),
        caption: text('젖은 나무와 한적한 골목을 걷는다', 'Walk past wet trees and quiet lanes'),
        icon: 'moonTree',
        meaning: text(
          '상권 밀도보다 녹지와 고요한 보행환경을 선호합니다.',
          'Green, quiet walkability matters more than density.',
        ),
        chips: chips(['산책 +4', 'Walking +4'], ['REST +3', 'REST +3']),
        traits: { walking: 4, green: 3, rest: 3, residential: 2 },
      },
    ],
  },
  {
    id: 'hidden-sound',
    kicker: text('Card 04 · The Sound', 'Card 04 · The Sound'),
    title: text(
      '당신의 동네와 가장 닮은 소리는?',
      'Which sound should your neighborhood resemble?',
    ),
    description: text(
      '편안하다고 느끼는 소리에는 원하는 생활의 밀도가 숨어 있습니다.',
      'The sound that comforts you reveals the density you want.',
    ),
    options: [
      {
        id: 'talk-sound',
        title: text('사람들의 대화와 식당 소리', 'Conversation and restaurant sounds'),
        caption: text(
          '골목마다 작은 이야기가 이어지는 소리',
          'Small stories continuing down every alley',
        ),
        icon: 'dining',
        meaning: text(
          '만남과 외식, 활발한 상권이 있는 동네를 좋아합니다.',
          'You enjoy dining, people, and an active district.',
        ),
        chips: chips(['외식 +4', 'Dining +4'], ['FUN +3', 'FUN +3']),
        traits: { dining: 4, fun: 3, commercial: 3, food: 2 },
      },
      {
        id: 'city-sound',
        title: text('열차와 도시의 움직임', 'Trains and the city in motion'),
        caption: text(
          '도시가 계속 연결되고 있다는 소리',
          'The sound of the city staying connected',
        ),
        icon: 'transit',
        meaning: text(
          '목적지 연결과 이동 가능성이 생활 만족에 큰 영향을 줍니다.',
          'Destination access and mobility shape your satisfaction.',
        ),
        chips: chips(['WORK +4', 'WORK +4'], ['출퇴근 +3', 'Commute +3']),
        traits: { work: 4, commute: 3, destination: 3, convenience: 1 },
      },
      {
        id: 'wind-sound',
        title: text('나무와 바람 소리', 'Trees and wind'),
        caption: text('속도를 늦추고 생각을 비우는 소리', 'A sound that slows you down'),
        icon: 'leaf',
        meaning: text(
          '녹지와 고요함, 산책 가능한 주거환경을 선호합니다.',
          'Green space, calm, and walkability matter.',
        ),
        chips: chips(['녹지 +4', 'Green +4'], ['REST +4', 'REST +4']),
        traits: { green: 4, rest: 4, walking: 2, residential: 2 },
      },
      {
        id: 'home-sound',
        title: text('집 안의 고요함', 'Quiet inside the home'),
        caption: text(
          '외부의 소리가 멀어지는 나만의 공간',
          'A private space where the outside fades',
        ),
        icon: 'home',
        meaning: text(
          '집의 안정감과 낮은 소음, 개인 공간을 중요하게 생각합니다.',
          'Home stability, low noise, and private space matter.',
        ),
        chips: chips(['집 중심 +4', 'Home +4'], ['주거 +3', 'Residential +3']),
        traits: { home: 4, residential: 3, space: 2, rest: 2 },
      },
    ],
  },
  {
    id: 'hidden-night',
    kicker: text('Card 05 · The Night', 'Card 05 · The Night'),
    title: text('밤에 가장 끌리는 풍경은?', 'Which night scene draws you in?'),
    description: text(
      '하루가 끝난 뒤에도 남아 있기를 바라는 동네의 모습입니다.',
      'Choose what you want the neighborhood to hold after the day ends.',
    ),
    options: [
      {
        id: 'night-commerce',
        title: text('늦게까지 불이 켜진 상권', 'Shops glowing late into the night'),
        caption: text(
          '언제든 선택할 수 있는 활기 있는 거리',
          'A lively street with options whenever you need them',
        ),
        icon: 'city',
        meaning: text(
          '외식과 활동, 늦은 생활까지 가능한 상권을 중요하게 봅니다.',
          'Dining, activity, and late-night options matter.',
        ),
        chips: chips(['FUN +4', 'FUN +4'], ['상권 +4', 'Shops +4']),
        traits: { fun: 4, commercial: 4, dining: 2, food: 1 },
      },
      {
        id: 'night-residential',
        title: text('정돈된 조용한 주택가', 'An orderly, quiet residential street'),
        caption: text(
          '불빛은 남아 있지만 소음은 잦아든 거리',
          'The lights remain while the noise fades',
        ),
        icon: 'quiet',
        meaning: text(
          '예측 가능하고 안정적인 주거환경에서 편안함을 느낍니다.',
          'Predictable residential calm helps you feel at ease.',
        ),
        chips: chips(['주거 +4', 'Residential +4'], ['REST +4', 'REST +4']),
        traits: { residential: 4, rest: 4, home: 2, green: 1 },
      },
      {
        id: 'night-care',
        title: text('가까운 편의점과 약국', 'A nearby store and pharmacy'),
        caption: text(
          '필요할 때 바로 도움을 받을 수 있는 풍경',
          'Help and essentials close at hand',
        ),
        icon: 'pharmacy',
        meaning: text(
          '생활 필수시설의 가까움이 동네에 대한 신뢰를 만듭니다.',
          'Nearby essentials build trust in a neighborhood.',
        ),
        chips: chips(['편의 +4', 'Convenience +4'], ['약국 +4', 'Pharmacy +4']),
        traits: { convenience: 4, pharmacy: 4, rest: 1, commercial: 1 },
      },
      {
        id: 'night-road',
        title: text('넓은 길과 주차 공간', 'Wide streets and parking'),
        caption: text('차로 돌아와도 어렵지 않은 여유 있는 거리', 'An easy return home by car'),
        icon: 'car',
        meaning: text(
          '차량 접근성과 주차, 넓은 생활반경에 편안함을 느낍니다.',
          'Vehicle access and a wider radius feel comfortable.',
        ),
        chips: chips(['주차 +4', 'Parking +4'], ['이동 +2', 'Mobility +2']),
        traits: { parking: 4, commute: 2, space: 1 },
      },
    ],
  },
  ...SHARED_REALITY_QUESTIONS,
];

export const ARCHETYPES: LifeArchetype[] = [
  {
    id: 'gardener',
    name: text('고요의 정원사', 'The Quiet Gardener'),
    english: 'THE QUIET GARDENER',
    icon: 'leaf',
    description: text(
      '도시의 편리함보다 고요한 회복과 주거의 안정감을 먼저 찾습니다. 나무와 산책길, 낮은 소음이 당신의 하루를 오래 지켜줍니다.',
      'You look for quiet recovery and residential stability before urban intensity. Trees, walks, and lower noise protect your day.',
    ),
    score: (t) =>
      (t.rest ?? 0) * 1.5 +
      (t.green ?? 0) * 2 +
      (t.residential ?? 0) * 1.5 +
      (t.walking ?? 0) * 1.4 +
      (t.home ?? 0) * 0.5,
  },
  {
    id: 'navigator',
    name: text('시간의 항해사', 'The Time Navigator'),
    english: 'THE TIME NAVIGATOR',
    icon: 'compass',
    description: text(
      '집의 위치를 시간의 관점에서 읽습니다. 주요 목적지와의 거리, 연결성, 예측 가능한 이동이 중요합니다.',
      'You read a home through time: destination distance, connections, and predictable travel shape the right place.',
    ),
    score: (t) =>
      (t.work ?? 0) * 1.5 +
      (t.commute ?? 0) * 2 +
      (t.destination ?? 0) * 1.6 +
      (t.convenience ?? 0) * 0.7,
  },
  {
    id: 'collector',
    name: text('골목의 수집가', 'The Alley Collector'),
    english: 'THE ALLEY COLLECTOR',
    icon: 'coffee',
    description: text(
      '좋아하는 가게와 익숙한 골목을 모으며 동네와 관계를 맺습니다. 카페와 음식점, 작은 발견이 삶의 만족을 만듭니다.',
      'You build a relationship with a neighborhood through favorite cafés, food, familiar streets, and small discoveries.',
    ),
    score: (t) =>
      (t.fun ?? 0) * 1.2 +
      (t.cafe ?? 0) * 2 +
      (t.food ?? 0) * 1.5 +
      (t.commercial ?? 0) * 1.2 +
      (t.convenience ?? 0) * 0.6,
  },
  {
    id: 'alchemist',
    name: text('집의 연금술사', 'The Home Alchemist'),
    english: 'THE HOME ALCHEMIST',
    icon: 'sparkleHome',
    description: text(
      '집을 단순한 주소가 아니라 삶의 기반으로 바꿉니다. 충분한 공간과 기능, 오래 머물러도 편안한 조건이 핵심입니다.',
      'You turn a home into the foundation of life. Space, function, and long-stay comfort are essential.',
    ),
    score: (t) =>
      (t.home ?? 0) * 2 +
      (t.space ?? 0) * 1.7 +
      (t.housing ?? 0) * 1.6 +
      (t.residential ?? 0) * 0.7,
  },
  {
    id: 'citylights',
    name: text('도시의 불빛', 'The City Lights'),
    english: 'THE CITY LIGHTS',
    icon: 'city',
    description: text(
      '사람과 활동이 모이는 도시의 리듬에서 에너지를 얻습니다. 외식, 운동, 문화와 상권이 가까울수록 하루가 선명해집니다.',
      'You draw energy from urban rhythm. Dining, exercise, culture, and active streets make your day feel vivid.',
    ),
    score: (t) =>
      (t.fun ?? 0) * 1.5 +
      (t.dining ?? 0) * 1.8 +
      (t.exercise ?? 0) * 1.5 +
      (t.commercial ?? 0) * 1.5 +
      (t.food ?? 0),
  },
  {
    id: 'balance',
    name: text('균형의 설계자', 'The Balance Architect'),
    english: 'THE BALANCE ARCHITECT',
    icon: 'balance',
    description: text(
      '한 조건을 극단적으로 밀기보다 일과 휴식, 생활 편의와 주거의 균형을 설계합니다.',
      'You design a sustainable balance between work, rest, everyday convenience, and the home itself.',
    ),
    score: (t, stats) =>
      28 -
      (Math.max(stats.fun, stats.work, stats.rest) - Math.min(stats.fun, stats.work, stats.rest)) *
        0.38 +
      (t.affordability ?? 0) +
      (t.convenience ?? 0) * 0.5,
  },
];

export function localize(value: LocalizedText, locale: DeckLocale): string {
  return value[locale];
}

export function getDeckQuestions(mode: DeckMode): DeckQuestion[] {
  return mode === 'routine' ? ROUTINE_QUESTIONS : INTUITION_QUESTIONS;
}

export function getArchetype(id: string): LifeArchetype {
  return ARCHETYPES.find((archetype) => archetype.id === id) ?? ARCHETYPES[5];
}

export function getAnswerOption(
  mode: DeckMode,
  questionId: string,
  optionId: string,
): DeckOption | undefined {
  return getDeckQuestions(mode)
    .find((question) => question.id === questionId)
    ?.options.find((option) => option.id === optionId);
}

function sumTraits(mode: DeckMode, answers: Record<string, string>): Traits {
  const result: Traits = {};
  for (const question of getDeckQuestions(mode)) {
    const option = question.options.find((candidate) => candidate.id === answers[question.id]);
    for (const [key, value] of Object.entries(option?.traits ?? {}) as [TraitKey, number][]) {
      result[key] = (result[key] ?? 0) + value;
    }
  }
  return result;
}

function calculateLifeStats(traits: Traits): LifeStats {
  const funRaw = Math.max(
    1,
    (traits.fun ?? 0) +
      (traits.cafe ?? 0) * 0.45 +
      (traits.food ?? 0) * 0.35 +
      (traits.exercise ?? 0) * 0.35 +
      (traits.dining ?? 0) * 0.35,
  );
  const workRaw = Math.max(
    1,
    (traits.work ?? 0) +
      (traits.commute ?? 0) * 0.55 +
      (traits.destination ?? 0) * 0.45 +
      (traits.convenience ?? 0) * 0.2,
  );
  const restRaw = Math.max(
    1,
    (traits.rest ?? 0) +
      (traits.home ?? 0) * 0.4 +
      (traits.green ?? 0) * 0.5 +
      (traits.residential ?? 0) * 0.35 +
      (traits.walking ?? 0) * 0.25,
  );
  const total = funRaw + workRaw + restRaw;
  const fun = Math.round((funRaw / total) * 100);
  const work = Math.round((workRaw / total) * 100);
  return { fun, work, rest: 100 - fun - work };
}

function calculateRoutine(traits: Traits): WeeklyRoutine {
  const raw: WeeklyRoutine = {
    commute: Math.max(0, (traits.commute ?? 0) + (traits.destination ?? 0) * 0.7),
    focus: Math.max(
      0,
      (traits.work ?? 0) * 0.75 + (traits.home ?? 0) * 0.25 + (traits.cafe ?? 0) * 0.2,
    ),
    cafe: Math.max(0, (traits.cafe ?? 0) + (traits.commercial ?? 0) * 0.2),
    exercise: Math.max(0, (traits.exercise ?? 0) + (traits.fun ?? 0) * 0.12),
    dining: Math.max(
      0,
      (traits.dining ?? 0) + (traits.food ?? 0) * 0.7 + (traits.commercial ?? 0) * 0.15,
    ),
    culture: Math.max(0, (traits.fun ?? 0) * 0.45 + (traits.commercial ?? 0) * 0.25),
    walking: Math.max(
      0,
      (traits.walking ?? 0) + (traits.green ?? 0) * 0.6 + (traits.rest ?? 0) * 0.2,
    ),
    homeRest: Math.max(
      0,
      (traits.home ?? 0) + (traits.rest ?? 0) * 0.7 + (traits.residential ?? 0) * 0.25,
    ),
  };
  const maxSignal = Math.max(...Object.values(raw), 1);
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      value <= 0 ? 0 : Math.max(1, Math.min(7, Math.round((value / maxSignal) * 7))),
    ]),
  ) as WeeklyRoutine;
}

export function calculateLifeDeckResult(
  mode: DeckMode,
  answers: Record<string, string>,
): LifeDeckResult {
  const traits = sumTraits(mode, answers);
  const lifeStats = calculateLifeStats(traits);
  const ranked = ARCHETYPES.map((archetype) => ({
    id: archetype.id,
    value: archetype.score(traits, lifeStats),
  })).sort((a, b) => b.value - a.value);
  const primary = ranked[0];
  const secondary = ranked[1];
  const pairTotal = Math.max(1, primary.value + secondary.value);

  return {
    mode,
    answers: { ...answers },
    lifeStats,
    routine: calculateRoutine(traits),
    archetypeId: primary.id,
    secondaryArchetypeId: secondary.id,
    secondaryPercent: Math.round((secondary.value / pairTotal) * 100),
    mustKeepId: answers['must-have'],
    relaxFirstId: answers.reverse,
  };
}
