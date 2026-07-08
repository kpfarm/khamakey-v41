import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WORKER_BASE_URL } from "./config.js";

export const MEDIA_BUCKET = "khamakey-media";
export const MAX_IMAGE_MB = 8;
export const MAX_VIDEO_MB = 25;
export const MAX_AUDIO_MB = 12;
export const MAX_GALLERY_IMAGES = 24;

const UPLOAD_URL = `${WORKER_BASE_URL}/api/media/upload`;
const DELETE_URL = `${WORKER_BASE_URL}/api/media/delete`;

let sharedClient = null;

export function getUploadClient(){
  if(!sharedClient){
    sharedClient = createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
  }
  return sharedClient;
}

/** URL serviti da Cloudflare R2 via Worker /cdn/ */
export function isCloudflareMediaUrl(url){
  return /\/cdn\/(moments|business)\/[0-9a-f-]+\/(images|videos|audio)\//i.test(String(url || ""));
}

/** Legacy Supabase Storage (pagine già pubblicate) */
export function isStorageUrl(url){
  return /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/khamakey-media\//i.test(String(url || ""));
}

export function isMediaUrl(url){
  return isCloudflareMediaUrl(url) || isStorageUrl(url);
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
const AUDIO_EXT = /\.(mp3|m4a|wav|ogg|aac)$/i;

/** Riconosce il tipo anche quando Safari/iOS non imposta file.type (comune con video dalla galleria). */
export function inferMediaKind(file){
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if(type.startsWith("video/") || VIDEO_EXT.test(name)) return "video";
  if(type.startsWith("audio/") || AUDIO_EXT.test(name)) return "audio";
  if(type.startsWith("image/") || IMAGE_EXT.test(name)) return "image";
  return "";
}

export function mimeForUpload(file, kind = inferMediaKind(file)){
  const type = String(file?.type || "").toLowerCase();
  if(type) return type;
  const name = String(file?.name || "").toLowerCase();
  if(kind === "video"){
    if(name.endsWith(".webm")) return "video/webm";
    if(name.endsWith(".mov")) return "video/quicktime";
    return "video/mp4";
  }
  if(kind === "audio"){
    if(name.endsWith(".wav")) return "audio/wav";
    if(name.endsWith(".ogg")) return "audio/webm";
    if(name.endsWith(".aac")) return "audio/aac";
    if(name.endsWith(".m4a")) return "audio/x-m4a";
    return "audio/mpeg";
  }
  if(name.endsWith(".png")) return "image/png";
  if(name.endsWith(".gif")) return "image/gif";
  if(name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function fileWithMime(file, kind = inferMediaKind(file)){
  const mime = mimeForUpload(file, kind);
  if(!file || file.type === mime) return file;
  return new File([file], file.name || "upload", { type:mime, lastModified:file.lastModified });
}

export function validateImageFile(file,maxMb = MAX_IMAGE_MB){
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if(type === "image/heic" || type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif")){
    throw new Error("Formato HEIC non supportato. Su iPhone usa JPG/PNG oppure Impostazioni → Fotocamera → Formati → Compatibilità più alta.");
  }
  if(!file || inferMediaKind(file) !== "image"){
    throw new Error("Seleziona un file immagine valido (JPG, PNG, WebP).");
  }
  if(file.size > maxMb * 1024 * 1024){
    throw new Error(`Immagine troppo grande: massimo ${maxMb} MB.`);
  }
  return true;
}

export function validateVideoFile(file,maxMb = MAX_VIDEO_MB){
  if(!file || inferMediaKind(file) !== "video"){
    throw new Error("Seleziona un video valido (MP4, WebM, MOV).");
  }
  if(file.size > maxMb * 1024 * 1024){
    throw new Error(`Video troppo grande: massimo ${maxMb} MB.`);
  }
  return true;
}

export function validateAudioFile(file,maxMb = MAX_AUDIO_MB){
  if(!file || inferMediaKind(file) !== "audio"){
    throw new Error("Seleziona un file audio valido (MP3, M4A, WAV).");
  }
  if(file.size > maxMb * 1024 * 1024){
    throw new Error(`Audio troppo grande: massimo ${maxMb} MB.`);
  }
  return true;
}

export function compressImage(file,{maxSide = 1920,quality = 0.82,mime = "image/webp"} = {}){
  validateImageFile(file);
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onerror = ()=>reject(new Error("Impossibile leggere l'immagine."));
    reader.onload = ()=>{
      const image = new Image();
      image.onerror = ()=>reject(new Error("Impossibile elaborare l'immagine."));
      image.onload = ()=>{
        const scale = Math.min(1,maxSide / Math.max(image.naturalWidth,image.naturalHeight,1));
        const width = Math.max(1,Math.round(image.naturalWidth * scale));
        const height = Math.max(1,Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image,0,0,width,height);
        canvas.toBlob(blob=>{
          if(!blob) return reject(new Error("Compressione immagine non riuscita."));
          resolve(blob);
        },mime,quality);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function ensureAuthSession(supabase = getUploadClient()){
  const { data,error } = await supabase.auth.getSession();
  if(error) throw error;
  if(!data.session){
    throw new Error("Sessione scaduta. Accedi di nuovo per caricare i file.");
  }
  if(data.session.expires_at && data.session.expires_at * 1000 < Date.now() + 60_000){
    const { data:refreshed,error:refreshError } = await supabase.auth.refreshSession();
    if(refreshError || !refreshed.session){
      throw new Error("Sessione scaduta. Accedi di nuovo.");
    }
    return refreshed.session;
  }
  return data.session;
}

async function uploadViaCloudflare(supabase,{scope,scopeId,file}){
  const session = await ensureAuthSession(supabase);
  const kind = inferMediaKind(file);
  const uploadFile = fileWithMime(file, kind);
  const form = new FormData();
  form.append("file",uploadFile);
  form.append("scope",scope);
  form.append("scopeId",scopeId);
  let response;
  try{
    response = await fetch(UPLOAD_URL,{
      method:"POST",
      headers:{Authorization:`Bearer ${session.access_token}`},
      body:form
    });
  }catch(error){
    throw new Error("Connessione al server di upload non riuscita. Controlla la rete e riprova.");
  }
  const payload = await response.json().catch(()=>({}));
  if(!response.ok){
    throw new Error(payload.error || payload.message || "Upload Cloudflare non riuscito.");
  }
  return payload.url;
}

export async function uploadImage(supabase,{scope,scopeId,file,maxSide = 1920,quality = 0.82}){
  const blob = await compressImage(file,{maxSide,quality});
  const uploadFile = new File([blob], file.name?.replace(/\.\w+$/,".webp") || "image.webp", {
    type:blob.type || "image/webp"
  });
  return uploadViaCloudflare(supabase,{scope,scopeId,file:uploadFile});
}

export async function uploadVideo(supabase,options){
  validateVideoFile(options.file);
  return uploadViaCloudflare(supabase,options);
}

export async function uploadAudio(supabase,options){
  validateAudioFile(options.file);
  return uploadViaCloudflare(supabase,options);
}

export async function uploadMediaFile(supabase,options){
  const file = options.file;
  const kind = inferMediaKind(file);
  if(kind === "video") return uploadVideo(supabase,options);
  if(kind === "audio") return uploadAudio(supabase,options);
  if(kind === "image") return uploadImage(supabase,options);
  throw new Error("Formato file non riconosciuto. Usa JPG, PNG, MP4 o MOV.");
}

export async function uploadImages(supabase,options,files){
  const list = [...files].filter(Boolean);
  const urls = [];
  for(const file of list){
    urls.push(await uploadImage(supabase,{...options,file}));
  }
  return urls;
}

export async function uploadMediaFiles(supabase,options,files){
  const list = [...files].filter(Boolean);
  const items = [];
  for(const file of list){
    const url = await uploadMediaFile(supabase,{...options,file});
    items.push({
      url,
      type:inferMediaKind(file) || "image"
    });
  }
  return items;
}

export async function deleteStorageObject(supabase,url){
  const clean = String(url || "").trim();
  if(!isCloudflareMediaUrl(clean)) return;
  const session = await ensureAuthSession(supabase);
  const response = await fetch(DELETE_URL,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${session.access_token}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({url:clean})
  });
  const payload = await response.json().catch(()=>({}));
  if(!response.ok){
    throw new Error(payload.error || payload.message || "Eliminazione file non riuscita.");
  }
}
