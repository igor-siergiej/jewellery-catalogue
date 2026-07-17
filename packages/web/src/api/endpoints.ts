export const MATERIALS_ENDPOINT = '/api/materials';
export const DESIGNS_ENDPOINT = '/api/designs';
export const DRAFTS_ENDPOINT = '/api/drafts';
export const USER_SETTINGS_ENDPOINT = '/api/user-settings';
export const RECALCULATE_PRICES_ENDPOINT = '/api/designs/recalculate-prices';
export const IMAGES_ENDPOINT = '/api/images';
export const ETSY_OAUTH_START_ENDPOINT = '/api/etsy/oauth/start';
export const ETSY_CONNECTION_ENDPOINT = '/api/etsy/connection';

export const getMaterialRecalculatePricesEndpoint = (materialId: string) =>
    `${MATERIALS_ENDPOINT}/${materialId}/recalculate-prices`;
