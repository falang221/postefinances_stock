// src/types/report.ts

export interface StockValuationByCategory {
    categoryName: string;
    totalValue: number;
    [key: string]: any; // Permet aux propriétés d'être accédées par une clé string (nécessaire pour Recharts)
}
