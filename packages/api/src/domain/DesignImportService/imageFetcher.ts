export interface EtsyImageFetcher {
    fetch(url: string): Promise<{ buffer: Buffer; contentType: string }>;
}

// fallow-ignore-next-line unused-export
export const isAllowedEtsyUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && parsed.hostname === 'i.etsystatic.com';
    } catch {
        return false;
    }
};

export class HttpEtsyImageFetcher implements EtsyImageFetcher {
    constructor(private readonly fetchFn: typeof fetch = fetch) {}

    async fetch(url: string): Promise<{ buffer: Buffer; contentType: string }> {
        if (!isAllowedEtsyUrl(url)) {
            throw Object.assign(new Error(`Refusing to fetch image from disallowed host: ${url}`), { status: 400 });
        }
        const res = await this.fetchFn(url);
        if (!res.ok) {
            throw Object.assign(new Error(`Image fetch failed (${res.status}) for ${url}`), { status: 502 });
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get('content-type') ?? 'image/jpeg';
        return { buffer, contentType };
    }
}
