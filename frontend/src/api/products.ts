import { useApiClient } from './client'; // Import the new hook
import { ProductResponse, ProductFullResponse, ProductCreate, ProductUpdate } from '../types/api'; // Import ProductCreate and ProductUpdate

export function useProductApi() {
  const apiClient = useApiClient();

  const getProducts = async (searchTerm?: string): Promise<ProductFullResponse[]> => { // Changed return type
    const params = new URLSearchParams();
    if (searchTerm) params.append("search", searchTerm);
    return apiClient.get<ProductFullResponse[]>(`/products?${params.toString()}`); // Changed generic type
  };

  const createProduct = async (data: ProductCreate): Promise<ProductResponse> => {
    return apiClient.post<ProductResponse>('/products/', data);
  };

  const updateProduct = async (productId: string, data: ProductUpdate): Promise<ProductResponse> => {
    return apiClient.put<ProductResponse>(`/products/${productId}`, data);
  };

  const deleteProduct = async (productId: string): Promise<void> => {
    await apiClient.delete<void>(`/products/${productId}`);
  };

  return {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}