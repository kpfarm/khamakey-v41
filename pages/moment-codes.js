/** Codici attivazione Moments — normalizzazione e formato leggibile per cliente. */

export const MOMENT_CODE_LENGTH = 12;
export const MOMENT_CODE_GROUP = 4;
/** 12 lettere/numeri + 2 trattini (XXXX-XXXX-XXXX). Largo per incollare con spazi. */
export const MOMENT_CODE_INPUT_MAX_LENGTH = 24;

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

/** Campo di inserimento: come l’etichetta, con trattino già visibile dopo ogni gruppo da 4. */
export function formatMomentCodeInput(value){
  const clean = normalizeMomentCode(value).slice(0, MOMENT_CODE_LENGTH);
  if(!clean) return "";
  const formatted = formatMomentCodeDisplay(clean);
  if(clean.length < MOMENT_CODE_LENGTH && clean.length % MOMENT_CODE_GROUP === 0){
    return `${formatted}-`;
  }
  return formatted;
}

export function caretIndexForMomentCode(rawValue, caret, formatted){
  const prefix = String(rawValue || "").slice(0, Math.max(0, Number(caret) || 0));
  const compactBefore = normalizeMomentCode(prefix).length;
  if(!compactBefore) return 0;
  let seen = 0;
  for(let i = 0; i < formatted.length; i++){
    if(/[A-Z0-9]/i.test(formatted[i])){
      seen += 1;
      if(seen === compactBefore){
        let next = i + 1;
        if(formatted[next] === "-") next += 1;
        return next;
      }
    }
  }
  return formatted.length;
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
