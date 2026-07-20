/** Modello media Moments — foto, video, audio con titolo e descrizione. */

import { inferMediaKind, IMAGE_ACCEPT } from "./media-upload.js?v=144";

export const MAX_GALLERY_ITEMS = 24;
export const MAX_GALLERY_VIDEOS = 0;
export const MAX_GALLERY_AUDIO = 0;
export const MAX_MUSIC_AUDIO = 2;
export const MAX_VIDEO_CLIPS = 1;
export const MAX_LETTER_IMAGES = 2;
export const MAX_LETTER_VIDEOS = 1;
export const MAX_LETTER_AUDIO = 1;
export const MAX_LETTER_ITEMS = MAX_LETTER_IMAGES + MAX_LETTER_VIDEOS + MAX_LETTER_AUDIO;

export const MEDIA_LIMITS_HINT =
  `Fino a ${MAX_GALLERY_ITEMS} foto (8 MB) — titolo e descrizione compaiono sotto ogni foto e nell’ingrandimento.`;

export const VIDEO_SECTION_HINT =
  `Un solo video (MP4/MOV, max 25 MB) con titolo e descrizione. Per audio usa la sezione Musica.`;

export const LETTER_MEDIA_HINT =
  `Fino a ${MAX_LETTER_IMAGES} foto, ${MAX_LETTER_VIDEOS} video e ${MAX_LETTER_AUDIO} audio (8 MB foto · 25 MB video · 12 MB audio) — si sbloccano con la lettera.`;

export function mediaLimitsForKey(sectionKey = "gallery"){
  if(sectionKey === "letter_future"){
    return {
      maxItems:MAX_LETTER_ITEMS,
      maxImages:MAX_LETTER_IMAGES,
      maxVideos:MAX_LETTER_VIDEOS,
      maxAudio:MAX_LETTER_AUDIO,
      hint:LETTER_MEDIA_HINT
    };
  }
  return {
    maxItems:MAX_GALLERY_ITEMS,
    maxImages:MAX_GALLERY_ITEMS,
    maxVideos:0,
    maxAudio:0,
    hint:MEDIA_LIMITS_HINT
  };
}

/** Converte media[] o allegato legacy (media_url) in lista normalizzata. */
export function migrateLetterMediaSection(section = {}){
  const list = normalizeMediaList(section);
  if(list.length) return list.slice(0, MAX_LETTER_ITEMS);
  const type = String(section.media_type || "").trim();
  const url = String(section.media_url || "").trim();
  const title = String(section.media_title || "").trim();
  if(url && ["image","video","audio"].includes(type)){
    return [normalizeMediaItem({ type, url, title })];
  }
  return [];
}

export function mediaId(){
  return crypto.randomUUID();
}

export function detectMediaType(fileOrUrl){
  if(typeof fileOrUrl === "string"){
    const url = fileOrUrl.toLowerCase();
    if(/\.(mp4|webm|mov|m4v)(\?|$)/.test(url)) return "video";
    if(/\.(mp3|m4a|wav|ogg|aac)(\?|$)/.test(url)) return "audio";
    return "image";
  }
  if(fileOrUrl && typeof fileOrUrl === "object" && "name" in fileOrUrl){
    const kind = inferMediaKind(fileOrUrl);
    if(kind) return kind;
  }
  const type = String(fileOrUrl?.type || "");
  if(type.startsWith("video/")) return "video";
  if(type.startsWith("audio/")) return "audio";
  return "image";
}

export function normalizeMediaItem(raw = {}){
  const url = String(raw.url || raw.src || "").trim();
  const type = ["image","video","audio"].includes(raw.type) ? raw.type : detectMediaType(url);
  return {
    id:String(raw.id || mediaId()),
    type,
    url,
    title:String(raw.title || "").trim(),
    description:String(raw.description || "").trim()
  };
}

/** Converte images[] legacy o media[] in lista normalizzata. */
export function normalizeMediaList(section = {}){
  if(Array.isArray(section.media) && section.media.length){
    return section.media.map(normalizeMediaItem).filter(item=>item.url);
  }
  if(Array.isArray(section.images)){
    return section.images.filter(Boolean).map(url=>normalizeMediaItem({type:"image",url}));
  }
  return [];
}

export function mediaListToImages(media){
  return normalizeMediaList({media}).filter(item=>item.type === "image").map(item=>item.url);
}

export function serializeMediaList(media){
  return JSON.stringify(normalizeMediaList({media}));
}

export function parseMediaList(value){
  if(!value) return [];
  if(Array.isArray(value)) return value.map(normalizeMediaItem).filter(item=>item.url);
  try{
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(normalizeMediaItem).filter(item=>item.url) : [];
  }catch{
    return [];
  }
}

export function countMediaByType(media,type){
  return normalizeMediaList({media}).filter(item=>item.type === type).length;
}

