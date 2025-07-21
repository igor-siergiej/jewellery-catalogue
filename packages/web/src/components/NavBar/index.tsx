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
import { useLocation, useNavigate } from 'react-router-dom';
import { HOME_PAGE, ROUTES } from '../../constants/routes';
import IMAGES from '../../img';

const NavBar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navBarButtons = ROUTES.map((route) => {
        return (
            <ListItem
                disablePadding
                sx={{
                    backgroundColor: theme =>
                        location.pathname.replace('/', '') === route.route
                            ? theme.palette.background.default
                            : 'white',
                }}
                key={route.route}
            >
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
                sx={{
                    color: theme => theme.palette.common.black,
                    backgroundColor: theme =>
                        theme.palette.background.default,
                    zIndex: theme => theme.zIndex.drawer + 1,
                }}
            >
                <Toolbar
                    sx={{
                        minHeight: '80px !important',
                        gap: 4
                    }}
                >
                    <Box
                        component="img"
                        sx={{ objectFit: 'scale-down', width: 64, height: 64 }}
                        src={IMAGES.logo}
                        alt="jewellery"
                        onClick={() => navigate(HOME_PAGE.route)}
                    />
                    <Typography
                        variant="h4"
                        sx={{ lineHeight: '80px' }}
                        noWrap
                        component="div"
                    >
                        Jewellery Catalogue
                    </Typography>

                </Toolbar>
            </AppBar>
            <Drawer
                variant="permanent"
                sx={{
                    'width': '150px',
                    '& .MuiDrawer-paper': {
                        width: '150px',
                    },
                }}
            >
                <Toolbar sx={{ minHeight: '80px !important' }} />
                <Box>
                    <List>{navBarButtons}</List>
                </Box>
            </Drawer>
        </>
    );
};

export default NavBar;
