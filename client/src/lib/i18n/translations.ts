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
  lifeMatch: {
    navLabel: string;
    title: string;
    intro: string;
    steps: [string, string, string];
    next: string;
    back: string;
    calculate: string;
    recalculating: string;
    resumeTitle: string;
    resumeDescription: string;
    liveResume: string;
    budget: string;
    home: string;
    location: string;
    depositMax: string;
    rentMax: string;
    minArea: string;
    minRooms: string;
    elevator: string;
    parking: string;
    vehicle: string;
    destination: string;
    destinationFrequency: string;
    destinationNote: string;
    destinationOptions: Record<"cityHall" | "seomyeon" | "centum" | "busanStation", string>;
    routineTitle: string;
    routineDescription: string;
    presets: {
      balanced: string;
      work: string;
      active: string;
      home: string;
    };
    activities: {
      commute: string;
      focus: string;
      cafe: string;
      exercise: string;
      dining: string;
      culture: string;
      walking: string;
      homeRest: string;
    };
    perWeek: string;
    statsTitle: string;
    fun: string;
    work: string;
    rest: string;
    resultTitle: string;
    resultDescription: string;
    noResults: string;
    error: string;
    matchRate: string;
    lifestyle: string;
    routine: string;
    housing: string;
    affordability: string;
    strength: string;
    caution: string;
    compareTitle: string;
    simulatorTitle: string;
    simulatorDescription: string;
    applyChanges: string;
    openDetail: string;
    close: string;
    houseResume: string;
    weekAtHome: string;
    dataBasis: string;
    demoWeightNote: string;
    quickRelaxTitle: string;
    quickRelaxDescription: string;
    zoningUnavailable: string;
    straightLineNote: string;
    residentialArea: string;
    commercialArea: string;
    greenArea: string;
    evidenceLabels: Record<"destination" | "nearbyPoi" | "zoning" | "proxy" | "unavailable", string>;
  };
  policy: {
    navLabel: string;
    title: string;
    intro: string;
    actualDataNote: string;
    totalProjects: string;
    geocodedCoverage: string;
    elevatorGap: string;
    parkingGap: string;
    stockByType: string;
    readinessTitle: string;
    readinessDescription: string;
    missingLocation: string;
    noElevator: string;
    noParking: string;
    olderStock: string;
    actionTitle: string;
    actions: [string, string, string];
    loading: string;
    error: string;
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
  lifeMatch: {
    navLabel: "라이프 매치",
    title: "하루스탯 부산",
    intro: "집의 조건보다 먼저, 내가 부산에서 보내는 하루를 기록해보세요.",
    steps: ["생활 이력서", "주간 루틴", "매치 결과"],
    next: "다음 단계",
    back: "이전",
    calculate: "라이프 매치 계산",
    recalculating: "다시 계산하는 중...",
    resumeTitle: "집을 위한 생활 이력서",
    resumeDescription: "입주 자격이 아닌, 실제로 살 집을 고르는 데 필요한 조건만 받습니다.",
    liveResume: "MY LIFE RESUME",
    budget: "예산",
    home: "집 조건",
    location: "생활권",
    depositMax: "보증금 상한(만원)",
    rentMax: "월 임대료 상한(만원)",
    minArea: "최소 면적(㎡)",
    minRooms: "최소 방 수",
    elevator: "승강기 필수",
    parking: "주차 필수",
    vehicle: "차량 보유",
    destination: "주요 목적지",
    destinationFrequency: "주당 방문 횟수",
    destinationNote: "현재 WORK는 목적지까지 직선거리와 주변 업무 편의시설로 계산합니다.",
    destinationOptions: { cityHall: "부산시청", seomyeon: "서면역", centum: "센텀시티역", busanStation: "부산역" },
    routineTitle: "일주일의 리듬을 알려주세요",
    routineDescription: "자주 하는 활동일수록 가까운 생활 인프라에 더 높은 가중치를 줍니다.",
    presets: { balanced: "균형형", work: "직장 중심", active: "활동 중심", home: "집 중심" },
    activities: {
      commute: "출근·통학",
      focus: "집중 작업",
      cafe: "카페",
      exercise: "운동",
      dining: "외식",
      culture: "문화생활",
      walking: "산책",
      homeRest: "집에서 휴식",
    },
    perWeek: "주 회",
    statsTitle: "라이프 스탯",
    fun: "FUN",
    work: "WORK",
    rest: "REST",
    resultTitle: "당신의 부산 라이프 매치",
    resultDescription: "필수조건을 통과한 주택만 생활권·루틴·집 조건·가격 여유로 비교했습니다.",
    noResults: "조건을 통과한 주택이 없습니다. 시뮬레이터에서 예산이나 면적을 조금 조정해보세요.",
    error: "추천 결과를 불러오지 못했습니다. API와 데이터 연결 상태를 확인해주세요.",
    matchRate: "종합 매치율",
    lifestyle: "생활 스탯",
    routine: "주간 루틴",
    housing: "주택 조건",
    affordability: "가격 여유",
    strength: "결정적 강점",
    caution: "주의 요소",
    compareTitle: "상위 후보 전적 비교",
    simulatorTitle: "생활 빌드 조정",
    simulatorDescription: "조건을 바꾸고 후보 수와 1위 변화를 다시 계산합니다.",
    applyChanges: "변경 조건으로 다시 계산",
    openDetail: "집 이력서 보기",
    close: "닫기",
    houseResume: "집 이력서",
    weekAtHome: "이번 집에서의 일주일",
    dataBasis: "데이터 근거",
    demoWeightNote: "매치 가중치는 프로토타입 기준이며 실제 운영 전 사용자 검증이 필요합니다.",
    quickRelaxTitle: "후보가 적다면 바로 조정해보세요",
    quickRelaxDescription: "제안을 누르면 조건을 바꾸고 실제 추천 API를 다시 계산합니다.",
    zoningUnavailable: "이 주택은 용도지역 근거가 없어 REST를 중립값으로 처리했습니다.",
    straightLineNote: "WORK 거리는 대중교통 시간이 아닌 직선거리 기반 추정치입니다.",
    residentialArea: "주거지역",
    commercialArea: "상업지역",
    greenArea: "녹지지역",
    evidenceLabels: { destination: "목적지 거리", nearbyPoi: "주변 시설", zoning: "용도지역", proxy: "대리지표", unavailable: "근거 데이터 없음" },
  },
  policy: {
    navLabel: "정책 리포트",
    title: "공공임대 공급 준비도",
    intro: "가상 이용자 통계가 아닌, 현재 적재된 주택 재고의 정보 품질과 생활권 분석 준비도를 점검합니다.",
    actualDataNote: "현재 데이터베이스의 실제 주택 레코드를 집계한 운영용 프로토타입입니다.",
    totalProjects: "분석 주택",
    geocodedCoverage: "위치정보 확보율",
    elevatorGap: "승강기 취약 주택",
    parkingGap: "주차 취약 주택",
    stockByType: "임대유형별 재고",
    readinessTitle: "추천 준비도 점검",
    readinessDescription: "추천에서 반복적으로 누락되거나 설명력이 낮아질 수 있는 데이터 상태입니다.",
    missingLocation: "위치정보 미확보",
    noElevator: "승강기 미설치·정보 없음",
    noParking: "주차 0대·정보 없음",
    olderStock: "2000년 이전 준공",
    actionTitle: "운영 제안",
    actions: ["위치정보 미확보 주택을 우선 지오코딩해 추천 사각지대를 줄입니다.", "승강기·주차 정보를 공고문에서 구조화해 필수조건 탈락 이유를 명확히 합니다.", "생활권 점수와 데이터 기준연도를 모집공고 상세에 함께 제공합니다."],
    loading: "정책 지표를 계산하는 중입니다.",
    error: "정책 지표를 불러오지 못했습니다.",
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
  lifeMatch: {
    navLabel: "Life Match",
    title: "Haru Stat Busan",
    intro: "Start with how you spend a week in Busan, not just a housing checklist.",
    steps: ["Life resume", "Weekly routine", "Match results"],
    next: "Next",
    back: "Back",
    calculate: "Calculate life match",
    recalculating: "Recalculating...",
    resumeTitle: "Your housing life resume",
    resumeDescription: "We only ask for the practical conditions you need to choose a home.",
    liveResume: "MY LIFE RESUME",
    budget: "Budget",
    home: "Home",
    location: "Area",
    depositMax: "Max deposit (10k KRW)",
    rentMax: "Max rent (10k KRW)",
    minArea: "Minimum area (㎡)",
    minRooms: "Minimum rooms",
    elevator: "Elevator required",
    parking: "Parking required",
    vehicle: "I own a car",
    destination: "Frequent destination",
    destinationFrequency: "Visits per week",
    destinationNote: "WORK currently uses straight-line distance and nearby workday amenities.",
    destinationOptions: { cityHall: "Busan City Hall", seomyeon: "Seomyeon Station", centum: "Centum City Station", busanStation: "Busan Station" },
    routineTitle: "Describe the rhythm of your week",
    routineDescription: "Frequent activities receive more weight in nearby-infrastructure matching.",
    presets: { balanced: "Balanced", work: "Work-first", active: "Active", home: "Home-first" },
    activities: {
      commute: "Commute",
      focus: "Focused work",
      cafe: "Cafés",
      exercise: "Exercise",
      dining: "Dining out",
      culture: "Culture",
      walking: "Walking",
      homeRest: "Resting at home",
    },
    perWeek: "days/wk",
    statsTitle: "Life stats",
    fun: "FUN",
    work: "WORK",
    rest: "REST",
    resultTitle: "Your Busan life matches",
    resultDescription: "Only homes that pass your must-haves are ranked by lifestyle, routine, home fit, and budget room.",
    noResults: "No homes pass these conditions. Adjust budget or floor area in the simulator.",
    error: "Matches could not be loaded. Check the API and data connection.",
    matchRate: "Overall match",
    lifestyle: "Life stats",
    routine: "Weekly routine",
    housing: "Housing fit",
    affordability: "Budget room",
    strength: "Decisive strength",
    caution: "Watch-out",
    compareTitle: "Top candidate comparison",
    simulatorTitle: "Adjust your build",
    simulatorDescription: "Change conditions and recalculate the candidate count and top match.",
    applyChanges: "Recalculate",
    openDetail: "View home resume",
    close: "Close",
    houseResume: "Home resume",
    weekAtHome: "A week in this home",
    dataBasis: "Data basis",
    demoWeightNote: "Match weights are prototype defaults and need user validation before production use.",
    quickRelaxTitle: "Broaden a tight result set",
    quickRelaxDescription: "Each suggestion changes the condition and recalculates the real recommendation API.",
    zoningUnavailable: "REST uses a neutral value because zoning evidence is unavailable for this home.",
    straightLineNote: "WORK distance is a straight-line proxy, not public-transit travel time.",
    residentialArea: "Residential zoning",
    commercialArea: "Commercial zoning",
    greenArea: "Green zoning",
    evidenceLabels: { destination: "Destination distance", nearbyPoi: "Nearby places", zoning: "Zoning", proxy: "Proxy", unavailable: "No supporting data" },
  },
  policy: {
    navLabel: "Policy report",
    title: "Public-housing recommendation readiness",
    intro: "This view audits the information quality and neighborhood-analysis readiness of loaded housing stock, not synthetic citizen behavior.",
    actualDataNote: "Operational prototype aggregated from real housing records in the current database.",
    totalProjects: "Homes analyzed",
    geocodedCoverage: "Location coverage",
    elevatorGap: "Elevator gap",
    parkingGap: "Parking gap",
    stockByType: "Stock by rental type",
    readinessTitle: "Recommendation readiness",
    readinessDescription: "Data conditions that can exclude homes or weaken explanations.",
    missingLocation: "Missing location",
    noElevator: "No/unknown elevator",
    noParking: "Zero/unknown parking",
    olderStock: "Built before 2000",
    actionTitle: "Operational actions",
    actions: ["Geocode missing housing first to reduce recommendation blind spots.", "Structure elevator and parking fields from notices so exclusions are explainable.", "Publish neighborhood scores and source years alongside listing details."],
    loading: "Calculating policy indicators.",
    error: "Policy indicators could not be loaded.",
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
