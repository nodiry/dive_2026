export type District = (typeof DISTRICTS)[number];

/** Approximate center of each 구/군 (the district office area) — the map
 * focuses here when a district filter is picked. */
export const DISTRICT_CENTERS: Record<District, { lat: number; lng: number }> = {
  강서구: { lat: 35.2122, lng: 128.9805 },
  금정구: { lat: 35.2428, lng: 129.0924 },
  기장군: { lat: 35.2446, lng: 129.2223 },
  남구: { lat: 35.1366, lng: 129.0843 },
  동구: { lat: 35.129, lng: 129.0454 },
  동래구: { lat: 35.205, lng: 129.0839 },
  부산진구: { lat: 35.1631, lng: 129.0532 },
  북구: { lat: 35.1972, lng: 128.9903 },
  사상구: { lat: 35.1526, lng: 128.991 },
  사하구: { lat: 35.1046, lng: 128.9746 },
  서구: { lat: 35.0979, lng: 129.0243 },
  수영구: { lat: 35.1454, lng: 129.1134 },
  연제구: { lat: 35.1762, lng: 129.0798 },
  영도구: { lat: 35.0912, lng: 129.0679 },
  중구: { lat: 35.1064, lng: 129.0323 },
  해운대구: { lat: 35.1631, lng: 129.1636 },
};

/** 시군구 코드 used to match a selected filter to the dissolved GIS boundary. */
export const DISTRICT_CODES: Record<District, string> = {
  강서구: '26440',
  금정구: '26410',
  기장군: '26710',
  남구: '26290',
  동구: '26170',
  동래구: '26260',
  부산진구: '26230',
  북구: '26320',
  사상구: '26530',
  사하구: '26380',
  서구: '26140',
  수영구: '26500',
  연제구: '26470',
  영도구: '26200',
  중구: '26110',
  해운대구: '26350',
};

/** Focus point when the district filter is cleared back to "전체" — Seomyeon,
 * Busan's commercial core, reads better as a landing view than the
 * geographic center of Busan (mostly empty hillside). */
export const ALL_DISTRICTS_FOCUS = { lat: 35.1578, lng: 129.0592 };

export const DISTRICTS = [
  '강서구',
  '금정구',
  '기장군',
  '남구',
  '동구',
  '동래구',
  '부산진구',
  '북구',
  '사상구',
  '사하구',
  '서구',
  '수영구',
  '연제구',
  '영도구',
  '중구',
  '해운대구',
] as const;
