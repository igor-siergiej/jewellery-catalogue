import { Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { RegisterForm } from '../../components/RegisterForm';
import { useRedirectIfAuthenticated } from '../../hooks/useAuthRedirect';

const Register = () => {
    const navigate = useNavigate();

    useRedirectIfAuthenticated();

    return (
        <AuthLayout
            title="Jewellery Catalogue"
            subtitle="Join the goldsmith empire!"
        >
            <RegisterForm />

            <Typography
                variant="body2"
                paddingTop={8}
            >
                Already part of the goldsmith empire?
            </Typography>

            <Button
                fullWidth
                color="secondary"
                variant="contained"
                onClick={() => {
                    navigate('/');
                }}
            >
                Login!
            </Button>
        </AuthLayout>
    );
};

export default Register;
