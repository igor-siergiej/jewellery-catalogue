export const MATERIALS_ENDPOINT = '/api/materials';
export const DESIGNS_ENDPOINT = '/api/designs';
export const DRAFTS_ENDPOINT = '/api/drafts';
export const USER_SETTINGS_ENDPOINT = '/api/user-settings';
export const RECALCULATE_PRICES_ENDPOINT = '/api/designs/recalculate-prices';
export const IMAGES_ENDPOINT = '/api/images';
export const ETSY_OAUTH_START_ENDPOINT = '/api/etsy/oauth/start';
export const ETSY_CONNECTION_ENDPOINT = '/api/etsy/connection';
export const ETSY_TAXONOMY_ENDPOINT = '/api/etsy/taxonomy';
export const ETSY_SHIPPING_PROFILES_ENDPOINT = '/api/etsy/shipping-profiles';
export const ETSY_LISTINGS_ENDPOINT = '/api/etsy/listings';
export const ETSY_RECONCILE_CREATE_ENDPOINT = '/api/etsy/reconcile/create';
export const ETSY_RECONCILE_LINK_ENDPOINT = '/api/etsy/reconcile/link';

export const getMaterialRecalculatePricesEndpoint = (materialId: string) =>
    `${MATERIALS_ENDPOINT}/${materialId}/recalculate-prices`;

export const getEtsyStatusEndpoint = (designId: string) => `${DESIGNS_ENDPOINT}/${designId}/etsy-status`;
