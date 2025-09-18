import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import NavBar from '../NavBar';

export interface MainLayoutProps {
    children?: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <div className="flex">
            <NavBar />
            <main className="flex-1 p-6">
                <div className="h-20" />
                {children ?? <Outlet />}
            </main>
        </div>
    );
};

export default MainLayout;
