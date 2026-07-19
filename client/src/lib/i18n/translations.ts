export type Locale = "ko" | "en";

export interface Translations {
  languageLabel: string;
  nav: {
    recommend: string;
    search: string;
  };
  footer: string;
  home: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    recommendEyebrow: string;
    recommendTitle: string;
    recommendBody: string;
    recommendCta: string;
    searchEyebrow: string;
    searchTitle: string;
    searchBody: string;
    searchCta: string;
  };
  search: {
    title: string;
    subtitle: string;
    depositMaxLabel: string;
    depositMaxPlaceholder: string;
    builtAfterLabel: string;
    builtAfterPlaceholder: string;
    roomCountLabel: string;
    roomCountPlaceholder: string;
    districtLabel: string;
    districtAll: string;
    typeLabel: string;
    typeAll: string;
    submit: string;
    prompt: string;
    loading: string;
    error: string;
    empty: string;
  };
  recommend: {
    title: string;
    subtitle: string;
    chooseHeading: string;
    loadingCategories: string;
    importanceHeading: string;
    districtLabel: string;
    districtPlaceholder: string;
    depositMaxLabel: string;
    depositMaxPlaceholder: string;
    radiusLabel: string;
    submit: string;
    submitting: string;
    error: string;
    emptyResult: string;
    scoreLabel: string;
  };
  detail: {
    loading: string;
    notFound: string;
    specType: string;
    specAddress: string;
    specBuiltDate: string;
    specTotalUnits: string;
    specDeposit: string;
    specRent: string;
    noData: string;
    locationHeading: string;
    nearbyPlaceholder: string;
  };
  housingType: Record<"purchased" | "redevelopment" | "integrated" | "happy", string>;
  housingCard: {
    deposit: string;
    rent: string;
  };
  map: {
    noKeyTitle: string;
    noKeyDetail: string;
    noCoordsTitle: string;
    noCoordsDetail: string;
    errorTitle: string;
    errorDetail: string;
  };
  districts: Record<string, string>;
  units: {
    radiusOption: (meters: number) => string;
    matchCount: (count: number, meters: number) => string;
    matchNone: string;
    totalUnits: (count: number) => string;
  };
}

// Canonical Korean district names — always the value sent to the API.
export const DISTRICTS = [
  "강서구",
  "금정구",
  "기장군",
  "남구",
  "동구",
  "동래구",
  "부산진구",
  "북구",
  "사상구",
  "사하구",
  "서구",
  "수영구",
  "연제구",
  "영도구",
  "중구",
  "해운대구",
] as const;

const districtsKo: Record<string, string> = Object.fromEntries(DISTRICTS.map((d) => [d, d]));

const districtsEn: Record<string, string> = {
  강서구: "Gangseo-gu",
  금정구: "Geumjeong-gu",
  기장군: "Gijang-gun",
  남구: "Nam-gu",
  동구: "Dong-gu",
  동래구: "Dongnae-gu",
  부산진구: "Busanjin-gu",
  북구: "Buk-gu",
  사상구: "Sasang-gu",
  사하구: "Saha-gu",
  서구: "Seo-gu",
  수영구: "Suyeong-gu",
  연제구: "Yeonje-gu",
  영도구: "Yeongdo-gu",
  중구: "Jung-gu",
  해운대구: "Haeundae-gu",
};

