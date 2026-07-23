import {
  LIST_SECTION_MODES,
  MAX_LIST_ITEMS,
  listItemId,
  normalizeListItem,
  normalizeListItems,
  itemsFromSection,
  parseListItems,
  serializeListItems
} from "./moment-list-items.js";
import { getUiLocale } from "./moments-i18n.js?v=215";
import { FIELD_PHRASE_EN } from "./moments-i18n-fields.js?v=215";

const LIST_LABELS = {
  promises:{
    singular:"Promessa",
    plural:"promesse",
    add:"+ Aggiungi promessa",
    empty:"Aggiungi le vostre promesse — emoji e testo, una card ciascuna.",
    hint:"Tocca «Aggiungi promessa» per ogni voce — niente più «una riga per elemento»."
  },
  dreams:{
    singular:"Sogno",
    plural:"sogni",
    add:"+ Aggiungi sogno",
    empty:"Scrivi i sogni da realizzare insieme. Spunta «Realizzato» se già avete fatto il passo.",
    hint:"Tocca «Aggiungi sogno» per ogni voce — niente più «una riga per elemento»."
  },
  rituals:{
    singular:"Rituale",
    plural:"rituali",
    add:"+ Aggiungi rituale",
    empty:"Le piccole abitudini quotidiane — una card per ogni rituale.",
    hint:"Tocca «Aggiungi rituale» per ogni voce — niente più «una riga per elemento»."
  },
  numbers:{
    singular:"Numero",
    plural:"numeri",
    add:"+ Aggiungi numero",
    empty:"Statistiche simboliche — es. «365» e «giorni insieme».",
    hint:"Tocca «Aggiungi numero» per ogni voce — niente più «una riga per elemento»."
  }
};

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function lf(text){
  const raw = String(text || "");
  if(!raw || getUiLocale() === "it") return raw;
  return FIELD_PHRASE_EN[raw] || raw;
}

function lfSpan(itText){
  const it = String(itText || "");
  return `<span data-lf="${esc(it)}">${esc(lf(it))}</span>`;
}

function modeForKey(key){
  return LIST_SECTION_MODES[key] || "promise";
}

export function readListItems(formNode,key){
  const field = formNode.querySelector(`input[name="section_${key}_items"]`);
  const mode = modeForKey(key);
  return normalizeListItems(parseListItems(field?.value || ""), mode, { keepEmpty:true });
}

export function writeListItems(formNode,key,items){
  const mode = modeForKey(key);
  const list = normalizeListItems(items, mode, { keepEmpty:true });
  const field = formNode.querySelector(`input[name="section_${key}_items"]`);
  if(field) field.value = serializeListItems(list);
}

