import type { DeckLocale } from '@/features/life-match/deck-model';

/**
 * The deck's own chrome copy. It lives here rather than in the i18n JSON
 * because every other string the deck renders (questions, options, archetypes)
 * is already bilingual inside deck-model.ts, so one lookup style covers the
 * whole surface.
 */
export const DECK_UI = {
  ko: {
    eyebrow: '7장의 동네 · LIFE DECK',
    titleBefore: '당신의 하루는 ',
    titleClear: '선명한가요',
    titleMiddle: ', 아직 ',
    titleHidden: '숨어 있나요?',
    intro:
      '내 생활을 잘 아는 사람과 아직 말로 설명하기 어려운 사람에게 서로 다른 일곱 장을 펼칩니다.',
    sharedEngine: '두 길은 마지막에 같은 공공임대·상권·공간 데이터 추천 엔진으로 이어집니다.',
    direct: '직접 선택',
    inferred: '직감 해석',
    cards: '07 CARDS',
    choose: '한 장을 선택하면 의미가 공개됩니다.',
    chosen: '선택 완료. 이 장면을 당신의 하루에 기록했습니다.',
    back: '이전',
    next: '다음 장면',
    reveal: '생활 아르카나 공개',
    resultEyebrow: '당신의 생활 아르카나',
    resultTitle: '일곱 장에서 발견한 부산의 하루',
    secondary: '보조 성향',
    selectedScenes: '당신이 고른 일곱 장면',
    realityCta: '현실 조건 확인',
    realityEyebrow: '마지막 확인',
    realityTitle: '좋아하는 하루가 실제 집이 되려면',
    realityDescription:
      '카드가 발견한 취향에 예산·면적·목적지를 더합니다. 이 값은 실제 추천 API의 필수조건으로 사용됩니다.',
    budget: '예산',
    home: '집 조건',
    location: '생활권',
    depositMax: '보증금 상한(만원)',
    rentMax: '월 임대료 상한(만원)',
    minArea: '최소 면적',
    minRooms: '최소 방 수',
    district: '구·군',
    districtAll: '부산 전체',
    housingType: '임대 유형',
    housingTypeAll: '전체 유형',
    destination: '주요 목적지',
    destinationFrequency: '주당 방문',
    elevator: '승강기 필수',
    parking: '주차 필수',
    vehicle: '차량 보유',
    seeMatches: '내 부산 라이프 매치 보기',
    summarySignal: '카드에서 추천값으로 변환 완료',
    retake: '카드 다시 펼치기',
    adjust: '아래에서 세부 조건을 바꾸면 결과가 바로 다시 계산됩니다.',
    mustKeep: '반드시 지킬 조건',
    relaxFirst: '먼저 완화할 조건',
    times: '회',
  },
  en: {
    eyebrow: 'SEVEN NEIGHBORHOOD CARDS · LIFE DECK',
    titleBefore: 'Is your day ',
    titleClear: 'clear',
    titleMiddle: ', or still ',
    titleHidden: 'hidden?',
    intro:
      'Two paths help people who know their routine and people who cannot yet put their ideal day into words.',
    sharedEngine:
      'Both paths lead to the same public-housing, commercial-area, and spatial-data engine.',
    direct: 'Direct signals',
    inferred: 'Intuitive signals',
    cards: '07 CARDS',
    choose: 'Choose a card to reveal what it means.',
    chosen: 'Selected. This scene is now part of your day.',
    back: 'Back',
    next: 'Next scene',
    reveal: 'Reveal my life arcana',
    resultEyebrow: 'YOUR LIFE ARCANA',
    resultTitle: 'The Busan day hidden in seven cards',
    secondary: 'Secondary pattern',
    selectedScenes: 'Your seven scenes',
    realityCta: 'Confirm real conditions',
    realityEyebrow: 'FINAL CHECK',
    realityTitle: 'Turn a day you love into a real home',
    realityDescription:
      'Add budget, area, and destination to the preferences discovered by the cards. These values become real API filters.',
    budget: 'Budget',
    home: 'Home',
    location: 'Area',
    depositMax: 'Max deposit (10k KRW)',
    rentMax: 'Max rent (10k KRW)',
    minArea: 'Minimum area',
    minRooms: 'Minimum rooms',
    district: 'District',
    districtAll: 'All Busan',
    housingType: 'Rental type',
    housingTypeAll: 'All types',
    destination: 'Frequent destination',
    destinationFrequency: 'Visits per week',
    elevator: 'Elevator required',
    parking: 'Parking required',
    vehicle: 'I own a car',
    seeMatches: 'See my Busan life matches',
    summarySignal: 'Cards translated into recommendation signals',
    retake: 'Retake the cards',
    adjust: 'Fine-tune any condition below and the results will recalculate.',
    mustKeep: 'Must keep',
    relaxFirst: 'Relax first',
    times: 'times',
  },
} as const;

/** Widened away from the `as const` literals so both locales share one type. */
export type DeckCopy = { [K in keyof (typeof DECK_UI)['ko']]: string };

export function deckLocale(language: string): DeckLocale {
  return language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}
