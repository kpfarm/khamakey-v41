import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

export const MEDIA_BUCKET = "khamakey-media";
export const MAX_IMAGE_MB = 8;
export const MAX_GALLERY_IMAGES = 24;

let sharedClient = null;

export function getUploadClient(){
  if(!sharedClient){
    sharedClient = createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
  }
  return sharedClient;
}

export function isStorageUrl(url){
  return /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/khamakey-media\//i.test(String(url || ""));
}

export function validateImageFile(file,maxMb = MAX_IMAGE_MB){
  if(!file || !String(file.type || "").startsWith("image/")){
    throw new Error("Seleziona un file immagine valido (JPG, PNG, WebP).");
  }
  if(file.size > maxMb * 1024 * 1024){
    throw new Error(`Immagine troppo grande: massimo ${maxMb} MB.`);
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

export function buildMediaPath(scope,scopeId,filename){
  const cleanScope = String(scope || "").trim().toLowerCase();
  const cleanId = String(scopeId || "").trim();
  if(!cleanScope || !cleanId) throw new Error("Contesto upload non valido.");
  return `${cleanScope}/${cleanId}/${filename}`;
}

export async function uploadImage(supabase,{
  scope,
  scopeId,
  file,
  maxSide = 1920,
  quality = 0.82
}){
  await ensureAuthSession(supabase);
  const blob = await compressImage(file,{maxSide,quality});
  const ext = blob.type === "image/png" ? "png" : "webp";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = buildMediaPath(scope,scopeId,filename);
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path,blob,{
    contentType:blob.type || "image/webp",
    cacheControl:"31536000",
    upsert:false
  });
  if(error) throw new Error(error.message || "Upload non riuscito.");
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadImages(supabase,options,files){
  const list = [...files].filter(Boolean);
  const urls = [];
  for(const file of list){
    urls.push(await uploadImage(supabase,{...options,file}));
  }
  return urls;
}

export async function deleteStorageObject(supabase,publicUrl){
  if(!isStorageUrl(publicUrl)) return;
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if(idx < 0) return;
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length).split("?")[0]);
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}
