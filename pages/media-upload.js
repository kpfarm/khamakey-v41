import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WORKER_BASE_URL } from "./config.js";

export const MEDIA_BUCKET = "khamakey-media";
export const MAX_IMAGE_MB = 8;
export const MAX_VIDEO_MB = 25;
export const MAX_AUDIO_MB = 12;
export const MAX_GALLERY_IMAGES = 24;

const UPLOAD_URL = `${WORKER_BASE_URL}/api/media/upload`;
const DELETE_URL = `${WORKER_BASE_URL}/api/media/delete`;
const UPLOAD_CONCURRENCY = 3;
const SKIP_COMPRESS_MAX_BYTES = 520_000;
const GALLERY_IMAGE_MAX_SIDE = 1600;
const GALLERY_IMAGE_QUALITY = 0.78;
const DEFAULT_IMAGE_MAX_SIDE = 1920;
const DEFAULT_IMAGE_QUALITY = 0.82;

let sharedClient = null;
let cachedUploadSession = null;
let cachedUploadSessionExp = 0;

export function bindUploadClient(client){
  if(client) sharedClient = client;
}

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

export const IMAGE_ACCEPT = "image/*,.heic,.heif,.heics,.hif";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|heics|hif|avif|tiff?)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
const AUDIO_EXT = /\.(mp3|m4a|wav|ogg|aac)$/i;

/** Riconosce il tipo anche quando Safari/iOS non imposta file.type (comune con video dalla galleria). */
export function inferMediaKind(file){
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if(isHeicFile(file)) return "image";
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

export function isHeicFile(file){
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if(/heic|heif/.test(type)) return true;
  return /\.(heic|heif|heics|hif)$/.test(name);
}

export function fileMatchesGalleryType(file,pendingType = ""){
  if(!pendingType) return true;
  const kind = inferMediaKind(file);
  if(pendingType === "image") return kind === "image" || !kind;
  return kind === pendingType;
}

let heic2anyLoader = null;

/** Precarica solo la libreria HEIC — la sessione auth dopo il caricamento editor (evita race all'avvio). */
export function warmUploadPipeline(){
  if(!heic2anyLoader){
    heic2anyLoader = import("https://esm.sh/heic2any@0.0.4").then(mod=>mod.default).catch(()=>null);
  }
}

export function warmUploadAuth(supabase = getUploadClient()){
  ensureAuthSession(supabase).catch(()=>{});
}

export async function mapPool(items,limit,worker){
  const list = [...items];
  if(!list.length) return [];
  const size = Math.max(1,Math.min(limit,list.length));
  const results = new Array(list.length);
  let cursor = 0;
  async function run(){
    while(cursor < list.length){
      const index = cursor++;
      results[index] = await worker(list[index],index);
    }
  }
  await Promise.all(Array.from({length:size},run));
  return results;
}

function canUploadImageDirectly(file){
  const type = String(file?.type || "").toLowerCase();
  const size = Number(file?.size || 0);
  if(!size || size > SKIP_COMPRESS_MAX_BYTES) return false;
  if(type === "image/webp") return true;
  if(type === "image/jpeg" || type === "image/jpg") return true;
  return false;
}

async function loadImageSource(file){
  if(typeof createImageBitmap === "function"){
    try{
      const bitmap = await createImageBitmap(file);
      return { kind:"bitmap", value:bitmap, cleanup:()=>bitmap.close?.() };
    }catch{
      /* fallback sotto */
    }
  }
  const objectUrl = URL.createObjectURL(file);
  return {
    kind:"url",
    value:objectUrl,
    cleanup:()=>URL.revokeObjectURL(objectUrl)
  };
}

async function decodeImageDimensions(source){
  if(source.kind === "bitmap"){
    return { width:source.value.width, height:source.value.height, draw:(ctx,x,y,w,h)=>ctx.drawImage(source.value,x,y,w,h) };
  }
  return new Promise((resolve,reject)=>{
    const image = new Image();
    image.onerror = ()=>reject(new Error("Impossibile elaborare l'immagine."));
    image.onload = ()=>resolve({
      width:image.naturalWidth,
      height:image.naturalHeight,
      draw:(ctx,x,y,w,h)=>ctx.drawImage(image,x,y,w,h)
    });
    image.src = source.value;
  });
}

async function convertHeicToJpeg(file){
  if(!heic2anyLoader){
    heic2anyLoader = import("https://esm.sh/heic2any@0.0.4").then(mod=>mod.default);
  }
  const heic2any = await heic2anyLoader;
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.88 });
  const blob = Array.isArray(result) ? result[0] : result;
  const base = String(file.name || "foto").replace(/\.(heic|heif)$/i, "") || "foto";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
}

