import { useRedirectIfAuthenticated } from '@imapps/web-utils';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { AuthLayout } from '../../components/AuthLayout';
import { RegisterForm } from '../../components/RegisterForm';
import { HOME_PAGE, REGISTER_PAGE } from '../../constants/routes';

const Register = () => {
    const navigate = useNavigate();

    useRedirectIfAuthenticated(HOME_PAGE.route, REGISTER_PAGE.route);

    return (
        <AuthLayout title="Create an account">
            <RegisterForm />

            <p className="text-sm text-muted-foreground pt-6">Already have an account?</p>

            <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                    navigate('/');
                }}
            >
                Log in
            </Button>
        </AuthLayout>
    );
};

export default Register;
