import React from "react";
import { useForm } from "react-hook-form";
import { LoginParams } from "./types";
import { Box, Button, TextField, IconButton, InputAdornment, FormControl, InputLabel, OutlinedInput, FormHelperText, Card } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export interface ILoginFormProps {

}

export const LoginForm: React.FC<ILoginFormProps> = ({}) => {
    const {
        handleSubmit,
        register,
        formState: { errors },
    } = useForm<LoginParams>();
    const [showPassword, setShowPassword] = React.useState(false);

    const onSubmit = (data: LoginParams) => {
        // For now, do nothing
    };

    return (
            <Box component="form" onSubmit={handleSubmit(onSubmit)}  sx={{display: 'flex', flexDirection: 'column', gap: '1em'}}>
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
                        endAdornment={
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    onClick={() => setShowPassword((show) => !show)}
                                    edge="end"
                                >
                                    {showPassword ? <Visibility /> : <VisibilityOff />}
                                </IconButton>
                            </InputAdornment>
                        }
                    />
                    <FormHelperText sx={{ minHeight: 24 }}>
                        {errors.password?.message || ' '}
                    </FormHelperText>
                </FormControl>
                <Button type="submit" variant="contained" color="primary" fullWidth>
                    Login
                </Button>
            </Box>
    );
} 