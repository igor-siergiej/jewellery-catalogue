export interface AppConfig {
    AUTH_URL: string;
    /**
     * Self-hosted Umami analytics (jott #124). `host` is the base URL the
     * tracker script `p.js` is served under (production: same-origin
     * `https://jewellery-catalogue.imapps.uk/pulse`). The web app is a no-op
     * tracker when `enabled` is `false` or the fields are missing.
     */
    analytics?: {
        host?: string;
        websiteId?: string;
        enabled?: boolean;
    };
}

let config: AppConfig | null = null;

export const loadConfig = async (): Promise<AppConfig> => {
    try {
        const response = await fetch('/config.json');

        if (!response.ok) {
            throw new Error(`Failed to load config.json: ${response.status} ${response.statusText}`);
        }

        const configData = await response.json();

        if (!configData.AUTH_URL) {
            throw new Error('AUTH_URL is required in config.json');
        }

        config = configData as AppConfig;

        return config;
    } catch (error) {
        throw new Error(`Configuration failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const getConfig = (): AppConfig => {
    if (!config) {
        throw new Error('Configuration not loaded.');
    }

    return config;
};
