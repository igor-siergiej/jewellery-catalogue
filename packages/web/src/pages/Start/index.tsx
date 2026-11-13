import { useRedirectIfAuthenticated } from '@imapps/web-utils';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { AuthLayout } from '../../components/AuthLayout';
import { LoginForm } from '../../components/LoginForm';
import { HOME_PAGE } from '../../constants/routes';

const Start = () => {
    const navigate = useNavigate();

    useRedirectIfAuthenticated(HOME_PAGE.route);

    return (
        <AuthLayout title="Welcome back">
            <LoginForm />

            <p className="text-sm text-muted-foreground pt-6">New here?</p>

            <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                    navigate('/register');
                }}
            >
                Create an account
            </Button>
        </AuthLayout>
    );
};

export default Start;
