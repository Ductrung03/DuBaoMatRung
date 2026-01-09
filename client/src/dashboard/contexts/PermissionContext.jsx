import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../../services/api';

const PermissionContext = createContext();

export const usePermissionContext = () => useContext(PermissionContext);

export const PermissionProvider = ({ children }) => {
    const { user, isAdmin } = useAuth();

    // Lazy init from cache/user data
    const [permissions, setPermissions] = useState(() => {
        if (!user) return [];

        // Try cache first
        try {
            const cachedPages = localStorage.getItem(`permissions_pages_${user.id}`);
            if (cachedPages) {
                const parsedPages = JSON.parse(cachedPages);
                // Flatten permissions
                return parsedPages.flatMap(page => page.features.map(feature => feature.code));
            }
        } catch (e) {
            console.warn('Failed to parse cached permissions in init');
        }

        // Fallback to user object (JWT properties)
        return user.permissions || [];
    });

    const [accessiblePages, setAccessiblePages] = useState(() => {
        if (!user) return [];
        try {
            const cachedPages = localStorage.getItem(`permissions_pages_${user.id}`);
            if (cachedPages) {
                return JSON.parse(cachedPages);
            }
        } catch (e) { }
        return [];
    });

    const [loading, setLoading] = useState(() => {
        // If we have permissions (from cache/token), we are not "loading" in a blocking sense
        if (user && (user.permissions || localStorage.getItem(`permissions_pages_${user.id}`))) {
            return false;
        }
        return true;
    });

    const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            fetchUserAccess();
        }
    }, [user]);

    const fetchUserAccess = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Admin has full access
        if (isAdmin()) {
            setLoading(false);
            return;
        }

        try {
            // Only set loading true if we don't have data yet
            if (permissions.length === 0) {
                setLoading(true);
            }

            const response = await api.get('/auth/permissions/my-access');

            if (response.data.success) {
                const pages = response.data.data.pages;

                if (Array.isArray(pages)) {
                    setAccessiblePages(pages);

                    // Flatten all permissions from all pages
                    const allPermissions = pages.flatMap(page =>
                        (page.features && Array.isArray(page.features)) ? page.features.map(feature => feature.code) : []
                    );
                    setPermissions(allPermissions);

                    // Cache the response
                    localStorage.setItem(`permissions_pages_${user.id}`, JSON.stringify(pages));
                } else {
                    console.warn("API returned invalid pages structure:", pages);
                    setAccessiblePages([]);
                    setPermissions([]);
                }
            }
        } catch (err) {
            console.error('Error fetching user access in PermissionContext:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PermissionContext.Provider
            value={{
                permissions,
                accessiblePages,
                loading,
                error,
                refresh: fetchUserAccess
            }}
        >
            {children}
        </PermissionContext.Provider>
    );
};

export default PermissionContext;
