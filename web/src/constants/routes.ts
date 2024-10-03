import { NavRoute } from './types';

export const START_PAGE: NavRoute = {
  name: 'Start Page',
  route: '/',
};

export const HOME_PAGE: NavRoute = {
  name: 'Home',
  route: 'home',
};

export const DESIGNS_PAGE: NavRoute = {
  name: 'Designs',
  route: 'designs',
};

export const ROUTES = [HOME_PAGE, DESIGNS_PAGE];
