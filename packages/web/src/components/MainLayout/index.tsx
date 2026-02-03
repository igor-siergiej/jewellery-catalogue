import { ArrowLeft, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import { DESIGNS_PAGE } from '../../constants/routes';
import { SearchProvider, useSearch } from '../../context/SearchContext';
import AppSidebar from '../AppSidebar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';

export interface MainLayoutProps {
    children?: ReactNode;
}

const MainLayoutContent = ({ children }: MainLayoutProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { searchQuery, setSearchQuery } = useSearch();
    const isDesignsPage = location.pathname === '/designs';
    const isViewDesignPage = location.pathname.startsWith('/designs/') && location.pathname !== '/designs';

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleBackToDesigns = () => {
        navigate(DESIGNS_PAGE.route);
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="overflow-y-auto max-h-screen">
                <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                    {isDesignsPage && (
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search designs..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="pl-9 bg-card"
                            />
                        </div>
                    )}
                    {isViewDesignPage && (
                        <Button variant="ghost" onClick={handleBackToDesigns} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Designs
                        </Button>
                    )}
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4">
                    <main>{children ?? <Outlet />}</main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
};

const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <SearchProvider>
            <MainLayoutContent>{children}</MainLayoutContent>
        </SearchProvider>
    );
};

export default MainLayout;
