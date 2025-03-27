import ReactDOM from 'react-dom/client';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import theme from './style/theme';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Start from './pages/Start';
import Home from './pages/Home';
import {
    HOME_PAGE,
    START_PAGE,
    DESIGNS_PAGE,
    ADD_DESIGN_PAGE,
    MATERIALS_PAGE,
    ADD_MATERIAL_PAGE,
} from './constants/routes';
import Designs from './pages/Designs';
import MainLayout from './components/MainLayout';
import { StoreProvider } from './components/Store';
import AddDesign from './pages/AddDesign';
import Materials from './pages/Materials';
import AddMaterial from './pages/AddMaterial';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false,
        },
    },
});

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

function App() {
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Routes>
                <Route path={START_PAGE.route} element={<Start />} />

                <Route element={<MainLayout />}>
                    <Route
                        index
                        path={HOME_PAGE.route}
                        element={<Home />}
                    />
                    <Route
                        path={DESIGNS_PAGE.route}
                        element={<Designs />}
                    />
                    <Route
                        path={ADD_DESIGN_PAGE.route}
                        element={<AddDesign />}
                    />
                    <Route
                        path={MATERIALS_PAGE.route}
                        element={<Materials />}
                    />
                    <Route
                        path={ADD_MATERIAL_PAGE.route}
                        element={<AddMaterial />}
                    />
                </Route>
            </Routes>
        </LocalizationProvider>
    );
}

root.render(
    <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <StoreProvider>
                    <App />
                </StoreProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </ThemeProvider>
);