/** iPhone: copertina (1 foto) spesso arriva già JPG; galleria (multi) può inviare HEIC. */
export async function prepareImageFileForUpload(file){
  if(!isHeicFile(file)) return file;
  try{
    return await convertHeicToJpeg(file);
  }catch{
    throw new Error("Foto iPhone (HEIC) non convertibile. Vai in Impostazioni → Fotocamera → Formati → Compatibilità più alta.");
  }
}

export function validateImageFile(file,maxMb = MAX_IMAGE_MB){
  if(!file || inferMediaKind(file) !== "image"){
    throw new Error("Seleziona un file immagine valido (JPG, PNG, WebP, HEIC).");
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

export function compressImage(file,{maxSide = DEFAULT_IMAGE_MAX_SIDE,quality = DEFAULT_IMAGE_QUALITY,mime = "image/webp"} = {}){
  validateImageFile(file);
  if(canUploadImageDirectly(file)) return Promise.resolve(file);
  return new Promise(async (resolve,reject)=>{
    let source;
    try{
      source = await loadImageSource(file);
      const decoded = await decodeImageDimensions(source);
      const scale = Math.min(1,maxSide / Math.max(decoded.width,decoded.height,1));
      const width = Math.max(1,Math.round(decoded.width * scale));
      const height = Math.max(1,Math.round(decoded.height * scale));
      if(scale >= 0.999 && file.type === mime && file.size <= SKIP_COMPRESS_MAX_BYTES){
        source.cleanup();
        return resolve(file);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d",{alpha:false});
      if(!ctx){
        source.cleanup();
        return reject(new Error("Compressione immagine non riuscita."));
      }
      decoded.draw(ctx,0,0,width,height);
      source.cleanup();
      canvas.toBlob(blob=>{
        if(blob) return resolve(blob);
        canvas.toBlob(fallback=>{
          if(!fallback) return reject(new Error("Compressione immagine non riuscita. Prova JPG o PNG."));
          resolve(fallback);
        },"image/jpeg",Math.min(0.9,quality + 0.05));
      },mime,quality);
    }catch(error){
      source?.cleanup?.();
      reject(error instanceof Error ? error : new Error("Impossibile elaborare l'immagine."));
    }
  });
}

async function buildImageUploadFile(file,{maxSide = DEFAULT_IMAGE_MAX_SIDE,quality = DEFAULT_IMAGE_QUALITY} = {}){
  const prepared = await prepareImageFileForUpload(file);
  if(canUploadImageDirectly(prepared)) return prepared;
  const compressed = await compressImage(prepared,{maxSide,quality});
  if(compressed instanceof File) return compressed;
  const base = String(prepared.name || file.name || "foto").replace(/\.\w+$/,"") || "foto";
  return new File([compressed], `${base}.webp`, { type:compressed.type || "image/webp", lastModified:prepared.lastModified });
}

export async function ensureAuthSession(supabase = getUploadClient(),{forceRefresh = false} = {}){
  const now = Date.now();
  if(!forceRefresh && cachedUploadSession && cachedUploadSessionExp > now + 30_000){
    return cachedUploadSession;
  }
  const { data,error } = await supabase.auth.getSession();
  if(error) throw error;
  if(!data.session){
    cachedUploadSession = null;
    cachedUploadSessionExp = 0;
    throw new Error("Sessione scaduta. Accedi di nuovo per caricare i file.");
  }
  if(data.session.expires_at && data.session.expires_at * 1000 < now + 60_000){
    const { data:refreshed,error:refreshError } = await supabase.auth.refreshSession();
    if(refreshError || !refreshed.session){
      cachedUploadSession = null;
      cachedUploadSessionExp = 0;
      throw new Error("Sessione scaduta. Accedi di nuovo.");
    }
    cachedUploadSession = refreshed.session;
    cachedUploadSessionExp = (refreshed.session.expires_at || 0) * 1000;
    return refreshed.session;
  }
  cachedUploadSession = data.session;
  cachedUploadSessionExp = (data.session.expires_at || 0) * 1000;
  return data.session;
}

export async function prepareUploadBatch(supabase,files,{imageMaxSide = GALLERY_IMAGE_MAX_SIDE,imageQuality = GALLERY_IMAGE_QUALITY} = {}){
  await ensureAuthSession(supabase);
  return mapPool(files,UPLOAD_CONCURRENCY,async file=>{
    const kind = inferMediaKind(file);
    if(kind === "image"){
      return { file, kind, uploadFile:await buildImageUploadFile(file,{maxSide:imageMaxSide,quality:imageQuality}) };
    }
    return { file, kind, uploadFile:fileWithMime(file,kind) };
  });
}

async function uploadViaCloudflare(supabase,{scope,scopeId,file,session},retry = true){
  const client = supabase || getUploadClient();
  let activeSession = session || await ensureAuthSession(client);
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
      headers:{Authorization:`Bearer ${activeSession.access_token}`},
      body:form
    });
  }catch(error){
    throw new Error("Connessione al server di upload non riuscita. Controlla la rete e riprova.");
  }
  const payload = await response.json().catch(()=>({}));
  if(response.status === 401 && retry){
    cachedUploadSession = null;
    cachedUploadSessionExp = 0;
    const { data:refreshed,error:refreshError } = await client.auth.refreshSession();
    if(!refreshError && refreshed?.session){
      cachedUploadSession = refreshed.session;
      cachedUploadSessionExp = (refreshed.session.expires_at || 0) * 1000;
      return uploadViaCloudflare(client,{scope,scopeId,file,session:refreshed.session},false);
    }
    throw new Error("Sessione scaduta. Esci e accedi di nuovo, poi riprova il caricamento.");
  }
  if(!response.ok){
    const detail = payload.error || payload.message || "";
    if(response.status === 403){
      throw new Error(detail || "Non hai permesso di caricare file su questa pagina. Ricarica l'editor e riprova.");
    }
    if(response.status === 413){
      throw new Error(detail || "File troppo grande per il limite consentito.");
    }
    if(response.status === 503){
      throw new Error(detail || "Archivio media temporaneamente non disponibile. Riprova tra qualche minuto.");
    }
    throw new Error(detail || `Upload non riuscito (${response.status}).`);
  }
  return payload.url;
}

