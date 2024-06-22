import { createTheme } from '@mui/material';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#CCDAF4',
        },
        secondary: {
            main: '#2D7DD2',
        },
    },
    typography: {
        fontFamily: 'Playwrite PL',
    },
});

export default theme;
