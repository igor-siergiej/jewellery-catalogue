import { Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { LoginForm } from '../../components/LoginForm';
import { useRedirectIfAuthenticated } from '../../hooks/useAuthRedirect';

const Start = () => {
    const navigate = useNavigate();

    useRedirectIfAuthenticated();

    return (
        <AuthLayout
            title="Jewellery Catalogue"
            subtitle="Welcome back Goldsmith!"
        >
            <LoginForm />

            <Typography
                variant="body2"
                paddingTop={8}
            >
                Haven't joined the goldsmith empire yet?
            </Typography>

            <Button
                fullWidth
                color="secondary"
                variant="contained"
                onClick={() => {
                    navigate('/register');
                }}
            >
                Register!
            </Button>
        </AuthLayout>
    );
};

export default Start;
