import { formatMomentCodeDisplay, normalizeMomentCode, packagingBarcodeForRow } from "./moment-codes.js";
import { WORKER_BASE_URL } from "./config.js";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import JsBarcode from "https://esm.sh/jsbarcode@3.11.6";

/** A4 in mm */
const A4 = { w: 210, h: 297 };

/** Forme etichette Cricut (contorno = percorso di taglio) */
/** Inserto confezione: testo “a cosa serve” + codice attivazione */
const OVAL = { w: 52, h: 22 };
/** Solo barcode magazzino (esterno confezione) */
const BAR_RECT = { w: 42, h: 16 };
/** Chip NFC: URL completo da copiare sul tag */
const LINK_RECT = { w: 72, h: 18 };
const NUM_BOX = { w: 10, h: 10 };

const SHEET = {
  marginX: 8,
  marginY: 16,
  gapX: 3.5,
  gapY: 3.5,
  headerH: 22,
  footerY: 292
};

const CUT_NOTE = "Stampa a colori 100% · taglia sul contorno nero · Cricut Explore 4 Print Then Cut / taglio su contorno";

function activationCode(row){
  return normalizeMomentCode(row?.code || row?.out_code || "");
}

function activationCodeDisplay(row){
  return formatMomentCodeDisplay(activationCode(row)) || "—";
}

function packagingBarcode(row){
  return packagingBarcodeForRow(row);
}

