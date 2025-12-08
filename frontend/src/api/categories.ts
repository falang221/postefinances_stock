import { useApiClient } from './client';
import { CategoryResponse } from '../types/api';

export function useCategoryApi() {
  const apiClient = useApiClient();

  const getCategories = async (): Promise<CategoryResponse[]> => {
    return apiClient.get<CategoryResponse[]>('/products/categories');
  };

  return {
    getCategories,
  };
}