export async function uploadImage(supabase,{scope,scopeId,file,maxSide = DEFAULT_IMAGE_MAX_SIDE,quality = DEFAULT_IMAGE_QUALITY,session}){
  const uploadFile = await buildImageUploadFile(file,{maxSide,quality});
  return uploadViaCloudflare(supabase,{scope,scopeId,file:uploadFile,session});
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
  if(kind === "image"){
    return uploadImage(supabase,{
      ...options,
      maxSide:options.maxSide ?? GALLERY_IMAGE_MAX_SIDE,
      quality:options.quality ?? GALLERY_IMAGE_QUALITY
    });
  }
  throw new Error("Formato file non riconosciuto. Usa JPG, PNG, MP4 o MOV.");
}

export async function uploadImages(supabase,options,files){
  const list = [...files].filter(Boolean);
  if(!list.length) return [];
  const session = await ensureAuthSession(supabase);
  const prepared = await mapPool(list,UPLOAD_CONCURRENCY,async file=>({
    file,
    uploadFile:await buildImageUploadFile(file,{
      maxSide:options.maxSide ?? GALLERY_IMAGE_MAX_SIDE,
      quality:options.quality ?? GALLERY_IMAGE_QUALITY
    })
  }));
  return mapPool(prepared,UPLOAD_CONCURRENCY,async item=>uploadViaCloudflare(supabase,{
    scope:options.scope,
    scopeId:options.scopeId,
    file:item.uploadFile,
    session
  }));
}

export async function uploadMediaBatch(supabase,options,files,{onProgress,imageMaxSide,imageQuality} = {}){
  const list = [...files].filter(Boolean);
  if(!list.length) return [];
  onProgress?.({phase:"prepare",done:0,total:list.length});
  const prepared = await prepareUploadBatch(supabase,list,{imageMaxSide,imageQuality});
  const session = await ensureAuthSession(supabase);
  let done = 0;
  return mapPool(prepared,UPLOAD_CONCURRENCY,async item=>{
    try{
      const url = await uploadViaCloudflare(supabase,{
        scope:options.scope,
        scopeId:options.scopeId,
        file:item.uploadFile,
        session
      });
      done += 1;
      onProgress?.({phase:"upload",done,total:prepared.length,success:true,file:item.file});
      return { ok:true,url,type:item.kind || inferMediaKind(item.file) || "image",file:item.file };
    }catch(error){
      done += 1;
      onProgress?.({phase:"upload",done,total:prepared.length,success:false,file:item.file,error});
      return { ok:false,file:item.file,error };
    }
  });
}

export async function uploadMediaFiles(supabase,options,files){
  const results = await uploadMediaBatch(supabase,options,files,{
    imageMaxSide:options.maxSide,
    imageQuality:options.quality
  });
  return results.filter(item=>item.ok).map(item=>({url:item.url,type:item.type}));
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