/** URL completo per programmazione chip NFC (copia-incolla). */
function nfcUrlForRow(row){
  const explicit = String(row?.nfc_url || row?.nfcUrl || "").trim();
  if(explicit){
    if(/^https?:\/\//i.test(explicit)) return explicit;
    if(explicit.startsWith("/")) return `${WORKER_BASE_URL}${explicit}`;
    return explicit;
  }
  const slug = String(row?.public_slug || "").trim();
  if(!slug) return "";
  return `${WORKER_BASE_URL}/m/${encodeURIComponent(slug)}`;
}

function batchMeta(rows){
  const first = rows[0] || {};
  const label = String(first.batch_label || "").trim();
  const sku = String(first.catalog_sku || first.sku || "").trim();
  const type = String(first.product_type || first.product_label || "").trim();
  const category = [sku, label, type].filter(Boolean).join(" · ") || "Lotto KhamaKey Moments";
  return { category, qty: rows.length, lotTitle: label || sku || "Lotto KhamaKey Moments" };
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

function setCutStroke(doc){
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.35);
}

function drawCategoryQtyHeader(doc, category, qty, sectionTitle, pageLabel){
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(sectionTitle, A4.w / 2, 7, { align: "center" });

  const boxY = 10;
  const boxH = 10;
  const gap = 4;
  const boxW = (A4.w - SHEET.marginX * 2 - gap) / 2;

  setCutStroke(doc);
  doc.setLineWidth(0.25);
  doc.rect(SHEET.marginX, boxY, boxW, boxH, "S");
  doc.rect(SHEET.marginX + boxW + gap, boxY, boxW, boxH, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text("CATEGORIA", SHEET.marginX + 2, boxY + 3.5);
  doc.text("QUANTITÀ", SHEET.marginX + boxW + gap + 2, boxY + 3.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const catLines = doc.splitTextToSize(category, boxW - 4);
  doc.text(catLines.slice(0, 1), SHEET.marginX + 2, boxY + 7.8);
  doc.setFont("helvetica", "bold");
  doc.text(String(qty), SHEET.marginX + boxW + gap + 2, boxY + 7.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(pageLabel, A4.w / 2, boxY + boxH + 4, { align: "center" });
}

function drawFooter(doc, text){
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(text, A4.w / 2, SHEET.footerY, { align: "center" });
}

function drawNumberBadge(doc, x, y, n, size = NUM_BOX){
  setCutStroke(doc);
  doc.roundedRect(x, y, size.w, size.h, 1.5, 1.5, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(String(n), x + size.w / 2, y + size.h / 2 + 1.1, { align: "center" });
}

/**
 * Inserto in confezione: spiega a cosa serve il codice + il codice stesso.
 * (Non mischiare con barcode o URL NFC.)
 */
function drawOvalLabel(doc, x, y, index1, row){
  const cx = x + OVAL.w / 2;
  setCutStroke(doc);
  doc.ellipse(cx, y + OVAL.h / 2, OVAL.w / 2, OVAL.h / 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.setTextColor(100, 116, 139);
  doc.text(String(index1), x + 3.2, y + 4.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.setTextColor(71, 85, 105);
  doc.text("Per attivare la pagina", cx, y + 7.2, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.setTextColor(15, 23, 42);
  const code = activationCodeDisplay(row);
  const lines = doc.splitTextToSize(code, OVAL.w - 8);
  doc.text(lines.slice(0, 1), cx, y + 13.8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.6);
  doc.setTextColor(100, 116, 139);
  doc.text("Inseriscilo nell'app Moments", cx, y + 18.2, { align: "center" });
}

/**
 * Etichetta esterna confezione: solo barcode magazzino (+ cifre).
 * Niente codice attivazione e niente numero d'ordine nel riquadro.
 */
function drawBarcodeRectLabel(doc, x, y, _index1, row, barcodeImg){
  setCutStroke(doc);
  doc.rect(x, y, BAR_RECT.w, BAR_RECT.h, "S");

  const packageCode = packagingBarcode(row);
  if(barcodeImg){
    const pad = 1.2;
    const barW = BAR_RECT.w - pad * 2;
    const barH = 7.5;
    doc.addImage(barcodeImg, "PNG", x + pad, y + 2.2, barW, barH);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(15, 23, 42);
  doc.text(packageCode || "—", x + BAR_RECT.w / 2, y + BAR_RECT.h - 1.8, { align: "center" });
}

/** Etichetta programmazione chip: solo URL completo. */
function drawLinkRectLabel(doc, x, y, _index1, row){
  setCutStroke(doc);
  doc.rect(x, y, LINK_RECT.w, LINK_RECT.h, "S");

  const full = nfcUrlForRow(row) || "—";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(full, LINK_RECT.w - 4);
  const shown = lines.slice(0, 2);
  const startY = shown.length > 1 ? y + 7 : y + 10.5;
  doc.text(shown, x + LINK_RECT.w / 2, startY, { align: "center" });
}

function computeGrid(cellW, cellH){
  const usableW = A4.w - SHEET.marginX * 2;
  const usableH = SHEET.footerY - SHEET.marginY - SHEET.headerH - 4;
  const cols = Math.max(1, Math.floor((usableW + SHEET.gapX) / (cellW + SHEET.gapX)));
  const rows = Math.max(1, Math.floor((usableH + SHEET.gapY) / (cellH + SHEET.gapY)));
  const gridW = cols * cellW + (cols - 1) * SHEET.gapX;
  const offsetX = SHEET.marginX + Math.max(0, (usableW - gridW) / 2);
  return { cols, rowsPerPage: rows, perPage: cols * rows, offsetX, cellW, cellH };
}

function drawGridSection(doc, rows, meta, {
  sectionTitle,
  cellW,
  cellH,
  drawCell,
  cutSheet = true
}){
  const grid = computeGrid(cellW, cellH);
  const pageCount = Math.max(1, Math.ceil(rows.length / grid.perPage));

  for(let page = 0; page < pageCount; page += 1){
    if(doc.__hasContent) doc.addPage();
    doc.__hasContent = true;

    drawCategoryQtyHeader(
      doc,
      meta.category,
      meta.qty,
      sectionTitle,
      `foglio ${page + 1}/${pageCount} · numerazione da 1`
    );

    const start = page * grid.perPage;
    const slice = rows.slice(start, start + grid.perPage);
    slice.forEach((row, i)=>{
      const absoluteIndex = start + i;
      const col = i % grid.cols;
      const rowIdx = Math.floor(i / grid.cols);
      const x = grid.offsetX + col * (grid.cellW + SHEET.gapX);
      const y = SHEET.marginY + SHEET.headerH + rowIdx * (grid.cellH + SHEET.gapY);
      drawCell(doc, x, y, absoluteIndex + 1, row);
    });

    drawFooter(doc, cutSheet ? CUT_NOTE : "Foglio di controllo — abbinamento pezzo a pezzo (non tagliare)");
  }
}

/**
 * Sezione 1 — panoramica: # | ovale codice | barcode+codice | URL NFC completo
 */
function drawOverviewSection(doc, rows, meta, barcodeCache){
  const colNumW = 12;
  const colCodeW = OVAL.w;
  const colBarW = BAR_RECT.w;
  const colLinkW = Math.min(LINK_RECT.w, 78);
  const rowH = Math.max(OVAL.h, BAR_RECT.h, LINK_RECT.h, NUM_BOX.h) + 2;
  const gap = 2.5;
  const tableW = colNumW + gap + colCodeW + gap + colBarW + gap + colLinkW;
  const startX = Math.max(SHEET.marginX, (A4.w - tableW) / 2);
  const topY = SHEET.marginY + SHEET.headerH + 2;
  const usableH = SHEET.footerY - topY - 6;
  const perPage = Math.max(1, Math.floor(usableH / (rowH + 2)));
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));

  for(let page = 0; page < pageCount; page += 1){
    if(doc.__hasContent) doc.addPage();
    doc.__hasContent = true;

    drawCategoryQtyHeader(
      doc,
      meta.category,
      meta.qty,
      "1 · Panoramica lotto (controllo)",
      `foglio ${page + 1}/${pageCount} · stessa numerazione delle etichette`
    );

    const headY = topY - 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    let hx = startX;
    doc.text("NUMERO", hx, headY);
    hx += colNumW + gap;
    doc.text("CODICE DI ATTIVAZIONE", hx, headY);
    hx += colCodeW + gap;
    doc.text("BARCODE", hx, headY);
    hx += colBarW + gap;
    doc.text("LINK NFC (URL completo)", hx, headY);

    const start = page * perPage;
    const slice = rows.slice(start, start + perPage);
    slice.forEach((row, i)=>{
      const n = start + i + 1;
      const y = topY + 2 + i * (rowH + 2);
      let x = startX;

      drawNumberBadge(doc, x + 1, y + (rowH - NUM_BOX.h) / 2, n);
      x += colNumW + gap;

      drawOvalLabel(doc, x, y + (rowH - OVAL.h) / 2, n, row);
      x += colCodeW + gap;

      const pkg = packagingBarcode(row);
      drawBarcodeRectLabel(doc, x, y + (rowH - BAR_RECT.h) / 2, n, row, barcodeCache.get(pkg));
      x += colBarW + gap;

      const linkX = x;
      const linkY = y + (rowH - LINK_RECT.h) / 2;
      setCutStroke(doc);
      doc.rect(linkX, linkY, colLinkW, LINK_RECT.h, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.2);
      doc.setTextColor(15, 23, 42);
      const full = nfcUrlForRow(row) || "—";
      const linkLines = doc.splitTextToSize(full, colLinkW - 3).slice(0, 2);
      const textY = linkLines.length > 1 ? linkY + 6.5 : linkY + 10;
      doc.text(linkLines, linkX + colLinkW / 2, textY, { align: "center" });
    });

    drawFooter(doc, "Foglio di controllo — abbinamento pezzo a pezzo (non tagliare)");
  }
}

function drawOvalCutSection(doc, rows, meta){
  drawGridSection(doc, rows, meta, {
    sectionTitle: "2 · Etichette codice (ovali) · Cricut",
    cellW: OVAL.w,
    cellH: OVAL.h,
    cutSheet: true,
    drawCell: (d, x, y, n, row)=>drawOvalLabel(d, x, y, n, row)
  });
}

function drawBarcodeCutSection(doc, rows, meta, barcodeCache){
  drawGridSection(doc, rows, meta, {
    sectionTitle: "3 · Etichette barcode confezione · Cricut",
    cellW: BAR_RECT.w,
    cellH: BAR_RECT.h,
    cutSheet: true,
    drawCell: (d, x, y, n, row)=>{
      const pkg = packagingBarcode(row);
      drawBarcodeRectLabel(d, x, y, n, row, barcodeCache.get(pkg));
    }
  });
}

function drawLinkCutSection(doc, rows, meta){
  drawGridSection(doc, rows, meta, {
    sectionTitle: "4 · Etichette link NFC — URL completo · Cricut",
    cellW: LINK_RECT.w,
    cellH: LINK_RECT.h,
    cutSheet: true,
    drawCell: (d, x, y, n, row)=>drawLinkRectLabel(d, x, y, n, row)
  });
}

/**
 * PDF 4 sezioni: panoramica · ovali (testo+codice) · barcode · URL NFC
 * Numerazione continua da 1 in panoramica/ovali.
 */
export async function exportMomentLabelsPdf(rows, filenameStem = "khamakey-etichette"){
  if(!rows.length){
    alert("Nessun codice da esportare.");
    return false;
  }

  const meta = batchMeta(rows);
  const barcodeCache = new Map();
  await Promise.all(rows.map(async row=>{
    const packageCode = packagingBarcode(row);
    if(packageCode && !barcodeCache.has(packageCode)){
      barcodeCache.set(packageCode, barcodeDataUrl(packageCode, { height: 28, width: 1.05 }));
    }
  }));

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true, orientation: "portrait" });
  doc.__hasContent = false;

  drawOverviewSection(doc, rows, meta, barcodeCache);
  drawOvalCutSection(doc, rows, meta);
  drawBarcodeCutSection(doc, rows, meta, barcodeCache);
  drawLinkCutSection(doc, rows, meta);

  const stamp = new Date().toISOString().slice(0, 10);
  const safeStem = String(filenameStem || "khamakey-lotto").replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  doc.save(`${safeStem}-${stamp}-${rows.length}pz-cricut4.pdf`);
  return true;
}

export const LABEL_SIZE_MM = { oval: { ...OVAL }, barcode: { ...BAR_RECT }, link: { ...LINK_RECT } };
export function labelGridInfo(){
  return {
    oval: computeGrid(OVAL.w, OVAL.h),
    barcode: computeGrid(BAR_RECT.w, BAR_RECT.h),
    link: computeGrid(LINK_RECT.w, LINK_RECT.h)
  };
}
