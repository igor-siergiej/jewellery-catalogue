import type React from 'react';

import IMAGES from '../../img';
import { Card } from '../ui/card';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
    return (
        <div className="flex min-h-screen w-full items-center justify-center select-none p-4">
            <Card className="bg-white p-0 w-full max-w-[1000px] md:h-[800px] shadow-lg">
                <div className="flex h-full min-h-[560px] w-full flex-col md:flex-row">
                    <div className="h-40 w-full shrink-0 overflow-hidden rounded-t-xl md:hidden">
                        <img className="h-full w-full object-cover" src={IMAGES.startImage} alt="" />
                    </div>
                    <div className="flex-[7]">
                        <div className="flex h-full px-4 pt-6 pb-8 md:pt-12 items-center flex-col text-center">
                            <h1 className="text-3xl font-bold">{title}</h1>

                            <h2 className="text-xl py-8 pt-8 pb-4">{subtitle}</h2>

                            <div className="w-full max-w-sm gap-4 flex flex-col items-center md:w-3/5">{children}</div>
                        </div>
                    </div>
                    <div className="hidden flex-[5] overflow-hidden rounded-r-xl md:block">
                        <img className="object-cover w-full h-full" src={IMAGES.startImage} alt="jewellery" />
                    </div>
                </div>
            </Card>
        </div>
    );
};
