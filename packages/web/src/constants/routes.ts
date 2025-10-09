import type { NavRoute } from './types';

export const START_PAGE: NavRoute = {
    name: 'Start Page',
    route: '/',
};

export const REGISTER_PAGE: NavRoute = {
    name: 'Register',
    route: '/register',
};

export const HOME_PAGE: NavRoute = {
    name: 'Home',
    route: '/home',
};

export const DESIGNS_PAGE: NavRoute = {
    name: 'Designs',
    route: '/designs',
};

export const ADD_DESIGN_PAGE: NavRoute = {
    name: 'Add Design',
    route: '/addDesign',
};

export const MATERIALS_PAGE: NavRoute = {
    name: 'Materials',
    route: '/materials',
};

export const ADD_MATERIAL_PAGE: NavRoute = {
    name: 'Add Material',
    route: '/addMaterial',
};

export const VIEW_DESIGN_PAGE = {
    name: 'View Design',
    route: '/designs/:id',
    getRoute: (id: string) => `/designs/${id}`,
};

export const ROUTES = [HOME_PAGE, DESIGNS_PAGE, ADD_DESIGN_PAGE, MATERIALS_PAGE, ADD_MATERIAL_PAGE];
