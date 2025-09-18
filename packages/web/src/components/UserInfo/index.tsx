import { useAuth, useUser } from '@igor-siergiej/web-utils';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Badge } from '../ui/badge';

const UserInfo = () => {
    const { user } = useUser();
    const { logout } = useAuth();

    if (!user) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
                Welcome back,
            </span>
            <Badge variant="default">{user?.username}</Badge>
            <Badge variant="outline">{user?.id}</Badge>
            <Button
                size="sm"
                variant="ghost"
                onClick={logout}
                title="Logout"
                className="ml-1"
            >
                <LogOut className="w-4 h-4" />
            </Button>
        </div>
    );
};

export default UserInfo;
