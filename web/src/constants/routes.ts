import { NavRoute } from './types';

export const START_PAGE: NavRoute = {
    name: 'Start Page',
    route: '/',
};

export const HOME_PAGE: NavRoute = {
    name: 'Home',
    route: 'home',
};

export const ITEMS_PAGE: NavRoute = {
    name: 'Items',
    route: 'items',
};

export const ROUTES = [HOME_PAGE, ITEMS_PAGE];
