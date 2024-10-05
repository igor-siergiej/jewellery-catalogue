import { Box, Button, Grid, Typography } from '@mui/material';
import { useOktaAuth } from '@okta/okta-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import IMAGES from '../../img';
import { HOME_PAGE } from '../../constants/routes';

const Start = () => {
    const { authState, oktaAuth } = useOktaAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (authState?.isAuthenticated) {
            navigate(HOME_PAGE.route);
        }
    }, [authState]);

    const loginButton = (
        <Button
            variant="contained"
            sx={{
                width: '80%',
                marginTop: '90%',
                marginLeft: 'auto',
                marginRight: 'auto',
            }}
            onClick={() => {
                oktaAuth.signInWithRedirect();
            }}
        >
            Log In or Sign up
        </Button>
    );

    const image = (
        <Box
            component="img"
            sx={{ objectFit: 'scale-down' }}
            src={IMAGES.startImage}
            alt="jewellery"
        />
    );

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
            }}
        >
            <Box
                sx={{
                    backgroundColor: '#fff',
                    width: '800px',
                    height: '720px',
                    marginTop: '20px',
                }}
            >
                <Grid container direction="row" sx={{ height: '100%' }}>
                    <Grid item xs={7}>
                        <Grid
                            container
                            direction="column"
                            sx={{ display: 'flex' }}
                        >
                            <Typography
                                sx={{ paddingTop: '1em', paddingLeft: '0.5em' }}
                                variant="h3"
                            >
                                Sign Up
                            </Typography>
                            <Typography
                                sx={{ paddingTop: '2em', paddingLeft: '2em' }}
                                variant="body2"
                            >
                                Welcome to the Jewellery Catalogue!
                            </Typography>
                            <Typography
                                sx={{ paddingTop: '1em', paddingLeft: '2em' }}
                                variant="body2"
                            >
                                Press the button below to log in or sign up.
                            </Typography>
                            {loginButton}
                        </Grid>
                    </Grid>
                    <Grid item xs={5} sx={{ overflow: 'hidden' }}>
                        {image}
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export default Start;
