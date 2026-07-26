import { getUiLocale } from "./moments-i18n.js?v=221";
import { FIELD_PHRASE_EN } from "./moments-i18n-fields.js?v=221";

export const RSVP_OPTIONAL_FIELDS = {
  guests:{ label:"Quanti siete?", type:"number", waLabel:"👥 Ospiti", waLabelEn:"👥 Guests", placeholder:"1", hint:"Numero di persone" },
  notes:{ label:"Note (allergie, bambini…)", type:"textarea", waLabel:"📝 Note", waLabelEn:"📝 Notes", placeholder:"Facoltativo", hint:"Allergie, bambini, esigenze" },
  phone:{ label:"Telefono", type:"tel", waLabel:"📞 Tel.", waLabelEn:"📞 Phone", placeholder:"Es. 333 1234567", hint:"Per contatti rapidi" },
  email:{ label:"Email", type:"email", waLabel:"✉️ Email", waLabelEn:"✉️ Email", placeholder:"Es. marco@email.it", hint:"Conferma via email" }
};

function lf(text){
  const raw = String(text || "");
  if(!raw || getUiLocale() === "it") return raw;
  return FIELD_PHRASE_EN[raw] || raw;
}

function waLabelFor(spec){
  return getUiLocale() === "en" ? (spec.waLabelEn || spec.waLabel) : spec.waLabel;
}

export function normalizeRsvpSection(section = {}){
  const next = { ...section };
  if(!Array.isArray(next.field_keys)){
    next.field_keys = [];
    if(next.ask_guests !== false) next.field_keys.push("guests");
    if(next.ask_notes !== false) next.field_keys.push("notes");
  }
  next.field_keys = [...new Set(next.field_keys.filter(key=>RSVP_OPTIONAL_FIELDS[key]))];
  if(!Array.isArray(next.custom_fields)) next.custom_fields = [];
  next.custom_fields = next.custom_fields
    .map((field,index)=>({
      id:String(field?.id || `custom_${index + 1}`).trim() || `custom_${index + 1}`,
      label:String(field?.label || "").trim(),
      placeholder:String(field?.placeholder || "").trim(),
      type:field?.type === "textarea" ? "textarea" : "text",
      enabled:field?.enabled !== false
    }))
    .filter(field=>field.label)
    .slice(0, 8);
  next.ask_guests = next.field_keys.includes("guests");
  next.ask_notes = next.field_keys.includes("notes");
  return next;
}

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function lfSpan(itText){
  const it = String(itText || "");
  return `<span data-lf="${esc(it)}">${esc(lf(it))}</span>`;
}

function customRowHtml(index, field = {}){
  const voiceIt = "Voce personalizzata";
  const hintIt = "Suggerimento";
  const removeIt = "Rimuovi";
  const phLabel = "Es. Menu scelto";
  const phHint = "Es. Carne / Pesce / Veg";
  return `<div class="rsvp-custom-row" data-rsvp-custom-row="${index}">
      <label>${lfSpan(voiceIt)}<input name="section_rsvp_custom_label_${index}" value="${esc(field.label || "")}" placeholder="${esc(lf(phLabel))}" data-lf-placeholder="${esc(phLabel)}"></label>
      <label>${lfSpan(hintIt)}<input name="section_rsvp_custom_placeholder_${index}" value="${esc(field.placeholder || "")}" placeholder="${esc(lf(phHint))}" data-lf-placeholder="${esc(phHint)}"></label>
      <button type="button" class="ghost rsvp-custom-remove" data-rsvp-custom-remove="${index}" data-lf="${esc(removeIt)}">${esc(lf(removeIt))}</button>
    </div>`;
}

export function renderRsvpFieldsEditor(section = {}){
  const safe = normalizeRsvpSection(section);
  const toggles = Object.entries(RSVP_OPTIONAL_FIELDS).map(([key, spec])=>{
    const checked = safe.field_keys.includes(key);
    return `<label class="smart-toggle rsvp-field-toggle">
      <input type="checkbox" name="section_rsvp_field_${esc(key)}" data-rsvp-field-key="${esc(key)}" ${checked ? "checked" : ""}>
      <span><strong data-lf="${esc(spec.label)}">${esc(lf(spec.label))}</strong><small data-lf="${esc(spec.hint)}">${esc(lf(spec.hint))}</small></span>
    </label>`;
  }).join("");
  const customRows = safe.custom_fields.map((field,index)=>customRowHtml(index, field)).join("");
  const titleIt = "Cosa chiedere";
  const introIt = "Nome e presenza sono sempre inclusi. Attiva le voci che vuoi nel modulo invitati.";
  const addIt = "+ Aggiungi voce personalizzata";
  const eventIt = "Nome evento nel messaggio";
  const eventPh = "Es. Matrimonio Marco & Giulia";
  const eventHint = "Compare in evidenza sopra il modulo e nel messaggio WhatsApp.";
  return `<div class="editor-card smart-card" data-rsvp-fields-card>
    <p class="ecard-title"><span class="step-badge">2</span> ${lfSpan(titleIt)}</p>
    <p class="field-hint" data-lf="${esc(introIt)}">${esc(lf(introIt))}</p>
    <div class="rsvp-field-toggles">${toggles}</div>
    <div class="rsvp-custom-fields" id="rsvpCustomFieldsList">${customRows}</div>
    <button type="button" class="ghost rsvp-add-field" id="rsvpAddCustomField" data-lf="${esc(addIt)}">${esc(lf(addIt))}</button>
    <input type="hidden" name="section_rsvp_custom_count" id="rsvpCustomCount" value="${safe.custom_fields.length}">
    <label class="rsvp-event-label">${lfSpan(eventIt)}
      <input class="rsvp-event-input" name="section_rsvp_event_name" value="${esc(safe.event_name || "")}" placeholder="${esc(lf(eventPh))}" data-lf-placeholder="${esc(eventPh)}">
      <span class="field-hint" data-lf="${esc(eventHint)}">${esc(lf(eventHint))}</span>
    </label>
  </div>`;
}

