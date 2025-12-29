
import { useQueryClient } from '@tanstack/react-query';
import { useApiClient } from './client';
import { StockAdjustmentDirectCreate, StockAdjustmentResponse } from '@/types/api';
import { useNotification } from '@/context/NotificationContext';

export const useStockAdjustmentApi = () => {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { showSnackbar } = useNotification();

  const createStockAdjustment = async (data: StockAdjustmentDirectCreate): Promise<StockAdjustmentResponse> => {
    try {
      const response = await apiClient.post<StockAdjustmentResponse>('/stock-adjustments/', data);
      
      // On success, invalidate products to refetch the list with updated quantities
      await queryClient.invalidateQueries({ queryKey: ['products'] });

      // Show success message
      showSnackbar('Ajustement de stock réussi !', 'success');
      
      return response;
    } catch (error: any) {
        console.error("Failed to create stock adjustment:", error);
        // The error will be handled by react-query's onError, which should show a snackbar.
        // Re-throw the error to ensure react-query's error handling is triggered.
        throw new Error(error.response?.data?.detail || 'Une erreur est survenue lors de l\'ajustement du stock.');
    }
  };

  return { createStockAdjustment };
};
