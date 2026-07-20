import { formatMomentCodeDisplay, normalizeMomentCode, packagingBarcodeForRow } from "./moment-codes.js";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import JsBarcode from "https://esm.sh/jsbarcode@3.11.6";

/** A4 in mm */
const A4 = { w: 210, h: 297 };

/** Etichetta fissa: 4 cm × 1,5 cm (larghezza × altezza) */
const LABEL = { w: 40, h: 15 };

/** Margini foglio e gap tra celle */
const SHEET = {
  marginX: 8,
  marginY: 14,
  gapX: 2,
  gapY: 2,
  headerH: 10,
  footerY: 292
};

function activationCode(row){
  return normalizeMomentCode(row?.code || row?.out_code || "");
}

function activationCodeDisplay(row){
  return formatMomentCodeDisplay(activationCode(row));
}

function packagingBarcode(row){
  return packagingBarcodeForRow(row);
}

function batchTitle(rows){
  const label = String(rows[0]?.batch_label || "").trim();
  const sku = String(rows[0]?.catalog_sku || "").trim();
  if(label && sku) return `${label} · ${sku}`;
  return label || sku || "Lotto KhamaKey Moments";
}

function barcodeDataUrl(value, { height = 28, width = 1.05 } = {}){
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, String(value || ""), {
    format: "CODE128",
    width,
    height,
    displayValue: false,
    margin: 0
  });
  return canvas.toDataURL("image/png");
}

/** Quante colonne/righe di etichette 40×15 mm entrano in A4 */
function computeLabelGrid(){
  const usableW = A4.w - SHEET.marginX * 2;
  const usableH = SHEET.footerY - SHEET.marginY - SHEET.headerH;
  const cols = Math.max(1, Math.floor((usableW + SHEET.gapX) / (LABEL.w + SHEET.gapX)));
  const rows = Math.max(1, Math.floor((usableH + SHEET.gapY) / (LABEL.h + SHEET.gapY)));
  const gridW = cols * LABEL.w + (cols - 1) * SHEET.gapX;
  const offsetX = SHEET.marginX + Math.max(0, (usableW - gridW) / 2);
  return { cols, rowsPerPage: rows, perPage: cols * rows, offsetX };
}

function drawSheetHeader(doc, title, subtitle){
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(27, 42, 94);
  doc.text(title, A4.w / 2, 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, A4.w / 2, 12, { align: "center" });
}

function drawLabelCell(doc, x, y, index1, row, barcodeImg){
  doc.setDrawColor(148, 163, 184);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.rect(x, y, LABEL.w, LABEL.h, "S");

  const pad = 1.2;
  const codeText = activationCodeDisplay(row) || "—";

  // Numero progressivo da 1
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(String(index1), x + pad, y + 3.2);

  // Codice attivazione
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(27, 42, 94);
  const codeLines = doc.splitTextToSize(codeText, LABEL.w - pad * 2 - 6);
  doc.text(codeLines.slice(0, 1), x + pad + 5.5, y + 3.4);

  if(barcodeImg){
    const barW = LABEL.w - pad * 2;
    const barH = 6.2;
    doc.addImage(barcodeImg, "PNG", x + pad, y + LABEL.h - pad - barH, barW, barH);
  }else{
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text("senza barcode", x + pad, y + LABEL.h - pad - 1);
  }
}

