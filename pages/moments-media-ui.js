import { uploadMediaBatch, inferMediaKind, IMAGE_ACCEPT } from "./media-upload.js?v=173";
import {
  normalizeMediaItem,
  normalizeMediaList,
  parseMediaList,
  serializeMediaList,
  countMediaByType,
  mediaThumbHtml,
  mediaEditorRowHtml,
  galleryEditorGroups,
  coverFocusStyle,
  mediaId,
  mediaLimitsForKey,
  migrateVideoSectionMedia,
  migrateMusicSectionMedia,
  migrateLetterMediaSection
} from "./moment-media.js?v=212";
import { getUiLocale } from "./moments-i18n.js?v=212";
import { FIELD_PHRASE_EN } from "./moments-i18n-fields.js?v=212";

let mediaEditContext = null;

function lf(text){
  const raw = String(text || "");
  if(!raw || getUiLocale() === "it") return raw;
  return FIELD_PHRASE_EN[raw] || raw;
}

export function readGalleryMedia(formNode,key){
  const field = formNode.querySelector(`textarea[name="section_${key}_media"], input[name="section_${key}_media"]`);
  return parseMediaList(field?.value || "");
}

export function writeGalleryMedia(formNode,key,media){
  const list = normalizeMediaList({media});
  const serialized = serializeMediaList(list);
  const field = formNode.querySelector(`textarea[name="section_${key}_media"], input[name="section_${key}_media"]`);
  if(field) field.value = serialized;
}

export function renderGalleryGrid(formNode,key){
  const root = document.getElementById(`galleryOrganized_${key}`);
  if(!root) return;
  const limits = mediaLimitsForKey(key);
  const media = readGalleryMedia(formNode,key);
  const groups = galleryEditorGroups(key);
  const galleryHintIt = "In pagina: foto grandi, titolo e descrizione sotto ciascuna; tap per ingrandire.";
  root.innerHTML = groups.map(group=>{
    const items = media.map((item,idx)=>({item,idx})).filter(({item})=>item.type === group.type);
    const canAdd = media.length < limits.maxItems
      && (group.type !== "image" || countMediaByType(media,"image") < limits.maxImages)
      && (group.type !== "video" || countMediaByType(media,"video") < limits.maxVideos)
      && (group.type !== "audio" || countMediaByType(media,"audio") < limits.maxAudio)
      && (group.type !== "pdf" || countMediaByType(media,"pdf") < (limits.maxPdfs || 0));
    const emptyIt = `Nessuna ${String(group.label || "").toLowerCase()} ancora.`;
    const rows = items.length
      ? items.map(({item,idx})=>mediaEditorRowHtml(item,{index:idx,sectionKey:key})).join("")
      : `<p class="gallery-type-empty" data-lf="${esc(emptyIt)}">${esc(lf(emptyIt))}</p>`;
    const addBtn = canAdd
      ? `<button type="button" class="ghost gallery-type-add" data-gallery-add="${key}" data-gallery-type="${group.type}"><span>${group.icon}</span><span data-lf="${esc(group.addLabel)}">${esc(lf(group.addLabel))}</span></button>`
      : "";
    const hint = group.addHint
      ? `<p class="field-hint gallery-type-hint" data-lf="${esc(group.addHint)}">${esc(lf(group.addHint))}</p>`
      : key === "gallery" && group.type === "image"
        ? `<p class="field-hint gallery-type-hint" data-lf="${esc(galleryHintIt)}">${esc(lf(galleryHintIt))}</p>`
        : "";
    return `<section class="gallery-type-block" data-gallery-type="${group.type}">
      <div class="gallery-type-head">
        <h4 class="gallery-type-title"><span data-lf="${esc(group.label)}">${esc(lf(group.label))}</span> <span class="gallery-type-count">${items.length}</span></h4>
        ${addBtn}
      </div>
      ${hint}
      <div class="gallery-type-list">${rows}</div>
    </section>`;
  }).join("");
}

function focusMediaRowTitle(formNode,key,mediaId){
  requestAnimationFrame(()=>{
    const row = formNode.querySelector(`.media-edit-row[data-media-id="${mediaId}"] .media-row-title`);
    row?.focus();
    row?.select();
  });
}

