"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TableFooter,
  Button,
  Card,
  CardContent,
} from "@mui/material";
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { useQuery } from "@tanstack/react-query";
import { useReportApi } from "@/api/reports";
import { useAuth } from "@/context/AuthContext";
import { exportToExcel } from '@/utils/export'; // Importer la fonction d'export

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(value);
};

const StockValueReport: React.FC = () => {
  const { token } = useAuth();
  const { getStockValueReport } = useReportApi();

  const { data: reportData, isLoading, isError, error } = useQuery({
    queryKey: ['stockValueReport'],
    queryFn: getStockValueReport,
    enabled: !!token, // Only fetch if the user is authenticated
  });

  const handleExportExcel = () => {
    if (!reportData || !reportData.items) return;

    // Formater les données pour l'export Excel avec des en-têtes en français
    const dataForExport = reportData.items.map(item => ({
      'Produit': item.productName,
      'Référence': item.productReference,
      'Quantité': item.quantity,
      'Coût Unitaire (CFA)': item.cost,
      'Valeur Totale (CFA)': item.totalValue,
    }));

    // Ajouter une ligne pour le total
    dataForExport.push({
      'Produit': 'TOTAL',
      'Référence': '',
      'Quantité': 0,
      'Coût Unitaire (CFA)': 0,
      'Valeur Totale (CFA)': reportData.totalStockValue,
    });

    exportToExcel({
      data: dataForExport,
      fileName: `Rapport_Valeur_Stock_${new Date().toLocaleDateString('fr-FR')}`,
      sheetName: 'Rapport Valeur Stock',
    });
  };

  const handlePrintReport = () => {
    if (!reportData) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Veuillez autoriser les pop-ups pour imprimer le rapport.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Rapport Valeur du Stock</title>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; line-height: 1.6; margin: 20px; color: #333; }
              .container { width: 100%; max-width: 750px; margin: 0 auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0056b3; padding-bottom: 15px; }
              .header h1 { color: #0056b3; font-size: 28px; margin: 0; }
              .header p { font-size: 10px; color: #777; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #e0e0e0; padding: 10px; text-align: left; }
              th { background-color: #0056b3; color: white; font-weight: bold; }
              tfoot td { font-weight: bold; background-color: #f2f2f2; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <img src="/Logo_PF.jpeg" alt="Postefinances Logo" style="width: 150px; height: auto; margin-bottom: 10px;" />
                  <h1>RAPPORT VALEUR DU STOCK</h1>
                  <p>Date d'impression: ${new Date().toLocaleDateString('fr-FR')}</p>
              </div>
              <p><strong>Valeur Totale du Stock:</strong> ${formatCurrency(reportData.totalStockValue)} CFA</p>
              <table>
                  <thead>
                      <tr>
                          <th>Produit</th>
                          <th>Référence</th>
                          <th style="text-align: right;">Quantité</th>
                          <th style="text-align: right;">Coût Unitaire</th>
                          <th style="text-align: right;">Valeur Totale</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${reportData.items.map(item => `
                          <tr>
                              <td>${item.productName}</td>
                              <td>${item.productReference}</td>
                              <td style="text-align: right;">${item.quantity}</td>
                              <td style="text-align: right;">${formatCurrency(item.cost)}</td>
                              <td style="text-align: right;">${formatCurrency(item.totalValue)}</td>
                          </tr>
                      `).join('')}
                  </tbody>
                  <tfoot>
                      <tr>
                          <td colspan="4" style="text-align: right; font-weight: bold;">Total Général</td>
                          <td style="text-align: right; font-weight: bold;">${formatCurrency(reportData.totalStockValue)} CFA</td>
                      </tr>
                  </tfoot>
              </table>
          </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (isError) {
    return <Alert severity="error">{(error as Error).message || "Failed to fetch stock value report."}</Alert>;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Rapport sur la Valeur du Stock
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
            disabled={!reportData || reportData.items.length === 0}
            sx={{ mr: 1 }}
          >
            Exporter en Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrintReport}
            disabled={!reportData}
          >
            Imprimer le Rapport
          </Button>
        </Box>
      </Box>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" color="text.secondary">
            Valeur Totale du Stock
          </Typography>
          <Typography variant="h4" component="p" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {formatCurrency(reportData?.totalStockValue || 0)} CFA
          </Typography>
          <Typography variant="body2" color="text.secondary">
            En date du {reportData ? new Date(reportData.reportDate).toLocaleDateString('fr-FR') : 'N/A'}
          </Typography>
        </CardContent>
      </Card>
      
      <Paper>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="stock value table">
            <TableHead>
              <TableRow>
                <TableCell>Produit</TableCell>
                <TableCell>Référence</TableCell>
                <TableCell align="right">Quantité</TableCell>
                <TableCell align="right">Coût Unitaire (CFA)</TableCell>
                <TableCell align="right">Valeur Totale (CFA)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData?.items.map((item) => (
                <TableRow key={item.productId} hover>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.productReference}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(item.cost)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.totalValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                  Total Général
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {formatCurrency(reportData?.totalStockValue || 0)} CFA
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default StockValueReport;
