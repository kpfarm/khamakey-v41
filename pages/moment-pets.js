/** Sezione Animale Moments — fino a 6 animali (nome, emoji, foto, racconto). */

import { getUiLocale } from "./moments-i18n.js?v=218";
import { FIELD_PHRASE_EN } from "./moments-i18n-fields.js?v=243";

export const MAX_PETS = 6;

function lf(text){
  const raw = String(text || "");
  if(!raw || getUiLocale() === "it") return raw;
  return FIELD_PHRASE_EN[raw] || raw;
}

function lfFill(it, vars = {}){
  let out = lf(it);
  for(const [key, value] of Object.entries(vars)){
    out = out.split(`{${key}}`).join(String(value ?? ""));
  }
  return out;
}

function esc(value){
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function petId(){
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `pet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizePet(raw = {}){
  const emoji = String(raw.emoji || raw.pet_emoji || "🐾").trim().slice(0, 8) || "🐾";
  return {
    id: String(raw.id || petId()),
    name: String(raw.name || raw.pet_name || "").trim().slice(0, 64),
    emoji,
    photo: String(raw.photo || raw.pet_photo || "").trim(),
    body: String(raw.body || "").trim().slice(0, 2000)
  };
}

function petHasContent(pet){
  return Boolean(pet?.name || pet?.photo || pet?.body);
}

/** Slot editor: tiene anche righe vuote (per «Aggiungi animale»). */
export function petSlots(section = {}){
  const fromPets = Array.isArray(section.pets)
    ? section.pets.map(normalizePet).slice(0, MAX_PETS)
    : [];
  if(fromPets.length) return fromPets;
  if(section.pet_name || section.pet_photo || section.body){
    return [normalizePet({
      name: section.pet_name,
      emoji: section.pet_emoji,
      photo: section.pet_photo,
      body: section.body
    })];
  }
  return [normalizePet()];
}

/** Persistenza / pagina pubblica: solo animali con contenuto. */
export function normalizePets(section = {}){
  const slots = Array.isArray(section.pets)
    ? section.pets.map(normalizePet).filter(petHasContent)
    : [];
  if(slots.length) return slots.slice(0, MAX_PETS);
  if(section.pet_name || section.pet_photo || section.body){
    return [normalizePet({
      name: section.pet_name,
      emoji: section.pet_emoji,
      photo: section.pet_photo,
      body: section.body
    })];
  }
  return [];
}

export function petsForEditor(section = {}){
  return petSlots(section);
}

export function serializePets(pets){
  return JSON.stringify(
    (Array.isArray(pets) ? pets : [])
      .map(normalizePet)
      .slice(0, MAX_PETS)
  );
}

/** Parse per UI editor — non scarta le righe vuote. */
export function parsePetSlots(raw){
  if(Array.isArray(raw)) return raw.map(normalizePet).slice(0, MAX_PETS);
  try{
    const parsed = JSON.parse(String(raw || "[]"));
    if(!Array.isArray(parsed)) return [];
    return parsed.map(normalizePet).slice(0, MAX_PETS);
  }catch{
    return [];
  }
}

/** Parse per salvataggio — solo animali con contenuto. */
export function parsePets(raw){
  if(Array.isArray(raw)) return normalizePets({ pets: raw });
  try{
    const parsed = JSON.parse(String(raw || "[]"));
    return normalizePets({ pets: Array.isArray(parsed) ? parsed : [] });
  }catch{
    return [];
  }
}

/** Allinea i campi legacy dal primo animale (compat vecchi client). */
export function syncLegacyPetFields(section = {}){
  const pets = normalizePets(section);
  const first = pets[0];
  return {
    ...section,
    pets,
    pet_name: first?.name || "",
    pet_emoji: first?.emoji || "🐾",
    pet_photo: first?.photo || ""
  };
}

function petPhotoPreviewHtml(pet){
  const uploadIt = "Carica foto";
  const removeIt = "Rimuovi";
  if(pet.photo){
    return `<img src="${esc(pet.photo)}" alt=""><button type="button" class="ghost" data-pet-photo-remove="${esc(pet.id)}" data-lf="Rimuovi">${esc(lf(removeIt))}</button>`;
  }
  return `<button type="button" class="primary section-photo-btn" data-pet-photo-upload="${esc(pet.id)}">📷 <span data-lf="${esc(uploadIt)}">${esc(lf(uploadIt))}</span></button>`;
}

function petRowHtml(pet, index){
  const removeIt = "Rimuovi";
  const nameIt = "Nome";
  const namePh = "Es. Luna";
  const emojiIt = "Emoji";
  const storyIt = "Racconto";
  const storyPh = "Scrivi qui...";
  return `<div class="list-item-card pet-animal-card" data-pet-id="${esc(pet.id)}" data-pet-index="${index}">
    <div class="journey-step-top">
      <span class="journey-step-badge">${index + 1}</span>
      <button type="button" class="ghost journey-remove" data-pet-remove="${esc(pet.id)}" aria-label="${esc(lf("Rimuovi animale"))}" data-lf="Rimuovi">${esc(lf(removeIt))}</button>
    </div>
    <label><span data-lf="${esc(nameIt)}">${esc(lf(nameIt))}</span><input class="pet-animal-field" data-pet-field="name" value="${esc(pet.name || "")}" placeholder="${esc(lf(namePh))}" data-lf-placeholder="${esc(namePh)}" maxlength="64" autocomplete="off"></label>
    <label><span data-lf="${esc(emojiIt)}">${esc(lf(emojiIt))}</span><input class="pet-animal-field" data-pet-field="emoji" value="${esc(pet.emoji || "🐾")}" maxlength="8" placeholder="🐾"></label>
    <div class="section-photo-panel pet-photo-panel">
      <div class="section-photo-preview" data-pet-photo-preview="${esc(pet.id)}">${petPhotoPreviewHtml(pet)}</div>
    </div>
    <label><span data-lf="${esc(storyIt)}">${esc(lf(storyIt))}</span><textarea class="pet-animal-field" data-pet-field="body" rows="3" placeholder="${esc(lf(storyPh))}" data-lf-placeholder="${esc(storyPh)}">${esc(pet.body || "")}</textarea></label>
  </div>`;
}

export function renderPetsPanel(section = {}){
  const pets = petsForEditor(section);
  const hintIt = "Fino a 6 animali. Nome, emoji, foto e racconto per ciascuno.";
  const animalsWord = "animali";
  const addIt = "+ Aggiungi animale";
  return `<div class="list-items-panel pets-panel" data-pets-panel>
    <p class="field-hint" data-lf="${esc(hintIt)}">${esc(lf(hintIt))}</p>
    <div class="journey-steps-head">
      <span class="journey-steps-count"><strong id="petsCount">${pets.length}</strong> / ${MAX_PETS} <span data-lf="${esc(animalsWord)}">${esc(lf(animalsWord))}</span></span>
      <button type="button" class="primary journey-add-btn" data-pet-add data-lf="${esc(addIt)}">${esc(lf(addIt))}</button>
    </div>
    <div class="list-items-list journey-steps-list" id="petsList">${pets.map(petRowHtml).join("")}</div>
    <input type="hidden" name="section_pet_pets" value="${esc(serializePets(pets))}">
    <input type="file" id="petPhotoFile" accept="image/*,.heic,.heif" hidden>
  </div>`;
}

function readPetsHidden(formNode){
  const input = formNode?.querySelector?.('[name="section_pet_pets"]');
  return parsePetSlots(input?.value || "[]");
}

function writePetsHidden(formNode, pets){
  const input = formNode?.querySelector?.('[name="section_pet_pets"]');
  if(input) input.value = serializePets(pets);
  const count = document.getElementById("petsCount");
  if(count) count.textContent = String(pets.length);
}

function renderPetsList(formNode){
  const list = document.getElementById("petsList");
  if(!list || !formNode) return;
  const pets = readPetsHidden(formNode);
  const emptyTitle = "Nessun animale";
  const emptyBody = "Aggiungi almeno un animale con nome, foto o racconto.";
  list.innerHTML = pets.length
    ? pets.map(petRowHtml).join("")
    : `<div class="journey-empty"><p><strong data-lf="${esc(emptyTitle)}">${esc(lf(emptyTitle))}</strong></p><p data-lf="${esc(emptyBody)}">${esc(lf(emptyBody))}</p></div>`;
  writePetsHidden(formNode, pets);
}

export function setPetPhoto(formNode, id, url){
  if(!formNode || !id) return "";
  const pets = readPetsHidden(formNode);
  const index = pets.findIndex(pet => pet.id === id);
  if(index < 0) return "";
  const oldUrl = pets[index].photo || "";
  pets[index].photo = String(url || "").trim();
  writePetsHidden(formNode, pets);
  const preview = formNode.querySelector(`[data-pet-photo-preview="${CSS.escape(id)}"]`);
  if(preview) preview.innerHTML = petPhotoPreviewHtml(pets[index]);
  return oldUrl;
}

export function getPetPhoto(formNode, id){
  if(!formNode || !id) return "";
  const pets = readPetsHidden(formNode);
  return pets.find(pet => pet.id === id)?.photo || "";
}

export function bindPetsEditor(formNode){
  if(!formNode || formNode.dataset.petsBound === "1") return;
  formNode.dataset.petsBound = "1";
  let previewTimer = null;
  formNode.addEventListener("click", event => {
    const addBtn = event.target.closest("[data-pet-add]");
    if(addBtn && formNode.contains(addBtn)){
      event.preventDefault();
      event.stopPropagation();
      const pets = readPetsHidden(formNode);
      if(pets.length >= MAX_PETS){
        alert(lfFill("Massimo {n} animali.", { n: MAX_PETS }));
        return;
      }
      const next = [...pets, normalizePet()];
      writePetsHidden(formNode, next);
      renderPetsList(formNode);
      formNode.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    const removeBtn = event.target.closest("[data-pet-remove]");
    if(removeBtn && formNode.contains(removeBtn)){
      event.preventDefault();
      event.stopPropagation();
      const id = removeBtn.dataset.petRemove;
      let pets = readPetsHidden(formNode).filter(pet => pet.id !== id);
      if(!pets.length) pets = [normalizePet()];
      writePetsHidden(formNode, pets);
      renderPetsList(formNode);
      formNode.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  formNode.addEventListener("input", event => {
    const card = event.target.closest(".pet-animal-card");
    if(!card || !formNode.contains(card) || !event.target.classList.contains("pet-animal-field")) return;
    const pets = readPetsHidden(formNode);
    const index = pets.findIndex(pet => pet.id === card.dataset.petId);
    if(index < 0) return;
    const field = event.target.dataset.petField;
    if(field === "name"){
      pets[index].name = String(event.target.value || "").trim().slice(0, 64);
    }else if(field === "emoji"){
      pets[index].emoji = String(event.target.value || "").trim().slice(0, 8) || "🐾";
    }else if(field === "body"){
      pets[index].body = String(event.target.value || "").trim().slice(0, 2000);
    }
    writePetsHidden(formNode, pets);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => formNode.dispatchEvent(new Event("input", { bubbles: true })), 400);
  });
}

export function refreshPetsEditor(formNode){
  if(!formNode?.querySelector?.("[data-pets-panel]")) return;
  renderPetsList(formNode);
  const panel = formNode.querySelector("[data-pets-panel]");
  if(!panel) return;
  panel.querySelectorAll("[data-lf]").forEach(el=>{
    const src = el.getAttribute("data-lf");
    if(src == null) return;
    el.textContent = lf(src);
  });
  panel.querySelectorAll("[data-lf-placeholder]").forEach(el=>{
    const src = el.getAttribute("data-lf-placeholder");
    if(src == null) return;
    el.setAttribute("placeholder", lf(src));
  });
}
