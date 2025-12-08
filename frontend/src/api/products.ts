import { useApiClient } from './client'; // Import the new hook
import { ProductResponse, ProductFullResponse } from '../types/api';

export function useProductApi() {
  const apiClient = useApiClient();

  const getProducts = async (searchTerm?: string): Promise<ProductFullResponse[]> => { // Changed return type
    const params = new URLSearchParams();
    if (searchTerm) params.append("search", searchTerm);
    return apiClient.get<ProductFullResponse[]>(`/products?${params.toString()}`); // Changed generic type
  };

  // Add other product-related API functions here if needed, e.g., createProduct, getProductById, etc.

  return {
    getProducts,
  };
}