function rowHtml(key,item,index){
  const labels = LIST_LABELS[key] || LIST_LABELS.promises;
  const num = index + 1;
  const singular = lf(labels.singular);
  const badge = `${singular} ${num}`;
  const removeAria = `${lf("Elimina")} ${singular} ${num}`;
  if(key === "promises"){
    const safe = normalizeListItem(item, "promise");
    return `<article class="list-item-card journey-step-card" data-list-key="${esc(key)}" data-list-id="${esc(safe.id)}" data-list-index="${index}">
      <header class="journey-step-head">
        <span class="journey-step-badge" data-lf-list-badge="${esc(labels.singular)}" data-lf-list-num="${num}">${esc(badge)}</span>
        <button type="button" class="journey-step-remove" data-list-remove="${esc(safe.id)}" aria-label="${esc(removeAria)}">${lfSpan("Elimina")}</button>
      </header>
      <div class="list-item-fields journey-step-fields">
        <label>${lfSpan("Emoji")}<input class="list-item-field" data-list-field="emoji" type="text" value="${esc(safe.emoji)}" maxlength="4" placeholder="💍"></label>
        <label>${lfSpan("Testo")}<textarea class="list-item-field" data-list-field="text" rows="2" placeholder="${esc(lf("Es. Esserci sempre"))}" data-lf-placeholder="Es. Esserci sempre">${esc(safe.text)}</textarea></label>
      </div>
    </article>`;
  }
  if(key === "dreams"){
    const safe = normalizeListItem(item, "dream");
    return `<article class="list-item-card journey-step-card" data-list-key="${esc(key)}" data-list-id="${esc(safe.id)}" data-list-index="${index}">
      <header class="journey-step-head">
        <span class="journey-step-badge" data-lf-list-badge="${esc(labels.singular)}" data-lf-list-num="${num}">${esc(badge)}</span>
        <button type="button" class="journey-step-remove" data-list-remove="${esc(safe.id)}" aria-label="${esc(removeAria)}">${lfSpan("Elimina")}</button>
      </header>
      <div class="list-item-fields journey-step-fields">
        <label class="list-item-check"><input class="list-item-field" data-list-field="done" type="checkbox" ${safe.done ? "checked" : ""}> ${lfSpan("Realizzato")}</label>
        <label>${lfSpan("Testo")}<textarea class="list-item-field" data-list-field="text" rows="2" placeholder="${esc(lf("Es. Viaggiare in Giappone"))}" data-lf-placeholder="Es. Viaggiare in Giappone">${esc(safe.text)}</textarea></label>
      </div>
    </article>`;
  }
  if(key === "rituals"){
    const safe = normalizeListItem(item, "ritual");
    return `<article class="list-item-card journey-step-card" data-list-key="${esc(key)}" data-list-id="${esc(safe.id)}" data-list-index="${index}">
      <header class="journey-step-head">
        <span class="journey-step-badge" data-lf-list-badge="${esc(labels.singular)}" data-lf-list-num="${num}">${esc(badge)}</span>
        <button type="button" class="journey-step-remove" data-list-remove="${esc(safe.id)}" aria-label="${esc(removeAria)}">${lfSpan("Elimina")}</button>
      </header>
      <div class="list-item-fields journey-step-fields">
        <label>${lfSpan("Emoji")}<input class="list-item-field" data-list-field="emoji" type="text" value="${esc(safe.emoji)}" maxlength="4" placeholder="☕"></label>
        <label>${lfSpan("Testo")}<textarea class="list-item-field" data-list-field="text" rows="2" placeholder="${esc(lf("Es. Caffè insieme ogni mattina"))}" data-lf-placeholder="Es. Caffè insieme ogni mattina">${esc(safe.text)}</textarea></label>
      </div>
    </article>`;
  }
  if(key === "numbers"){
    const safe = normalizeListItem(item, "number");
    return `<article class="list-item-card journey-step-card" data-list-key="${esc(key)}" data-list-id="${esc(safe.id)}" data-list-index="${index}">
      <header class="journey-step-head">
        <span class="journey-step-badge" data-lf-list-badge="${esc(labels.singular)}" data-lf-list-num="${num}">${esc(badge)}</span>
        <button type="button" class="journey-step-remove" data-list-remove="${esc(safe.id)}" aria-label="${esc(removeAria)}">${lfSpan("Elimina")}</button>
      </header>
      <div class="list-item-fields journey-step-fields">
        <label>${lfSpan("Numero")}<input class="list-item-field" data-list-field="value" type="text" value="${esc(safe.value)}" placeholder="${esc(lf("Es. 365"))}" data-lf-placeholder="Es. 365"></label>
        <label>${lfSpan("Etichetta")}<input class="list-item-field" data-list-field="label" type="text" value="${esc(safe.label)}" placeholder="${esc(lf("Es. giorni insieme"))}" data-lf-placeholder="Es. giorni insieme"></label>
      </div>
    </article>`;
  }
  return "";
}

export function renderListItems(formNode,key){
  const list = document.getElementById(`listItems_${key}`);
  if(!list) return;
  const items = readListItems(formNode,key);
  const labels = LIST_LABELS[key] || LIST_LABELS.promises;
  list.innerHTML = items.length
    ? items.map((item,idx)=>rowHtml(key,item,idx)).join("")
    : `<div class="journey-empty"><p><strong data-lf="Nessuna voce ancora">${esc(lf("Nessuna voce ancora"))}</strong></p><p data-lf="${esc(labels.empty)}">${esc(lf(labels.empty))}</p></div>`;
  const count = document.getElementById(`listItemCount_${key}`);
  if(count) count.textContent = String(items.length);
  const plural = document.getElementById(`listItemPlural_${key}`);
  if(plural){
    plural.setAttribute("data-lf", labels.plural);
    plural.textContent = lf(labels.plural);
  }
  const addBtn = formNode?.querySelector(`[data-list-add="${key}"]`);
  if(addBtn){
    addBtn.setAttribute("data-lf", labels.add);
    addBtn.textContent = lf(labels.add);
  }
  const hint = formNode?.querySelector(`[data-list-hint="${key}"]`);
  if(hint){
    hint.setAttribute("data-lf", labels.hint);
    hint.textContent = lf(labels.hint);
  }
}

