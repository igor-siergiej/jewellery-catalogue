import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ZodSchema } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthSubmit } from '@/hooks/useAuthSubmit';

type AuthFormFields = {
    username: string;
    password: string;
};

interface AuthFormBaseProps {
    schema: ZodSchema<AuthFormFields>;
    endpoint: string;
    errorTitle: string;
    submitLabel: string;
    loadingLabel: string;
    passwordAutoComplete: string;
}

// fallow-ignore-next-line complexity
export const AuthFormBase: React.FC<AuthFormBaseProps> = ({
    schema,
    endpoint,
    errorTitle,
    submitLabel,
    loadingLabel,
    passwordAutoComplete,
}) => {
    const {
        handleSubmit,
        register,
        formState: { errors },
    } = useForm<AuthFormFields>({
        resolver: zodResolver(schema),
    });
    const [showPassword, setShowPassword] = useState(false);
    const { isLoading, onSubmit } = useAuthSubmit(endpoint, errorTitle);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full">
            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    {...register('username')}
                    className={errors.username ? 'border-destructive' : ''}
                    aria-invalid={errors.username ? 'true' : 'false'}
                />
                <p className="text-sm text-destructive min-h-[20px]">{errors.username?.message || ''}</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={passwordAutoComplete}
                        {...register('password')}
                        className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                        aria-invalid={errors.password ? 'true' : 'false'}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((show) => !show)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>
                </div>
                <p className="text-sm text-destructive min-h-[20px]">{errors.password?.message || ''}</p>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? loadingLabel : submitLabel}
            </Button>
        </form>
    );
};
