import type { Page } from '@playwright/test';

// The e2e stack has no object store, so image bytes never reach the API. File parts are swapped for
// `e2e-upload-<filename>` image ids and the rest of the request goes through to the real API.

export const uploadedImageId = (filename: string) => `e2e-upload-${filename}`;

export async function mockDraftImageUpload(page: Page) {
    await page.route(/\/api\/drafts\/[^/]+\/image$/, async (route) => {
        const form = await readMultipart(route.request().postDataBuffer(), route.request().headers()['content-type']);
        const file = form.get('file');
        const name = file instanceof File ? file.name : 'unknown';
        await route.fulfill({ json: { imageId: uploadedImageId(name) } });
    });
}

/** Rewrites multipart design creates (`POST /api/designs`) into JSON creates with placeholder image ids. */
export async function stripDesignImageUploads(page: Page, onFiles?: (filenames: string[]) => void) {
    await page.route(/\/api\/designs$/, async (route) => {
        const request = route.request();
        const contentType = request.headers()['content-type'] ?? '';
        if (request.method() !== 'POST' || !contentType.includes('multipart/form-data')) {
            await route.continue();
            return;
        }

        const form = await readMultipart(request.postDataBuffer(), contentType);
        const body: Record<string, string> = {};
        const filenames: string[] = [];
        for (const [key, value] of form.entries()) {
            if (value instanceof File) {
                if (key === 'files') filenames.push(value.name);
            } else {
                body[key] = value;
            }
        }
        onFiles?.(filenames);

        const existing: string[] = body.existingImageIds ? JSON.parse(body.existingImageIds) : [];
        body.existingImageIds = JSON.stringify([...existing, ...filenames.map(uploadedImageId)]);

        const { 'content-length': _length, ...headers } = request.headers();
        const response = await route.fetch({
            headers: { ...headers, 'content-type': 'application/json' },
            postData: JSON.stringify(body),
        });
        await route.fulfill({ response });
    });
}

async function readMultipart(buffer: Buffer | null, contentType: string | undefined): Promise<FormData> {
    return new Response(buffer, { headers: { 'content-type': contentType ?? '' } }).formData();
}
