import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoadingButton from '@mui/lab/LoadingButton';
import { Box, FormControl, FormHelperText, IconButton, InputAdornment, InputLabel, OutlinedInput, TextField } from '@mui/material';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { addCatalogue } from '../../api/endpoints/addCatalogue';
import { HOME_PAGE } from '../../constants/routes';
import { useAlert } from '../../context/Alert';
import { AlertStoreActions } from '../../context/Alert/types';
import { useAuth } from '../../context/AuthContext';
import { extractUserFromToken } from '../../utils/jwtUtils';
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

    const validatePassword = (password: string) => {
        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
            return 'Password must be at least 8 characters long and contain at least one letter and one number';
        }
        return true;
    };

    const onSubmit = async (data: RegisterParams) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_AUTH_URL}/register`, {
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

            navigate(`/${HOME_PAGE.route}`);
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
                    autoComplete="new-password"
                    label="Password"
                    {...register('password', {
                        required: 'Password is required',
                        validate: validatePassword
                    })}
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
                Register
            </LoadingButton>
        </Box>
    );
};