function sectionMediaLabel(key){
  if(key === "letter_future") return "lettera al futuro";
  if(key === "video") return "sezione video";
  if(key === "music") return "sezione musica";
  return "galleria";
}

function canAddFiles(current,batch,key = "gallery"){
  const limits = mediaLimitsForKey(key);
  const label = sectionMediaLabel(key);
  const next = [...current];
  let filtered = batch;
  if(key === "gallery"){
    filtered = batch.filter(file=>(inferMediaKind(file) || "image") === "image");
  }else if(key === "video"){
    filtered = batch.filter(file=>inferMediaKind(file) === "video");
  }else if(key === "music"){
    filtered = batch.filter(file=>inferMediaKind(file) === "audio");
  }
  for(const file of filtered){
    const type = inferMediaKind(file) || "image";
    if(key === "gallery" && type !== "image"){
      throw new Error("La galleria accetta solo foto. Usa la sezione Video o Musica.");
    }
    if(key === "video" && type !== "video"){
      throw new Error("Questa sezione accetta solo video.");
    }
    if(key === "music" && type !== "audio"){
      throw new Error("Questa sezione accetta solo audio.");
    }
    if(key === "letter_future" && !["image","video","audio","pdf"].includes(type)){
      throw new Error("Formato non supportato nella lettera al futuro.");
    }
    if(next.length >= limits.maxItems){
      throw new Error(`Limite raggiunto: massimo ${limits.maxItems} allegati nella ${label}. Passa a Plus o Pro per sbloccare di più.`);
    }
    if(type === "image" && countMediaByType(next,"image") >= limits.maxImages){
      throw new Error(`Massimo ${limits.maxImages} foto nella ${label}.`);
    }
    if(type === "video" && countMediaByType(next,"video") >= limits.maxVideos){
      throw new Error(`Massimo ${limits.maxVideos} video nella ${label}.`);
    }
    if(type === "audio" && countMediaByType(next,"audio") >= limits.maxAudio){
      throw new Error(`Massimo ${limits.maxAudio} audio nella ${label}.`);
    }
    if(type === "pdf" && countMediaByType(next,"pdf") >= (limits.maxPdfs || 0)){
      throw new Error(`Massimo ${limits.maxPdfs || 0} PDF nella ${label}.`);
    }
    next.push({type});
  }
  return filtered;
}

export async function uploadGalleryMedia({supabase,row,formNode,key,files,onStatus,onBusy}){
  if(!row?.id) throw new Error("Pagina non selezionata. Ricarica l'editor e riprova.");
  const limits = mediaLimitsForKey(key);
  const current = readGalleryMedia(formNode,key);
  const batch = canAddFiles(current,[...files].slice(0,limits.maxItems - current.length),key);
  if(!batch.length) throw new Error("Nessun file selezionato.");
  onStatus?.(`Preparazione ${batch.length} file...`);
  onBusy?.(true);
  const uploadedItems = [];
  const errors = [];
  try{
    const results = await uploadMediaBatch(supabase,{scope:"moments",scopeId:row.id},batch,{
      onProgress:({phase,done,total,success,file,error})=>{
        if(phase === "prepare"){
          onStatus?.(`Ottimizzazione ${total} file...`);
          return;
        }
        if(!success){
          errors.push(`${file?.name || "file"}: ${error?.message || "errore"}`);
        }
        onStatus?.(`Caricati ${done}/${total}...`);
      }
    });
    for(const result of results){
      if(!result.ok) continue;
      uploadedItems.push(normalizeMediaItem({
        id:mediaId(),
        type:result.type || inferMediaKind(result.file) || "image",
        url:result.url,
        title:"",
        description:""
      }));
    }
    if(!uploadedItems.length){
      throw new Error(errors[0] || "Upload non riuscito.");
    }
    writeGalleryMedia(formNode,key,[...current,...uploadedItems]);
    renderGalleryGrid(formNode,key);
    const okMsg = errors.length
      ? `${uploadedItems.length} file caricati, ${errors.length} errori — aggiungi titolo e descrizione, poi Salva.`
      : `${uploadedItems.length} file caricati — aggiungi titolo e descrizione, poi clicca Salva.`;
    onStatus?.(okMsg, errors.length ? "error" : "ok");
    formNode.dispatchEvent(new Event("input",{bubbles:true}));
    if(uploadedItems[0]?.id) focusMediaRowTitle(formNode,key,uploadedItems[0].id);
    return uploadedItems;
  }finally{
    onBusy?.(false);
  }
}

