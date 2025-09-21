import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import AppSidebar from '../AppSidebar';
import { Separator } from '../ui/separator';

export interface MainLayoutProps {
    children?: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4">
                    <main>
                        {children ?? <Outlet />}
                    </main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default MainLayout;
