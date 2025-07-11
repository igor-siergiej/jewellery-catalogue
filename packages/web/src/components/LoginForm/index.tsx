import React from 'react';
import { useForm } from 'react-hook-form';
import { LoginParams } from './types';
import { Box, TextField, IconButton, InputAdornment, FormControl, InputLabel, OutlinedInput, FormHelperText } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoadingButton from '@mui/lab/LoadingButton';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HOME_PAGE } from '../../constants/routes';

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

    const onSubmit = async (data: LoginParams) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_AUTH_URL}/login`, {
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
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: '1em', width: '100%' }}>
            <TextField
                label="Username"
                variant="outlined"
                fullWidth
                autoComplete="username"
                error={!!errors.username}
                {...register('username', { required: 'Username is required' })}
                FormHelperTextProps={{ sx: { minHeight: 24 } }}
                helperText={errors.username?.message || ' '}
            />
            <FormControl variant="outlined" fullWidth error={!!errors.password}>
                <InputLabel htmlFor="password">Password</InputLabel>
                <OutlinedInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    label="Password"
                    {...register('password', { required: 'Password is required' })}
                    endAdornment={(
                        <InputAdornment position="end">
                            <IconButton
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                onClick={() => setShowPassword(show => !show)}
                                edge="end"
                            >
                                {showPassword ? <Visibility /> : <VisibilityOff />}
                            </IconButton>
                        </InputAdornment>
                    )}
                />
                <FormHelperText sx={{ minHeight: 24 }}>
                    {errors.password?.message || ' '}
                </FormHelperText>
            </FormControl>
            <LoadingButton
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                loading={isLoading}
                disabled={isLoading}
            >
                Login
            </LoadingButton>
        </Box>
    );
};
