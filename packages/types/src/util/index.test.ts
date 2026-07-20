import { describe, expect, it } from 'bun:test';

import { htmlToPlainText, plainTextToHtml } from './index';

describe('plainTextToHtml', () => {
    it('wraps a single paragraph in <p>', () => {
        expect(plainTextToHtml('Hello world.')).toBe('<p>Hello world.</p>');
    });

    it('converts single new lines to <br>', () => {
        expect(plainTextToHtml('Line one.\nLine two.')).toBe('<p>Line one.<br>Line two.</p>');
    });

    it('converts blank-line-separated text into separate paragraphs', () => {
        expect(plainTextToHtml('Para one.\n\nPara two.')).toBe('<p>Para one.</p><p>Para two.</p>');
    });

    it('escapes HTML-significant characters', () => {
        expect(plainTextToHtml('A & B < C > D')).toBe('<p>A &amp; B &lt; C &gt; D</p>');
    });

    it('returns an empty paragraph for blank input', () => {
        expect(plainTextToHtml('   ')).toBe('<p></p>');
    });

    it('round-trips through htmlToPlainText for a multi-paragraph, multi-line input', () => {
        const original = 'Para one line one.\nPara one line two.\n\nPara two.';
        expect(htmlToPlainText(plainTextToHtml(original))).toBe(original);
    });
});
