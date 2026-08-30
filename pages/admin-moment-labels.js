import { formatMomentCodeDisplay, normalizeMomentCode, packagingBarcodeForRow } from "./moment-codes.js";
import { WORKER_BASE_URL } from "./config.js";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import JsBarcode from "https://esm.sh/jsbarcode@3.11.6";
import QRCode from "https://esm.sh/qrcode@1.5.3";
import JSZip from "https://esm.sh/jszip@3.10.1";

/** A4 in mm */
const A4 = { w: 210, h: 297 };

/** Forme etichette Cricut (contorno = percorso di taglio) */
/** Inserto confezione: solo codice attivazione (riquadro stretto, 2 copie per pezzo) */
const CODE_RECT = { w: 36, h: 9 };
/** Spazio sopra il contorno per il N° pezzo (fuori dal taglio) */
const CODE_NUM_H = 3.4;
const CODE_CELL = { w: CODE_RECT.w, h: CODE_RECT.h + CODE_NUM_H };
/** Gap tra le 2 etichette codice affiancate (panoramica) */
const CODE_PAIR_GAP = 2.5;
/** @deprecated alias — stesso rettangolo codice */
const OVAL = CODE_RECT;
/**
 * Barcode magazzino — proporzioni tipo etichetta CODE128 retail (~33×12 mm),
 * non un riquadro troppo grande rispetto alle barre.
 */
const BAR_RECT = { w: 33, h: 12 };
/** Chip NFC: URL completo da copiare sul tag */
const LINK_RECT = { w: 72, h: 18 };
/**
 * QR pagina destinazione (= stesso URL del chip NFC).
 * Solo /m/<slug> — mai il codice di attivazione (sicurezza scaffale).
 * Contorno nero = taglio Cricut Print Then Cut.
 */
const QR_SQUARE = { w: 28, h: 28 };
/** Spazio sopra il contorno QR per il N° pezzo (fuori dal taglio) */
const QR_NUM_H = 3.4;
const QR_CELL = { w: QR_SQUARE.w, h: QR_SQUARE.h + QR_NUM_H };
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

/** Ogni pezzo → 2 etichette adesive identiche (stesso N° pezzo). */
function duplicateCodeLabelRows(rows){
  return rows.flatMap((row, i)=>[
    { ...row, __labelIndex: i + 1 },
    { ...row, __labelIndex: i + 1 }
  ]);
}