function drawLabelSheetPages(doc, rows, lotTitle, barcodeCache){
  const grid = computeLabelGrid();
  const pageCount = Math.max(1, Math.ceil(rows.length / grid.perPage));

  for(let page = 0; page < pageCount; page += 1){
    if(page > 0) doc.addPage();
    drawSheetHeader(
      doc,
      "Etichette confezione · 40 × 15 mm",
      `${lotTitle} · ${rows.length} pezzi · foglio ${page + 1}/${pageCount} · codice attivazione (inserto)`
    );

    const start = page * grid.perPage;
    const slice = rows.slice(start, start + grid.perPage);
    slice.forEach((row, i)=>{
      const absoluteIndex = start + i;
      const col = i % grid.cols;
      const rowIdx = Math.floor(i / grid.cols);
      const x = grid.offsetX + col * (LABEL.w + SHEET.gapX);
      const y = SHEET.marginY + SHEET.headerH + rowIdx * (LABEL.h + SHEET.gapY);
      const packageCode = packagingBarcode(row);
      drawLabelCell(doc, x, y, absoluteIndex + 1, row, barcodeCache.get(packageCode));
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Cella ${LABEL.w}×${LABEL.h} mm · numerazione continua da 1 (sinistra→destra, alto→basso)`,
      A4.w / 2,
      SHEET.footerY,
      { align: "center" }
    );
  }
}

/**
 * Tabella di controllo multi-colonna, stessa numerazione delle etichette (da 1).
 * Riempimento riga per riga (come la griglia etichette).
 */
function drawNumberedIndexPages(doc, rows, lotTitle){
  const marginX = 10;
  const topY = 18;
  const footerY = 290;
  const cols = rows.length > 36 ? 2 : 1;
  const colGap = 5;
  const colW = (A4.w - marginX * 2 - colGap * (cols - 1)) / cols;
  const indexW = 9;
  const fontSize = rows.length > 90 ? 6.5 : 7.5;
  const rowH = fontSize * 0.5 + 2.4;
  const rowsPerCol = Math.floor((footerY - topY - 8) / rowH);
  const perPage = rowsPerCol * cols;
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));

  for(let page = 0; page < pageCount; page += 1){
    doc.addPage();
    drawSheetHeader(
      doc,
      "Tabella codici · numerata da 1",
      `${lotTitle} · ${rows.length} pezzi · foglio ${page + 1}/${pageCount}`
    );

    for(let c = 0; c < cols; c += 1){
      const x = marginX + c * (colW + colGap);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      doc.setTextColor(71, 85, 105);
      doc.text("#", x + 1, topY);
      doc.text("Codice attivazione", x + indexW, topY);
      doc.setDrawColor(210, 214, 220);
      doc.setLineWidth(0.15);
      doc.line(x, topY + 1.5, x + colW - 1, topY + 1.5);
    }

    const start = page * perPage;
    const slice = rows.slice(start, start + perPage);
    slice.forEach((row, i)=>{
      const col = Math.floor(i / rowsPerCol);
      const rowInCol = i % rowsPerCol;
      const x = marginX + col * (colW + colGap);
      const y = topY + 5 + rowInCol * rowH;
      const n = start + i + 1;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(100, 116, 139);
      doc.text(String(n), x + 1, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(27, 42, 94);
      const code = activationCodeDisplay(row) || "—";
      doc.text(doc.splitTextToSize(code, colW - indexW - 2).slice(0, 1), x + indexW, y);
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Stessa numerazione delle etichette — elenco di controllo magazzino",
      A4.w / 2,
      footerY,
      { align: "center" }
    );
  }
}

export async function exportMomentLabelsPdf(rows, filenameStem = "khamakey-etichette"){
  if(!rows.length){
    alert("Nessun codice da esportare.");
    return false;
  }

  const lotTitle = batchTitle(rows);
  const barcodeCache = new Map();
  await Promise.all(rows.map(async row=>{
    const packageCode = packagingBarcode(row);
    if(packageCode && !barcodeCache.has(packageCode)){
      barcodeCache.set(packageCode, barcodeDataUrl(packageCode, { height: 28, width: 1.05 }));
    }
  }));

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true, orientation: "portrait" });
  const grid = computeLabelGrid();

  drawLabelSheetPages(doc, rows, lotTitle, barcodeCache);
  drawNumberedIndexPages(doc, rows, lotTitle);

  const stamp = new Date().toISOString().slice(0, 10);
  const safeStem = String(filenameStem || "khamakey-lotto").replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  doc.save(`${safeStem}-${stamp}-${rows.length}pz-${grid.cols}col.pdf`);
  return true;
}

export const LABEL_SIZE_MM = { ...LABEL };
export function labelGridInfo(){
  return computeLabelGrid();
}
