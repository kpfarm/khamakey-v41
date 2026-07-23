/** Modello media Moments — foto, video, audio, PDF con titolo e descrizione. */

import { inferMediaKind, IMAGE_ACCEPT } from "./media-upload.js?v=173";
import {
  DEFAULT_MOMENTS_LIMITS,
  mediaLimitsFromPlan,
  normalizePlanLimits
} from "./moment-plans.js?v=173";
import { getUiLocale } from "./moments-i18n.js?v=216";
import { FIELD_PHRASE_EN } from "./moments-i18n-fields.js?v=216";

function lf(text){
  const raw = String(text || "");
  if(!raw || getUiLocale() === "it") return raw;
  return FIELD_PHRASE_EN[raw] || raw;
}

export const MAX_GALLERY_ITEMS = DEFAULT_MOMENTS_LIMITS.gallery_images;
export const MAX_GALLERY_VIDEOS = 0;
export const MAX_GALLERY_AUDIO = 0;
export const MAX_MUSIC_AUDIO = DEFAULT_MOMENTS_LIMITS.music_audio;
export const MAX_VIDEO_CLIPS = DEFAULT_MOMENTS_LIMITS.video_clips;
export const MAX_LETTER_IMAGES = DEFAULT_MOMENTS_LIMITS.letter_images;
export const MAX_LETTER_VIDEOS = DEFAULT_MOMENTS_LIMITS.letter_videos;
export const MAX_LETTER_AUDIO = DEFAULT_MOMENTS_LIMITS.letter_audio;
export const MAX_LETTER_PDFS = DEFAULT_MOMENTS_LIMITS.letter_pdfs;
export const MAX_LETTER_ITEMS =
  MAX_LETTER_IMAGES + MAX_LETTER_VIDEOS + MAX_LETTER_AUDIO + MAX_LETTER_PDFS;

export const MEDIA_LIMITS_HINT = mediaLimitsFromPlan("gallery").hint;
export const VIDEO_SECTION_HINT = mediaLimitsFromPlan("video").hint;
export const LETTER_MEDIA_HINT = mediaLimitsFromPlan("letter_future").hint;

let activePlanLimits = { ...DEFAULT_MOMENTS_LIMITS };

export function setActivePlanLimits(limits){
  activePlanLimits = normalizePlanLimits(limits || DEFAULT_MOMENTS_LIMITS);
  return activePlanLimits;
}

export function getActivePlanLimits(){
  return activePlanLimits;
}

export function mediaLimitsForKey(sectionKey = "gallery", planLimits = activePlanLimits){
  return mediaLimitsFromPlan(sectionKey, planLimits);
}

/** Converte media[] o allegato legacy (media_url) in lista normalizzata. */
export function migrateLetterMediaSection(section = {}){
  const limits = mediaLimitsForKey("letter_future");
  const list = normalizeMediaList(section);
  if(list.length) return list.slice(0, limits.maxItems);
  const type = String(section.media_type || "").trim();
  const url = String(section.media_url || "").trim();
  const title = String(section.media_title || "").trim();
  if(url && ["image","video","audio","pdf"].includes(type)){
    return [normalizeMediaItem({ type, url, title })];
  }
  return [];
}

export function migrateVideoSectionMedia(section = {}){
  const limits = mediaLimitsForKey("video");
  const list = normalizeMediaList(section).filter(item=>item.type === "video");
  if(list.length) return list.slice(0, limits.maxVideos);
  const url = String(section.video_url || "").trim();
  if(!url) return [];
  return [normalizeMediaItem({
    type:"video",
    url,
    title:section.video_title,
    description:section.video_description
  })].slice(0, limits.maxVideos);
}

export function migrateMusicSectionMedia(section = {}){
  const limits = mediaLimitsForKey("music");
  const list = normalizeMediaList(section).filter(item=>item.type === "audio");
  if(list.length) return list.slice(0, limits.maxAudio);
  const url = String(section.audio_url || "").trim();
  if(!url) return [];
  return [normalizeMediaItem({
    type:"audio",
    url,
    title:section.audio_title,
    description:section.audio_description
  })].slice(0, limits.maxAudio);
}

export function mediaId(){
  return crypto.randomUUID();
}

export function detectMediaType(fileOrUrl){
  if(typeof fileOrUrl === "string"){
    const url = fileOrUrl.toLowerCase();
    if(/\.(mp4|webm|mov|m4v)(\?|$)/.test(url)) return "video";
    if(/\.(mp3|m4a|wav|ogg|aac)(\?|$)/.test(url)) return "audio";
    if(/\.pdf(\?|$)/.test(url)) return "pdf";
    return "image";
  }
  if(fileOrUrl && typeof fileOrUrl === "object" && "name" in fileOrUrl){
    const kind = inferMediaKind(fileOrUrl);
    if(kind) return kind;
  }
  const type = String(fileOrUrl?.type || "");
  if(type === "application/pdf") return "pdf";
  if(type.startsWith("video/")) return "video";
  if(type.startsWith("audio/")) return "audio";
  return "image";
}

