import 'react-quill/dist/quill.snow.css';

import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { GlobalAlert } from './components/Alert';
import AppInitializer from './components/AppInitializer';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
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
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import AddDesign from './pages/AddDesign';
import AddMaterial from './pages/AddMaterial';
import Designs from './pages/Designs';
import Home from './pages/Home';
import Materials from './pages/Materials';
import Register from './pages/Register';
import Start from './pages/Start';
import theme from './style/theme';
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

                <Route element={<ProtectedRoute />}>
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
                </Route>
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
