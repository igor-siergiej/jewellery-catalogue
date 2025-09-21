import React from 'react';
import { useNavigate } from 'react-router-dom';

import { HOME_PAGE } from '@/constants/routes';
import IMAGES from '@/img';

export interface HeaderProps {
    isCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isCollapsed }) => {
    const navigate = useNavigate();
    if (isCollapsed) {
        return (

            <div className="flex flex-row items-center gap-2 py-2 relative">
                <div
                    className="cursor-pointer"
                    onClick={() => navigate(HOME_PAGE.route)}
                    title="Go to home"
                >
                    <img
                        src={IMAGES.logo}
                        alt="jewellery"
                        className="h-6 w-6 object-scale-down"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center px-2 py-2 relative">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                    className="cursor-pointer"
                    onClick={() => navigate(HOME_PAGE.route)}
                    title="Go to home"
                >
                    <img
                        src={IMAGES.logo}
                        alt="jewellery"
                        className="h-8 w-8 object-scale-down"
                    />
                </div>
                <h1 className="text-lg text-center font-bold text-sidebar-foreground truncate flex-1">
                    Jewellery Catalogue
                </h1>
            </div>
            {typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ && (
                <span className="text-xs text-sidebar-foreground/60 select-none ml-auto">
                    v
                    {__APP_VERSION__}
                </span>
            )}
        </div>
    );
};
