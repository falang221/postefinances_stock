import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { jwtDecode } from 'jwt-decode';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react'; // Added useCallback and useMemo

const BASE_API_URL = typeof window === 'undefined'
  ? process.env.NEXT_PUBLIC_API_URL // Server-side: use Docker internal hostname
  : process.env.NEXT_PUBLIC_API_URL_HOST; // Client-side: use localhost for browser access

interface ApiErrorDetail {
  detail: string;
}

interface DecodedToken {
  exp: number;
}

// This function returns an API client instance that can use React hooks
export function useApiClient() {
  const notificationContext = useNotification();
  const authContext = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const apiFetch = useCallback(async function apiFetch<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
    };

    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    const token = authContext.token;
    console.log("DEBUG FE: Current token from authContext:", token ? token.substring(0, 30) + "..." : "No token"); // Log partial token
    if (token) {
      try {
        const decodedToken: DecodedToken = jwtDecode(token);
        if (decodedToken.exp * 1000 < Date.now()) {
          notificationContext.showSnackbar('Votre session a expiré. Veuillez vous reconnecter.', 'error');
          authContext.logout();
          throw new Error('Session expired');
        }
      } catch (error) {
        console.error("Failed to decode token before API call:", error);
        notificationContext.showSnackbar('Votre session est invalide. Veuillez vous reconnecter.', 'error');
        authContext.logout();
        throw new Error('Invalid session token');
      }

      headers['Authorization'] = `Bearer ${token}`;
      console.log("DEBUG FE: Authorization header set to:", headers['Authorization'].substring(0, 40) + "..."); // Log partial header
    } else {
      console.log("DEBUG FE: No token, Authorization header not set.");
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
      ...options,
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }
    const fullUrl = `${BASE_API_URL}${endpoint}`;
    const response = await fetch(fullUrl, config);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorDetail: string | ApiErrorDetail = errorMessage;

      try {
        const errorJson = await response.json();
        if (errorJson && typeof errorJson === 'object' && 'detail' in errorJson) {
          errorDetail = errorJson as ApiErrorDetail;
          errorMessage = errorDetail.detail;
        } else {
          errorMessage = JSON.stringify(errorJson);
        }
      } catch (e) {
        // If response is not JSON, use default error message
      }

      if (response.status === 401) {
        notificationContext.showSnackbar(errorMessage || 'Session expirée. Veuillez vous reconnecter.', 'error');
        authContext.logout();
        if (pathname !== '/login') { 
             router.push('/login');
        }
      } else if (response.status === 403) {
        notificationContext.showSnackbar(errorMessage || 'Vous n\'êtes pas autorisé à effectuer cette action.', 'error');
      } else {
        notificationContext.showSnackbar(errorMessage || `Une erreur est survenue (${response.status}).`, 'error');
      }

      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }, [authContext, notificationContext, router, pathname]); // Dependencies for apiFetch

  const client = useMemo(() => ({
    get: <T>(endpoint: string, options?: RequestInit) => apiFetch<T>('GET', endpoint, undefined, options),
    post: <T>(endpoint: string, data: any, options?: RequestInit) => apiFetch<T>('POST', endpoint, data, options),
    put: <T>(endpoint: string, data: any, options?: RequestInit) => apiFetch<T>('PUT', endpoint, data, options),
    delete: <T>(endpoint: string, options?: RequestInit) => apiFetch<T>('DELETE', endpoint, undefined, options),
    download: async (endpoint: string, filename: string = 'download.csv', options?: RequestInit) => {
      const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string>),
      };

      const token = authContext.token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const config: RequestInit = {
        method: 'GET',
        headers,
        credentials: 'include',
        cache: 'no-store',
        ...options,
      };

      const response = await fetch(`${BASE_API_URL}${endpoint}`, config);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorDetail: string | ApiErrorDetail = errorMessage;

        try {
          const errorJson = await response.json();
          if (errorJson && typeof errorJson === 'object' && 'detail' in errorJson) {
            errorDetail = errorJson as ApiErrorDetail;
            errorMessage = errorDetail.detail;
          } else {
            errorMessage = JSON.stringify(errorJson);
          }
        } catch (e) {
          // If response is not JSON, use default error message
        }

        if (response.status === 401) {
          notificationContext.showSnackbar(errorMessage || 'Session expirée. Veuillez vous reconnecter.', 'error');
          authContext.logout();
        } else if (response.status === 403) {
          notificationContext.showSnackbar(errorMessage || 'Vous n\'êtes pas autorisé à effectuer cette action.', 'error');
        } else {
          notificationContext.showSnackbar(errorMessage || `Une erreur est survenue (${response.status}).`, 'error');
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  }), [apiFetch, authContext.token, notificationContext.showSnackbar, authContext.logout, router, pathname]); // Dependencies for useMemo

  return client;
}
