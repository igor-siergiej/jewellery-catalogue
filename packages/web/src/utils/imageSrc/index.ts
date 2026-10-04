const IMAGE_PATH = /(\/api\/image\/[A-Za-z0-9]+)(?![A-Za-z0-9?])/g;

export const getImageSrc = (imageId: string, accessToken?: string | null): string => {
    const src = `/api/image/${imageId}`;

    return accessToken ? `${src}?token=${encodeURIComponent(accessToken)}` : src;
};

export const addTokenToImageUrls = (html: string, accessToken?: string | null): string =>
    accessToken ? html.replace(IMAGE_PATH, `$1?token=${encodeURIComponent(accessToken)}`) : html;
