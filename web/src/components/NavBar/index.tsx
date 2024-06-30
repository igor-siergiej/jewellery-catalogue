import {
    AppBar,
    Box,
    CssBaseline,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Toolbar,
    Typography,
} from '@mui/material';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store } from '../Store';
import { ROUTES } from '../../constants/routes';

const NavBar = () => {
    const { state } = useContext(Store);
    const { user } = state || {};

    const navigate = useNavigate();

    const navBarButtons = ROUTES.map((route) => {
        return (
            <ListItem disablePadding key={route.route}>
                <ListItemButton
                    onClick={() => {
                        navigate(route.route);
                    }}
                    sx={{ borderBottom: '1px solid #e0e0e0' }}
                >
                    <ListItemText>{route.name}</ListItemText>
                </ListItemButton>
            </ListItem>
        );
    });

    return (
        <>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
                <Toolbar
                    sx={{
                        justifyContent: 'space-between',
                    }}
                >
                    {/* TODO: logo here with navigate to home screen?  */}
                    <Typography variant="h6" noWrap component="div">
                        Jewellery Catalogue
                    </Typography>

                    <Typography variant="h6" noWrap component="div">
                        {user?.email || ''}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Drawer
                variant="permanent"
                sx={{
                    width: '150px',
                    '& .MuiDrawer-paper': {
                        width: '150px',
                    },
                }}
            >
                <Toolbar />
                <Box>
                    <List>{navBarButtons}</List>
                </Box>
            </Drawer>
        </>
    );
};

export default NavBar;
