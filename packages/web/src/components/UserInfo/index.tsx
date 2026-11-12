import { useAuth, useUser } from '@imapps/web-utils';
import { LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { SETTINGS_PAGE } from '../../constants/routes';

const UserInfo = () => {
    const { user } = useUser();
    const { logout } = useAuth();

    if (!user) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1 p-2 group-data-[collapsible=icon]:p-0">
            <span className="truncate px-2 text-sm group-data-[collapsible=icon]:hidden font-medium text-sidebar-foreground">
                {user.username}
            </span>
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
                <Button
                    asChild
                    variant="ghost"
                    className="h-11 flex-1 justify-start gap-2 px-2 text-sidebar-foreground md:h-9 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                >
                    <Link to={SETTINGS_PAGE.route}>
                        <Settings className="h-4 w-4" />
                        <span className="group-data-[collapsible=icon]:sr-only">Settings</span>
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    aria-label="Log out"
                    className="size-11 text-sidebar-foreground md:size-9 group-data-[collapsible=icon]:size-8"
                >
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default UserInfo;