/** Sostituisce il file di una riga galleria mantenendo titolo e descrizione. */
export async function replaceGalleryMediaItem({supabase,row,formNode,key,mediaId,file,onStatus,onBusy}){
  if(!row?.id) throw new Error("Pagina non selezionata. Ricarica l'editor e riprova.");
  if(!file) throw new Error("Nessun file selezionato.");
  const current = readGalleryMedia(formNode,key);
  const index = current.findIndex(item=>item.id === mediaId);
  if(index < 0) throw new Error("Elemento non trovato nella galleria.");
  const existing = current[index];
  const nextType = inferMediaKind(file) || "image";
  if(key === "gallery" && nextType !== "image"){
    throw new Error("La galleria accetta solo foto. Usa la sezione Video o Musica.");
  }
  if(existing.type && nextType !== existing.type){
    const want = existing.type === "video" ? "video"
      : existing.type === "audio" ? "audio"
        : existing.type === "pdf" ? "PDF"
          : "foto";
    throw new Error(`Seleziona un file dello stesso tipo (${want}) oppure rimuovi l'elemento e aggiungine uno nuovo.`);
  }
  onStatus?.("Sostituzione in corso...");
  onBusy?.(true);
  try{
    let uploadError = null;
    const results = await uploadMediaBatch(supabase,{scope:"moments",scopeId:row.id},[file],{
      onProgress:({phase,done,total,success,file:progressFile,error})=>{
        if(phase === "prepare"){
          onStatus?.("Ottimizzazione file...");
          return;
        }
        if(!success){
          uploadError = error || new Error(`${progressFile?.name || "file"}: upload non riuscito`);
          return;
        }
        onStatus?.(`Caricato ${done}/${total}...`);
      }
    });
    const result = results.find(item=>item.ok);
    if(!result?.url) throw uploadError || new Error("Upload non riuscito.");
    const oldUrl = existing.url;
    current[index] = normalizeMediaItem({
      ...existing,
      type:result.type || nextType,
      url:result.url
    });
    writeGalleryMedia(formNode,key,current);
    renderGalleryGrid(formNode,key);
    onStatus?.("File sostituito — clicca Salva per aggiornare la pagina.","ok");
    formNode.dispatchEvent(new Event("input",{bubbles:true}));
    return { item:current[index], oldUrl };
  }finally{
    onBusy?.(false);
  }
}

export function ensureMediaModals(root=document.body){
  if(document.getElementById("momentMediaModal")) return;
  const modal = document.createElement("div");
  modal.id = "momentMediaModal";
  modal.className = "media-modal";
  modal.hidden = true;
  const titlePh = "Es. Il nostro primo giorno";
  const descPh = "Racconta questo ricordo...";
  modal.innerHTML = `<div class="media-modal-backdrop" data-close-media-modal></div>
    <div class="media-modal-card" role="dialog" aria-modal="true" aria-labelledby="mediaModalTitle">
      <button type="button" class="media-modal-close" data-close-media-modal aria-label="${esc(lf("Chiudi"))}" data-lf-aria="Chiudi">×</button>
      <div class="media-modal-preview" id="mediaModalPreview"></div>
      <label><span data-lf="Titolo">${esc(lf("Titolo"))}</span><input id="mediaModalTitleInput" placeholder="${esc(lf(titlePh))}" data-lf-placeholder="${esc(titlePh)}"></label>
      <label><span data-lf="Descrizione">${esc(lf("Descrizione"))}</span><textarea id="mediaModalDescInput" placeholder="${esc(lf(descPh))}" data-lf-placeholder="${esc(descPh)}"></textarea></label>
      <button type="button" class="primary" id="mediaModalSaveBtn" data-lf="Salva dettagli">${esc(lf("Salva dettagli"))}</button>
    </div>`;
  root.appendChild(modal);
  modal.querySelectorAll("[data-close-media-modal]").forEach(node=>{
    node.addEventListener("click",closeMediaModal);
  });
  document.getElementById("mediaModalSaveBtn")?.addEventListener("click",saveMediaModal);
}

