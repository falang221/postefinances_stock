import { useApiClient } from './client'; // Import the new hook
import { UserFullResponse, UserUpdate, PasswordUpdate, UserCreate } from '../types/api';

// This file will now export functions that return the API calls
// These functions will need to be called from within a React component
// where useApiClient can be used.

export function useUserApi() {
  const apiClient = useApiClient();

  // Admin CRUD
  const createUser = async (data: UserCreate): Promise<UserFullResponse> => {
    return apiClient.post<UserFullResponse>('/users/', data);
  };

  const getUsers = async (searchTerm?: string): Promise<UserFullResponse[]> => {
    const params = new URLSearchParams();
    if (searchTerm) params.append("search", searchTerm);
    return apiClient.get<UserFullResponse[]>(`/users?${params.toString()}`);
  };

  const updateUser = async (userId: string, data: UserUpdate): Promise<UserFullResponse> => {
    return apiClient.put<UserFullResponse>(`/users/${userId}`, data);
  };

  const deleteUser = async (userId: string): Promise<void> => {
    return apiClient.delete<void>(`/users/${userId}`);
  };


  // Current User Profile
  const getUserProfile = async (): Promise<UserFullResponse> => {
    return apiClient.get<UserFullResponse>('/users/me');
  };

  const updateUserProfile = async (data: UserUpdate): Promise<UserFullResponse> => {
    return apiClient.put<UserFullResponse>('/users/me', data);
  };

  const changeUserPassword = async (data: PasswordUpdate): Promise<void> => {
    return apiClient.put<void>('/users/me/password', data);
  };

  // Misc
  const getRequestCreators = async (): Promise<UserFullResponse[]> => {
    return apiClient.get<UserFullResponse[]>('/users/request-creators');
  };

  return {
    createUser,
    getUsers,
    updateUser,
    deleteUser,
    getRequestCreators,
    getUserProfile,
    updateUserProfile,
    changeUserPassword,
  };
}
