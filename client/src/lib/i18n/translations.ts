export type Locale = "ko" | "en";

export interface Translations {
  languageLabel: string;
  nav: {
    backToExplore: string;
    savedLabel: string;
    aboutLabel: string;
  };
  footer: string;
  explore: {
    heroEyebrow: string;
    heroTitle: string;
    modeCriteria: string;
    modePreference: string;
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
    radiusLabel: string;
    submit: string;
    submitting: string;
    loading: string;
    error: string;
    empty: string;
    emptyResult: string;
    prompt: string;
    scoreLabel: string;
    detailLink: string;
  };
  poiCategoryLabels: {
    cafe: string;
    convenienceStore: string;
    gym: string;
    pharmacy: string;
    gasStation: string;
    food: string;
  };
  saved: {
    title: string;
    empty: string;
    saveLabel: string;
    unsaveLabel: string;
    viewSaved: string;
    viewResults: string;
  };
  about: {
    title: string;
    intro: string;
    problemHeading: string;
    problemBody: string;
    partnersHeading: string;
    bmcName: string;
    bmcBlurb: string;
    sundosoftName: string;
    sundosoftBlurb: string;
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
    backToExplore: "동네탐색",
    savedLabel: "찜 목록",
    aboutLabel: "서비스 소개",
  },
  footer: "DIVE 2026 · 부산도시공사 × 선도소프트 · 상권·취향 기반 공공임대주택 추천 서비스",
  explore: {
    heroEyebrow: "부산광역시 공공임대주택",
    heroTitle: "동네를 먼저 보고, 집을 고르세요.",
    modeCriteria: "조건으로 찾기",
    modePreference: "취향으로 찾기",
    depositMaxLabel: "보증금 상한(만원)",
    depositMaxPlaceholder: "예: 3000",
    builtAfterLabel: "건축연도 이후",
    builtAfterPlaceholder: "예: 2020",
    roomCountLabel: "방수",
    roomCountPlaceholder: "예: 2",
    districtLabel: "지역",
    districtAll: "전체",
    typeLabel: "유형",
    typeAll: "전체",
    radiusLabel: "반경",
    submit: "검색",
    submitting: "찾는 중...",
    loading: "검색 중...",
    error: "검색에 실패했습니다. 다시 시도해주세요.",
    empty: "조건에 맞는 임대주택이 없어요. 조건을 조금 넓혀보세요.",
    emptyResult: "조건에 맞는 결과가 없어요. 아직 위치 정보가 등록된 임대주택이 없을 수 있어요.",
    prompt: "지도를 움직이며 살펴보거나, 조건·취향을 입력해 검색해보세요.",
    scoreLabel: "점수",
    detailLink: "상세보기 →",
  },
  poiCategoryLabels: {
    cafe: "카페",
    convenienceStore: "편의점",
    gym: "헬스장",
    pharmacy: "약국",
    gasStation: "주유소",
    food: "음식점",
  },
  saved: {
    title: "찜 목록",
    empty: "아직 찜한 임대주택이 없어요. 마음에 드는 곳을 찜해보세요.",
    saveLabel: "찜하기",
    unsaveLabel: "찜 해제",
    viewSaved: "찜 목록",
    viewResults: "검색 결과",
  },
  about: {
    title: "서비스 소개",
    intro:
      "동네탐색은 부산광역시 인구 감소와 공공임대주택 입주 포기율 약 50%라는 문제에서 출발했습니다. 면적과 보증금만으로는 알 수 없는 동네의 상권과 생활 인프라를 먼저 보여드려요.",
    problemHeading: "왜 만들었나요",
    problemBody:
      "공급자 중심의 단순 조건(면적, 보증금) 공고만으로는 시민이 실제로 살고 싶은 동네인지 알기 어렵습니다. 주변 카페·헬스장·편의점 같은 생활 인프라를 확인하려면 공고를 일일이 따로 검색해야 했죠. 동네탐색은 취향과 조건을 함께 고려해 상권이 형성된 임대주택을 추천합니다.",
    partnersHeading: "함께한 기관",
    bmcName: "부산도시공사 (BMC)",
    bmcBlurb: "주거복지·도시개발 지방공기업. 공공임대주택 데이터와 시민 주거 수요 파악 채널을 제공했습니다.",
    sundosoftName: "㈜선도소프트",
    sundosoftBlurb: "GIS·데이터 분석 전문기업. 상권·인구 융합 데이터와 공간 분석 노하우를 제공했습니다.",
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
    backToExplore: "Dongne Tamsaek",
    savedLabel: "Saved",
    aboutLabel: "About",
  },
  footer: "DIVE 2026 · Busan Metropolitan City (BMC) × Sundosoft · Commercial-district & preference-based public rental housing recommendation service",
  explore: {
    heroEyebrow: "Busan Metropolitan City Public Rental Housing",
    heroTitle: "See the neighborhood first, then choose your home.",
    modeCriteria: "Search by Criteria",
    modePreference: "Search by Preference",
    depositMaxLabel: "Max deposit (10k KRW)",
    depositMaxPlaceholder: "e.g. 3000",
    builtAfterLabel: "Built after",
    builtAfterPlaceholder: "e.g. 2020",
    roomCountLabel: "Rooms",
    roomCountPlaceholder: "e.g. 2",
    districtLabel: "District",
    districtAll: "All",
    typeLabel: "Type",
    typeAll: "All",
    radiusLabel: "Radius",
    submit: "Search",
    submitting: "Finding...",
    loading: "Searching...",
    error: "Search failed. Please try again.",
    empty: "No housing matches these criteria. Try broadening your search.",
    emptyResult: "No results match yet. There may be no geocoded housing in range.",
    prompt: "Pan the map to explore, or enter criteria or preferences to search.",
    scoreLabel: "Score",
    detailLink: "View details →",
  },
  poiCategoryLabels: {
    cafe: "Cafés",
    convenienceStore: "Convenience stores",
    gym: "Gyms",
    pharmacy: "Pharmacies",
    gasStation: "Gas stations",
    food: "Restaurants",
  },
  saved: {
    title: "Saved",
    empty: "No saved housing yet — save places you like to see them here.",
    saveLabel: "Save",
    unsaveLabel: "Unsave",
    viewSaved: "Saved",
    viewResults: "Results",
  },
  about: {
    title: "About",
    intro:
      "Dongne Tamsaek started from Busan's shrinking population and the ~50% decline rate for public housing lottery winners. We show the surrounding neighborhood — not just deposit and floor size — first.",
    problemHeading: "Why we built this",
    problemBody:
      "Supply-side notices (size, deposit) alone don't tell citizens whether a listing is actually a neighborhood they'd want to live in. Checking nearby cafés, gyms, or convenience stores meant searching separately for every listing. Dongne Tamsaek recommends housing by combining hard conditions with real commercial-district context.",
    partnersHeading: "Partners",
    bmcName: "Busan Metropolitan City (BMC)",
    bmcBlurb:
      "A public housing and urban development corporation. Provided public rental housing data and a citizen housing-demand channel.",
    sundosoftName: "Sundosoft Co., Ltd.",
    sundosoftBlurb: "A GIS and data analytics company. Provided fused commercial-district/population data and spatial analysis expertise.",
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
