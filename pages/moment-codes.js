/** Codici attivazione Moments — normalizzazione e formato leggibile per cliente. */

export const MOMENT_CODE_LENGTH = 12;
export const MOMENT_CODE_GROUP = 4;

export function normalizeMomentCode(value){
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatMomentCodeDisplay(value){
  const clean = normalizeMomentCode(value);
  if(!clean) return "";
  const parts = [];
  for(let i = 0; i < clean.length; i += MOMENT_CODE_GROUP){
    parts.push(clean.slice(i, i + MOMENT_CODE_GROUP));
  }
  return parts.join("-");
}

export function packagingBarcodeForRow(row){
  const packaging = String(row?.packaging_barcode || "").trim();
  if(packaging) return packaging;
  return normalizeMomentCode(row?.code || row?.out_code || "");
}

export function isValidMomentCode(value){
  const clean = normalizeMomentCode(value);
  return /^[A-Z0-9]{8,32}$/.test(clean);
}