/** Refresh modal chrome after locale toggle (IDs/handlers unchanged). */
export function syncMediaModalChrome(){
  const modal = document.getElementById("momentMediaModal");
  if(!modal) return;
  modal.querySelectorAll("[data-lf]").forEach(el=>{
    const src = el.getAttribute("data-lf");
    if(src != null) el.textContent = lf(src);
  });
  modal.querySelectorAll("[data-lf-placeholder]").forEach(el=>{
    const src = el.getAttribute("data-lf-placeholder");
    if(src != null) el.setAttribute("placeholder", lf(src));
  });
  modal.querySelectorAll("[data-lf-aria]").forEach(el=>{
    const src = el.getAttribute("data-lf-aria");
    if(src != null) el.setAttribute("aria-label", lf(src));
  });
}

export function openMediaModal(formNode,key,index){
  ensureMediaModals();
  const media = readGalleryMedia(formNode,key);
  const item = media[index];
  if(!item) return;
  mediaEditContext = {formNode,key,index};
  const modal = document.getElementById("momentMediaModal");
  const preview = document.getElementById("mediaModalPreview");
  document.getElementById("mediaModalTitleInput").value = item.title || "";
  document.getElementById("mediaModalDescInput").value = item.description || "";
  if(item.type === "image"){
    preview.innerHTML = `<img src="${esc(item.url)}" alt="">`;
  }else if(item.type === "video"){
    preview.innerHTML = `<video src="${esc(item.url)}" controls playsinline></video>`;
  }else{
    preview.innerHTML = `<audio src="${esc(item.url)}" controls></audio>`;
  }
  modal.hidden = false;
  document.body.classList.add("media-modal-open");
}

function closeMediaModal(){
  mediaEditContext = null;
  const modal = document.getElementById("momentMediaModal");
  if(modal) modal.hidden = true;
  document.body.classList.remove("media-modal-open");
}

function saveMediaModal(){
  if(!mediaEditContext) return;
  const {formNode,key,index} = mediaEditContext;
  const media = readGalleryMedia(formNode,key);
  const item = media[index];
  if(!item) return closeMediaModal();
  item.title = document.getElementById("mediaModalTitleInput").value.trim();
  item.description = document.getElementById("mediaModalDescInput").value.trim();
  media[index] = item;
  writeGalleryMedia(formNode,key,media);
  renderGalleryGrid(formNode,key);
  closeMediaModal();
  formNode.dispatchEvent(new Event("input",{bubbles:true}));
}

export function bindGalleryInlineEdit(formNode){
  if(formNode.dataset.galleryInlineBound === "1") return;
  formNode.dataset.galleryInlineBound = "1";
  let previewTimer = null;
  formNode.addEventListener("input",event=>{
    const row = event.target.closest(".media-edit-row");
    if(!row || !formNode.contains(row)) return;
    if(!event.target.matches(".media-row-title,.media-row-desc")) return;
    const key = row.dataset.mediaSection || "gallery";
    const mediaId = row.dataset.mediaId;
    const media = readGalleryMedia(formNode,key);
    const index = media.findIndex(item=>item.id === mediaId);
    if(index < 0) return;
    if(event.target.matches(".media-row-title")) media[index].title = event.target.value.trim();
    if(event.target.matches(".media-row-desc")) media[index].description = event.target.value.trim();
    writeGalleryMedia(formNode,key,media);
    markEditorDirtyFromGallery(formNode);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(()=>{
      formNode.dispatchEvent(new Event("input",{bubbles:true}));
    },400);
  });
}

function markEditorDirtyFromGallery(formNode){
  formNode.dispatchEvent(new Event("input",{bubbles:true}));
}

export function bindGalleryMediaInteractions(root,formNode){
  bindGalleryInlineEdit(formNode);
}

const COVER_QUICK = [
  { id:"top", x:50, y:12, label:"Alto" },
  { id:"center", x:50, y:50, label:"Centro" },
  { id:"bottom", x:50, y:88, label:"Basso" }
];

