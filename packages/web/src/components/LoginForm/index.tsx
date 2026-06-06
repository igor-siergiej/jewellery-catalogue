import type React from 'react';
import { z } from 'zod';

import { AuthFormBase } from '@/components/AuthFormBase';
import { usernameSchema } from '@/utils/authSchemas';

const loginSchema = z.object({
    username: usernameSchema,
    password: z
        .string()
        .min(1, 'Password is required')
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must not exceed 100 characters'),
});

export const LoginForm: React.FC = () => (
    <AuthFormBase
        schema={loginSchema}
        endpoint="/login"
        errorTitle="Login Error"
        submitLabel="Login"
        loadingLabel="Logging in..."
        passwordAutoComplete="current-password"
    />
);
