type Cell = string | number | boolean | null | undefined;

// A leading =, +, -, @, tab or CR makes Excel/Sheets treat text as a formula (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

const formatCell = (value: Cell): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    const text = FORMULA_START.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
};

// UTF-8 BOM so Excel detects the encoding (e.g. £ and accented names), CRLF line endings per RFC 4180.
export const toCsv = (header: string[], rows: Cell[][]): string =>
    `﻿${[header, ...rows].map((row) => row.map(formatCell).join(',')).join('\r\n')}\r\n`;
