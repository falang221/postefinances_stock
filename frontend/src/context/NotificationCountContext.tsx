'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useApiClient } from '@/api/client';
import { useAuth } from './AuthContext';

interface NotificationCounts {
    pending_requests_for_daf: number;
    pending_purchase_orders_for_daf: number;
    requests_to_deliver_for_magasinier: number;
    requests_to_confirm_for_chef_service: number;
}

interface NotificationCountContextType {
    counts: NotificationCounts;
    fetchCounts: () => void;
    isLoading: boolean;
}

const NotificationCountContext = createContext<NotificationCountContextType | undefined>(undefined);

export const useNotificationCount = () => {
    const context = useContext(NotificationCountContext);
    if (!context) {
        throw new Error('useNotificationCount must be used within a NotificationCountProvider');
    }
    return context;
};

interface NotificationCountProviderProps {
    children: ReactNode;
}

export const NotificationCountProvider: React.FC<NotificationCountProviderProps> = ({ children }) => {
    const { token } = useAuth();
    const apiClient = useApiClient();
    const [counts, setCounts] = useState<NotificationCounts>({
        pending_requests_for_daf: 0,
        pending_purchase_orders_for_daf: 0,
        requests_to_deliver_for_magasinier: 0,
        requests_to_confirm_for_chef_service: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchCounts = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        try {
            const data = await apiClient.get<NotificationCounts>('/notifications/counts');
            setCounts(data);
        } catch (error) {
            console.error("Failed to fetch notification counts:", error);
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, token]);

    useEffect(() => {
        fetchCounts(); // Fetch immediately on mount
        const interval = setInterval(fetchCounts, 30000); // And then every 30 seconds
        return () => clearInterval(interval); // Cleanup on unmount
    }, [fetchCounts]);

    return (
        <NotificationCountContext.Provider value={{ counts, fetchCounts, isLoading }}>
            {children}
        </NotificationCountContext.Provider>
    );
};
