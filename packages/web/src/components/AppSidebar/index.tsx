import {
    Gem,
    Home,
    Palette,
    Plus,
    PlusCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';

import { ROUTES } from '../../constants/routes';
import { Header } from './Header';

const routeIcons = {
    '/home': Home,
    '/designs': Palette,
    '/addDesign': Plus,
    '/materials': Gem,
    '/addMaterial': PlusCircle,
};

const AppSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';

    return (
        <Sidebar collapsible="icon" className="relative h-full border-r border-sidebar-border">
            <SidebarHeader>
                <Header isCollapsed={isCollapsed} />
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {ROUTES.map((route) => {
                                const isActive = location.pathname === route.route;
                                const IconComponent = routeIcons[route.route as keyof typeof routeIcons];

                                return (
                                    <SidebarMenuItem key={route.route}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                        >
                                            <button
                                                onClick={() => navigate(route.route)}
                                                className="w-full justify-start"
                                            >
                                                {IconComponent && <IconComponent />}
                                                <span>{route.name}</span>
                                            </button>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
};

export default AppSidebar;
