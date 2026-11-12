import { describe, expect, it } from 'vite-plus/test';

import { describeDuration, formatDuration, parseDuration } from './duration';

describe('parseDuration', () => {
    it('parses padded, unpadded and empty values', () => {
        expect(parseDuration('00:30')).toEqual({ hours: 0, minutes: 30 });
        expect(parseDuration('1:5')).toEqual({ hours: 1, minutes: 5 });
        expect(parseDuration('')).toEqual({ hours: 0, minutes: 0 });
        expect(parseDuration(undefined)).toEqual({ hours: 0, minutes: 0 });
        expect(parseDuration('garbage')).toEqual({ hours: 0, minutes: 0 });
    });
});

describe('formatDuration', () => {
    it('zero-pads and normalises minutes over 59', () => {
        expect(formatDuration(0, 90)).toBe('01:30');
        expect(formatDuration(0, 0)).toBe('00:00');
        expect(formatDuration(2, 5)).toBe('02:05');
    });

    it('round-trips stored values', () => {
        const { hours, minutes } = parseDuration('12:45');
        expect(formatDuration(hours, minutes)).toBe('12:45');
        const legacy = parseDuration('1:5');
        expect(formatDuration(legacy.hours, legacy.minutes)).toBe('01:05');
    });
});

describe('describeDuration', () => {
    it('describes in plain words', () => {
        expect(describeDuration('00:30')).toBe('30 min');
        expect(describeDuration('01:30')).toBe('1 h 30 min');
        expect(describeDuration('02:00')).toBe('2 h');
        expect(describeDuration('0:30')).toBe('30 min');
        expect(describeDuration('')).toBe('0 min');
    });
});