function barcodeDataUrl(value, { height = 36, width = 1.2 } = {}){
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

/** QR data URL — payload = solo URL pubblico /m/… (stesso del chip). */
async function qrDataUrl(url){
  const target = String(url || "").trim();
  if(!target) return "";
  return QRCode.toDataURL(target, {
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" }
  });
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
 * Inserto in confezione: rettangolo stretto + solo codice (niente frasi guida).
 * Il N° pezzo sta FUORI dal contorno di taglio (sopra a sinistra).
 */
function drawCodeRectLabel(doc, x, y, index1, row){
  const showNum = index1 != null && index1 !== "" && Number(index1) > 0;
  const boxY = showNum ? y + CODE_NUM_H : y;
  const cx = x + CODE_RECT.w / 2;

  if(showNum){
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(String(index1), x, y + 2.4);
  }

  setCutStroke(doc);
  doc.roundedRect(x, boxY, CODE_RECT.w, CODE_RECT.h, 1.0, 1.0, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const code = activationCodeDisplay(row);
  const lines = doc.splitTextToSize(code, CODE_RECT.w - 2.4);
  doc.text(lines.slice(0, 1), cx, boxY + CODE_RECT.h / 2 + 1.2, { align: "center" });
}

/** Due etichette codice affiancate (stesso pezzo). */
function drawCodeRectPair(doc, x, y, index1, row){
  drawCodeRectLabel(doc, x, y, index1, row);
  drawCodeRectLabel(doc, x + CODE_RECT.w + CODE_PAIR_GAP, y, index1, row);
}

/** @deprecated nome storico — ora rettangolo */
function drawOvalLabel(doc, x, y, index1, row){
  return drawCodeRectLabel(doc, x, y, index1, row);
}

/**
 * Etichetta esterna confezione: solo barcode magazzino (+ cifre leggibili).
 * Niente codice attivazione e niente numero d'ordine nel riquadro.
 */
function drawBarcodeRectLabel(doc, x, y, _index1, row, barcodeImg){
  setCutStroke(doc);
  doc.rect(x, y, BAR_RECT.w, BAR_RECT.h, "S");

  const packageCode = packagingBarcode(row);
  if(barcodeImg){
    const padX = 1.2;
    const padTop = 1.1;
    const barW = BAR_RECT.w - padX * 2;
    const barH = 5.8;
    doc.addImage(barcodeImg, "PNG", x + padX, y + padTop, barW, barH);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(packageCode || "—", x + BAR_RECT.w / 2, y + BAR_RECT.h - 1.4, { align: "center" });
}

/** Etichetta programmazione chip: solo URL completo. */
function drawLinkRectLabel(doc, x, y, _index1, row){
  setCutStroke(doc);
  doc.rect(x, y, LINK_RECT.w, LINK_RECT.h, "S");

  const full = nfcUrlForRow(row) || "—";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(full, LINK_RECT.w - 3.5);
  const shown = lines.slice(0, 2);
  const startY = shown.length > 1 ? y + 7.2 : y + 10.5;
  doc.text(shown, x + LINK_RECT.w / 2, startY, { align: "center" });
}

/**
 * Quadretto QR ritagliabile (confezione / backup NFC).
 * Contorno = taglio; N° pezzo FUORI (sopra a sinistra); contenuto = solo URL /m/<slug>.
 */
function drawQrSquareLabel(doc, x, y, index1, row, qrImg){
  const showNum = index1 != null && index1 !== "" && Number(index1) > 0;
  const boxY = showNum ? y + QR_NUM_H : y;

  if(showNum){
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(String(index1), x, y + 2.4);
  }

  setCutStroke(doc);
  doc.rect(x, boxY, QR_SQUARE.w, QR_SQUARE.h, "S");

  const pad = 2.2;
  const imgSize = QR_SQUARE.w - pad * 2;
  const imgX = x + pad;
  const imgY = boxY + pad;
  if(qrImg){
    doc.addImage(qrImg, "PNG", imgX, imgY, imgSize, imgSize);
  }else{
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text("QR n/d", x + QR_SQUARE.w / 2, boxY + QR_SQUARE.h / 2 + 2, { align: "center" });
  }
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
  cutSheet = true,
  qtyOverride = null
}){
  const grid = computeGrid(cellW, cellH);
  const pageCount = Math.max(1, Math.ceil(rows.length / grid.perPage));
  const qtyShown = qtyOverride != null ? qtyOverride : meta.qty;

  for(let page = 0; page < pageCount; page += 1){
    if(doc.__hasContent) doc.addPage();
    doc.__hasContent = true;

    drawCategoryQtyHeader(
      doc,
      meta.category,
      qtyShown,
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
      const n = row.__labelIndex != null ? row.__labelIndex : absoluteIndex + 1;
      drawCell(doc, x, y, n, row);
    });

    drawFooter(doc, cutSheet ? CUT_NOTE : "Foglio di controllo — abbinamento pezzo a pezzo (non tagliare)");
  }
}

/**
 * Sezione 1 — panoramica: # | 2× codice | barcode | URL NFC | QR
 */
function drawOverviewSection(doc, rows, meta, barcodeCache, qrCache){
  const colNumW = 10;
  const colCodeW = CODE_RECT.w * 2 + CODE_PAIR_GAP;
  const colBarW = BAR_RECT.w;
  const colQrW = QR_SQUARE.w;
  const colLinkW = Math.min(LINK_RECT.w, 52);
  const rowH = Math.max(CODE_RECT.h, BAR_RECT.h, LINK_RECT.h, QR_SQUARE.h, NUM_BOX.h) + 2;
  const gap = 2;
  const tableW = colNumW + gap + colCodeW + gap + colBarW + gap + colLinkW + gap + colQrW;
  const startX = Math.max(4, (A4.w - tableW) / 2);
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
      `foglio ${page + 1}/${pageCount} · 2 etichette codice per pezzo`
    );

    const headY = topY - 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.setTextColor(71, 85, 105);
    let hx = startX;
    doc.text("N°", hx, headY);
    hx += colNumW + gap;
    doc.text("CODICE ×2", hx, headY);
    hx += colCodeW + gap;
    doc.text("BARCODE", hx, headY);
    hx += colBarW + gap;
    doc.text("LINK NFC", hx, headY);
    hx += colLinkW + gap;
    doc.text("QR PAGINA", hx, headY);

    const start = page * perPage;
    const slice = rows.slice(start, start + perPage);
    slice.forEach((row, i)=>{
      const n = start + i + 1;
      const y = topY + 2 + i * (rowH + 2);
      let x = startX;

      drawNumberBadge(doc, x, y + (rowH - NUM_BOX.h) / 2, n);
      x += colNumW + gap;

      drawCodeRectPair(doc, x, y + (rowH - CODE_RECT.h) / 2, null, row);
      x += colCodeW + gap;

      const pkg = packagingBarcode(row);
      drawBarcodeRectLabel(doc, x, y + (rowH - BAR_RECT.h) / 2, n, row, barcodeCache.get(pkg));
      x += colBarW + gap;

      const linkX = x;
      const linkY = y + (rowH - LINK_RECT.h) / 2;
      setCutStroke(doc);
      doc.rect(linkX, linkY, colLinkW, LINK_RECT.h, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.8);
      doc.setTextColor(15, 23, 42);
      const full = nfcUrlForRow(row) || "—";
      const linkLines = doc.splitTextToSize(full, colLinkW - 3).slice(0, 2);
      const textY = linkLines.length > 1 ? linkY + 6.5 : linkY + 10;
      doc.text(linkLines, linkX + colLinkW / 2, textY, { align: "center" });
      x += colLinkW + gap;

      const url = nfcUrlForRow(row);
      drawQrSquareLabel(doc, x, y + (rowH - QR_SQUARE.h) / 2, null, row, qrCache.get(url));
    });

    drawFooter(doc, "Foglio di controllo — abbinamento pezzo a pezzo (non tagliare)");
  }
}

