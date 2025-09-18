import { extractUserFromToken, useAuth, useAuthConfig } from '@igor-siergiej/web-utils';
import { Eye, EyeOff } from 'lucide-react';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { addCatalogue } from '../../api/endpoints/addCatalogue';
import { HOME_PAGE } from '../../constants/routes';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { RegisterParams } from './types';

export const RegisterForm: React.FC = () => {
    const {
        handleSubmit,
        register,
        formState: { errors },
    } = useForm<RegisterParams>();
    const [showPassword, setShowPassword] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const { dispatch } = useAlert();
    const navigate = useNavigate();
    const { login } = useAuth();
    const config = useAuthConfig();

    const validatePassword = (password: string) => {
        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
            return 'Password must be at least 8 characters long and contain at least one letter and one number';
        }
        return true;
    };

    const onSubmit = async (data: RegisterParams) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${config.authUrl}/register`, {
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

            // Extract user ID from the token
            const userInfo = extractUserFromToken(json.accessToken);
            if (!userInfo?.id) {
                throw new Error('Could not extract user ID from token');
            }

            // Login the user first
            login(json.accessToken);

            // Create catalogue with user ID using the addCatalogue endpoint
            await addCatalogue(userInfo.id);

            navigate(HOME_PAGE.route);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            dispatch({
                type: AlertStoreActions.SHOW_ALERT,
                payload: {
                    title: 'Registration Error',
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
                        autoComplete="new-password"
                        {...register('password', {
                            required: 'Password is required',
                            validate: validatePassword
                        })}
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
                {isLoading ? 'Creating account...' : 'Register'}
            </Button>
        </form>
    );
};
