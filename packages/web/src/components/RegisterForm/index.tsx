import type React from 'react';
import { z } from 'zod';

import { AuthFormBase } from '@/components/AuthFormBase';
import { usernameSchema } from '@/utils/authSchemas';

const registerSchema = z.object({
    username: usernameSchema,
    password: z
        .string()
        .min(1, 'Password is required')
        .min(8, 'Password must be at least 8 characters long')
        .max(100, 'Password must not exceed 100 characters')
        .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, 'Password must contain at least one letter and one number'),
});

export const RegisterForm: React.FC = () => (
    <AuthFormBase
        schema={registerSchema}
        endpoint="/register"
        errorTitle="Registration Error"
        submitLabel="Register"
        loadingLabel="Creating account..."
        passwordAutoComplete="new-password"
    />
);
