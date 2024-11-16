import { createTheme } from '@mui/material';

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
    components: {
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    lineHeight: 200,
                },
            },
        },
    },
});

export default theme;
