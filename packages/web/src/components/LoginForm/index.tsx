import { useAuth, useAuthConfig } from '@igor-siergiej/web-utils';
import { Eye, EyeOff } from 'lucide-react';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { HOME_PAGE } from '../../constants/routes';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { LoginParams } from './types';

export const LoginForm: React.FC = () => {
    const {
        handleSubmit,
        register,
        formState: { errors },
    } = useForm<LoginParams>();
    const [showPassword, setShowPassword] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const { dispatch } = useAlert();
    const navigate = useNavigate();
    const { login } = useAuth();
    const config = useAuthConfig();

    const onSubmit = async (data: LoginParams) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${config.authUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include',
            });
            if (!response.ok) {
                const json = await response.json();
                throw new Error(json.message);
            }
            const json = await response.json();
            if (!json.accessToken) throw new Error('No access token returned');
            login(json.accessToken);
            navigate(HOME_PAGE.route);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Login Error',
                    message,
                    severity: 'error',
                    variant: 'standard',
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full">
            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    {...register('username', { required: 'Username is required' })}
                    className={errors.username ? 'border-destructive' : ''}
                />
                <p className="text-sm text-destructive min-h-[20px]">
                    {errors.username?.message || ''}
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        {...register('password', { required: 'Password is required' })}
                        className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(show => !show)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword
                            ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                )
                            : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                    </button>
                </div>
                <p className="text-sm text-destructive min-h-[20px]">
                    {errors.password?.message || ''}
                </p>
            </div>

            <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
            >
                {isLoading ? 'Logging in...' : 'Login'}
            </Button>
        </form>
    );
};
