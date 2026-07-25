export const ROUTES = {
  Root: '/',
  About: '/about',
  HousingDetail: '/housing/:id',
  LifeMatch: '/life-match',
  Policy: '/policy',
};

export function housingDetailPath(id: number): string {
  return `/housing/${id}`;
}
