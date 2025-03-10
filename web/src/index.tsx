import ReactDOM from 'react-dom/client';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import theme from './style/theme';
import { BrowserRouter, Route, useNavigate, Routes } from 'react-router-dom';
import { Security, LoginCallback } from '@okta/okta-react';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';
import Start from './pages/Start';
import { RequiredAuth } from './components/Auth';
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
import LoadingScreen from './components/Loading';
import AddDesign from './pages/AddDesign';
import Materials from './pages/Materials';
import AddMaterial from './pages/AddMaterial';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

const { VITE_CLIENT_ID, VITE_ISSUER, VITE_OKTA_TESTING_DISABLEHTTPSCHECK } =
    import.meta.env;

const config = {
    clientId: VITE_CLIENT_ID || '',
    issuer: VITE_ISSUER || '',
    redirectUri: `${window.location.origin}/login/callback`,
    scopes: ['openid', 'profile', 'email'],
    pkce: true,
    disableHttpsCheck: VITE_OKTA_TESTING_DISABLEHTTPSCHECK || false,
};

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false,
        },
    },
});

const oktaConfig = new OktaAuth(config);

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

function App() {
    const navigate = useNavigate();
    const restoreOriginalUri = (_oktaAuth: any, originalUri: string) => {
        navigate(toRelativeUrl(originalUri || '/', window.location.origin));
    };

    return (
        <Security oktaAuth={oktaConfig} restoreOriginalUri={restoreOriginalUri}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Routes>
                    <Route
                        path="login/callback"
                        element={
                            <LoginCallback loadingElement={<LoadingScreen />} />
                        }
                    />

                    <Route path={START_PAGE.route} element={<Start />} />

                    <Route element={<MainLayout />}>
                        <Route element={<RequiredAuth />}>
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
                    </Route>
                </Routes>
            </LocalizationProvider>
        </Security>
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
