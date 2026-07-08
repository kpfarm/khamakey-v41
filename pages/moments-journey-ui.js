import { uploadImage } from "./media-upload.js";
import {
  MAX_JOURNEY_STEPS,
  journeyStepId,
  normalizeJourneyStep,
  normalizeJourneySteps,
  parseJourneySteps,
  resolveJourneySteps,
  serializeJourneySteps
} from "./moment-journey.js";

export function readJourneySteps(formNode,key = "timeline"){
  const field = formNode.querySelector(`input[name="section_${key}_items"]`);
  return parseJourneySteps(field?.value || "");
}

export function writeJourneySteps(formNode,key,steps){
  const list = normalizeJourneySteps(steps);
  const field = formNode.querySelector(`input[name="section_${key}_items"]`);
  if(field) field.value = serializeJourneySteps(list);
  const bodyField = formNode.querySelector(`input[name="section_${key}_body"], textarea[name="section_${key}_body"]`);
  if(bodyField){
    bodyField.value = list.map(step=>{
      if(step.place && step.date) return `${step.date} · ${step.place}${step.text ? ` — ${step.text}` : ""}`;
      if(step.date && step.text) return `${step.date} · ${step.text}`;
      if(step.place) return `📍 · ${step.place}${step.text ? ` — ${step.text}` : ""}`;
      return step.text || "";
    }).filter(Boolean).join("\n");
  }
}

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

export function journeyStepRowHtml(step,index){
  const safe = normalizeJourneyStep(step);
  const stepNum = index + 1;
  const preview = safe.image_url
    ? `<img src="${esc(safe.image_url)}" alt="" loading="lazy">`
    : `<span class="journey-photo-empty"><span aria-hidden="true">📷</span><small>Tocca per aggiungere foto</small></span>`;
  return `<article class="journey-step-card" draggable="true" data-journey-id="${esc(safe.id)}" data-journey-index="${index}">
    <header class="journey-step-head">
      <button type="button" class="journey-step-drag" aria-label="Trascina per riordinare tappa ${stepNum}" title="Trascina">☰</button>
      <span class="journey-step-badge">Tappa ${stepNum}</span>
      <button type="button" class="journey-step-remove" data-journey-remove="${esc(safe.id)}" aria-label="Rimuovi tappa ${stepNum}">Elimina</button>
    </header>
    <button type="button" class="journey-step-photo-btn" data-journey-upload="${esc(safe.id)}" aria-label="Carica foto tappa ${stepNum}">
      <div class="journey-step-preview">${preview}</div>
    </button>
    ${safe.image_url ? `<button type="button" class="ghost journey-step-clear-photo" data-journey-clear-photo="${esc(safe.id)}">Rimuovi foto</button>` : ""}
    <div class="journey-step-fields">
      <label>Nome tappa<input class="journey-field" data-journey-field="place" type="text" value="${esc(safe.place)}" placeholder="Es. Parigi · Chiesa di San Marco"></label>
      <label>Quando<input class="journey-field" data-journey-field="date" type="text" value="${esc(safe.date)}" placeholder="Es. 15 giugno · ore 18:30"></label>
      <label>Cosa racconti<textarea class="journey-field" data-journey-field="text" rows="3" placeholder="Racconta cosa è successo, cosa provi, un ricordo...">${esc(safe.text)}</textarea></label>
      <details class="journey-step-extra">
        <summary>Link mappa (facoltativo)</summary>
        <label>Google Maps<input class="journey-field" data-journey-field="maps_url" type="url" value="${esc(safe.maps_url)}" placeholder="https://maps.google.com/..."></label>
      </details>
    </div>
  </article>`;
}

export function renderJourneySteps(formNode,key = "timeline"){
  const list = document.getElementById(`journeySteps_${key}`);
  if(!list) return;
  const steps = readJourneySteps(formNode,key);
  list.innerHTML = steps.length
    ? steps.map((step,idx)=>journeyStepRowHtml(step,idx)).join("")
    : `<div class="journey-empty">
        <span class="journey-empty-icon" aria-hidden="true">🗺</span>
        <p><strong>Nessuna tappa ancora</strong></p>
        <p>Aggiungi le tappe del viaggio o del programma — una card per ogni momento importante.</p>
      </div>`;
  const count = document.getElementById(`journeyStepCount_${key}`);
  if(count) count.textContent = String(steps.length);
}

