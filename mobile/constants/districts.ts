export const DISTRICTS = [
  '강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구',
  '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구',
] as const;

export type District = (typeof DISTRICTS)[number];

/** Approximate center of each 구/군, used when a district filter is picked. */
export const DISTRICT_CENTERS: Record<District, { latitude: number; longitude: number }> = {
  강서구: { latitude: 35.2122, longitude: 128.9805 },
  금정구: { latitude: 35.2428, longitude: 129.0924 },
  기장군: { latitude: 35.2446, longitude: 129.2223 },
  남구: { latitude: 35.1366, longitude: 129.0843 },
  동구: { latitude: 35.129, longitude: 129.0454 },
  동래구: { latitude: 35.205, longitude: 129.0839 },
  부산진구: { latitude: 35.1631, longitude: 129.0532 },
  북구: { latitude: 35.1972, longitude: 128.9903 },
  사상구: { latitude: 35.1526, longitude: 128.991 },
  사하구: { latitude: 35.1046, longitude: 128.9746 },
  서구: { latitude: 35.0979, longitude: 129.0243 },
  수영구: { latitude: 35.1454, longitude: 129.1134 },
  연제구: { latitude: 35.1762, longitude: 129.0798 },
  영도구: { latitude: 35.0912, longitude: 129.0679 },
  중구: { latitude: 35.1064, longitude: 129.0323 },
  해운대구: { latitude: 35.1631, longitude: 129.1636 },
};

/** Seomyeon, Busan's commercial core: a better landing view than the city centroid. */
export const DEFAULT_CAMERA = { latitude: 35.1578, longitude: 129.0592 };
