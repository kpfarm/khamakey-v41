import { uploadMediaFile, validateImageFile, validateVideoFile, validateAudioFile } from "./media-upload.js";

const LETTER_MEDIA_TYPES = ["image","video","audio"];

export function normalizeLetterMedia(section = {}){
  const type = String(section.media_type || "").trim();
  const url = String(section.media_url || "").trim();
  const title = String(section.media_title || "").trim();
  if(!url || !LETTER_MEDIA_TYPES.includes(type)) return { media_type:"", media_url:"", media_title:"" };
  return { media_type:type, media_url:url, media_title:title };
}

export function readLetterMedia(formNode){
  const type = formNode.querySelector('[name="section_letter_future_media_type"]')?.value || "";
  const url = formNode.querySelector('[name="section_letter_future_media_url"]')?.value || "";
  const title = formNode.querySelector('[name="section_letter_future_media_title"]')?.value || "";
  return normalizeLetterMedia({ media_type:type, media_url:url, media_title:title });
}

export function writeLetterMedia(formNode,media){
  const safe = normalizeLetterMedia(media);
  const typeInput = formNode.querySelector('[name="section_letter_future_media_type"]');
  const urlInput = formNode.querySelector('[name="section_letter_future_media_url"]');
  const titleInput = formNode.querySelector('[name="section_letter_future_media_title"]');
  if(typeInput) typeInput.value = safe.media_type;
  if(urlInput) urlInput.value = safe.media_url;
  if(titleInput) titleInput.value = safe.media_title;
}

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function letterMediaPreview(media){
  const safe = normalizeLetterMedia(media);
  if(!safe.media_url) return "";
  if(safe.media_type === "video"){
    return `<video src="${esc(safe.media_url)}" controls playsinline></video>`;
  }
  if(safe.media_type === "audio"){
    return `<audio src="${esc(safe.media_url)}" controls></audio>`;
  }
  return `<img src="${esc(safe.media_url)}" alt="">`;
}

export function renderLetterMediaPanel(section){
  const media = normalizeLetterMedia(section);
  const preview = media.media_url
    ? `<div class="letter-media-preview">${letterMediaPreview(media)}<button type="button" class="ghost letter-media-remove" data-letter-media-remove>Rimuovi allegato</button></div>`
    : `<button type="button" class="gallery-add letter-media-add" data-letter-media-add><span>+</span>Allega foto, video o audio</button>`;
  return `<div class="letter-media-panel" id="letterMediaPanel">
    <p class="field-hint">Opzionale: un ricordo multimediale che si sblocca <strong>insieme alla lettera</strong> (foto, video o audio).</p>
    <input type="hidden" name="section_letter_future_media_type" value="${esc(media.media_type)}">
    <input type="hidden" name="section_letter_future_media_url" value="${esc(media.media_url)}">
    <label>Titolo allegato (opzionale)<input name="section_letter_future_media_title" value="${esc(media.media_title)}" placeholder="Es. Il nostro messaggio video"></label>
    ${preview}
  </div>`;
}

export function renderLetterFileInput(){
  return `<input type="file" id="letterFutureFile" accept="image/*,video/*,audio/*" hidden tabindex="-1" aria-hidden="true">`;
}

export function syncLetterMediaPanel(formNode){
  const panel = document.getElementById("letterMediaPanel");
  if(!panel) return;
  const media = readLetterMedia(formNode);
  panel.querySelector(".letter-media-preview")?.remove();
  panel.querySelector("[data-letter-media-add]")?.remove();
  if(media.media_url){
    panel.insertAdjacentHTML("beforeend",`<div class="letter-media-preview">${letterMediaPreview(media)}<button type="button" class="ghost letter-media-remove" data-letter-media-remove>Rimuovi allegato</button></div>`);
  }else{
    panel.insertAdjacentHTML("beforeend",`<button type="button" class="gallery-add letter-media-add" data-letter-media-add><span>+</span>Allega foto, video o audio</button>`);
  }
}

export async function uploadLetterMedia({supabase,row,formNode,file,onBusy}){
  if(!row?.id){
    throw new Error("Pagina non pronta. Ricarica l'editor e riprova.");
  }
  const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
  if(type === "video") validateVideoFile(file);
  else if(type === "audio") validateAudioFile(file);
  else validateImageFile(file);
  const current = readLetterMedia(formNode);
  onBusy?.(true);
  try{
    const url = await uploadMediaFile(supabase,{scope:"moments",scopeId:row.id,file});
    writeLetterMedia(formNode,{
      media_type:type,
      media_url:url,
      media_title:current.media_title
    });
    syncLetterMediaPanel(formNode);
    formNode.dispatchEvent(new Event("input",{bubbles:true}));
    return { url, type, oldUrl:current.media_url };
  }finally{
    onBusy?.(false);
  }
}
