export const ROUTES = {
  Root: '/',
  About: '/about',
  HousingDetail: '/housing/:id',
  Login: '/login',
  Signup: '/signup',
  AiSearch: '/search',
};

export function housingDetailPath(id: number): string {
  return `/housing/${id}`;
}
