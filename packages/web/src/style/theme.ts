import { createTheme } from '@mui/material';

declare module '@mui/material/styles' {
    type Components = Record<string, unknown>;
}

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#a600ff',
        },
        secondary: {
            main: '#2D7DD2',
        },
        background: {
            default: '#CCDAF4',
        },
    },
    typography: {
        fontFamily: 'Faculty Glyphic, sans-serif',
    },
});

export default theme;
