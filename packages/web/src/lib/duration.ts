export function parseDuration(value: string | undefined): { hours: number; minutes: number } {
    const [h, m] = (value ?? '').split(':');
    const hours = Number.parseInt(h, 10);
    const minutes = Number.parseInt(m, 10);

    return {
        hours: Number.isFinite(hours) && hours > 0 ? hours : 0,
        minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0,
    };
}

export function formatDuration(hours: number, minutes: number): string {
    const total = Math.max(0, Math.trunc(hours || 0)) * 60 + Math.max(0, Math.trunc(minutes || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function describeDuration(value: string): string {
    const { hours, minutes } = parseDuration(value);
    const parts: string[] = [];
    const total = hours * 60 + minutes;
    const h = Math.floor(total / 60);
    const m = total % 60;

    if (h > 0) parts.push(`${h} h`);

    if (m > 0) parts.push(`${m} min`);

    return parts.length > 0 ? parts.join(' ') : '0 min';
}