function drawOvalCutSection(doc, rows, meta){
  const doubled = duplicateCodeLabelRows(rows);
  drawGridSection(doc, doubled, meta, {
    sectionTitle: "2 · Etichette codice (rettangoli ×2) · Cricut",
    cellW: CODE_CELL.w,
    cellH: CODE_CELL.h,
    cutSheet: true,
    qtyOverride: `${meta.qty} pezzi · ${doubled.length} etichette`,
    drawCell: (d, x, y, n, row)=>drawCodeRectLabel(d, x, y, n, row)
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

function drawQrCutSection(doc, rows, meta, qrCache){
  drawGridSection(doc, rows, meta, {
    sectionTitle: "5 · QR pagina destinazione (quadretti) · Cricut",
    cellW: QR_CELL.w,
    cellH: QR_CELL.h,
    cutSheet: true,
    drawCell: (d, x, y, n, row)=>{
      const url = nfcUrlForRow(row);
      drawQrSquareLabel(d, x, y, n, row, qrCache.get(url));
    }
  });
}

function escapeXml(value){
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** jsPDF usa pt; SVG con viewBox in mm deve convertire pt → mm. */
const PT_TO_MM = 25.4 / 72;

function svgFontMm(pt){
  return Number((Number(pt) * PT_TO_MM).toFixed(3));
}

/** Font size mm che fa stare il codice nel riquadro (stesso look del PDF). */
function codeFontMmForDisplay(code){
  const text = String(code || "");
  const maxW = CODE_RECT.w - 2.4;
  // Helvetica bold ≈ 0.62em per carattere
  const raw = maxW / Math.max(1, text.length * 0.62);
  return Math.max(2.2, Math.min(svgFontMm(10), Number(raw.toFixed(3))));
}

/**
 * Foglio SVG etichette codice (2 per pezzo) — Cricut Print Then Cut.
 * Nessun titolo, sfondo trasparente, casella bianca senza bordo nero.
 */
function buildCodeLabelsSvg(rows){
  const doubled = duplicateCodeLabelRows(rows);
  const grid = computeGrid(CODE_CELL.w, CODE_CELL.h);
  const pageH = A4.h;
  const pageCount = Math.max(1, Math.ceil(doubled.length / grid.perPage));
  const pages = [];
  const numFs = svgFontMm(7);

  for(let page = 0; page < pageCount; page += 1){
    const start = page * grid.perPage;
    const slice = doubled.slice(start, start + grid.perPage);
    const labels = slice.map((row, i)=>{
      const col = i % grid.cols;
      const rowIdx = Math.floor(i / grid.cols);
      const x = grid.offsetX + col * (grid.cellW + SHEET.gapX);
      const y = SHEET.marginY + SHEET.headerH + rowIdx * (grid.cellH + SHEET.gapY);
      const n = row.__labelIndex != null ? row.__labelIndex : start + i + 1;
      const boxY = y + CODE_NUM_H;
      const codeRaw = activationCodeDisplay(row);
      const code = escapeXml(codeRaw);
      const codeFs = codeFontMmForDisplay(codeRaw);
      const textW = CODE_RECT.w - 2.4;
      const baseline = boxY + CODE_RECT.h / 2 + codeFs * 0.35;
      return `
        <g data-piece="${n}">
          <text x="${x}" y="${y + numFs}" font-family="Helvetica, Arial, sans-serif" font-size="${numFs}" font-weight="700" fill="#0f172a">${n}</text>
          <rect x="${x}" y="${boxY}" width="${CODE_RECT.w}" height="${CODE_RECT.h}" rx="1" ry="1" fill="#ffffff" stroke="none"/>
          <text x="${x + CODE_RECT.w / 2}" y="${baseline}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${codeFs}" font-weight="700" fill="#0f172a" textLength="${textW}" lengthAdjust="spacingAndGlyphs">${code}</text>
        </g>`;
    }).join("");

    pages.push(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${A4.w}mm" height="${pageH}mm" viewBox="0 0 ${A4.w} ${pageH}">
        ${labels}
      </svg>`);
  }

  if(pages.length === 1) return pages[0].trim();
  const totalH = pageH * pages.length;
  const stacked = pages.map((pageSvg, idx)=>{
    const inner = pageSvg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    return `<g transform="translate(0, ${idx * pageH})">${inner}</g>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${A4.w}mm" height="${totalH}mm" viewBox="0 0 ${A4.w} ${totalH}">
  ${stacked}
</svg>`;
}

/** Raster PNG etichette codice (300 dpi, alpha) — solo caselle bianche + testo, no titolo/bordo. */
async function buildCodeLabelsPngBlob(rows){
  const doubled = duplicateCodeLabelRows(rows);
  const grid = computeGrid(CODE_CELL.w, CODE_CELL.h);
  const pageCount = Math.max(1, Math.ceil(doubled.length / grid.perPage));
  const dpi = 300;
  const scale = dpi / 25.4; // px per mm
  const pxW = Math.round(A4.w * scale);
  const pxH = Math.round(A4.h * scale * pageCount);

  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, pxW, pxH);
  ctx.textBaseline = "alphabetic";

  const drawRoundRect = (rx, ry, rw, rh, radius)=>{
    const r = Math.min(radius, rw / 2, rh / 2);
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
    ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
    ctx.arcTo(rx, ry + rh, rx, ry, r);
    ctx.arcTo(rx, ry, rx + rw, ry, r);
    ctx.closePath();
  };

  for(let page = 0; page < pageCount; page += 1){
    const pageOffsetY = page * A4.h * scale;
    const start = page * grid.perPage;
    const slice = doubled.slice(start, start + grid.perPage);
    slice.forEach((row, i)=>{
      const col = i % grid.cols;
      const rowIdx = Math.floor(i / grid.cols);
      const xMm = grid.offsetX + col * (grid.cellW + SHEET.gapX);
      const yMm = SHEET.marginY + SHEET.headerH + rowIdx * (grid.cellH + SHEET.gapY);
      const n = row.__labelIndex != null ? row.__labelIndex : start + i + 1;
      const boxYMm = yMm + CODE_NUM_H;
      const code = activationCodeDisplay(row);
      const codeFsMm = codeFontMmForDisplay(code);

      const x = xMm * scale;
      const y = pageOffsetY + yMm * scale;
      const boxY = pageOffsetY + boxYMm * scale;
      const boxW = CODE_RECT.w * scale;
      const boxH = CODE_RECT.h * scale;

      // N° pezzo fuori dalla casella (guida magazzino, non nel taglio bianco)
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "left";
      ctx.font = `700 ${svgFontMm(7) * scale}px Helvetica, Arial, sans-serif`;
      ctx.fillText(String(n), x, y + svgFontMm(7) * scale);

      // Casella bianca senza contorno
      ctx.fillStyle = "#ffffff";
      drawRoundRect(x, boxY, boxW, boxH, 1 * scale);
      ctx.fill();

      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.font = `700 ${codeFsMm * scale}px Helvetica, Arial, sans-serif`;
      const maxTextW = (CODE_RECT.w - 2.4) * scale;
      let drawFs = codeFsMm * scale;
      while(drawFs > 8 && ctx.measureText(code).width > maxTextW){
        drawFs -= 1;
        ctx.font = `700 ${drawFs}px Helvetica, Arial, sans-serif`;
      }
      ctx.fillText(code, x + boxW / 2, boxY + boxH / 2 + drawFs * 0.35);
    });
  }

  return new Promise((resolve, reject)=>{
    canvas.toBlob(b=>b ? resolve(b) : reject(new Error("PNG etichette non riuscito.")), "image/png");
  });
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url), 2500);
}

/**
 * Pacchetto etichette: PDF (5 sezioni) + SVG + PNG delle etichette codice ×2.
 * Numerazione continua da 1. QR = stesso URL del chip (/m/slug), mai il codice attivazione.
 */
export async function exportMomentLabelsPdf(rows, filenameStem = "khamakey-etichette"){
  if(!rows.length){
    alert("Nessun codice da esportare.");
    return false;
  }

  const meta = batchMeta(rows);
  const barcodeCache = new Map();
  const qrCache = new Map();
  await Promise.all(rows.map(async row=>{
    const packageCode = packagingBarcode(row);
    if(packageCode && !barcodeCache.has(packageCode)){
      barcodeCache.set(packageCode, barcodeDataUrl(packageCode, { height: 36, width: 1.2 }));
    }
    const url = nfcUrlForRow(row);
    if(url && !qrCache.has(url)){
      try{
        qrCache.set(url, await qrDataUrl(url));
      }catch(error){
        console.warn("QR non generato per", url, error);
        qrCache.set(url, "");
      }
    }
  }));

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true, orientation: "portrait" });
  doc.__hasContent = false;

  drawOverviewSection(doc, rows, meta, barcodeCache, qrCache);
  drawOvalCutSection(doc, rows, meta);
  drawBarcodeCutSection(doc, rows, meta, barcodeCache);
  drawLinkCutSection(doc, rows, meta);
  drawQrCutSection(doc, rows, meta, qrCache);

  const stamp = new Date().toISOString().slice(0, 10);
  const safeStem = String(filenameStem || "khamakey-lotto").replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const baseName = `${safeStem}-${stamp}-${rows.length}pz`;

  const pdfBlob = doc.output("blob");
  const svgText = buildCodeLabelsSvg(rows);
  let pngBlob = null;
  try{
    pngBlob = await buildCodeLabelsPngBlob(rows);
  }catch(error){
    console.warn("PNG etichette:", error);
  }

  const zip = new JSZip();
  zip.file(`${baseName}-cricut5.pdf`, pdfBlob);
  zip.file(`${baseName}-codici.svg`, svgText);
  if(pngBlob) zip.file(`${baseName}-codici.png`, pngBlob);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `${baseName}-etichette.zip`);
  return true;
}

export const LABEL_SIZE_MM = {
  oval: { ...CODE_RECT },
  code: { ...CODE_RECT },
  codeCell: { ...CODE_CELL },
  barcode: { ...BAR_RECT },
  link: { ...LINK_RECT },
  qr: { ...QR_SQUARE },
  qrCell: { ...QR_CELL }
};
export function labelGridInfo(){
  return {
    oval: computeGrid(CODE_CELL.w, CODE_CELL.h),
    code: computeGrid(CODE_CELL.w, CODE_CELL.h),
    barcode: computeGrid(BAR_RECT.w, BAR_RECT.h),
    link: computeGrid(LINK_RECT.w, LINK_RECT.h),
    qr: computeGrid(QR_CELL.w, QR_CELL.h)
  };
}
