// frontend/src/api/inventoryAudits.ts

import { useApiClient } from './client';
import {
  InventoryAudit,
  InventoryAuditBulkUpdate,
  PaginatedInventoryAuditResponse,
} from '../types/api';

export function useInventoryAuditApi() {
  const apiClient = useApiClient();

  const createAudit = async (): Promise<InventoryAudit> => {
    return apiClient.post<InventoryAudit>('/inventory-audits/', {});
  };

  const getAudits = async (
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedInventoryAuditResponse> => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    return apiClient.get<PaginatedInventoryAuditResponse>(`/inventory-audits/?${params.toString()}`);
  };

  const getAuditDetails = async (auditId: string): Promise<InventoryAudit> => {
    return apiClient.get<InventoryAudit>(`/inventory-audits/${auditId}`);
  };

  const updateAuditItems = async (
    auditId: string,
    data: InventoryAuditBulkUpdate
  ): Promise<void> => {
    return apiClient.put<void>(`/inventory-audits/${auditId}/items`, data);
  };

  const completeAudit = async (auditId: string): Promise<InventoryAudit> => {
    return apiClient.post<InventoryAudit>(`/inventory-audits/${auditId}/complete`, {});
  };

  const requestReconciliation = async (auditId: string): Promise<InventoryAudit> => {
    return apiClient.post<InventoryAudit>(
      `/inventory-audits/${auditId}/request-reconciliation`,
      {}
    );
  };

  return {
    createAudit,
    getAudits,
    getAuditDetails,
    updateAuditItems,
    completeAudit,
    requestReconciliation,
  };
}
