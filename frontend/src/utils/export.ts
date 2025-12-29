// src/utils/export.ts
import * as XLSX from 'xlsx';

interface ExportToExcelParams<T> {
  data: T[];
  fileName: string;
  sheetName?: string;
}

export const exportToExcel = <T extends Record<string, any>>({
  data,
  fileName,
  sheetName = 'Sheet 1',
}: ExportToExcelParams<T>) => {
  // Crée une feuille de calcul à partir des données JSON
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Crée un nouveau classeur
  const workbook = XLSX.utils.book_new();

  // Ajoute la feuille de calcul au classeur
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Génère le fichier Excel et déclenche le téléchargement
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