export function coverFocusStyle(state = {}){
  const x = clampNumber(state.cover_focus_x,0,100,50);
  const y = clampNumber(state.cover_focus_y,0,100,50);
  const zoom = clampNumber(state.cover_zoom,100,200,100);
  // Zoom sul punto di fuoco (non sul centro del riquadro)
  return {
    x,y,zoom,
    css:`object-position:${x}% ${y}%;transform-origin:${x}% ${y}%;transform:scale(${zoom/100})`
  };
}

export function clampNumber(value,min,max,fallback){
  const num = Number(value);
  if(Number.isNaN(num)) return fallback;
  return Math.min(max,Math.max(min,num));
}

export function mediaThumbHtml(item,{editable = false,index = 0,sectionKey = "gallery"} = {}){
  const safe = normalizeMediaItem(item);
  const badge = safe.type === "video" ? "▶" : safe.type === "audio" ? "♫" : "";
  const preview = safe.type === "image"
    ? `<img src="${escAttr(safe.url)}" alt="" loading="lazy" decoding="async">`
    : safe.type === "video"
      ? `<video src="${escAttr(safe.url)}" muted playsinline preload="metadata"></video><span class="media-type-badge">${badge}</span>`
      : `<div class="media-audio-thumb"><span class="media-type-badge">${badge || "♫"}</span><span class="media-audio-label">${escHtml(safe.title || "Audio")}</span></div>`;
  const meta = safe.title ? `<span class="media-thumb-title">${escHtml(safe.title)}</span>` : "";
  return `<div class="gallery-thumb media-thumb media-thumb-${safe.type}" data-media-index="${index}" data-media-section="${escAttr(sectionKey)}" role="button" tabindex="0" aria-label="Apri dettagli">
    ${preview}${meta}
    ${editable ? `<button type="button" class="gallery-remove" data-gallery-remove="${index}" data-media-id="${escAttr(safe.id)}" data-media-section="${escAttr(sectionKey)}" aria-label="Rimuovi">×</button>` : ""}
  </div>`;
}

/** Riga editor con titolo e descrizione visibili per ogni file. */
export function mediaEditorRowHtml(item,{index = 0,sectionKey = "gallery"} = {}){
  const safe = normalizeMediaItem(item);
  const typeLabel = safe.type === "video" ? "Video" : safe.type === "audio" ? "Audio" : "Foto";
  const preview = safe.type === "image"
    ? `<img src="${escAttr(safe.url)}" alt="" loading="lazy" decoding="async">`
    : safe.type === "video"
      ? `<video src="${escAttr(safe.url)}" muted playsinline preload="metadata"></video>`
      : `<div class="media-audio-row-icon" aria-hidden="true">♫</div>`;
  const replaceLabel = safe.type === "image" ? "Cambia foto" : safe.type === "video" ? "Cambia video" : "Cambia audio";
  return `<article class="media-edit-row media-edit-row-${safe.type}" data-media-id="${escAttr(safe.id)}" data-media-index="${index}" data-media-section="${escAttr(sectionKey)}">
    <div class="media-edit-preview" aria-label="${escAttr(typeLabel)}">${preview}</div>
    <div class="media-edit-fields">
      <label class="media-edit-label">Titolo<input class="media-row-title" type="text" value="${escAttr(safe.title)}" placeholder="Es. Il nostro primo giorno" maxlength="120"></label>
      <label class="media-edit-label">Descrizione<textarea class="media-row-desc" rows="2" placeholder="Racconta questo ricordo...">${escHtml(safe.description)}</textarea></label>
      <div class="media-edit-actions">
        <button type="button" class="media-edit-replace" data-gallery-replace="${index}" data-media-id="${escAttr(safe.id)}" data-media-section="${escAttr(sectionKey)}" data-media-type="${escAttr(safe.type)}">${escHtml(replaceLabel)}</button>
        <button type="button" class="media-edit-remove" data-gallery-remove="${index}" data-media-id="${escAttr(safe.id)}" data-media-section="${escAttr(sectionKey)}">Rimuovi</button>
      </div>
    </div>
  </article>`;
}

export const GALLERY_IMAGE_GROUP = [
  { type:"image", label:"Foto", icon:"📷", addLabel:"Aggiungi foto", accept:IMAGE_ACCEPT }
];

export const GALLERY_TYPE_GROUPS = [
  ...GALLERY_IMAGE_GROUP,
  { type:"video", label:"Video", icon:"▶", addLabel:"Aggiungi video", accept:"video/*" },
  { type:"audio", label:"Audio", icon:"♫", addLabel:"Aggiungi audio", accept:"audio/*", addHint:"Messaggi vocali e registrazioni — si sbloccano con la lettera." }
];

export function galleryEditorGroups(key = "gallery"){
  return key === "letter_future" ? GALLERY_TYPE_GROUPS : GALLERY_IMAGE_GROUP;
}

function escAttr(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function escHtml(value){
  return escAttr(value);
}