const COVER_ZOOM_MIN = 100;
const COVER_ZOOM_MAX = 200;
const COVER_ZOOM_STEP = 5;

function nearestZoomStep(zoom){
  const value = Number(zoom);
  const raw = Number.isFinite(value) ? value : COVER_ZOOM_MIN;
  const clamped = Math.min(COVER_ZOOM_MAX, Math.max(COVER_ZOOM_MIN, raw));
  return Math.round(clamped / COVER_ZOOM_STEP) * COVER_ZOOM_STEP;
}

function activeQuickPositionId(x,y){
  let best = COVER_QUICK[1];
  let bestDist = Infinity;
  for(const pos of COVER_QUICK){
    const dist = (pos.x - x) ** 2 + (pos.y - y) ** 2;
    if(dist < bestDist){
      bestDist = dist;
      best = pos;
    }
  }
  return best.id;
}

function setCoverFocus(formNode,x,y){
  if(formNode.elements.cover_focus_x) formNode.elements.cover_focus_x.value = String(x);
  if(formNode.elements.cover_focus_y) formNode.elements.cover_focus_y.value = String(y);
  syncCoverFramer(formNode);
  formNode.dispatchEvent(new Event("input",{bubbles:true}));
}

function setCoverZoom(formNode,zoom){
  const safe = nearestZoomStep(zoom);
  if(formNode.elements.cover_zoom) formNode.elements.cover_zoom.value = String(safe);
  syncCoverFramer(formNode);
  formNode.dispatchEvent(new Event("input",{bubbles:true}));
}

function stepCoverZoom(formNode,direction){
  const current = nearestZoomStep(formNode.elements.cover_zoom?.value || 100);
  setCoverZoom(formNode, current + (direction * COVER_ZOOM_STEP));
}

export function bindCoverFramer(formNode){
  const slot = formNode.querySelector("#coverFramerSlot");
  if(!slot) return;
  if(slot.dataset.bound !== "1"){
    slot.dataset.bound = "1";
    slot.addEventListener("click",event=>{
      const phone = event.target.closest("[data-cover-tap]");
      if(phone){
        const rect = phone.getBoundingClientRect();
        const x = Math.round(Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)));
        const y = Math.round(Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)));
        setCoverFocus(formNode, x, y);
        return;
      }
      const posBtn = event.target.closest("[data-cover-x]");
      if(posBtn){
        event.preventDefault();
        setCoverFocus(formNode,Number(posBtn.dataset.coverX),Number(posBtn.dataset.coverY));
        return;
      }
      const zoomStep = event.target.closest("[data-cover-zoom-step]");
      if(zoomStep){
        event.preventDefault();
        stepCoverZoom(formNode, Number(zoomStep.dataset.coverZoomStep));
      }
    });
    slot.addEventListener("input",event=>{
      if(event.target?.name !== "cover_zoom" && event.target?.id !== "coverZoomRange") return;
      setCoverZoom(formNode, event.target.value);
    });
  }
  syncCoverFramer(formNode);
}

export function syncCoverFramer(formNode){
  const img = document.getElementById("coverFramerImg");
  if(!img) return;
  const state = {
    cover_focus_x:formNode.elements.cover_focus_x?.value,
    cover_focus_y:formNode.elements.cover_focus_y?.value,
    cover_zoom:formNode.elements.cover_zoom?.value
  };
  const {x,y,zoom,css} = coverFocusStyle(state);
  img.style.cssText = css;
  const marker = document.getElementById("coverFocusMarker");
  if(marker){
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
  }
  const quickId = activeQuickPositionId(x,y);
  formNode.querySelectorAll("[data-cover-x]").forEach(btn=>{
    const active = btn.dataset.coverQuick === quickId;
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-pressed",active ? "true" : "false");
  });
  const normalizedZoom = nearestZoomStep(zoom);
  const zoomLabel = document.getElementById("coverZoomLabel");
  if(zoomLabel) zoomLabel.textContent = `${normalizedZoom}%`;
  const range = formNode.querySelector("#coverZoomRange") || formNode.elements.cover_zoom;
  if(range && range.type === "range") range.value = String(normalizedZoom);
  else if(formNode.elements.cover_zoom) formNode.elements.cover_zoom.value = String(normalizedZoom);
  const minus = formNode.querySelector("[data-cover-zoom-step='-1']");
  const plus = formNode.querySelector("[data-cover-zoom-step='1']");
  if(minus) minus.disabled = normalizedZoom <= COVER_ZOOM_MIN;
  if(plus) plus.disabled = normalizedZoom >= COVER_ZOOM_MAX;
}

