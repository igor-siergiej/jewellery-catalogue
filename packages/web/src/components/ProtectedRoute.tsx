import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { START_PAGE } from '../constants/routes';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <Outlet /> : <Navigate to={START_PAGE.route} replace />;
};

export default ProtectedRoute;
