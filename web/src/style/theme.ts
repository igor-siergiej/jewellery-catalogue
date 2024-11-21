import { createTheme } from '@mui/material';

declare module '@mui/material/styles' {
    interface Components {
        [key: string]: any;
    }
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
    components: {
        MUIDataTableToolbarSelect: {
            styleOverrides: { root: { backgroundColor: '#d078ff' } },
        },
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
