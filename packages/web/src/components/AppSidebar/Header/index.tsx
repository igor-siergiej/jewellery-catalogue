import type React from 'react';
import { Link } from 'react-router-dom';

import { HOME_PAGE } from '@/constants/routes';
import IMAGES from '@/img';

export interface HeaderProps {
    isCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isCollapsed }) => (
    <Link
        to={HOME_PAGE.route}
        aria-label="Stock"
        className="flex min-h-11 items-center gap-3 rounded-sm px-2 py-2 text-sidebar-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
        <img
            src={IMAGES.logo}
            alt=""
            className={isCollapsed ? 'h-6 w-6 object-scale-down' : 'h-10 w-10 shrink-0 object-scale-down'}
        />
        {!isCollapsed && (
            <span className="flex min-w-0 flex-col leading-tight">
                <span className="font-brand-caps truncate text-lg tracking-wide">MARI'S</span>
                <span className="font-brand-script truncate text-xl">Crystal Jewellery</span>
            </span>
        )}
    </Link>
);
