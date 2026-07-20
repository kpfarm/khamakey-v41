/** Helper consolle Moments — SKU automatici, nomi prodotto, linee oggetto. */

import { TYPE_LABELS } from "./moment-categories.js";

export const PRODUCT_LINE_OPTIONS = [
  { value: "portachiavi", label: "Portachiavi NFC", sku: "KEY", hint: "Oggetto più venduto — coppia, regalo, eventi." },
  { value: "orsetto", label: "Orsetto NFC", sku: "BEAR", hint: "Peluche con chip — nascite, bambini, ricordi." },
  { value: "card", label: "Card NFC", sku: "CARD", hint: "Tessera rigida — matrimoni, inviti eleganti." },
  { value: "magnete", label: "Magnete NFC", sku: "MAG", hint: "Per frigo — famiglia, foto, ricordi casa." },
  { value: "tag", label: "Tag / tessera NFC", sku: "TAG", hint: "Formato piatto — eventi, badge, bundle." },
  { value: "confezione", label: "Confezione regalo", sku: "BOX", hint: "Kit regalo con NFC incluso." },
  { value: "altro", label: "Altra linea (personalizzata)", sku: "OTH", hint: "Scrivi il nome linea sotto — utile per nuovi oggetti." }
];

export const LINE_SKU_BY_VALUE = Object.fromEntries(PRODUCT_LINE_OPTIONS.map(row => [row.value, row.sku]));

export const TYPE_SKU = {
  free: "GEN",
  love: "LOVE",
  mom: "MOM",
  dad: "DAD",
  child: "KID",
  kids: "KIDS",
  memory: "MEM",
  photo: "PHOT",
  pet: "PET",
  communion: "COM",
  baptism: "BAP",
  friendship: "FRND",
  family: "FAM",
  valentine: "VAL",
  christmas: "XMAS",
  birthday: "BDAY",
  wedding: "WED",
  party: "PARTY",
  travel: "TRV",
  memorial: "MEMO",
  portfolio: "PORT"
};

const PRODUCT_LINE_LABELS = Object.fromEntries(PRODUCT_LINE_OPTIONS.map(row => [row.value, row.label]));

export function normalizeMomentSku(value){
  return String(value || "").replace(/[^A-Z0-9-]/gi, "").toUpperCase();
}

export function lineSkuCode(line, customLine = ""){
  if(line === "altro"){
    const custom = String(customLine || "").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 8);
    return custom || "OTH";
  }
  return LINE_SKU_BY_VALUE[line] || "GEN";
}

export function typeSkuCode(type){
  const key = String(type || "free").toLowerCase();
  return TYPE_SKU[key] || key.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 4) || "GEN";
}

export function generateMomentSku({ productLine, productType, customLine = "", existingSkus = [] }){
  const base = `MOM-${lineSkuCode(productLine, customLine)}-${typeSkuCode(productType)}`;
  const taken = new Set((existingSkus || []).map(normalizeMomentSku).filter(Boolean));
  if(!taken.has(base)) return base;
  for(let i = 2; i < 100; i += 1){
    const candidate = `${base}-${String(i).padStart(2, "0")}`;
    if(!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

export function generateMomentProductName(productLine, productType, customLine = ""){
  const lineLabel = productLine === "altro" && customLine
    ? String(customLine).trim()
    : (PRODUCT_LINE_LABELS[productLine] || "Oggetto NFC").replace(/ NFC$/, "");
  const typeLabel = TYPE_LABELS[productType] || "Moments";
  return `KhamaKey ${typeLabel} — ${lineLabel}`;
}

export function generateBatchLabel(sku){
  const today = new Date().toISOString().slice(0, 10);
  return `${sku || "MOMENT"} · ${today}`;
}

export function generateCodePrefix(sku){
  return normalizeMomentSku(String(sku || "MOMENT").replace(/^MOM-/, "")).slice(0, 12) || "MOMENT";
}

export function renderProductLineOptions(selected = "portachiavi"){
  return PRODUCT_LINE_OPTIONS.map(row => `
    <option value="${row.value}" ${row.value === selected ? "selected" : ""}>${row.label}</option>
  `).join("");
}

export function productLineHint(line){
  return PRODUCT_LINE_OPTIONS.find(row => row.value === line)?.hint || "";
}

export function applyMomentProductAutofill(form, { existingSkus = [], force = false } = {}){
  if(!form?.elements) return;
  const line = form.elements.product_line?.value || "portachiavi";
  const type = form.elements.product_type?.value || form.querySelector("[data-moment-type-select]")?.value || "free";
  const customLine = form.elements.product_line_custom?.value || "";
  const skuInput = form.elements.sku;
  const nameInput = form.elements.name;
  const prefixInput = form.elements.prefix;
  const batchInput = form.elements.batch_label;

  const sku = generateMomentSku({ productLine: line, productType: type, customLine, existingSkus });
  const name = generateMomentProductName(line, type, customLine);

  if(skuInput && (force || !String(skuInput.value || "").trim() || skuInput.dataset.autoFilled === "1")){
    skuInput.value = sku;
    skuInput.dataset.autoFilled = "1";
  }
  if(nameInput && (force || !String(nameInput.value || "").trim() || nameInput.dataset.autoFilled === "1")){
    nameInput.value = name;
    nameInput.dataset.autoFilled = "1";
  }
  if(prefixInput && (force || !String(prefixInput.value || "").trim() || prefixInput.dataset.autoFilled === "1")){
    prefixInput.value = generateCodePrefix(sku);
    prefixInput.dataset.autoFilled = "1";
  }
  if(batchInput && (force || !String(batchInput.value || "").trim() || batchInput.dataset.autoFilled === "1")){
    batchInput.value = generateBatchLabel(sku);
    batchInput.dataset.autoFilled = "1";
  }

  const customWrap = form.querySelector("[data-product-line-custom-wrap]");
  if(customWrap) customWrap.hidden = line !== "altro";

  const hintNode = form.querySelector("[data-product-line-hint]");
  if(hintNode) hintNode.textContent = productLineHint(line);

  const preview = form.querySelector("[data-sku-preview]");
  if(preview) preview.textContent = sku;
}

export function wireMomentProductAutofill(form, getExistingSkus){
  if(!form || form.dataset.momentAutoWired === "1") return;
  form.dataset.momentAutoWired = "1";

  const refresh = (force = false) => {
    const existingSkus = typeof getExistingSkus === "function" ? getExistingSkus() : [];
    applyMomentProductAutofill(form, { existingSkus, force });
  };

  form.addEventListener("change", event => {
    const target = event.target;
    if(!target?.name) return;
    if(["product_line", "product_type", "product_line_custom"].includes(target.name)){
      refresh(false);
    }
  });

  form.querySelector("[data-moment-auto-sku]")?.addEventListener("click",()=>refresh(true));

  form.querySelectorAll("[data-moment-auto-name]").forEach(button=>{
    button.addEventListener("click",()=>{
      const line = form.elements.product_line?.value || "portachiavi";
      const type = form.elements.product_type?.value || "free";
      const customLine = form.elements.product_line_custom?.value || "";
      if(form.elements.name){
        form.elements.name.value = generateMomentProductName(line, type, customLine);
        form.elements.name.dataset.autoFilled = "1";
      }
    });
  });

  ["sku", "name", "prefix", "batch_label"].forEach(field=>{
    form.elements[field]?.addEventListener("input",()=>{
      if(form.elements[field]) form.elements[field].dataset.autoFilled = "0";
    });
  });

  refresh(false);
}
