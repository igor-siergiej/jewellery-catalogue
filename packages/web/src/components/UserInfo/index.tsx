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
        <div className="flex flex-col gap-1 p-2">
            <span className="truncate px-2 text-sm font-medium text-sidebar-foreground">{user.username}</span>
            <div className="flex items-center gap-1">
                <Button
                    asChild
                    variant="ghost"
                    className="h-11 flex-1 justify-start gap-2 px-2 text-sidebar-foreground md:h-9"
                >
                    <Link to={SETTINGS_PAGE.route}>
                        <Settings className="h-4 w-4" />
                        Settings
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    aria-label="Log out"
                    className="size-11 text-sidebar-foreground md:size-9"
                >
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default UserInfo;
