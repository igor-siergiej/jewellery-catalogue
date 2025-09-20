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

import { HOME_PAGE, ROUTES } from '../../constants/routes';
import IMAGES from '../../img';

const routeIcons = {
    '/home': Home,
    '/designs': Palette,
    '/addDesign': Plus,
    '/materials': Gem,
    '/addMaterial': PlusCircle,
};

const CollapsibleSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';

    return (
        <Sidebar collapsible="icon" className="relative h-full border-r border-sidebar-border">
            <SidebarHeader>
                {isCollapsed
                    ? (
                            <div className="flex flex-col items-center gap-2 py-2">
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
                        )
                    : (
                            <div className="flex items-center gap-2 px-2 py-2">
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
                                <h1 className="text-lg font-bold text-sidebar-foreground truncate flex-1">
                                    Jewellery Catalogue
                                </h1>
                            </div>
                        )}
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

export default CollapsibleSidebar;
