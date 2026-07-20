import { uploadMediaBatch, inferMediaKind, IMAGE_ACCEPT } from "./media-upload.js?v=144";
import {
  normalizeMediaItem,
  normalizeMediaList,
  parseMediaList,
  serializeMediaList,
  countMediaByType,
  mediaThumbHtml,
  mediaEditorRowHtml,
  galleryEditorGroups,
  GALLERY_TYPE_GROUPS,
  coverFocusStyle,
  mediaId,
  mediaLimitsForKey,
  VIDEO_SECTION_HINT
} from "./moment-media.js?v=144";

let mediaEditContext = null;

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
  root.innerHTML = groups.map(group=>{
    const items = media.map((item,idx)=>({item,idx})).filter(({item})=>item.type === group.type);
    const canAdd = media.length < limits.maxItems
      && (group.type !== "image" || countMediaByType(media,"image") < limits.maxImages)
      && (group.type !== "video" || countMediaByType(media,"video") < limits.maxVideos)
      && (group.type !== "audio" || countMediaByType(media,"audio") < limits.maxAudio);
    const rows = items.length
      ? items.map(({item,idx})=>mediaEditorRowHtml(item,{index:idx,sectionKey:key})).join("")
      : `<p class="gallery-type-empty">Nessuna ${group.label.toLowerCase()} ancora.</p>`;
    const addBtn = canAdd
      ? `<button type="button" class="ghost gallery-type-add" data-gallery-add="${key}" data-gallery-type="${group.type}"><span>${group.icon}</span>${group.addLabel}</button>`
      : "";
    const hint = group.addHint
      ? `<p class="field-hint gallery-type-hint">${group.addHint}</p>`
      : key === "gallery" && group.type === "image"
        ? `<p class="field-hint gallery-type-hint">In pagina le foto si aprono ingrandite con titolo e descrizione.</p>`
        : "";
    return `<section class="gallery-type-block" data-gallery-type="${group.type}">
      <div class="gallery-type-head">
        <h4 class="gallery-type-title">${group.label} <span class="gallery-type-count">${items.length}</span></h4>
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

function canAddFiles(current,batch,key = "gallery"){
  const limits = mediaLimitsForKey(key);
  const label = key === "letter_future" ? "lettera al futuro" : "galleria";
  const next = [...current];
  const filtered = key === "gallery"
    ? batch.filter(file=>(inferMediaKind(file) || "image") === "image")
    : batch;
  for(const file of filtered){
    const type = inferMediaKind(file) || "image";
    if(key === "gallery" && type !== "image"){
      throw new Error("La galleria accetta solo foto. Usa la sezione Video o Musica.");
    }
    if(next.length >= limits.maxItems){
      throw new Error(`Limite raggiunto: massimo ${limits.maxItems} allegati nella ${label}.`);
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
    const want = existing.type === "video" ? "video" : existing.type === "audio" ? "audio" : "foto";
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
  modal.innerHTML = `<div class="media-modal-backdrop" data-close-media-modal></div>
    <div class="media-modal-card" role="dialog" aria-modal="true" aria-labelledby="mediaModalTitle">
      <button type="button" class="media-modal-close" data-close-media-modal aria-label="Chiudi">×</button>
      <div class="media-modal-preview" id="mediaModalPreview"></div>
      <label>Titolo<input id="mediaModalTitleInput" placeholder="Es. Il nostro primo giorno"></label>
      <label>Descrizione<textarea id="mediaModalDescInput" placeholder="Racconta questo ricordo..."></textarea></label>
      <button type="button" class="primary" id="mediaModalSaveBtn">Salva dettagli</button>
    </div>`;
  root.appendChild(modal);
  modal.querySelectorAll("[data-close-media-modal]").forEach(node=>{
    node.addEventListener("click",closeMediaModal);
  });
  document.getElementById("mediaModalSaveBtn")?.addEventListener("click",saveMediaModal);
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

const COVER_ZOOM_STEPS = [100, 115, 130];

function nearestZoomStep(zoom){
  const value = Number(zoom) || 100;
  return COVER_ZOOM_STEPS.reduce((best,step)=>Math.abs(step - value) < Math.abs(best - value) ? step : best, COVER_ZOOM_STEPS[0]);
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
  const idx = COVER_ZOOM_STEPS.indexOf(current);
  const next = COVER_ZOOM_STEPS[Math.min(COVER_ZOOM_STEPS.length - 1, Math.max(0, idx + direction))];
  setCoverZoom(formNode, next);
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
  const zoomLabel = document.getElementById("coverZoomLabel");
  const normalizedZoom = nearestZoomStep(zoom);
  if(zoomLabel) zoomLabel.textContent = `${normalizedZoom}%`;
  const minus = formNode.querySelector("[data-cover-zoom-step='-1']");
  const plus = formNode.querySelector("[data-cover-zoom-step='1']");
  if(minus) minus.disabled = normalizedZoom <= COVER_ZOOM_STEPS[0];
  if(plus) plus.disabled = normalizedZoom >= COVER_ZOOM_STEPS[COVER_ZOOM_STEPS.length - 1];
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
  <input type="hidden" name="cover_zoom" value="${normalizedZoom}">
  <div class="cover-picker">
    <p class="cover-picker-label">Scorciatoie</p>
    <div class="cover-quick-row" role="group" aria-label="Posizione rapida">${quick}</div>
  </div>
  <div class="cover-picker cover-picker-zoom">
    <p class="cover-picker-label">Zoom</p>
    <div class="cover-zoom-stepper" role="group" aria-label="Zoom copertina">
      <button type="button" class="cover-zoom-step-btn" data-cover-zoom-step="-1" aria-label="Riduci zoom" ${normalizedZoom <= COVER_ZOOM_STEPS[0] ? "disabled" : ""}>−</button>
      <span class="cover-zoom-label" id="coverZoomLabel">${normalizedZoom}%</span>
      <button type="button" class="cover-zoom-step-btn" data-cover-zoom-step="1" aria-label="Aumenta zoom" ${normalizedZoom >= COVER_ZOOM_STEPS[COVER_ZOOM_STEPS.length - 1] ? "disabled" : ""}>+</button>
    </div>
  </div>`;
}

/** Input file fuori dai pannelli nascosti — altrimenti il dialog non si apre in Chrome/Safari. */
export function renderGalleryFileInput(key = "gallery"){
  const accept = key === "letter_future" ? `${IMAGE_ACCEPT},video/*,audio/*` : IMAGE_ACCEPT;
  return `<input type="file" id="galleryFile_${key}" accept="${accept}" multiple hidden tabindex="-1" aria-hidden="true">`;
}

export function renderGalleryUploadPanel(section,key){
  const media = normalizeMediaList(section);
  const limits = mediaLimitsForKey(key);
  const isLetter = key === "letter_future";
  const intro = isLetter
    ? `<p><strong>Allegati sigillati</strong></p><p class="field-hint">Foto, video o audio che si sbloccano <strong>insieme alla lettera</strong>. Tocca Aggiungi, poi <strong>Salva</strong>.</p>`
    : `<p><strong>Galleria foto</strong></p><p class="field-hint">Solo immagini qui. Tocca <strong>Aggiungi foto</strong>, scrivi titolo e descrizione, poi <strong>Salva</strong>.</p>`;
  const footer = isLetter
    ? `${media.length ? `${media.length} allegati pronti. ` : ""}${limits.hint}`
    : `${media.length ? `${media.length} foto pronte. ` : ""}${limits.hint} Video → sezione <strong>Video</strong> · Audio → sezione <strong>Musica</strong>.`;
  return `<div class="gallery-upload-panel" data-gallery-key="${key}">
    <div class="gallery-steps">${intro}</div>
    <div class="gallery-organized" id="galleryOrganized_${key}"></div>
    <textarea name="section_${key}_media" class="gallery-media-json" aria-hidden="true" tabindex="-1"></textarea>
    <p class="field-hint" id="galleryUploadStatus_${key}">${footer}</p>
  </div>`;
}

export function renderSectionPhotoPanel(key, section, fieldName, { previewId, fileId, label = "Carica foto" } = {}){
  const resolvedPreviewId = previewId || `${key}PhotoPreview`;
  const resolvedFileId = fileId || `${key}PhotoFile`;
  const url = String(section[fieldName] || "").trim();
  const preview = url
    ? `<img src="${esc(url)}" alt=""><button type="button" class="ghost" data-section-photo-remove="${esc(key)}">Rimuovi</button>`
    : `<button type="button" class="primary section-photo-btn" data-section-photo-upload="${esc(key)}">📷 ${esc(label)}</button>`;
  return `<div class="section-photo-panel" data-section-photo-key="${esc(key)}">
    <input type="hidden" name="section_${esc(key)}_${esc(fieldName)}" value="${esc(url)}">
    <div class="section-photo-preview" id="${esc(resolvedPreviewId)}">${preview}</div>
    <input type="file" id="${esc(resolvedFileId)}" accept="${IMAGE_ACCEPT}" hidden data-section-photo-input="${esc(key)}">
  </div>`;
}

export function renderVideoSectionPanel(section){
  const videoUrl = String(section.video_url || "").trim();
  const preview = videoUrl
    ? `<div class="video-section-preview"><video src="${esc(videoUrl)}" controls playsinline preload="metadata"></video><button type="button" class="ghost video-section-remove" data-video-section-remove aria-label="Rimuovi video">Rimuovi</button></div>`
    : `<button type="button" class="gallery-add video-section-add" data-video-section-upload><span>▶</span>Carica video MP4/MOV</button>`;
  return `<div class="video-section-panel" id="videoSectionPanel">
    <input type="hidden" name="section_video_video_url" value="${esc(videoUrl)}">
    <label>Titolo del video<input name="section_video_video_title" value="${esc(section.video_title || "")}" placeholder="Es. Il giorno più bello" maxlength="120"></label>
    <label>Descrizione<textarea name="section_video_video_description" rows="3" placeholder="Racconta questo video...">${esc(section.video_description || "")}</textarea></label>
    <p class="field-hint">${VIDEO_SECTION_HINT}</p>
    ${preview}
    <input type="file" id="sectionVideoFile" accept="video/*" hidden>
  </div>`;
}

export function renderMusicAudioPanel(section){
  const audioUrl = String(section.audio_url || "").trim();
  const preview = audioUrl
    ? `<div class="music-audio-preview"><audio src="${esc(audioUrl)}" controls></audio><button type="button" class="ghost music-audio-remove" data-music-audio-remove aria-label="Rimuovi audio">Rimuovi</button></div>`
    : `<button type="button" class="gallery-add music-audio-add" data-music-audio-add><span>+</span>Carica audio MP3/M4A</button>`;
  return `<div class="music-audio-panel" id="musicAudioPanel">
    <input type="hidden" name="section_music_audio_url" value="${esc(audioUrl)}">
    <input type="hidden" name="section_music_audio_title" value="${esc(section.audio_title || "")}">
    <input type="hidden" name="section_music_audio_description" value="${esc(section.audio_description || "")}">
    <p class="field-hint">Alternativa o complemento a Spotify/YouTube — max 12 MB.</p>
    ${preview}
    <input type="file" id="musicAudioFile" accept="audio/*" hidden>
  </div>`;
}

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

export { coverFocusStyle, normalizeMediaList, mediaLimitsForKey };
