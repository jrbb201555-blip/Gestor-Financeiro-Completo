import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { RelatorioExportData } from "@workspace/api-client-react";

export function downloadExcel(data: RelatorioExportData, filename: string) {
  const wsData = [];
  
  // Headers
  wsData.push(data.colunas);
  
  // Rows
  data.linhas.forEach((row) => {
    wsData.push(data.colunas.map((col) => row[col] || ""));
  });

  // Totals
  if (data.totais) {
    wsData.push([]);
    wsData.push(["TOTAIS"]);
    Object.entries(data.totais).forEach(([key, value]) => {
      wsData.push([key, value]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function downloadPDF(data: RelatorioExportData, filename: string) {
  const doc = new jsPDF("l", "pt", "a4"); // landscape for wide tables
  
  doc.setFontSize(16);
  doc.text(data.titulo, 40, 40);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${data.geradoEm}`, 40, 60);
  if (data.periodo) {
    doc.text(`Período: ${data.periodo}`, 40, 75);
  }

  const head = [data.colunas];
  const body = data.linhas.map((row) => data.colunas.map((col) => String(row[col] || "")));

  let startY = data.periodo ? 90 : 75;

  autoTable(doc, {
    startY,
    head,
    body,
    theme: "striped",
    headStyles: { fillColor: [24, 97, 61] }, // matches var(--primary) roughly
    styles: { fontSize: 9 },
  });

  if (data.totais) {
    const finalY = (doc as any).lastAutoTable.finalY || startY + 50;
    doc.setFontSize(11);
    doc.text("Resumo/Totais:", 40, finalY + 20);
    
    let currentY = finalY + 35;
    Object.entries(data.totais).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 40, currentY);
      currentY += 15;
    });
  }

  doc.save(`${filename}.pdf`);
}
