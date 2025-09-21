import { useAuth, useUser } from '@igor-siergiej/web-utils';
import { LogOut, User } from 'lucide-react';

import { Button } from '@/components/ui/button';

const UserInfo = () => {
    const { user } = useUser();
    const { logout } = useAuth();

    if (!user) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 p-2">
            <div className="flex items-center gap-2 flex-1">
                <User className="w-8 h-8 text-sidebar-foreground/60" />
                <span className="text-md text-sidebar-foreground truncate">
                    {user?.username}
                </span>
            </div>
            <Button
                size="sm"
                variant="ghost"
                onClick={logout}
                title="Logout"
                className="h-8 w-8 p-0"
            >
                <LogOut className="w-4 h-4" />
            </Button>
        </div>
    );
};

export default UserInfo;
