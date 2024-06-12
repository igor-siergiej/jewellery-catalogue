import { Button, Grid, Typography } from '@mui/material';
import { useOktaAuth } from '@okta/okta-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const StartPage = () => {
    const { authState, oktaAuth } = useOktaAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (authState?.isAuthenticated) {
            navigate('/transaction');
        }
    }, [authState]);
    return (
        <Grid
            container
            direction="column"
            justifyContent="center"
            alignItems="center"
        >
            <Typography
                sx={{ mt: '5em', color: 'blue' }}
                variant="h3"
                component="h2"
            >
                Welcome to Maris Jewellery Catalogue!
            </Typography>

            <Button
                onClick={() => {
                    oktaAuth.signInWithRedirect();
                }}
            >
                Log In or Sign up
            </Button>
        </Grid>
    );
};

export default StartPage;
