import { useApiClient } from './client';
import { CategoryResponse } from '../types/api';

// Assuming CategoryCreate and CategoryUpdate are simple objects with a 'name' property
interface CategoryCreate {
  name: string;
}

interface CategoryUpdate {
  name?: string; // Name is optional for update
}


export function useCategoryApi() {
  const apiClient = useApiClient();

  const getCategories = async (searchTerm?: string): Promise<CategoryResponse[]> => {
    const params = new URLSearchParams();
    if (searchTerm) params.append("search", searchTerm);
    return apiClient.get<CategoryResponse[]>(`/categories?${params.toString()}`);
  };

  const createCategory = async (data: CategoryCreate): Promise<CategoryResponse> => {
    return apiClient.post<CategoryResponse>('/categories/', data);
  };

  const updateCategory = async (categoryId: string, data: CategoryUpdate): Promise<CategoryResponse> => {
    return apiClient.put<CategoryResponse>(`/categories/${categoryId}`, data);
  };

  const deleteCategory = async (categoryId: string): Promise<void> => {
    await apiClient.delete<void>(`/categories/${categoryId}`);
  };

  return {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}