export function renderCoverFramer(state){
  const url = state.cover_url || "";
  const {x,y,zoom,css} = coverFocusStyle(state);
  if(!url){
    return `<div class="cover-framer cover-framer-empty"><p class="field-hint">Carica una copertina, poi tocca l'anteprima per inquadrarla.</p></div>`;
  }
  const quickId = activeQuickPositionId(x,y);
  const normalizedZoom = nearestZoomStep(zoom);
  const quick = COVER_QUICK.map(pos=>`<button type="button" class="cover-quick-btn ${pos.id === quickId ? "active" : ""}" data-cover-quick="${pos.id}" data-cover-x="${pos.x}" data-cover-y="${pos.y}" aria-pressed="${pos.id === quickId ? "true" : "false"}">${esc(pos.label)}</button>`).join("");
  return `<div class="cover-framer" id="coverFramer" aria-label="Anteprima copertina">
    <p class="cover-picker-hint cover-framer-top-hint">Tocca la foto dove vuoi il fuoco</p>
    <div class="cover-framer-phone" data-cover-tap>
      <img id="coverFramerImg" src="${esc(url)}" alt="" style="${esc(css)}" loading="lazy" decoding="async">
      <span class="cover-focus-marker" id="coverFocusMarker" style="left:${x}%;top:${y}%"></span>
    </div>
  </div>
  <input type="hidden" name="cover_focus_x" value="${x}">
  <input type="hidden" name="cover_focus_y" value="${y}">
  <div class="cover-picker">
    <p class="cover-picker-label">Scorciatoie</p>
    <div class="cover-quick-row" role="group" aria-label="Posizione rapida">${quick}</div>
  </div>
  <div class="cover-picker cover-picker-zoom">
    <p class="cover-picker-label">Zoom <span class="cover-zoom-label" id="coverZoomLabel">${normalizedZoom}%</span></p>
    <div class="cover-zoom-stepper" role="group" aria-label="Zoom copertina">
      <button type="button" class="cover-zoom-step-btn" data-cover-zoom-step="-1" aria-label="Riduci zoom" ${normalizedZoom <= COVER_ZOOM_MIN ? "disabled" : ""}>−</button>
      <input id="coverZoomRange" class="cover-zoom-range" type="range" name="cover_zoom" min="${COVER_ZOOM_MIN}" max="${COVER_ZOOM_MAX}" step="${COVER_ZOOM_STEP}" value="${normalizedZoom}" aria-valuemin="${COVER_ZOOM_MIN}" aria-valuemax="${COVER_ZOOM_MAX}" aria-valuenow="${normalizedZoom}" aria-label="Livello zoom copertina">
      <button type="button" class="cover-zoom-step-btn" data-cover-zoom-step="1" aria-label="Aumenta zoom" ${normalizedZoom >= COVER_ZOOM_MAX ? "disabled" : ""}>+</button>
    </div>
    <p class="cover-picker-hint">Da 100% a 200%. Tocca la foto per il fuoco, poi avvicina volti o dettagli.</p>
  </div>`;
}

/** Input file fuori dai pannelli nascosti — altrimenti il dialog non si apre in Chrome/Safari. */
export function renderGalleryFileInput(key = "gallery"){
  const accept = key === "letter_future"
    ? `${IMAGE_ACCEPT},video/*,audio/*,application/pdf,.pdf`
    : key === "video"
      ? "video/*"
      : key === "music"
        ? "audio/*"
        : IMAGE_ACCEPT;
  return `<input type="file" id="galleryFile_${key}" accept="${accept}" multiple hidden tabindex="-1" aria-hidden="true">`;
}

