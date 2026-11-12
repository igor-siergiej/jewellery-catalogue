import type React from 'react';
import { Link } from 'react-router-dom';

import { BrandMark } from '@/components/BrandMark';
import { HOME_PAGE } from '@/constants/routes';

export interface HeaderProps {
    isCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isCollapsed }) => (
    <Link
        to={HOME_PAGE.route}
        aria-label="Stock"
        className="flex min-h-11 items-center gap-3 rounded-sm px-2 py-2 text-sidebar-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
        <BrandMark collapsed={isCollapsed} />
    </Link>
);
