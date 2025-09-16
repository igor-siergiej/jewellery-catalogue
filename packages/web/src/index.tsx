import 'react-quill/dist/quill.snow.css';

import {
    AuthConfigProvider,
    AuthProvider,
    ProtectedRoute,
    UserProvider } from '@igor-siergiej/web-utils';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { GlobalAlert } from './components/Alert';
import AppInitializer from './components/AppInitializer';
import MainLayout from './components/MainLayout';
import {
    ADD_DESIGN_PAGE,
    ADD_MATERIAL_PAGE,
    DESIGNS_PAGE,
    HOME_PAGE,
    MATERIALS_PAGE,
    REGISTER_PAGE,
    START_PAGE,
} from './constants/routes';
import { AlertProvider } from './context/Alert';
import AddDesign from './pages/AddDesign';
import AddMaterial from './pages/AddMaterial';
import Designs from './pages/Designs';
import Home from './pages/Home';
import Materials from './pages/Materials';
import Register from './pages/Register';
import Start from './pages/Start';
import theme from './style/theme';
import { getAuthConfig } from './utils/authConfig';
import { loadConfig } from './utils/loadConfig';

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
                <Route path={REGISTER_PAGE.route} element={<Register />} />

                <Route
                    path={HOME_PAGE.route}
                    element={(
                        <ProtectedRoute fallbackPath={START_PAGE.route}>
                            <MainLayout>
                                <Home />
                            </MainLayout>
                        </ProtectedRoute>
                    )}
                />

                <Route
                    path={DESIGNS_PAGE.route}
                    element={(
                        <ProtectedRoute fallbackPath={START_PAGE.route}>
                            <MainLayout>
                                <Designs />
                            </MainLayout>
                        </ProtectedRoute>
                    )}
                />

                <Route
                    path={ADD_DESIGN_PAGE.route}
                    element={(
                        <ProtectedRoute fallbackPath={START_PAGE.route}>
                            <MainLayout>
                                <AddDesign />
                            </MainLayout>
                        </ProtectedRoute>
                    )}
                />

                <Route
                    path={MATERIALS_PAGE.route}
                    element={(
                        <ProtectedRoute fallbackPath={START_PAGE.route}>
                            <MainLayout>
                                <Materials />
                            </MainLayout>
                        </ProtectedRoute>
                    )}
                />

                <Route
                    path={ADD_MATERIAL_PAGE.route}
                    element={(
                        <ProtectedRoute fallbackPath={START_PAGE.route}>
                            <MainLayout>
                                <AddMaterial />
                            </MainLayout>
                        </ProtectedRoute>
                    )}
                />
            </Routes>
        </LocalizationProvider>
    );
}

const initializeApp = async () => {
    try {
        await loadConfig();

        root.render(
            <ThemeProvider theme={theme}>
                <QueryClientProvider client={queryClient}>
                    <BrowserRouter>
                        <AuthConfigProvider config={getAuthConfig()}>
                            <UserProvider>
                                <AuthProvider>
                                    <AppInitializer>
                                        <AlertProvider>
                                            <GlobalAlert />
                                            <App />
                                        </AlertProvider>
                                    </AppInitializer>
                                </AuthProvider>
                            </UserProvider>
                        </AuthConfigProvider>
                    </BrowserRouter>
                </QueryClientProvider>
            </ThemeProvider>
        );
    } catch (error) {
        root.render(
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#f5f5f5'
            }}
            >
                <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    maxWidth: '500px'
                }}
                >
                    <h1 style={{ color: '#e53e3e', marginBottom: '1rem' }}>
                        Configuration Error
                    </h1>
                    <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
                        The application failed to load its configuration.
                    </p>
                    <p style={{ color: '#718096', fontSize: '0.9rem' }}>
                        {error instanceof Error ? error.message : 'Unknown error occurred'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#3182ce',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }
};

initializeApp();