export function renderGalleryUploadPanel(section,key){
  const seeded = key === "video"
    ? migrateVideoSectionMedia(section)
    : key === "music"
      ? migrateMusicSectionMedia(section)
      : key === "letter_future"
        ? migrateLetterMediaSection(section)
        : normalizeMediaList(section);
  const limits = mediaLimitsForKey(key);
  const isLetter = key === "letter_future";
  const isVideo = key === "video";
  const isMusic = key === "music";
  const intro = isLetter
    ? `<p><strong data-lf="Allegati sigillati">${esc(lf("Allegati sigillati"))}</strong></p><p class="field-hint" data-lf="Foto, video, audio o PDF che si sbloccano insieme alla lettera. Tocca Aggiungi, poi Salva.">${esc(lf("Foto, video, audio o PDF che si sbloccano insieme alla lettera. Tocca Aggiungi, poi Salva."))}</p>`
    : isVideo
      ? `<p><strong data-lf="Video">${esc(lf("Video"))}</strong></p><p class="field-hint" data-lf="Carica uno o più video — in pagina scorrono come la galleria. Titolo e descrizione sotto ciascuno, poi Salva.">${esc(lf("Carica uno o più video — in pagina scorrono come la galleria. Titolo e descrizione sotto ciascuno, poi Salva."))}</p>`
      : isMusic
        ? `<p><strong data-lf="Audio">${esc(lf("Audio"))}</strong></p><p class="field-hint" data-lf="Messaggi vocali o brani — complemento a Spotify/YouTube. Poi Salva.">${esc(lf("Messaggi vocali o brani — complemento a Spotify/YouTube. Poi Salva."))}</p>`
        : `<p><strong data-lf="Galleria foto">${esc(lf("Galleria foto"))}</strong></p><p class="field-hint" data-lf="Solo immagini qui. Tocca Aggiungi foto, scrivi titolo e descrizione, poi Salva.">${esc(lf("Solo immagini qui. Tocca Aggiungi foto, scrivi titolo e descrizione, poi Salva."))}</p>`;
  const footer = `${seeded.length ? `${seeded.length} file pronti. ` : ""}${limits.hint}`;
  return `<div class="gallery-upload-panel" data-gallery-key="${key}">
    <div class="gallery-steps">${intro}</div>
    <div class="gallery-organized" id="galleryOrganized_${key}"></div>
    <textarea name="section_${key}_media" class="gallery-media-json" aria-hidden="true" tabindex="-1">${esc(serializeMediaList(seeded))}</textarea>
    <p class="field-hint" id="galleryUploadStatus_${key}">${footer}</p>
  </div>`;
}

export function renderSectionPhotoPanel(key, section, fieldName, { previewId, fileId, label = "Carica foto" } = {}){
  const resolvedPreviewId = previewId || `${key}PhotoPreview`;
  const resolvedFileId = fileId || `${key}PhotoFile`;
  const url = String(section[fieldName] || "").trim();
  const labelIt = label || "Carica foto";
  const preview = url
    ? `<img src="${esc(url)}" alt=""><button type="button" class="ghost" data-section-photo-remove="${esc(key)}" data-lf="Rimuovi">${esc(lf("Rimuovi"))}</button>`
    : `<button type="button" class="primary section-photo-btn" data-section-photo-upload="${esc(key)}">📷 <span data-lf="${esc(labelIt)}">${esc(lf(labelIt))}</span></button>`;
  return `<div class="section-photo-panel" data-section-photo-key="${esc(key)}">
    <input type="hidden" name="section_${esc(key)}_${esc(fieldName)}" value="${esc(url)}">
    <div class="section-photo-preview" id="${esc(resolvedPreviewId)}">${preview}</div>
    <input type="file" id="${esc(resolvedFileId)}" accept="${IMAGE_ACCEPT}" hidden data-section-photo-input="${esc(key)}">
  </div>`;
}

export function renderVideoSectionPanel(section){
  return renderGalleryUploadPanel(section, "video");
}

export function renderMusicAudioPanel(section){
  return renderGalleryUploadPanel(section, "music");
}

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

export { coverFocusStyle, normalizeMediaList, mediaLimitsForKey };
