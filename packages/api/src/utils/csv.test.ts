import { describe, expect, it } from 'bun:test';

import { toCsv } from './csv';

describe('toCsv', () => {
    it('starts with a UTF-8 BOM and uses CRLF line endings', () => {
        expect(toCsv(['a', 'b'], [[1, 2]])).toBe('﻿a,b\r\n1,2\r\n');
    });

    it('quotes commas, quotes, newlines and surrounding spaces, doubling embedded quotes', () => {
        const csv = toCsv(['v'], [['a,b'], ['say "hi"'], ['line\nbreak'], [' padded ']]);

        expect(csv).toBe('﻿v\r\n"a,b"\r\n"say ""hi"""\r\n"line\nbreak"\r\n" padded "\r\n');
    });

    it('leaves plain text, numbers and non-ASCII unquoted', () => {
        expect(toCsv(['name', 'price'], [['Opal £ ring – café', 12.5]])).toBe(
            '﻿name,price\r\nOpal £ ring – café,12.5\r\n'
        );
    });

    it('renders empty values as blank cells and booleans as words', () => {
        expect(toCsv(['a', 'b', 'c', 'd'], [[null, undefined, true, Number.NaN]])).toBe('﻿a,b,c,d\r\n,,true,\r\n');
    });

    it('neutralises text that a spreadsheet would run as a formula, but not negative numbers', () => {
        expect(toCsv(['v'], [['=HYPERLINK("x")'], ['@cmd'], [-3]])).toBe(
            '﻿v\r\n"\'=HYPERLINK(""x"")"\r\n\'@cmd\r\n-3\r\n'
        );
    });
});