export const ko: Translations = {
  languageLabel: "언어",
  nav: {
    recommend: "취향으로 찾기",
    search: "조건으로 찾기",
  },
  footer: "DIVE 2026 · 부산도시공사 × 선도소프트 · 상권·취향 기반 공공임대주택 추천 서비스",
  home: {
    eyebrow: "부산광역시 공공임대주택",
    titleLine1: "동네를 먼저 보고,",
    titleLine2: "집을 고르세요.",
    subtitle:
      "보증금과 평수만으로는 알 수 없는 것들 — 자주 가는 카페, 다니는 헬스장, 가까운 편의점까지 고려한 공공임대주택 추천 서비스예요.",
    recommendEyebrow: "취향 기반",
    recommendTitle: "취향으로 찾기",
    recommendBody:
      '"자주 가는 카페, 헬스장, 편의점이 가까운 임대주택 어디야?" — 좋아하는 상권을 고르면 가까운 순서로 추천해드려요.',
    recommendCta: "취향 입력하기 →",
    searchEyebrow: "조건 기반",
    searchTitle: "조건으로 찾기",
    searchBody:
      '"5년 이내 신축, 보증금 3천만원 미만" — 원하는 조건을 정확히 입력해서 바로 필터링된 목록을 받아보세요.',
    searchCta: "조건 입력하기 →",
  },
  search: {
    title: "조건으로 찾기",
    subtitle: "보증금, 건축연도, 방수, 지역으로 원하는 임대주택을 바로 필터링하세요.",
    depositMaxLabel: "보증금 상한 (만원)",
    depositMaxPlaceholder: "예: 3000",
    builtAfterLabel: "건축연도 이후",
    builtAfterPlaceholder: "예: 2020",
    roomCountLabel: "방수",
    roomCountPlaceholder: "예: 2",
    districtLabel: "지역",
    districtAll: "전체",
    typeLabel: "주택 유형",
    typeAll: "전체",
    submit: "검색",
    prompt: "조건을 입력하고 검색을 눌러주세요.",
    loading: "검색 중...",
    error: "검색에 실패했습니다. 다시 시도해주세요.",
    empty: "조건에 맞는 임대주택이 없어요. 조건을 조금 넓혀보세요.",
  },
  recommend: {
    title: "취향으로 찾기",
    subtitle: "자주 가는 곳을 골라주시면, 가까운 순서로 임대주택을 추천해드려요.",
    chooseHeading: "자주 이용하는 곳을 선택하세요",
    loadingCategories: "불러오는 중...",
    importanceHeading: "얼마나 중요한가요?",
    districtLabel: "지역 (선택)",
    districtPlaceholder: "예: 수영구",
    depositMaxLabel: "보증금 상한 (만원, 선택)",
    depositMaxPlaceholder: "예: 3000",
    radiusLabel: "반경",
    submit: "추천받기",
    submitting: "찾는 중...",
    error: "추천을 불러오지 못했습니다. 다시 시도해주세요.",
    emptyResult:
      "조건에 맞는 결과가 없어요. 아직 위치 정보가 등록된 임대주택이 없을 수 있어요 — 지오코딩이 완료되면 결과가 채워집니다.",
    scoreLabel: "점수",
  },
  detail: {
    loading: "불러오는 중...",
    notFound: "해당 임대주택을 찾을 수 없습니다.",
    specType: "유형",
    specAddress: "주소",
    specBuiltDate: "준공/사용승인일",
    specTotalUnits: "세대수",
    specDeposit: "보증금",
    specRent: "월 임대료",
    noData: "정보 없음",
    locationHeading: "위치",
    nearbyPlaceholder: "주변 상권 정보는 이 주택의 위치 정보(지오코딩)가 등록되면 표시됩니다.",
  },
  housingType: {
    purchased: "매입임대",
    redevelopment: "재개발임대",
    integrated: "통합공공임대",
    happy: "행복주택",
  },
  housingCard: {
    deposit: "보증금",
    rent: "월세",
  },
  map: {
    noKeyTitle: "지도를 표시할 수 없습니다",
    noKeyDetail: "Kakao Maps API 키가 아직 설정되지 않았어요.",
    noCoordsTitle: "위치 정보 없음",
    noCoordsDetail: "이 주택은 아직 지오코딩되지 않았어요.",
    errorTitle: "지도를 불러오지 못했습니다",
    errorDetail: "잠시 후 다시 시도해주세요.",
  },
  districts: districtsKo,
  units: {
    radiusOption: (meters) => `${meters}m 이내`,
    matchCount: (count, meters) => `${count}곳 · ${meters}m`,
    matchNone: "없음",
    totalUnits: (count) => `${count}세대`,
  },
};

