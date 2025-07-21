import { Box, Card, Grid, Typography } from '@mui/material';
import React from 'react';

import IMAGES from '../../img';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                height: '100vh',
                width: '100vw',
            }}
        >
            <Card
                raised
                sx={{
                    backgroundColor: '#fff',
                    width: '1000px',
                    height: '800px',
                }}
            >
                <Grid container spacing={0} sx={{ height: '100%', width: '100%' }}>
                    <Grid size={7}>
                        <Grid container sx={{ display: 'flex', height: '100%', padding: '3em 1em 1em 1em', alignItems: 'center', flexDirection: 'column' }}>
                            <Typography variant="h3">
                                {title}
                            </Typography>

                            <Typography
                                variant="h5"
                                sx={{ padding: '2em 0 1em 0' }}
                            >
                                {subtitle}
                            </Typography>

                            <Box sx={{ width: '60%', gap: '1em', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                {children}
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid size={5} sx={{ overflow: 'hidden' }}>
                        <Box
                            component="img"
                            sx={{ objectFit: 'cover', width: '100%', height: '100%' }}
                            src={IMAGES.startImage}
                            alt="jewellery"
                        />
                    </Grid>
                </Grid>
            </Card>
        </Box>
    );
};