export function renderListItemsPanel(key,section){
  const labels = LIST_LABELS[key] || LIST_LABELS.promises;
  const items = itemsFromSection(section, modeForKey(key));
  return `<div class="list-items-panel" data-list-section="${esc(key)}">
    <p class="field-hint" data-list-hint="${esc(key)}" data-lf="${esc(labels.hint)}">${esc(lf(labels.hint))}</p>
    <div class="journey-steps-head">
      <span class="journey-steps-count"><strong id="listItemCount_${esc(key)}">${items.length}</strong> / ${MAX_LIST_ITEMS} <span id="listItemPlural_${esc(key)}" data-lf="${esc(labels.plural)}">${esc(lf(labels.plural))}</span></span>
      <button type="button" class="primary journey-add-btn" data-list-add="${esc(key)}" data-lf="${esc(labels.add)}">${esc(lf(labels.add))}</button>
    </div>
    <div class="list-items-list journey-steps-list" id="listItems_${esc(key)}"></div>
    <input type="hidden" name="section_${esc(key)}_items" value="${esc(serializeListItems(items))}">
    <label class="list-intro-label">${lfSpan("Testo introduttivo (facoltativo)")}<textarea name="section_${esc(key)}_body" rows="2" placeholder="${esc(lf("Una frase sopra l'elenco…"))}" data-lf-placeholder="Una frase sopra l'elenco…">${esc(section.body || "")}</textarea></label>
  </div>`;
}

export function bindListItemsEditor(formNode){
  if(formNode.dataset.listItemsBound === "1") return;
  formNode.dataset.listItemsBound = "1";
  let previewTimer = null;
  formNode.addEventListener("click",event=>{
    const addBtn = event.target.closest("[data-list-add]");
    if(addBtn && formNode.contains(addBtn)){
      event.preventDefault();
      const key = addBtn.dataset.listAdd;
      const items = readListItems(formNode,key);
      if(items.length >= MAX_LIST_ITEMS) return alert(lf("Massimo 24 voci."));
      const mode = modeForKey(key);
      const blank = mode === "number"
        ? { id:listItemId(), value:"", label:"" }
        : mode === "dream"
          ? { id:listItemId(), done:false, text:"" }
          : { id:listItemId(), emoji:mode === "ritual" ? "🕯" : "✦", text:"" };
      writeListItems(formNode,key,[...items, blank]);
      renderListItems(formNode,key);
      formNode.dispatchEvent(new Event("input",{bubbles:true}));
      return;
    }
    const removeBtn = event.target.closest("[data-list-remove]");
    if(removeBtn && formNode.contains(removeBtn)){
      event.preventDefault();
      const row = removeBtn.closest(".list-item-card");
      const key = row?.dataset.listKey;
      if(!key) return;
      writeListItems(formNode,key,readListItems(formNode,key).filter(item=>item.id !== removeBtn.dataset.listRemove));
      renderListItems(formNode,key);
      formNode.dispatchEvent(new Event("input",{bubbles:true}));
    }
  });
  formNode.addEventListener("input",event=>{
    const row = event.target.closest(".list-item-card");
    if(!row || !event.target.classList.contains("list-item-field")) return;
    const key = row.dataset.listKey;
    const items = readListItems(formNode,key);
    const index = items.findIndex(item=>item.id === row.dataset.listId);
    if(index < 0) return;
    const field = event.target.dataset.listField;
    if(field === "done"){
      items[index].done = event.target.checked;
    }else{
      items[index][field] = event.target.value.trim();
    }
    writeListItems(formNode,key,items);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(()=>formNode.dispatchEvent(new Event("input",{bubbles:true})),400);
  });
  formNode.addEventListener("change",event=>{
    if(!event.target.classList.contains("list-item-field") || event.target.type !== "checkbox") return;
    event.target.dispatchEvent(new Event("input",{bubbles:true}));
  });
}