export const en: Translations = {
  languageLabel: "Language",
  nav: {
    recommend: "Search by Preference",
    search: "Search by Criteria",
  },
  footer: "DIVE 2026 · Busan Metropolitan City (BMC) × Sundosoft · Commercial-district & preference-based public rental housing recommendation service",
  home: {
    eyebrow: "Busan Metropolitan City Public Rental Housing",
    titleLine1: "See the neighborhood first,",
    titleLine2: "then choose your home.",
    subtitle:
      "Things deposit and floor size alone can't tell you — the café you visit, the gym you go to, the convenience store nearby. We factor all of it into public housing recommendations.",
    recommendEyebrow: "Preference-based",
    recommendTitle: "Search by Preference",
    recommendBody:
      "\"Where's a rental unit close to the cafés, gyms, and convenience stores I actually use?\" — Pick the places you love, and we'll rank homes by proximity.",
    recommendCta: "Enter your preferences →",
    searchEyebrow: "Criteria-based",
    searchTitle: "Search by Criteria",
    searchBody:
      '"Built within 5 years, deposit under 30 million won" — enter exact conditions and get a filtered list instantly.',
    searchCta: "Enter your criteria →",
  },
  search: {
    title: "Search by Criteria",
    subtitle: "Filter rental housing instantly by deposit, build year, room count, and district.",
    depositMaxLabel: "Max deposit (10k KRW)",
    depositMaxPlaceholder: "e.g. 3000",
    builtAfterLabel: "Built after",
    builtAfterPlaceholder: "e.g. 2020",
    roomCountLabel: "Rooms",
    roomCountPlaceholder: "e.g. 2",
    districtLabel: "District",
    districtAll: "All",
    typeLabel: "Housing type",
    typeAll: "All",
    submit: "Search",
    prompt: "Enter your criteria and press search.",
    loading: "Searching...",
    error: "Search failed. Please try again.",
    empty: "No housing matches these criteria. Try broadening your search.",
  },
  recommend: {
    title: "Search by Preference",
    subtitle: "Pick the places you visit often, and we'll recommend housing ranked by proximity.",
    chooseHeading: "Select the places you use often",
    loadingCategories: "Loading...",
    importanceHeading: "How important is each one?",
    districtLabel: "District (optional)",
    districtPlaceholder: "e.g. Suyeong-gu",
    depositMaxLabel: "Max deposit (10k KRW, optional)",
    depositMaxPlaceholder: "e.g. 3000",
    radiusLabel: "Radius",
    submit: "Get recommendations",
    submitting: "Finding...",
    error: "Couldn't load recommendations. Please try again.",
    emptyResult:
      "No results match yet. There may be no geocoded housing in range — results will populate once geocoding completes.",
    scoreLabel: "Score",
  },
  detail: {
    loading: "Loading...",
    notFound: "This rental housing could not be found.",
    specType: "Type",
    specAddress: "Address",
    specBuiltDate: "Completion / approval date",
    specTotalUnits: "Total units",
    specDeposit: "Deposit",
    specRent: "Monthly rent",
    noData: "No data",
    locationHeading: "Location",
    nearbyPlaceholder: "Nearby commercial-area info will appear once this housing's location (geocoding) is registered.",
  },
  housingType: {
    purchased: "Purchased Rental Housing",
    redevelopment: "Redevelopment Rental Housing",
    integrated: "Integrated Public Rental Housing",
    happy: "Happy House",
  },
  housingCard: {
    deposit: "Deposit",
    rent: "Rent",
  },
  map: {
    noKeyTitle: "Map unavailable",
    noKeyDetail: "The Kakao Maps API key hasn't been set yet.",
    noCoordsTitle: "No location data",
    noCoordsDetail: "This housing hasn't been geocoded yet.",
    errorTitle: "Couldn't load the map",
    errorDetail: "Please try again shortly.",
  },
  districts: districtsEn,
  units: {
    radiusOption: (meters) => `Within ${meters}m`,
    matchCount: (count, meters) => `${count} places · ${meters}m`,
    matchNone: "None",
    totalUnits: (count) => `${count} units`,
  },
};
