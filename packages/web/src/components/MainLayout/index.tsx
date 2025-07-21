import Box from '@mui/material/Box';
import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from '../NavBar';
import { Toolbar } from '@mui/material';

export interface MainLayoutProps {
    children?: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <Box sx={{ display: 'flex' }}>
            <NavBar />
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Toolbar sx={{ minHeight: '80px !important' }} />
                {children ?? <Outlet />}
            </Box>
        </Box>
    );
};

export default MainLayout;