export function renderJourneyPanel(section,placesSection = null){
  const steps = resolveJourneySteps(section,placesSection);
  return `<div class="journey-panel" data-journey-key="timeline">
    <p class="journey-lead">Ogni tappa è una card: nome, data, racconto e foto. Trascina ☰ per riordinare.</p>
    <div class="journey-steps-head">
      <span class="journey-steps-count"><strong id="journeyStepCount_timeline">${steps.length}</strong> / ${MAX_JOURNEY_STEPS} tappe</span>
      <button type="button" class="primary journey-add-btn" data-journey-add="timeline">+ Aggiungi tappa</button>
    </div>
    <div class="journey-steps-list" id="journeySteps_timeline"></div>
    <input type="hidden" name="section_timeline_items" value="${esc(serializeJourneySteps(steps))}">
    <input type="hidden" name="section_timeline_body" value="${esc(section.body || "")}">
  </div>`;
}

export function renderJourneyFileInput(){
  return `<input type="file" id="journeyStepFile" accept="image/*" hidden tabindex="-1" aria-hidden="true">`;
}

function bindJourneyStepDnD(formNode){
  const listNode = document.getElementById("journeySteps_timeline");
  if(!listNode || listNode.dataset.dndBound === "1") return;
  listNode.dataset.dndBound = "1";
  let dragStepId = null;
  listNode.addEventListener("dragstart",event=>{
    if(event.target.closest("input,textarea,button:not(.journey-step-drag),label,details")) return;
    const row = event.target.closest(".journey-step-card");
    if(!row) return;
    dragStepId = row.dataset.journeyId;
    row.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
  });
  listNode.addEventListener("dragend",()=>{
    dragStepId = null;
    listNode.querySelector(".journey-step-card.dragging")?.classList.remove("dragging");
  });
  listNode.addEventListener("dragover",event=>{
    event.preventDefault();
    const over = event.target.closest(".journey-step-card");
    if(!over || !dragStepId || over.dataset.journeyId === dragStepId) return;
    const steps = readJourneySteps(formNode,"timeline");
    const from = steps.findIndex(step=>step.id === dragStepId);
    const to = steps.findIndex(step=>step.id === over.dataset.journeyId);
    if(from < 0 || to < 0 || from === to) return;
    const [moved] = steps.splice(from,1);
    steps.splice(to,0,moved);
    writeJourneySteps(formNode,"timeline",steps);
    renderJourneySteps(formNode,"timeline");
    formNode.dispatchEvent(new Event("input",{bubbles:true}));
  });
  listNode.addEventListener("drop",event=>event.preventDefault());
}

export function bindJourneyEditor(formNode,actions = {}){
  if(formNode.dataset.journeyBound === "1") return;
  formNode.dataset.journeyBound = "1";
  bindJourneyStepDnD(formNode);
  let previewTimer = null;
  formNode.addEventListener("click",event=>{
    const addBtn = event.target.closest("[data-journey-add]");
    if(addBtn && formNode.contains(addBtn)){
      event.preventDefault();
      actions.onAddStep?.(formNode);
      return;
    }
    const uploadBtn = event.target.closest("[data-journey-upload]");
    if(uploadBtn && formNode.contains(uploadBtn)){
      event.preventDefault();
      actions.onUploadStep?.(formNode, uploadBtn.dataset.journeyUpload);
      return;
    }
    const clearBtn = event.target.closest("[data-journey-clear-photo]");
    if(clearBtn && formNode.contains(clearBtn)){
      event.preventDefault();
      actions.onClearPhoto?.(formNode, clearBtn.dataset.journeyClearPhoto);
      return;
    }
    const removeBtn = event.target.closest("[data-journey-remove]");
    if(removeBtn && formNode.contains(removeBtn)){
      event.preventDefault();
      actions.onRemoveStep?.(formNode, removeBtn.dataset.journeyRemove);
    }
  });
  formNode.addEventListener("input",event=>{
    const row = event.target.closest(".journey-step-card");
    if(!row || !event.target.classList.contains("journey-field")) return;
    const steps = readJourneySteps(formNode,"timeline");
    const index = steps.findIndex(step=>step.id === row.dataset.journeyId);
    if(index < 0) return;
    const field = event.target.dataset.journeyField;
    if(!field) return;
    steps[index][field] = event.target.value.trim();
    writeJourneySteps(formNode,"timeline",steps);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(()=>formNode.dispatchEvent(new Event("input",{bubbles:true})),400);
  });
}

export async function uploadJourneyStepPhoto({supabase,row,formNode,stepId,file,onBusy}){
  const steps = readJourneySteps(formNode,"timeline");
  const index = steps.findIndex(step=>step.id === stepId);
  if(index < 0) throw new Error("Tappa non trovata.");
  onBusy?.(true);
  try{
    const url = await uploadImage(supabase,{scope:"moments",scopeId:row.id,file});
    const oldUrl = steps[index].image_url;
    steps[index].image_url = url;
    writeJourneySteps(formNode,"timeline",steps);
    renderJourneySteps(formNode,"timeline");
    formNode.dispatchEvent(new Event("input",{bubbles:true}));
    return {url,oldUrl};
  }finally{
    onBusy?.(false);
  }
}
