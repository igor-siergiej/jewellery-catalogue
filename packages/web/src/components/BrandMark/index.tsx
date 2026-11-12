import type React from 'react';

import IMAGES from '@/img';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
    collapsed?: boolean;
    size?: 'sidebar' | 'auth';
}

export const BrandMark: React.FC<BrandMarkProps> = ({ collapsed = false, size = 'sidebar' }) => {
    const auth = size === 'auth';

    return (
        <>
            <img
                src={IMAGES.logo}
                alt=""
                className={cn(
                    'object-scale-down',
                    collapsed ? 'h-6 w-6' : cn('shrink-0', auth ? 'h-14 w-14' : 'h-10 w-10')
                )}
            />
            {!collapsed && (
                <span className="flex min-w-0 flex-col leading-tight">
                    <span className={cn('font-brand-caps truncate tracking-wide', auth ? 'text-2xl' : 'text-lg')}>
                        MARI'S
                    </span>
                    <span className={cn('font-brand-script truncate', auth ? 'text-3xl' : 'text-xl')}>
                        Crystal Jewellery
                    </span>
                </span>
            )}
        </>
    );
};
