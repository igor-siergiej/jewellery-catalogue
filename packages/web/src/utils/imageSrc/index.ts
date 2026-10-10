const IMAGE_PATH = /(\/api\/image\/[A-Za-z0-9]+)(?![A-Za-z0-9?])/g;

export type ImageSize = 'thumb' | 'display';

// thumb is ~400px and display ~1600px WebP; omit size for the original upload.
export const getImageSrc = (imageId: string, accessToken?: string | null, size?: ImageSize): string => {
    const params = new URLSearchParams();
    if (size) params.set('size', size);
    if (accessToken) params.set('token', accessToken);
    const query = params.toString();

    return query ? `/api/image/${imageId}?${query}` : `/api/image/${imageId}`;
};

export const addTokenToImageUrls = (html: string, accessToken?: string | null): string =>
    accessToken ? html.replace(IMAGE_PATH, `$1?token=${encodeURIComponent(accessToken)}`) : html;
