export const ROUTES = {
  Root: '/',
  About: '/about',
  HousingDetail: '/housing/:id',
  LifeMatch: '/life-match',
  Policy: '/policy',
  Login: '/login',
  Signup: '/signup',
};

export function housingDetailPath(id: number): string {
  return `/housing/${id}`;
}