export function normalizeMediaItem(raw = {}){
  const url = String(raw.url || raw.src || "").trim();
  const type = ["image","video","audio","pdf"].includes(raw.type) ? raw.type : detectMediaType(url);
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
  const badge = safe.type === "video" ? "▶" : safe.type === "audio" ? "♫" : safe.type === "pdf" ? "PDF" : "";
  const preview = safe.type === "image"
    ? `<img src="${escAttr(safe.url)}" alt="" loading="lazy" decoding="async">`
    : safe.type === "video"
      ? `<video src="${escAttr(safe.url)}" muted playsinline preload="metadata"></video><span class="media-type-badge">${badge}</span>`
      : safe.type === "pdf"
        ? `<div class="media-pdf-thumb"><span class="media-type-badge">${badge}</span><span class="media-audio-label">${escHtml(safe.title || "PDF")}</span></div>`
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
  const typeLabelIt = safe.type === "video" ? "Video" : safe.type === "audio" ? "Audio" : safe.type === "pdf" ? "PDF" : "Foto";
  const typeLabel = lf(typeLabelIt);
  const preview = safe.type === "image"
    ? `<img src="${escAttr(safe.url)}" alt="" loading="lazy" decoding="async">`
    : safe.type === "video"
      ? `<video src="${escAttr(safe.url)}" muted playsinline preload="metadata"></video>`
      : safe.type === "pdf"
        ? `<div class="media-pdf-row-icon" aria-hidden="true">PDF</div>`
        : `<div class="media-audio-row-icon" aria-hidden="true">♫</div>`;
  const replaceLabelIt = safe.type === "image" ? "Cambia foto"
    : safe.type === "video" ? "Cambia video"
      : safe.type === "pdf" ? "Cambia PDF"
        : "Cambia audio";
  const titlePh = "Es. Il nostro primo giorno";
  const descPh = "Racconta questo ricordo...";
  return `<article class="media-edit-row media-edit-row-${safe.type}" data-media-id="${escAttr(safe.id)}" data-media-index="${index}" data-media-section="${escAttr(sectionKey)}">
    <div class="media-edit-preview" aria-label="${escAttr(typeLabel)}">${preview}</div>
    <div class="media-edit-fields">
      <label class="media-edit-label"><span data-lf="Titolo">${escHtml(lf("Titolo"))}</span><input class="media-row-title" type="text" value="${escAttr(safe.title)}" placeholder="${escAttr(lf(titlePh))}" data-lf-placeholder="${escAttr(titlePh)}" maxlength="120"></label>
      <label class="media-edit-label"><span data-lf="Descrizione">${escHtml(lf("Descrizione"))}</span><textarea class="media-row-desc" rows="2" placeholder="${escAttr(lf(descPh))}" data-lf-placeholder="${escAttr(descPh)}">${escHtml(safe.description)}</textarea></label>
      <div class="media-edit-actions">
        <button type="button" class="media-edit-replace" data-gallery-replace="${index}" data-media-id="${escAttr(safe.id)}" data-media-section="${escAttr(sectionKey)}" data-media-type="${escAttr(safe.type)}" data-lf="${escAttr(replaceLabelIt)}">${escHtml(lf(replaceLabelIt))}</button>
        <button type="button" class="media-edit-remove" data-gallery-remove="${index}" data-media-id="${escAttr(safe.id)}" data-media-section="${escAttr(sectionKey)}" data-lf="Rimuovi">${escHtml(lf("Rimuovi"))}</button>
      </div>
    </div>
  </article>`;
}

export const GALLERY_IMAGE_GROUP = [
  { type:"image", label:"Foto", icon:"📷", addLabel:"Aggiungi foto", accept:IMAGE_ACCEPT }
];

export const VIDEO_TYPE_GROUPS = [
  { type:"video", label:"Video", icon:"▶", addLabel:"Aggiungi video", accept:"video/*" }
];

export const MUSIC_TYPE_GROUPS = [
  { type:"audio", label:"Audio", icon:"♫", addLabel:"Aggiungi audio", accept:"audio/*" }
];

export const GALLERY_TYPE_GROUPS = [
  ...GALLERY_IMAGE_GROUP,
  { type:"video", label:"Video", icon:"▶", addLabel:"Aggiungi video", accept:"video/*" },
  { type:"audio", label:"Audio", icon:"♫", addLabel:"Aggiungi audio", accept:"audio/*", addHint:"Messaggi vocali e registrazioni — si sbloccano con la lettera." },
  { type:"pdf", label:"PDF", icon:"PDF", addLabel:"Aggiungi PDF", accept:"application/pdf,.pdf", addHint:"Documenti e lettere in PDF — si aprono dopo lo sblocco." }
];

export function galleryEditorGroups(key = "gallery"){
  if(key === "letter_future") return GALLERY_TYPE_GROUPS;
  if(key === "video") return VIDEO_TYPE_GROUPS;
  if(key === "music") return MUSIC_TYPE_GROUPS;
  return GALLERY_IMAGE_GROUP;
}

function escAttr(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function escHtml(value){
  return escAttr(value);
}
