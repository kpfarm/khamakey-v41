import { WORKER_BASE_URL } from "./config.js";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const PRODUCT_LINE_LABELS = {
  orsetto: "Orsetto NFC",
  portachiavi: "Portachiavi NFC",
  card: "Card NFC",
  magnete: "Magnete NFC",
  tag: "Tag NFC",
  confezione: "Confezione regalo",
  altro: "Altro",
  non_specificato: "—"
};

const PAGE = { cols: 2, rows: 6, marginX: 8, marginY: 8, w: 210, h: 297 };
PAGE.labelW = (PAGE.w - PAGE.marginX * 2) / PAGE.cols;
PAGE.labelH = (PAGE.h - PAGE.marginY * 2) / PAGE.rows;
PAGE.perPage = PAGE.cols * PAGE.rows;

function nfcUrl(row){
  return row?.public_slug ? `${WORKER_BASE_URL}/m/${row.public_slug}` : "";
}

function lineLabel(value){
  return PRODUCT_LINE_LABELS[value] || value || "—";
}

function splitLines(doc, text, maxWidth){
  return doc.splitTextToSize(String(text || ""), maxWidth);
}

async function qrDataUrl(text){
  return QRCode.toDataURL(text, {
    width: 180,
    margin: 0,
    errorCorrectionLevel: "M"
  });
}

function drawCutGuide(doc, x, y, w, h){
  doc.setDrawColor(210, 214, 220);
  doc.setLineWidth(0.15);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.rect(x, y, w, h);
  doc.setLineDashPattern([], 0);
}

async function drawLabel(doc, x, y, w, h, row, qrImage){
  drawCutGuide(doc, x, y, w, h);
  const pad = 3;
  const qrSize = 26;
  const textX = x + pad + qrSize + 3;
  const textW = w - pad * 2 - qrSize - 3;

  if(qrImage){
    doc.addImage(qrImage, "PNG", x + pad, y + pad + 1, qrSize, qrSize);
  }

  let ty = y + pad + 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(27, 42, 94);
  doc.text("KhamaKey Moments", textX, ty);
  ty += 4;

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(lineLabel(row.product_line), textX, ty);
  ty += 3.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(27, 42, 94);
  doc.text("Codice attivazione", textX, ty);
  ty += 3.8;

  doc.setFontSize(10.5);
  doc.text(String(row.code || "—"), textX, ty);
  ty += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  doc.setTextColor(71, 85, 105);
  doc.text("Codice confezione", textX, ty);
  ty += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text(String(row.code || "—"), textX, ty);
  ty += 4.2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.setTextColor(100, 116, 139);
  const lotto = row.batch_label ? `Lotto: ${row.batch_label}` : "Lotto: —";
  doc.text(lotto, textX, ty);
  ty += 3.2;

  doc.setFontSize(5.2);
  doc.text("Link NFC (programma chip):", textX, ty);
  ty += 2.8;
  const urlLines = splitLines(doc, nfcUrl(row), textW);
  doc.text(urlLines.slice(0, 2), textX, ty);

  doc.setFontSize(4.8);
  doc.setTextColor(130, 138, 154);
  doc.text("Attiva su khamakey-app.pages.dev/moments.html", x + pad, y + h - 2.5);
}

export async function exportMomentLabelsPdf(rows, filenameStem = "khamakey-etichette"){
  if(!rows.length){
    alert("Nessun codice da esportare.");
    return false;
  }

  const qrCache = new Map();
  await Promise.all(rows.map(async row=>{
    const url = nfcUrl(row);
    if(!url || qrCache.has(url)) return;
    qrCache.set(url, await qrDataUrl(url));
  }));

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  for(let i = 0; i < rows.length; i++){
    if(i > 0 && i % PAGE.perPage === 0) doc.addPage();
    const indexOnPage = i % PAGE.perPage;
    const col = indexOnPage % PAGE.cols;
    const rowIndex = Math.floor(indexOnPage / PAGE.cols);
    const x = PAGE.marginX + col * PAGE.labelW;
    const y = PAGE.marginY + rowIndex * PAGE.labelH;
    const url = nfcUrl(rows[i]);
    await drawLabel(doc, x, y, PAGE.labelW, PAGE.labelH, rows[i], qrCache.get(url));
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`${filenameStem}-${stamp}-${rows.length}.pdf`);
  return true;
}
