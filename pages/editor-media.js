import { getUploadClient,uploadImage,uploadVideo,validateImageFile,validateVideoFile,deleteStorageObject,isCloudflareMediaUrl,MAX_VIDEO_MB } from "./media-upload.js";

const supabase = getUploadClient();

window.__khamakeyBusinessId = new URLSearchParams(location.search).get("business") || "";

window.__khamakeyMedia = {
  maxVideoMb:MAX_VIDEO_MB,
  setBusinessId(id){
    window.__khamakeyBusinessId = String(id || "").trim();
  },
  isCloudUrl(url){
    return isCloudflareMediaUrl(url);
  },
  async upload({file,scope = "business",scopeId}){
    validateImageFile(file);
    const targetId = scopeId || window.__khamakeyBusinessId;
    if(!targetId) throw new Error("Attività non collegata. Ricarica la pagina.");
    return uploadImage(supabase,{scope,scopeId:targetId,file});
  },
  async uploadVideo({file,scope = "business",scopeId}){
    validateVideoFile(file);
    const targetId = scopeId || window.__khamakeyBusinessId;
    if(!targetId) throw new Error("Attività non collegata. Ricarica la pagina.");
    return uploadVideo(supabase,{scope,scopeId:targetId,file});
  },
  async remove(url){
    if(!isCloudflareMediaUrl(url)) return;
    return deleteStorageObject(supabase,url);
  }
};

window.addEventListener("message",event=>{
  const validOrigin = location.protocol === "file:" ? event.origin === "null" : event.origin === location.origin;
  if(!validOrigin || event.source !== window.parent) return;
  if(event.data?.type === "khamakey:load-state" && event.data.businessId){
    window.__khamakeyMedia.setBusinessId(event.data.businessId);
  }
});
