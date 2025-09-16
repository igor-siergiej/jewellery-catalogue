import { useTokenInitialization } from '@igor-siergiej/web-utils';
import { Box, CircularProgress, Typography } from '@mui/material';
import React from 'react';

interface AppInitializerProps {
    children: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    const { isInitializing } = useTokenInitialization();

    if (isInitializing) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    gap: 2,
                }}
            >
                <CircularProgress size={40} />
                <Typography variant="body1" color="text.secondary">
                    Loading...
                </Typography>
            </Box>
        );
    }

    return <>{children}</>;
};

export default AppInitializer;
