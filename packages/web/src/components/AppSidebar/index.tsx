import { Gem, Home, LayoutGrid, Palette, ShoppingBag } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';

import { ROUTES } from '../../constants/routes';
import UserInfo from '../UserInfo';
import { Header } from './Header';

const routeIcons = {
    '/home': Home,
    '/designs': Palette,
    '/listings': ShoppingBag,
    '/materials': Gem,
    '/board': LayoutGrid,
};

const AppSidebar = () => {
    const location = useLocation();
    const { state, isMobile, setOpenMobile } = useSidebar();
    const isCollapsed = state === 'collapsed';

    return (
        <Sidebar
            collapsible="icon"
            className="relative h-full border-r border-sidebar-border [&_[data-slot='sidebar-container']]:z-50 [&_[data-sidebar='sidebar']]:flex [&_[data-sidebar='sidebar']]:h-full [&_[data-sidebar='sidebar']]:flex-col [&_[data-sidebar='sidebar']]:overflow-hidden"
        >
            <SidebarHeader>
                <Header isCollapsed={isCollapsed} />
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {ROUTES.map((route) => {
                                const isActive =
                                    location.pathname === route.route ||
                                    location.pathname.startsWith(`${route.route}/`);

                                const IconComponent = routeIcons[route.route as keyof typeof routeIcons];

                                return (
                                    <SidebarMenuItem key={route.route}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            className="h-11 md:h-8 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                                        >
                                            <NavLink
                                                to={route.route}
                                                onClick={() => {
                                                    if (isMobile) setOpenMobile(false);
                                                }}
                                            >
                                                {IconComponent && <IconComponent />}
                                                <span>{route.name}</span>
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <UserInfo />
            </SidebarFooter>
        </Sidebar>
    );
};

export default AppSidebar;
