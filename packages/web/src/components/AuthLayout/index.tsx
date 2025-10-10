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
        <div className="flex items-center justify-center select-none h-screen w-screen">
            <Card className="bg-white p-0 w-[1000px] h-[800px] shadow-lg">
                <div className="flex h-full w-full">
                    <div className="flex-[7]">
                        <div className="flex h-full pt-12 pb-4 items-center flex-col">
                            <h1 className="text-3xl font-bold">{title}</h1>

                            <h2 className="text-xl py-8 pt-8 pb-4">{subtitle}</h2>

                            <div className="w-3/5 gap-4 flex flex-col items-center">{children}</div>
                        </div>
                    </div>
                    <div className="flex-[5] rounded-r-xl overflow-hidden">
                        <img className="object-cover w-full h-full" src={IMAGES.startImage} alt="jewellery" />
                    </div>
                </div>
            </Card>
        </div>
    );
};
