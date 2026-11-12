import { Loader2, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import { useDraftStatus } from '../../context/DraftStatus';
import { SearchProvider, useSearch } from '../../context/SearchContext';
import AppSidebar from '../AppSidebar';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';

interface MainLayoutProps {
    children?: ReactNode;
}

const MainLayoutContent = ({ children }: MainLayoutProps) => {
    const location = useLocation();
    const { searchQuery, setSearchQuery } = useSearch();
    const { status: draftStatus } = useDraftStatus();
    const isDesignsPage = location.pathname === '/designs';
    const isMaterialsPage = location.pathname === '/materials';
    const isListingsPage = location.pathname === '/listings';

    useEffect(() => {
        setSearchQuery('');
    }, [setSearchQuery]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-w-0 md:max-h-screen md:overflow-y-auto">
                <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
                    <SidebarTrigger className="-ml-1 size-11 md:size-7" />
                    <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                    {draftStatus.hasDraft && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
                            {draftStatus.isSaving ? (
                                <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Saving draft…
                                </>
                            ) : draftStatus.saveError ? (
                                <span className="text-destructive">Draft save failed, will retry</span>
                            ) : (
                                'Draft saved'
                            )}
                        </span>
                    )}
                    {(isDesignsPage || isMaterialsPage || isListingsPage) && (
                        <div className="relative min-w-0 max-w-md flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder={
                                    isDesignsPage
                                        ? 'Search designs...'
                                        : isMaterialsPage
                                          ? 'Search materials...'
                                          : 'Search listings...'
                                }
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="pl-9 bg-card"
                            />
                        </div>
                    )}
                </header>
                <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
                    <div>{children ?? <Outlet />}</div>
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
