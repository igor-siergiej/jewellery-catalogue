import { useRedirectIfAuthenticated } from '@igor-siergiej/web-utils';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { AuthLayout } from '../../components/AuthLayout';
import { RegisterForm } from '../../components/RegisterForm';
import { HOME_PAGE } from '../../constants/routes';

const Register = () => {
    const navigate = useNavigate();

    useRedirectIfAuthenticated(HOME_PAGE.route);

    return (
        <AuthLayout
            title="Jewellery Catalogue"
            subtitle="Join the goldsmith empire!"
        >
            <RegisterForm />

            <p className="text-sm pt-8">
                Already part of the goldsmith empire?
            </p>

            <Button
                className="w-full"
                variant="secondary"
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
