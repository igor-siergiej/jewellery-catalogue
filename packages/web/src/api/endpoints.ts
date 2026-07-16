export const MATERIALS_ENDPOINT = '/api/materials';
export const DESIGNS_ENDPOINT = '/api/designs';
export const DRAFTS_ENDPOINT = '/api/drafts';
export const USER_SETTINGS_ENDPOINT = '/api/user-settings';
export const RECALCULATE_PRICES_ENDPOINT = '/api/designs/recalculate-prices';
export const IMAGES_ENDPOINT = '/api/images';
export const DESIGNS_IMPORT_PREVIEW_ENDPOINT = '/api/designs/import/preview';
export const DESIGNS_IMPORT_COMMIT_ENDPOINT = '/api/designs/import/commit';
export const DESIGNS_IMPORT_RUNS_ENDPOINT = '/api/designs/import/runs';
export const getImportRunEndpoint = (id: string) => `${DESIGNS_IMPORT_RUNS_ENDPOINT}/${id}`;
export const getCancelImportRunEndpoint = (id: string) => `${DESIGNS_IMPORT_RUNS_ENDPOINT}/${id}/cancel`;

export const getMaterialRecalculatePricesEndpoint = (materialId: string) =>
    `${MATERIALS_ENDPOINT}/${materialId}/recalculate-prices`;
