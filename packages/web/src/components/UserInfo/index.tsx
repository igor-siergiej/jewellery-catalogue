import { useAuth, useUser } from '@igor-siergiej/web-utils';
import { Logout } from '@mui/icons-material';
import { Box, Chip, IconButton, Typography } from '@mui/material';

const UserInfo = () => {
    const { user } = useUser();
    const { logout } = useAuth();

    if (!user) {
        return null;
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
                Welcome back,
            </Typography>
            <Chip
                label={user?.username}
                color="primary"
                variant="outlined"
                size="small"
            />
            <Chip
                label={user?.id}
                color="secondary"
                variant="outlined"
                size="small"
            />
            <IconButton
                size="small"
                onClick={logout}
                title="Logout"
                sx={{ ml: 1 }}
            >
                <Logout fontSize="small" />
            </IconButton>
        </Box>
    );
};

export default UserInfo;
