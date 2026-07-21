/** Limiti piani Moments — allineati a platform_plans.limits (SQL v161). */

export const MOMENTS_PLAN_KEYS = Object.freeze(["moments_free", "moments_plus", "moments_pro"]);

export const DEFAULT_MOMENTS_LIMITS = Object.freeze({
  product: "moments",
  storage_mb: 250,
  gallery_images: 24,
  video_clips: 1,
  music_audio: 1,
  letter_images: 2,
  letter_videos: 1,
  letter_audio: 1,
  letter_pdfs: 1,
  journey_steps: 24,
  max_image_mb: 8,
  max_video_mb: 25,
  max_audio_mb: 12,
  max_pdf_mb: 15
});

export const PLAN_LABELS = Object.freeze({
  moments_free: "Free",
  moments_plus: "Plus",
  moments_pro: "Pro"
});

export function normalizePlanKey(value){
  const key = String(value || "").trim().toLowerCase();
  return MOMENTS_PLAN_KEYS.includes(key) ? key : "moments_free";
}

export function normalizePlanLimits(raw = {}){
  const src = raw && typeof raw === "object" ? raw : {};
  const num = (key, fallback)=>{
    const n = Number(src[key]);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
  };
  return {
    product: "moments",
    storage_mb: num("storage_mb", DEFAULT_MOMENTS_LIMITS.storage_mb),
    gallery_images: num("gallery_images", DEFAULT_MOMENTS_LIMITS.gallery_images),
    video_clips: num("video_clips", DEFAULT_MOMENTS_LIMITS.video_clips),
    music_audio: num("music_audio", DEFAULT_MOMENTS_LIMITS.music_audio),
    letter_images: num("letter_images", DEFAULT_MOMENTS_LIMITS.letter_images),
    letter_videos: num("letter_videos", DEFAULT_MOMENTS_LIMITS.letter_videos),
    letter_audio: num("letter_audio", DEFAULT_MOMENTS_LIMITS.letter_audio),
    letter_pdfs: num("letter_pdfs", DEFAULT_MOMENTS_LIMITS.letter_pdfs),
    journey_steps: num("journey_steps", DEFAULT_MOMENTS_LIMITS.journey_steps),
    max_image_mb: num("max_image_mb", DEFAULT_MOMENTS_LIMITS.max_image_mb),
    max_video_mb: num("max_video_mb", DEFAULT_MOMENTS_LIMITS.max_video_mb),
    max_audio_mb: num("max_audio_mb", DEFAULT_MOMENTS_LIMITS.max_audio_mb),
    max_pdf_mb: num("max_pdf_mb", DEFAULT_MOMENTS_LIMITS.max_pdf_mb)
  };
}

export function emptyEntitlements(eventId = null){
  return {
    event_id: eventId,
    plan_key: "moments_free",
    plan_name: "Moments Free",
    price_monthly: 0,
    price_yearly: 0,
    limits: { ...DEFAULT_MOMENTS_LIMITS },
    bytes_used: 0,
    file_count: 0,
    storage_mb: DEFAULT_MOMENTS_LIMITS.storage_mb
  };
}

export function normalizeEntitlements(raw, eventId = null){
  const src = raw && typeof raw === "object" ? raw : {};
  const limits = normalizePlanLimits(src.limits || DEFAULT_MOMENTS_LIMITS);
  const bytes = Number(src.bytes_used);
  const files = Number(src.file_count);
  return {
    event_id: src.event_id || eventId,
    plan_key: normalizePlanKey(src.plan_key),
    plan_name: String(src.plan_name || PLAN_LABELS[normalizePlanKey(src.plan_key)] || "Free"),
    price_monthly: Number(src.price_monthly) || 0,
    price_yearly: Number(src.price_yearly) || 0,
    limits,
    bytes_used: Number.isFinite(bytes) && bytes >= 0 ? bytes : 0,
    file_count: Number.isFinite(files) && files >= 0 ? files : 0,
    storage_mb: limits.storage_mb
  };
}

export function storageBytesLimit(limits = DEFAULT_MOMENTS_LIMITS){
  return Math.max(0, Number(limits.storage_mb) || 0) * 1024 * 1024;
}

export function formatBytes(bytes){
  const n = Math.max(0, Number(bytes) || 0);
  if(n < 1024) return `${Math.round(n)} B`;
  if(n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  const mb = n / (1024 * 1024);
  return `${mb >= 100 ? Math.round(mb) : mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

export function storageUsagePercent(entitlements){
  const ent = normalizeEntitlements(entitlements);
  const max = storageBytesLimit(ent.limits);
  if(!max) return 0;
  return Math.min(100, Math.round((ent.bytes_used / max) * 100));
}

export function canFitBytes(entitlements, nextBytes){
  const ent = normalizeEntitlements(entitlements);
  const max = storageBytesLimit(ent.limits);
  const add = Math.max(0, Number(nextBytes) || 0);
  return ent.bytes_used + add <= max;
}

export function mediaLimitsFromPlan(sectionKey = "gallery", planLimits = DEFAULT_MOMENTS_LIMITS){
  const limits = normalizePlanLimits(planLimits);
  if(sectionKey === "letter_future"){
    return {
      maxImages: limits.letter_images,
      maxVideos: limits.letter_videos,
      maxAudio: limits.letter_audio,
      maxPdfs: limits.letter_pdfs,
      maxItems: limits.letter_images + limits.letter_videos + limits.letter_audio + limits.letter_pdfs,
      hint: `Fino a ${limits.letter_images} foto, ${limits.letter_videos} video, ${limits.letter_audio} audio e ${limits.letter_pdfs} PDF (max ${limits.max_image_mb}/${limits.max_video_mb}/${limits.max_audio_mb}/${limits.max_pdf_mb} MB) — si sbloccano con la lettera.`
    };
  }
  if(sectionKey === "video"){
    return {
      maxImages: 0,
      maxVideos: limits.video_clips,
      maxAudio: 0,
      maxPdfs: 0,
      maxItems: limits.video_clips,
      hint: `Fino a ${limits.video_clips} video (MP4/MOV, max ${limits.max_video_mb} MB ciascuno) con titolo e descrizione — scorrimento in pagina come la galleria.`
    };
  }
  if(sectionKey === "music"){
    return {
      maxImages: 0,
      maxVideos: 0,
      maxAudio: limits.music_audio,
      maxPdfs: 0,
      maxItems: limits.music_audio,
      hint: `Fino a ${limits.music_audio} audio (max ${limits.max_audio_mb} MB) — alternativa o complemento a Spotify/YouTube.`
    };
  }
  return {
    maxImages: limits.gallery_images,
    maxVideos: 0,
    maxAudio: 0,
    maxPdfs: 0,
    maxItems: limits.gallery_images,
    hint: `Fino a ${limits.gallery_images} foto (max ${limits.max_image_mb} MB) — titolo e descrizione sotto ogni foto e nell’ingrandimento.`
  };
}

export async function fetchMomentEntitlements(supabase, eventId){
  if(!supabase || !eventId) return emptyEntitlements(eventId);
  const { data, error } = await supabase.rpc("get_moment_entitlements", { p_event_id: eventId });
  if(error) throw error;
  return normalizeEntitlements(data, eventId);
}

export async function applyMomentPlan(supabase, eventId, planKey){
  const { data, error } = await supabase.rpc("apply_moment_plan", {
    p_event_id: eventId,
    p_plan_key: normalizePlanKey(planKey)
  });
  if(error) throw error;
  return normalizeEntitlements(data, eventId);
}
