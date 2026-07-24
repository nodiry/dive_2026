export const ROUTES = {
  Root: '/',
  About: '/about',
  HousingDetail: '/housing/:id',
};

export function housingDetailPath(id: number): string {
  return `/housing/${id}`;
}
