// src/api/reports.ts
import { useApiClient } from './client';
import { StockValuationByCategory, StockValueReportResponse, PaginatedProductStockStatusResponse } from '../types/api'; // Adjusted import
import { useCallback } from 'react';

export function useReportApi() {
    const client = useApiClient();

    const getStockValuationByCategory = useCallback(async (): Promise<StockValuationByCategory[]> => {
        return client.get<StockValuationByCategory[]>('/reports/stock-valuation-by-category');
    }, [client]);

    const getStockValueReport = useCallback(async (): Promise<StockValueReportResponse> => {
        return client.get<StockValueReportResponse>('/reports/stock-value');
    }, [client]);

    const getStockStatusReport = useCallback(async (
        page: number,
        pageSize: number,
        statusFilter?: string,
        categoryId?: string,
    ): Promise<PaginatedProductStockStatusResponse> => {
        const params = new URLSearchParams();
        params.append('page', String(page));
        params.append('page_size', String(pageSize));
        if (statusFilter) params.append('status_filter', statusFilter);
        if (categoryId) params.append('category_id', categoryId);
        return client.get<PaginatedProductStockStatusResponse>(`/reports/stock-status?${params.toString()}`);
    }, [client]);

    return {
        getStockValuationByCategory,
        getStockValueReport,
        getStockStatusReport, // Expose the new function
    };
}