export function readRsvpFieldsFromForm(form, formNode = null){
  const checked = name=>{
    const el = formNode?.elements?.[name] || formNode?.querySelector?.(`[name="${name}"]`);
    if(el && el.type === "checkbox") return Boolean(el.checked);
    return form.get(name) === "on";
  };
  const text = name=>{
    const el = formNode?.elements?.[name] || formNode?.querySelector?.(`[name="${name}"]`);
    if(el && typeof el.value === "string") return String(el.value || "").trim();
    return String(form.get(name) || "").trim();
  };
  const fieldKeys = Object.keys(RSVP_OPTIONAL_FIELDS).filter(key=>checked(`section_rsvp_field_${key}`));
  const count = Number(text("section_rsvp_custom_count") || form.get("section_rsvp_custom_count") || 0);
  const customFields = [];
  for(let index = 0; index < count; index += 1){
    const label = text(`section_rsvp_custom_label_${index}`);
    if(!label) continue;
    customFields.push({
      id:`custom_${index + 1}`,
      label,
      placeholder:text(`section_rsvp_custom_placeholder_${index}`),
      type:"text",
      enabled:true
    });
  }
  return normalizeRsvpSection({
    field_keys:fieldKeys,
    custom_fields:customFields,
    ask_guests:fieldKeys.includes("guests"),
    ask_notes:fieldKeys.includes("notes")
  });
}

export function bindRsvpFieldsEditor(formNode, onChange){
  const list = formNode.querySelector("#rsvpCustomFieldsList");
  const countInput = formNode.querySelector("#rsvpCustomCount");
  const rerender = ()=>{
    if(typeof onChange === "function") onChange();
  };
  formNode.querySelectorAll("[data-rsvp-field-key]").forEach(input=>{
    input.addEventListener("change",rerender);
  });
  formNode.querySelector("#rsvpAddCustomField")?.addEventListener("click",()=>{
    const count = Number(countInput?.value || 0);
    if(count >= 8) return;
    list?.insertAdjacentHTML("beforeend", customRowHtml(count));
    if(countInput) countInput.value = String(count + 1);
    rerender();
  });
  list?.addEventListener("click",event=>{
    const button = event.target.closest("[data-rsvp-custom-remove]");
    if(!button) return;
    button.closest(".rsvp-custom-row")?.remove();
    reindexRsvpCustomRows(list, countInput);
    rerender();
  });
  list?.addEventListener("input",event=>{
    if(event.target.closest(".rsvp-custom-row")) rerender();
  });
}

function reindexRsvpCustomRows(list, countInput){
  if(!list) return;
  [...list.querySelectorAll(".rsvp-custom-row")].forEach((row,index)=>{
    row.dataset.rsvpCustomRow = String(index);
    const label = row.querySelector("[name^='section_rsvp_custom_label_']");
    const placeholder = row.querySelector("[name^='section_rsvp_custom_placeholder_']");
    const remove = row.querySelector("[data-rsvp-custom-remove]");
    if(label) label.name = `section_rsvp_custom_label_${index}`;
    if(placeholder) placeholder.name = `section_rsvp_custom_placeholder_${index}`;
    if(remove) remove.dataset.rsvpCustomRemove = String(index);
  });
  if(countInput) countInput.value = String(list.querySelectorAll(".rsvp-custom-row").length);
}

export function rsvpGuestPreviewLines(section = {}){
  const safe = normalizeRsvpSection(section);
  const en = getUiLocale() === "en";
  const eventName = String(safe.event_name || (en ? "Event" : "Evento")).trim();
  const lines = en
    ? ["Hi! 👋", `RSVP · ${eventName}`, "", "👤 Name: Alex Smith", "✓ Attendance: Yes, I’ll be there"]
    : ["Ciao! 👋", `RSVP · ${eventName}`, "", "👤 Nome: Marco Rossi", "✓ Presenza: Sì, ci sarò"];
  safe.field_keys.forEach(key=>{
    const spec = RSVP_OPTIONAL_FIELDS[key];
    if(!spec) return;
    const label = waLabelFor(spec);
    if(key === "guests") lines.push(`${label}: 2`);
    else if(key === "notes") lines.push(`${label}: —`);
    else lines.push(`${label}: …`);
  });
  safe.custom_fields.forEach(field=>{
    if(field.enabled === false) return;
    lines.push(`${field.label}: …`);
  });
  return lines.join("\n");
}
