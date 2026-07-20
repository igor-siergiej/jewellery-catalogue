import type { Bead, Material, Wire } from '../material';

export interface MakeRequestProps {
    pathname: string;
    method: MethodType;
    operationString: string;
    headers?: Record<string, string>;
    body?: object | FormData;
    accessToken?: string;
}

export enum MethodType {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    PATCH = 'PATCH',
    DELETE = 'DELETE',
}

export type Spread<T> = { [Key in keyof T]: T[Key] };

export type Time = `${number}:${number}`;

export interface PersistentFile {
    filepath: string;
    mimetype?: string;
}

export const isWireMaterial = (material: Material): material is Wire => {
    return material.type === 'WIRE';
};

export const isBeadMaterial = (material: Material): material is Bead => {
    return material.type === 'BEAD';
};

// Design descriptions are authored as TipTap HTML. Third parties like Etsy's
// listing description field are plain text only, so block-level tags become
// paragraph breaks, <br> becomes a single line break, and everything else is
// stripped rather than shown as raw markup.
const HTML_PARAGRAPH_BREAKS = /<\/(p|div|h[1-6]|li)>/gi;
const HTML_LINE_BREAKS = /<br\s*\/?>/gi;
const HTML_ENTITIES: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
};

export const htmlToPlainText = (html: string): string =>
    html
        .replace(HTML_PARAGRAPH_BREAKS, '\n\n')
        .replace(HTML_LINE_BREAKS, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => HTML_ENTITIES[entity])
        .replace(/\n{3,}/g, '\n\n')
        .trim();

const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Inverse of htmlToPlainText: third-party plain text (e.g. an Etsy listing
// description) becomes TipTap-compatible HTML, so blank-line-separated
// paragraphs and single line breaks survive instead of collapsing to one line.
export const plainTextToHtml = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed) {
        return '<p></p>';
    }
    return trimmed
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join('');
};
