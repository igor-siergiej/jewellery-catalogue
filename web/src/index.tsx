import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@mui/material/styles';
import theme from './style/theme';
import { BrowserRouter, Route, useNavigate, Routes } from 'react-router-dom';
import { Security, LoginCallback } from '@okta/okta-react';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';
import { CircularProgress } from '@mui/material';
import StartPage from './pages/StartPage';

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
            <main>
                <Routes>
                    <Route path="/" element={<StartPage />} />
                    <Route
                        path="login/callback"
                        element={
                            <LoginCallback
                                loadingElement={<CircularProgress />}
                            />
                        }
                    />
                    {/* <Route path="/transaction" element={<RequiredAuth />}>
                        <Route path="" element={<TransactionPage />} />
                    </Route> */}
                </Routes>
            </main>
        </Security>
    );
}

root.render(
    <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </QueryClientProvider>
    </ThemeProvider>
);
