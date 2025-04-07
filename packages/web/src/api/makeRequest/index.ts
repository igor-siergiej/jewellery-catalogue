import { MakeRequestProps } from '@jewellery-catalogue/types';

export const origin = import.meta.env.VITE_API_URL;

export const makeRequest = async <T>({
    pathname,
    method,
    operationString,
    headers,
    body,
}: MakeRequestProps) => {
    const url = origin + pathname;
    const parsedBody = (body instanceof FormData) ? body : JSON.stringify(body);
    try {
        const response = await fetch(url, {
            method: method,
            headers,
            body: body ? parsedBody : undefined
        });

        if (response.ok) {
            return await response.json() as T;
        } else {
            console.error(
                `Failed to ${operationString}:`,
                response.status,
                response.statusText
            );
            throw new Error(
                `Response was not ok ${response.status}: ${response.statusText}`
            );
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(
                `Error while trying to ${operationString}: ${error.message}`
            );
        }
    }
};
