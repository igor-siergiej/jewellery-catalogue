import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { HOME_PAGE, ROUTES } from '../../constants/routes';
import IMAGES from '../../img';

const NavBar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navBarButtons = ROUTES.map((route) => {
        const isActive = location.pathname === route.route;
        return (
            <Button
                key={route.route}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                    'w-full justify-start border-b border-gray-200 rounded-none',
                    isActive && 'bg-gray-100'
                )}
                onClick={() => navigate(route.route)}
            >
                {route.name}
            </Button>
        );
    });

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
                <div className="flex items-center min-h-[80px] px-4 gap-4">
                    <img
                        src={IMAGES.logo}
                        alt="jewellery"
                        className="w-16 h-16 object-scale-down cursor-pointer"
                        onClick={() => navigate(HOME_PAGE.route)}
                    />
                    <h1 className="text-3xl font-bold leading-[80px] truncate">
                        Jewellery Catalogue
                    </h1>
                </div>
            </header>

            <aside className="fixed left-0 top-[80px] bottom-0 w-[150px] bg-background border-r border-border">
                <nav className="flex flex-col">
                    {navBarButtons}
                </nav>
            </aside>
        </>
    );
};

export default NavBar;
