import { uploadMediaFiles, inferMediaKind } from "./media-upload.js";
import {
  MAX_GALLERY_ITEMS,
  MAX_GALLERY_VIDEOS,
  MAX_GALLERY_AUDIO,
  MEDIA_LIMITS_HINT,
  normalizeMediaItem,
  normalizeMediaList,
  parseMediaList,
  serializeMediaList,
  countMediaByType,
  mediaThumbHtml,
  mediaEditorRowHtml,
  GALLERY_TYPE_GROUPS,
  coverFocusStyle,
  mediaId
} from "./moment-media.js";

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
  const media = readGalleryMedia(formNode,key);
  root.innerHTML = GALLERY_TYPE_GROUPS.map(group=>{
    const items = media.map((item,idx)=>({item,idx})).filter(({item})=>item.type === group.type);
    const canAdd = media.length < MAX_GALLERY_ITEMS
      && (group.type !== "video" || countMediaByType(media,"video") < MAX_GALLERY_VIDEOS)
      && (group.type !== "audio" || countMediaByType(media,"audio") < MAX_GALLERY_AUDIO);
    const rows = items.length
      ? items.map(({item,idx})=>mediaEditorRowHtml(item,{index:idx,sectionKey:key})).join("")
      : `<p class="gallery-type-empty">Nessun ${group.label.toLowerCase()} ancora.</p>`;
    const addBtn = canAdd
      ? `<button type="button" class="ghost gallery-type-add" data-gallery-add="${key}" data-gallery-type="${group.type}"><span>${group.icon}</span>${group.addLabel}</button>`
      : "";
    const hint = group.addHint ? `<p class="field-hint gallery-type-hint">${group.addHint}</p>` : "";
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

function canAddFiles(current,batch){
  const next = [...current];
  for(const file of batch){
    const type = inferMediaKind(file) || "image";
    if(next.length >= MAX_GALLERY_ITEMS) throw new Error(`Limite raggiunto: massimo ${MAX_GALLERY_ITEMS} elementi in galleria.`);
    if(type === "video" && countMediaByType(next,"video") >= MAX_GALLERY_VIDEOS){
      throw new Error(`Massimo ${MAX_GALLERY_VIDEOS} video in galleria.`);
    }
    if(type === "audio" && countMediaByType(next,"audio") >= MAX_GALLERY_AUDIO){
      throw new Error(`Massimo ${MAX_GALLERY_AUDIO} audio in galleria.`);
    }
    next.push({type});
  }
  return batch;
}

export async function uploadGalleryMedia({supabase,row,formNode,key,files,onStatus,onBusy}){
  const current = readGalleryMedia(formNode,key);
  const batch = canAddFiles(current,[...files].slice(0,MAX_GALLERY_ITEMS - current.length));
  if(!batch.length) throw new Error("Nessun file selezionato.");
  onStatus?.(`Caricamento ${batch.length} file...`);
  onBusy?.(true);
  try{
    const uploaded = await uploadMediaFiles(supabase,{scope:"moments",scopeId:row.id},batch);
    const items = uploaded.map(entry=>normalizeMediaItem({
      id:mediaId(),
      type:entry.type,
      url:entry.url,
      title:"",
      description:""
    }));
    writeGalleryMedia(formNode,key,[...current,...items]);
    renderGalleryGrid(formNode,key);
    onStatus?.(`${items.length} file caricati — aggiungi titolo e descrizione, poi clicca Salva.`,"ok");
    formNode.dispatchEvent(new Event("input",{bubbles:true}));
    if(items[0]?.id) focusMediaRowTitle(formNode,key,items[0].id);
    return items;
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

export function bindCoverFramer(formNode){
  const framer = document.getElementById("coverFramer");
  const img = document.getElementById("coverFramerImg");
  if(!framer || !img) return;
  if(framer.dataset.bound === "1"){
    syncCoverFramer(formNode);
    return;
  }
  framer.dataset.bound = "1";
  syncCoverFramer(formNode);
  ["cover_focus_x","cover_focus_y","cover_zoom"].forEach(name=>{
    formNode.elements[name]?.addEventListener("input",()=>{
      syncCoverFramer(formNode);
      formNode.dispatchEvent(new Event("input",{bubbles:true}));
    });
  });
  let dragging = false;
  const onPointer = event=>{
    if(!dragging) return;
    const rect = framer.getBoundingClientRect();
    const x = Math.round(Math.min(100,Math.max(0,((event.clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.min(100,Math.max(0,((event.clientY - rect.top) / rect.height) * 100)));
    if(formNode.elements.cover_focus_x) formNode.elements.cover_focus_x.value = String(x);
    if(formNode.elements.cover_focus_y) formNode.elements.cover_focus_y.value = String(y);
    syncCoverFramer(formNode);
  };
  framer.addEventListener("pointerdown",event=>{
    if(!formNode.elements.cover_url?.value) return;
    dragging = true;
    framer.setPointerCapture(event.pointerId);
    onPointer(event);
  });
  framer.addEventListener("pointermove",onPointer);
  framer.addEventListener("pointerup",event=>{
    dragging = false;
    framer.releasePointerCapture(event.pointerId);
    formNode.dispatchEvent(new Event("input",{bubbles:true}));
  });
  framer.addEventListener("pointercancel",()=>{ dragging = false; });
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
  const xLabel = document.getElementById("coverFocusXVal");
  const yLabel = document.getElementById("coverFocusYVal");
  const zLabel = document.getElementById("coverZoomVal");
  if(xLabel) xLabel.textContent = `${x}%`;
  if(yLabel) yLabel.textContent = `${y}%`;
  if(zLabel) zLabel.textContent = `${zoom}%`;
}

export function renderCoverFramer(state){
  const url = state.cover_url || "";
  const {x,y,zoom,css} = coverFocusStyle(state);
  if(!url) return `<div class="cover-framer cover-framer-empty"><p class="field-hint">Carica una copertina per regolare inquadratura e zoom.</p></div>`;
  return `<div class="cover-framer" id="coverFramer" aria-label="Trascina per spostare la copertina">
    <div class="cover-framer-phone"><img id="coverFramerImg" src="${esc(url)}" alt="" style="${esc(css)}" loading="lazy" decoding="async"></div>
    <p class="cover-framer-hint">Trascina con il dito per inquadrare la foto · usa Zoom se serve</p>
  </div>
  <div class="cover-focus-controls">
    <label>Sposta ↔ <strong id="coverFocusXVal">${x}%</strong><input type="range" name="cover_focus_x" min="0" max="100" step="1" value="${x}"></label>
    <label>Sposta ↕ <strong id="coverFocusYVal">${y}%</strong><input type="range" name="cover_focus_y" min="0" max="100" step="1" value="${y}"></label>
    <label>Ingrandisci <strong id="coverZoomVal">${zoom}%</strong><input type="range" name="cover_zoom" min="100" max="200" step="5" value="${zoom}"></label>
  </div>`;
}

/** Input file fuori dai pannelli nascosti — altrimenti il dialog non si apre in Chrome/Safari. */
export function renderGalleryFileInput(key = "gallery"){
  return `<input type="file" id="galleryFile_${key}" accept="image/*,video/*,audio/*" multiple hidden tabindex="-1" aria-hidden="true">`;
}

export function renderGalleryUploadPanel(section,key){
  const media = normalizeMediaList(section);
  return `<div class="gallery-upload-panel" data-gallery-key="${key}">
    <div class="gallery-steps">
      <p><strong>Aggiungi i tuoi ricordi</strong></p>
      <p class="field-hint">Tocca <strong>Aggiungi foto</strong>, video o audio — poi scrivi titolo e descrizione e tocca <strong>Salva</strong>.</p>
    </div>
    <div class="gallery-organized" id="galleryOrganized_${key}"></div>
    <textarea name="section_${key}_media" class="gallery-media-json" aria-hidden="true" tabindex="-1"></textarea>
    <p class="field-hint" id="galleryUploadStatus_${key}">${media.length ? `${media.length} elementi organizzati. ` : ""}${MEDIA_LIMITS_HINT}. La musica di sottofondo va nella sezione <strong>Musica</strong>.</p>
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
    <input type="file" id="${esc(resolvedFileId)}" accept="image/*" hidden data-section-photo-input="${esc(key)}">
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

export { MEDIA_LIMITS_HINT, coverFocusStyle, normalizeMediaList };
