import { z } from 'zod';

const ENUM_MESSAGES: Record<string, string> = {
    wireType: 'Pick a wire type',
    metalType: 'Pick a metal type',
    designType: 'Pick a design type',
};

export const zodErrorMap: z.core.$ZodErrorMap = (issue) => {
    if (issue.code !== 'invalid_value') return undefined;

    const field = [...(issue.path ?? [])].reverse().find((segment) => typeof segment === 'string');

    return (typeof field === 'string' && ENUM_MESSAGES[field]) || 'Pick one of the options';
};
