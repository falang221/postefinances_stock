import { useApiClient } from './client'; // Import the new hook
import {
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
    PurchaseOrderStatus,
    PaginatedPurchaseOrderResponse, // NEW: Import the paginated response type
} from "../types/api";

export function usePurchaseOrderApi() {
  const apiClient = useApiClient();

  const createPurchaseOrder = async (
      data: PurchaseOrderCreate
  ): Promise<PurchaseOrderResponse> => {
      return apiClient.post<PurchaseOrderResponse>('/purchase-orders/', data);
  };

  const getPurchaseOrders = async (
      status?: PurchaseOrderStatus,
      page: number = 1,
      pageSize: number = 10
  ): Promise<PaginatedPurchaseOrderResponse> => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      params.append("page", String(page));
      params.append("page_size", String(pageSize));

      return apiClient.get<PaginatedPurchaseOrderResponse>(`/purchase-orders?${params.toString()}`);
  };

  const getPurchaseOrderById = async (
      id: string
  ): Promise<PurchaseOrderResponse> => {
      return apiClient.get<PurchaseOrderResponse>(`/purchase-orders/${id}`);
  };

  const updatePurchaseOrder = async (
      id: string,
      data: PurchaseOrderUpdate
  ): Promise<PurchaseOrderResponse> => {
      return apiClient.put<PurchaseOrderResponse>(`/purchase-orders/${id}`, data);
  };

  const deletePurchaseOrder = async (
      id: string
  ): Promise<void> => {
      return apiClient.delete<void>(`/purchase-orders/${id}`);
  };

  return {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    deletePurchaseOrder,
  };
}