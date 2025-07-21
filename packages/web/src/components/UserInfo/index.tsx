import { Typography, Box, Chip, IconButton } from '@mui/material';
import { Logout } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';

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
