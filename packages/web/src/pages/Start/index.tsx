import { useRedirectIfAuthenticated } from '@igor-siergiej/web-utils';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { AuthLayout } from '../../components/AuthLayout';
import { LoginForm } from '../../components/LoginForm';
import { HOME_PAGE } from '../../constants/routes';

const Start = () => {
    const navigate = useNavigate();

    useRedirectIfAuthenticated(HOME_PAGE.route);

    return (
        <AuthLayout
            title="Jewellery Catalogue"
            subtitle="Welcome back Goldsmith!"
        >
            <LoginForm />

            <p className="text-sm pt-8">
                Haven't joined the goldsmith empire yet?
            </p>

            <Button
                className="w-full"
                variant="secondary"
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
